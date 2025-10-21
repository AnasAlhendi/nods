We want the connections between nodes to be dynamic during dragging, with:

No overlapping lines,

No line crossings over nodes or groups,

A clean, orthogonal path with smooth rounded corners.

Below is a structured algorithm plan you can directly translate into your existing codebase.

⚙️ Algorithm Plan (No Code)
1) Smart Port Selection

Goal: Exit and enter from the nearest sides to minimize path length.

Compute each node’s center (cx, cy).

Let dx = cxB - cxA, dy = cyB - cyA.

If |dx| ≥ |dy|:

If B is to the right of A → src = right, dst = left.

Else B is to the left → src = left, dst = right.

Otherwise (vertical alignment):

If B is below A → src = bottom, dst = top.

Else → src = top, dst = bottom.

Add a small fixed gap (≈ 24–32 px) for both exit and entry.

Recalculate this decision every time a node moves.

2) Prevent Line Overlap (Lanes / Fan-out)

Problem: Multiple edges from the same side overlap.
Solution: Assign each connection a unique “lane offset.”

For each node and side (e.g. “right”):

Collect all outgoing edges.

Sort them by the target’s angle or vertical/horizontal position.

Assign laneIndex = 0…N–1.

Offset each port position perpendicular to its direction:

offset = (laneIndex - (N–1)/2) * laneGap


where laneGap ≈ 10–14 px.

Result: elegant, non-overlapping fan-out lines.
(You can apply this only at the source side — destination is optional.)

3) Avoid Obstacles (Nodes / Groups)

Treat all nodes and groups as rectangular obstacles with a clearance margin.

Two possible levels:

A) Simple & Fast (Rectangular Detour)

After computing exit p1 and entry p2:

Try an “L-shaped” route (one corner at the target’s x or y).

If the segment intersects any rectangle (AABB test):

Try the alternative corner order (horizontal → vertical or vice versa).

If still blocked:

Route around the nearest obstacle by adding a waypoint parallel to its edge + clearance (≈ 12–16 px).

Repeat until the path is clear.

B) Advanced (Grid + BFS / A)*

Build a Manhattan grid (cell size 8–12 px).

Mark obstacle cells as blocked, expanded by clearance.

Run BFS or A* (4-directional) from p1 → p2.

After obtaining the path, simplify it (merge collinear points) and round corners.

Level A works for ~90 % of cases; Level B for dense diagrams.

4) Corner Rounding and Path Smoothing

After generating the polyline (M, L, L, …):

At each 90° turn:

Cut the corner by distance r (≤ length of adjacent segments).

Replace the corner with a short arc or quadratic curve (Q).

Auto-adjust radius:

r = min(rBase, min(segmentLengthBefore, segmentLengthAfter), 12px)


Styling:

stroke-linecap: round;
stroke-linejoin: round;


This produces a soft, flowchart-style line.

5) Real-Time Updates While Dragging

To keep the interaction smooth:

Throttle rerouting to every ~16 ms (≈ 60 FPS) or 25 ms.

Recalculate only affected edges:

When node X moves → update its out(X) and in(X) connections only.

Maintain caches:

Ports cache: for each side (count, laneGap).

Obstacles cache: bounding boxes + clearance.

After drag ends (mouseup), do a full refresh.

6) Group Interactions

Treat group boxes as obstacles (with clearance).
When dragging a group:

Children move with it (handled already).

After each move, reroute affected edges (children + cross-group connections).

7) Rendering Order (Z-Index) and Interaction

Use a hit path slightly wider than the visible path for better click detection.

On hover: increase stroke width or change opacity.

Render visually under nodes, but keep the hit path clickable on top.

8) Default Recommended Visual Parameters
   Property	Recommended Value
   Exit/entry gap	28 px
   Lane gap	12 px
   Corner radius	8–10 px (clamped)
   Clearance	12–16 px
   Stroke width	2 px
   Decision Flow (Pseudo-Flow)

Determine srcSide / dstSide (direction rules).

Compute exit/entry ports with gap.

Assign lane offsets using laneGap.

Build a Manhattan-style route:

Try “L”. If blocked → alternative → obstacle detour or A*.

Once a valid polyline is found:

Simplify (merge collinear segments).

Round corners with radius.

Render (path + marker-end).

On drag:

Throttle and rerun steps 1–6 for affected edges only.

✅ Outcome:
Dynamic, obstacle-aware, non-overlapping, smooth orthogonal connections that behave and look like those in a professional flowchart editor.