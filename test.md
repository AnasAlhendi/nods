Perfect — here’s the Agent Instruction Manual (in English) version of your final concept.
Think of this as a playbook for how the Agent should behave — step-by-step logic and responsibilities.

🧠 Agent Instruction Manual
0) Scope of Operation

The Agent is active only in two cases:

When a node’s checkbox state changes (checked / unchecked).

When nodeStates are applied during initialization and a checkbox value actually changes.

enabled / disabled states are applied silently — they do not trigger events.

1) What the Agent Does When Triggered

When an event is triggered on a node (the “current node”):

Update the internal checkbox state for the current node.

Execute its logic function:

onChangeNode.call(thisNode, checked)


this refers to the current node context.

Collect all state changes (enable, disable, rename, etc.).

Apply all changes in batch.

Re-render the diagram once.

2) Allowed Methods Inside this
   Method	Description
   this.getChecked()	Returns the node’s current checkbox state.
   this.setChecked(bool)	Sets the checkbox state and triggers onChangeNode again.
   this.enable()	Enables the current node (restores original edges, removes bypass links, makes interactive again).
   this.disable(options?)	Disables the current node:
- Makes it read-only.
- Adds transparent visual style (is-disabled).
- Detaches all input/output connections.
- Bypass ON (default): connects every input → every output directly with dashed temporary edges.
  Optional flags: { detach, bypass, transparent }.
  `this.setState(nodeId, 'enabled'	'disabled')`
  this.rename(newLabel)	Renames the current node.
  this.renameNode(nodeId, newLabel)	Renames another node by ID.
3) Contextual Navigation Helpers (Sugar Syntax)

You can move through the diagram easily using context helpers:

Helper	Description
this.next.enable() / .disable()	Applies to all directly connected outgoing nodes.
this.next.next.enable()	Moves 2 steps forward and enables them.
this.prev.enable() / .disable()	Applies to all directly incoming nodes.
this.prev.prev.disable()	Moves 2 steps backward and disables them.
this.to(targetId).enable() / .disable()	Affects all nodes along the shortest path from current to targetId.

These helpers stop automatically when no further nodes exist.
You can chain them freely like this.next.next.next.enable().

4) Edge (Connection) Rules for Enable/Disable
   When calling this.disable():

Detach all incoming/outgoing connections.

Bypass Mode (default ON):

For each input node → connect to each output node temporarily.

Use a distinct visual style (e.g., dashed line).

Node becomes transparent and read-only.

When calling this.enable():

Restore all original edges.

Remove any bypass connections created during disable.

5) Conflict Policy

If multiple commands modify the same node within a single execution cycle →
last write wins (the most recent action overrides earlier ones).

6) Safety and Behavior Rules
   ✅ Always

Apply all changes at once before re-rendering.

Stop navigation chains (next/prev) automatically if no more neighbors exist.

Ignore invalid target IDs silently (log internally, no crash).

❌ Never

Trigger events for nodes without checkboxes.

Keep bypass edges after re-enabling nodes.

Cause infinite loops by re-calling setChecked() unless the value truly changed.

7) Ready-Made Behavior Scenarios
   🟢 Scenario 1: A menu controls helper nodes
   onChangeNode(checked) {
   if (checked) {
   this.enableNode('help');
   this.disableNode('end');
   this.next.enable(); // enable direct outgoing nodes
   } else {
   this.disableNode('help');
   this.enableNode('end');
   }
   }

🟠 Scenario 2: Skip a node when unchecked
onChangeNode(checked) {
if (!checked) {
this.disable(); // detaches, makes transparent, bypasses connections
}
}

🔵 Scenario 3: Enable a full chain
this.next.next.enable(); // two steps forward

🟣 Scenario 4: Enable up to a target node
this.to('end').enable();

8) Initialization Rules

At diagram build:

diagramUI.build('.canvas-container', diagramNodes, {
width: 2000,
height: 1200,
state: diagramState,
lineControlsEnabled: true,
nodeStates: [
"start::checked",
"menu::unchecked",
"help::enabled",
"end::disabled"
]
});


When nodeStates are applied:

If a node changes checked ↔ unchecked, trigger its onChangeNode(checked).

Apply enabled / disabled silently (affecting style and logic only).

9) Post-Update Checks

After each update cycle:

No bypass edges remain for enabled nodes.

Disabled nodes are transparent, read-only, and detached.

No infinite next / prev loops exist.

The diagram re-renders only once per full change set.

✅ Summary
Feature	Description
Event	onChangeNode(checked) (single unified event)
API	this.* context functions
Auto Behavior	enable() / disable() manage visuals & edges
Navigation	Chainable next, prev, and to() helpers
Conflict Rule	Last-write-wins
No DSL	Commands are native JS calls
Rendering	All changes applied in batch, then one re-render