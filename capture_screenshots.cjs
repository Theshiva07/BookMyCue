const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = 'C:\\Users\\Shiva\\.gemini\\antigravity\\brain\\853261d0-b049-40b0-9fe1-5573d125c512';

const pages = [
  { url: 'http://localhost:3000/', name: 'ss_dashboard.png' },
  { url: 'http://localhost:3000/graph-explorer', name: 'ss_graph_explorer.png' },
  { url: 'http://localhost:3000/cypher-suite', name: 'ss_cypher_suite.png' },
  { url: 'http://localhost:3000/gds-analytics', name: 'ss_gds_analytics.png' },
  { url: 'http://localhost:3000/tournaments', name: 'ss_tournaments.png' }
];

for (const p of pages) {
  const dest = path.join(outDir, p.name);
  console.log(`Capturing ${p.url} -> ${dest}...`);
  try {
    const cmd = `"${chromePath}" --headless=new --window-size=1440,900 --virtual-time-budget=3500 --screenshot="${dest}" "${p.url}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Saved: ${dest}`);
  } catch (err) {
    console.error(`Error capturing ${p.name}:`, err.message);
  }
}
console.log('All screenshots captured successfully!');
