// Provides a reusable saveDesign(nodes) function.
// Returns a <pre> element containing the JSON design.

function saveDesign(nodes) {
  // Exclude function-valued fields from JSON output
  const data = {
    nodes: (Array.isArray(nodes) ? nodes : []).map(n => {
      const entries = Object.entries(n).filter(([, v]) => typeof v !== 'function');
      return Object.fromEntries(entries);
    })
  };
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap';
  pre.textContent = JSON.stringify(data, null, 2);
  return pre;
}

