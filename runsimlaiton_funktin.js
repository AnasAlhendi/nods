// Provides a reusable runSimulation(nodes) function.
// Highlights a path following first connection from the start node.

function runSimulation(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return;
  const getNode = (id) => nodes.find(n => n && n.id === id);
  const startNode = nodes.find(n => (n.tag || '').toLowerCase().includes('start')) || nodes[0];
  const visited = new Set();
  const path = [];
  let current = startNode;
  while (current && !visited.has(current.id)) {
    path.push(current.id);
    visited.add(current.id);
    const nextId = (current.connections && current.connections[0]) || undefined;
    current = nextId ? getNode(nextId) : undefined;
  }
  let i = 0;
  const timer = setInterval(() => {
    if (i > 0) {
      const prev = document.querySelector(`[data-node-id="${path[i-1]}"] .option-js`);
      if (prev) prev.style.background = 'var(--blue-900)';
    }
    if (i >= path.length) { clearInterval(timer); return; }
    const el = document.querySelector(`[data-node-id="${path[i]}"] .option-js`);
    if (el) el.style.background = '#0E9F6E';
    i++;
  }, 400);
}

