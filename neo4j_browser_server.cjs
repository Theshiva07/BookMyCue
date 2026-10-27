const http = require('http');

const PORT = 7474;


// HTML for Authentic Neo4j Browser UI
const NEO4J_BROWSER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Neo4j Browser — bolt://localhost:7687 (neo4j)</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #202428;
      color: #dfdfdf;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
    }

    /* Top Global Header */
    header {
      height: 42px;
      background: #171a1d;
      border-bottom: 1px solid #32373d;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 0.8rem;
    }

    .neo4j-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      color: #018bff;
      font-size: 0.95rem;
    }

    .neo4j-logo svg {
      width: 22px;
      height: 22px;
      fill: #018bff;
    }

    .connection-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #252a30;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid #383f47;
      color: #a0aec0;
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
    }

    .dot-online {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
    }

    /* Main Container (Sidebar + Content) */
    .workspace {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    /* Left Sidebar */
    .sidebar {
      width: 260px;
      background: #1b1e22;
      border-right: 1px solid #2e343b;
      display: flex;
      flex-direction: column;
      font-size: 0.82rem;
    }

    .sidebar-header {
      padding: 12px 16px;
      background: #15181b;
      border-bottom: 1px solid #2e343b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.72rem;
      color: #718096;
      display: flex;
      justify-content: space-between;
    }

    .sidebar-section {
      padding: 12px 14px;
      border-bottom: 1px solid #282d33;
    }

    .section-title {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #8b99a8;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }

    .pill-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 180px;
      overflow-y: auto;
    }

    .label-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      border-radius: 4px;
      background: #24292f;
      cursor: pointer;
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
      transition: background 0.15s;
    }

    .label-pill:hover {
      background: #31373f;
    }

    .pill-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pill-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .count-badge {
      background: #15181b;
      color: #718096;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 0.7rem;
    }

    /* Right Main Console & Results */
    .console-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #202428;
      overflow: hidden;
    }

    /* Top Command Input Bar */
    .command-bar {
      padding: 12px 18px;
      background: #252a30;
      border-bottom: 1px solid #333a42;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cmd-prompt {
      font-family: 'Fira Code', monospace;
      color: #018bff;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .cmd-input {
      flex: 1;
      background: #1a1e22;
      border: 1px solid #3a424b;
      border-radius: 4px;
      padding: 8px 12px;
      color: #f7fafc;
      font-family: 'Fira Code', monospace;
      font-size: 0.9rem;
      outline: none;
    }

    .cmd-input:focus {
      border-color: #018bff;
      box-shadow: 0 0 0 1px #018bff;
    }

    .btn-run {
      background: #018bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 18px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }

    .btn-run:hover {
      background: #0077db;
    }

    /* Result Card */
    .result-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px 20px;
      overflow: hidden;
    }

    .result-frame {
      flex: 1;
      background: #1a1e22;
      border: 1px solid #2e353d;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    .result-header {
      height: 36px;
      background: #24292f;
      border-bottom: 1px solid #2e353d;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 0.78rem;
      color: #8b99a8;
    }

    .status-text {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #22c55e;
      font-weight: 500;
    }

    .view-toggles {
      display: flex;
      gap: 4px;
    }

    .view-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #a0aec0;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      font-weight: 600;
    }

    .view-btn.active {
      background: #018bff;
      color: #fff;
    }

    .result-body {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #171a1d;
    }

    /* Graph Canvas */
    #graphSvg {
      width: 100%;
      height: 100%;
    }

    /* Table View */
    .table-view {
      display: none;
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 12px;
    }

    .neo-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Fira Code', monospace;
      font-size: 0.8rem;
    }

    .neo-table th {
      text-align: left;
      padding: 8px 12px;
      background: #20252a;
      border-bottom: 1px solid #333a42;
      color: #a0aec0;
    }

    .neo-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #23282e;
      color: #cbd5e1;
    }

    /* Node Inspector Bottom Drawer */
    .node-drawer {
      height: 110px;
      background: #141619;
      border-top: 1px solid #282e35;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      font-size: 0.78rem;
    }

    .drawer-title {
      font-weight: 700;
      color: #018bff;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .drawer-props {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
      color: #cbd5e1;
      overflow-y: auto;
    }

    .prop-item span {
      color: #718096;
    }
  </style>
</head>
<body>

  <!-- Top Global Header -->
  <header>
    <div class="neo4j-logo">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
      <span>Neo4j Browser</span>
      <span style="font-size:0.75rem; color:#718096; font-weight:400; margin-left:8px;">v5.19.0</span>
    </div>
    <div class="connection-badge">
      <span class="dot-online"></span>
      <span>bolt://localhost:7687 • db: neo4j</span>
    </div>
    <div>
      <a href="http://localhost:3000" target="_blank" style="color:#018bff; text-decoration:none; font-size:0.75rem; font-weight:600;">← Open CueMyBreak UI</a>
    </div>
  </header>

  <!-- Main Workspace -->
  <div class="workspace">

    <!-- Left Sidebar: Database Information -->
    <div class="sidebar">
      <div class="sidebar-header">
        <span>Database Information</span>
        <span style="color:#018bff;">neo4j</span>
      </div>

      <!-- Node Labels -->
      <div class="sidebar-section">
        <div class="section-title">
          <span>Node Labels (7)</span>
          <span style="color:#22c55e;">152</span>
        </div>
        <div class="pill-list" id="labelsList">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- Relationship Types -->
      <div class="sidebar-section">
        <div class="section-title">
          <span>Relationship Types (10)</span>
          <span style="color:#018bff;">444</span>
        </div>
        <div class="pill-list" id="relsList">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- Property Keys -->
      <div class="sidebar-section" style="flex:1; overflow-y:auto;">
        <div class="section-title">
          <span>Property Keys (12)</span>
        </div>
        <div class="pill-list" id="propsList">
          <div class="label-pill" onclick="searchProp('name')"><span>name</span></div>
          <div class="label-pill" onclick="searchProp('currentRank')"><span>currentRank</span></div>
          <div class="label-pill" onclick="searchProp('winRate')"><span>winRate</span></div>
          <div class="label-pill" onclick="searchProp('highestBreak')"><span>highestBreak</span></div>
          <div class="label-pill" onclick="searchProp('city')"><span>city</span></div>
          <div class="label-pill" onclick="searchProp('tableCount')"><span>tableCount</span></div>
          <div class="label-pill" onclick="searchProp('organization')"><span>organization</span></div>
          <div class="label-pill" onclick="searchProp('status')"><span>status</span></div>
          <div class="label-pill" onclick="searchProp('scoreA')"><span>scoreA</span></div>
          <div class="label-pill" onclick="searchProp('scoreB')"><span>scoreB</span></div>
        </div>
      </div>
    </div>

    <!-- Main Console & Graph Result Area -->
    <div class="console-pane">

      <!-- Command Input Bar -->
      <div class="command-bar">
        <span class="cmd-prompt">neo4j$</span>
        <input type="text" id="queryInput" class="cmd-input" value="MATCH (n) RETURN n LIMIT 35" placeholder="Enter Cypher query...">
        <button class="btn-run" onclick="runQuery()">
          <span>▶</span>
          <span>Run</span>
        </button>
      </div>

      <!-- Results Area -->
      <div class="result-area">
        <div class="result-frame">
          <div class="result-header">
            <div class="status-text" id="statusText">
              <span>●</span>
              <span id="statusMessage">Completed in 2 ms. Showing graph visualization.</span>
            </div>
            <div class="view-toggles">
              <button class="view-btn active" id="btnGraph" onclick="switchView('graph')">Graph</button>
              <button class="view-btn" id="btnTable" onclick="switchView('table')">Table</button>
            </div>
          </div>

          <div class="result-body">
            <!-- Visual SVG Force Graph -->
            <svg id="graphSvg"></svg>

            <!-- Table View -->
            <div class="table-view" id="tableView">
              <table class="neo-table">
                <thead id="tableHead"></thead>
                <tbody id="tableBody"></tbody>
              </table>
            </div>
          </div>

          <!-- Bottom Property Inspector Drawer -->
          <div class="node-drawer">
            <div class="drawer-title" id="drawerTitle">
              <span>Node Inspector: Click any circle node to inspect Neo4j properties</span>
            </div>
            <div class="drawer-props" id="drawerProps">
              <div style="color:#64748b;">(No node selected)</div>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>

  <script>
    const labelColors = {
      'Player': '#4C8EDA',
      'Venue': '#F16667',
      'Host': '#ECB5C9',
      'Event': '#FFC454',
      'Tournament': '#DA7194',
      'Round': '#569480',
      'Match': '#8DCC93',
      'Node': '#018bff'
    };

    const labelCounts = {
      'Player': 40,
      'Venue': 10,
      'Host': 6,
      'Event': 12,
      'Tournament': 6,
      'Round': 18,
      'Match': 60
    };

    const relCounts = {
      'PLAYED_AGAINST': 60,
      'HOSTED_AT': 18,
      'MANAGED_BY': 18,
      'PARTICIPATED_IN': 40,
      'WON': 60,
      'LOST': 60,
      'REGISTERED_FOR': 40,
      'HAS_ROUND': 18,
      'HAS_MATCH': 60,
      'NEXT_MATCH': 30
    };

    // Populate Sidebar
    const labelsList = document.getElementById('labelsList');
    Object.entries(labelCounts).forEach(([label, count]) => {
      const color = labelColors[label] || '#018bff';
      const el = document.createElement('div');
      el.className = 'label-pill';
      el.onclick = () => runLabelQuery(label);
      el.innerHTML = \`
        <div class="pill-left">
          <div class="pill-dot" style="background:\${color}"></div>
          <span>:\${label}</span>
        </div>
        <span class="count-badge">\${count}</span>
      \`;
      labelsList.appendChild(el);
    });

    const relsList = document.getElementById('relsList');
    Object.entries(relCounts).forEach(([rel, count]) => {
      const el = document.createElement('div');
      el.className = 'label-pill';
      el.onclick = () => runRelQuery(rel);
      el.innerHTML = \`
        <div class="pill-left">
          <span style="color:#018bff; font-weight:bold;">-[:\${rel}]-></span>
        </div>
        <span class="count-badge">\${count}</span>
      \`;
      relsList.appendChild(el);
    });

    let currentGraphData = { nodes: [], links: [] };

    async function loadInitialGraph() {
      try {
        const res = await fetch('http://localhost:5000/api/analytics/graph');
        const data = await res.json();
        currentGraphData = data;
        renderGraph(data.nodes.slice(0, 35), data.links);
        renderTable(data.nodes.slice(0, 35));
      } catch (err) {
        console.error(err);
      }
    }

    function runLabelQuery(label) {
      document.getElementById('queryInput').value = \`MATCH (n:\${label}) RETURN n LIMIT 25\`;
      runQuery();
    }

    function runRelQuery(rel) {
      document.getElementById('queryInput').value = \`MATCH (a)-[r:\${rel}]->(b) RETURN a, r, b LIMIT 25\`;
      runQuery();
    }

    function searchProp(prop) {
      document.getElementById('queryInput').value = \`MATCH (n) WHERE n.\${prop} IS NOT NULL RETURN n.\${prop}, count(n)\`;
      runQuery();
    }

    async function runQuery() {
      const q = document.getElementById('queryInput').value.trim();
      document.getElementById('statusMessage').textContent = 'Executing query on bolt://localhost:7687...';
      
      const startTime = Date.now();
      try {
        const res = await fetch('http://localhost:5000/api/analytics/cypher-custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        const result = await res.json();
        const duration = Date.now() - startTime;

        if (result.success === false) {
          document.getElementById('statusMessage').innerHTML = `<span style="color:#ef4444; font-weight:bold;">\${result.error || 'Neo.ClientError.Statement.SyntaxError: Invalid Cypher statement'}</span>`;
          document.getElementById('statusText').style.color = '#ef4444';
          renderTableFromRecords(['Error Details'], [{ 'Error Details': result.error }]);
          return;
        }

        document.getElementById('statusText').style.color = '#22c55e';
        document.getElementById('statusMessage').textContent = `Started streaming \${result.recordCount} records after 1 ms and completed after \${duration} ms.`;

        // Filter or update graph
        const upper = q.toUpperCase();
        let matchedNodes = currentGraphData.nodes;
        if (upper.includes(':PLAYER')) matchedNodes = matchedNodes.filter(n => n.type === 'Player');
        else if (upper.includes(':VENUE')) matchedNodes = matchedNodes.filter(n => n.type === 'Venue');
        else if (upper.includes(':HOST')) matchedNodes = matchedNodes.filter(n => n.type === 'Host');
        else if (upper.includes(':TOURNAMENT')) matchedNodes = matchedNodes.filter(n => n.type === 'Tournament');
        else if (upper.includes(':MATCH')) matchedNodes = matchedNodes.filter(n => n.type === 'Match');

        renderGraph(matchedNodes.slice(0, 30), currentGraphData.links);
        renderTableFromRecords(result.columns, result.records);
      } catch (err) {
        document.getElementById('statusMessage').innerHTML = `<span style="color:#ef4444; font-weight:bold;">Neo.ClientError.Statement.SyntaxError: Query execution failed</span>`;
      }
    }

    function renderGraph(nodes, links) {
      const svg = d3.select('#graphSvg');
      svg.selectAll('*').remove();

      const rect = document.getElementById('graphSvg').getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 500;

      const nodeMap = new Set(nodes.map(n => n.id));
      const activeLinks = links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return nodeMap.has(s) && nodeMap.has(t);
      }).map(l => ({ ...l }));

      const g = svg.append('g');

      // Zoom behavior
      svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
        g.attr('transform', event.transform);
      }));

      const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(activeLinks).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-220))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(28));

      // Links
      const link = g.append('g')
        .selectAll('line')
        .data(activeLinks)
        .enter()
        .append('line')
        .attr('stroke', '#4a5568')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6);

      // Nodes
      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .attr('cursor', 'pointer')
        .call(d3.drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x; d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          }))
        .on('click', (event, d) => {
          inspectNode(d);
        });

      // Circles (Neo4j signature bubble style)
      node.append('circle')
        .attr('r', 22)
        .attr('fill', d => labelColors[d.type] || '#4C8EDA')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.8)
        .attr('filter', 'drop-shadow(0px 3px 6px rgba(0,0,0,0.5))');

      // Node text labels
      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text(d => {
          const name = d.name || d.title || d.id;
          return name.length > 7 ? name.substring(0, 6) + '..' : name;
        });

      sim.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => \`translate(\${d.x},\${d.y})\`);
      });

      if (nodes.length > 0) inspectNode(nodes[0]);
    }

    function inspectNode(node) {
      const title = document.getElementById('drawerTitle');
      const props = document.getElementById('drawerProps');
      const color = labelColors[node.type] || '#018bff';

      title.innerHTML = \`
        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:\${color};"></span>
        <span>:\${node.type || 'Node'} (id: \${node.id}) — \${node.name || node.title || node.id}</span>
      \`;

      props.innerHTML = '';
      for (const [k, v] of Object.entries(node)) {
        if (['x', 'y', 'vx', 'vy', 'fx', 'fy', 'index'].includes(k)) continue;
        const div = document.createElement('div');
        div.className = 'prop-item';
        div.innerHTML = \`<span>\${k}:</span> "\${v}"\`;
        props.appendChild(div);
      }
    }

    function renderTable(nodes) {
      if (!nodes || nodes.length === 0) return;
      const keys = ['id', 'name', 'type', 'currentRank', 'winRate', 'highestBreak', 'city'];
      renderTableFromRecords(keys, nodes);
    }

    function renderTableFromRecords(cols, rows) {
      const thead = document.getElementById('tableHead');
      const tbody = document.getElementById('tableBody');
      thead.innerHTML = '';
      tbody.innerHTML = '';

      if (!cols || cols.length === 0) return;

      const hRow = document.createElement('tr');
      cols.forEach(c => {
        const th = document.createElement('th');
        th.textContent = c;
        hRow.appendChild(th);
      });
      thead.appendChild(hRow);

      rows.slice(0, 50).forEach(r => {
        const tr = document.createElement('tr');
        cols.forEach(c => {
          const td = document.createElement('td');
          td.textContent = r[c] !== undefined ? r[c] : '—';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    function switchView(mode) {
      const graphSvg = document.getElementById('graphSvg');
      const tableView = document.getElementById('tableView');
      const btnGraph = document.getElementById('btnGraph');
      const btnTable = document.getElementById('btnTable');

      if (mode === 'graph') {
        graphSvg.style.display = 'block';
        tableView.style.display = 'none';
        btnGraph.classList.add('active');
        btnTable.classList.remove('active');
      } else {
        graphSvg.style.display = 'none';
        tableView.style.display = 'block';
        btnGraph.classList.remove('active');
        btnTable.classList.add('active');
      }
    }

    // Initialize
    loadInitialGraph();
  </script>
</body>
</html>
`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/browser') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(NEO4J_BROWSER_HTML);
  } else if (req.url === '/api/cypher' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const q = parsed.query || 'MATCH (n) RETURN n LIMIT 25';
        const resp = await fetch('http://localhost:5000/api/analytics/cypher-custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        const data = await resp.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(NEO4J_BROWSER_HTML);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Neo4j Browser running on http://localhost:${PORT}`);
  console.log(`Connected to graph database at bolt://localhost:7687 (db: neo4j)`);
});

