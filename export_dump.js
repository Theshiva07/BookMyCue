const fs = require('fs');

async function exportCypher() {
  const res = await fetch('http://localhost:5000/api/analytics/graph');
  const data = await res.json();
  
  let cypher = '// =====================================================\n';
  cypher += '// CueMyBreak Complete Neo4j Graph Database Dump\n';
  cypher += `// Total Nodes: ${data.nodes.length} | Relationships: ${data.links.length}\n`;
  cypher += '// =====================================================\n\n';

  // Nodes
  data.nodes.forEach(n => {
    const lbl = n.type || n.group || 'Node';
    const props = [];
    for (const [k, v] of Object.entries(n)) {
      if (['type', 'group', 'color', 'radius'].includes(k)) continue;
      if (typeof v === 'string') props.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
      else if (typeof v === 'number' || typeof v === 'boolean') props.push(`${k}: ${v}`);
    }
    cypher += `MERGE (n:${lbl} {id: "${n.id}"})\nSET n += {${props.join(', ')}};\n`;
  });

  cypher += '\n// Relationships\n';
  data.links.forEach(l => {
    const sId = typeof l.source === 'object' ? l.source.id : l.source;
    const tId = typeof l.target === 'object' ? l.target.id : l.target;
    const rel = l.type || 'CONNECTED_TO';
    const matchesProp = l.matches ? ` {matches: ${l.matches}}` : '';
    cypher += `MATCH (a {id: "${sId}"}), (b {id: "${tId}"})\nMERGE (a)-[:${rel}${matchesProp}]->(b);\n`;
  });

  fs.writeFileSync('C:/Users/Shiva/.gemini/antigravity/scratch/cuemybreak/cuemybreak_dump.cypher', cypher);
  console.log(`✅ Exported ${data.nodes.length} nodes and ${data.links.length} relationships to cuemybreak_dump.cypher`);
}

exportCypher().catch(console.error);
