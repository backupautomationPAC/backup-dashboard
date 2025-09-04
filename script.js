// ------------------------------------------------------
// Backup Dashboard • script.js (GViz JSONP, no CORS)
// Works with headers: Status, Device Name, Source, Last Backup,
// Files Backed Up, Files Failed, Total Size
// ------------------------------------------------------
(() => {
  // 🔧 CHANGE THESE TWO:
  const SHEET_ID = "PUT_YOUR_SHEET_ID_HERE";
  const GID = "PUT_YOUR_GID_HERE";

  const GVIZ_URL =
    `https://docs.google.com/spreadsheets/d/1zHXFq6cHG45pCN-u7_7Knul2UyXbhS9a02VPm-weMrc/gviz/tq` +
    `?tqx=out:json;responseHandler:onGviz&gid=1187290868`;

  // Column names EXACTLY as they appear in your sheet
  const COLS = {
    status:     "Status",
    device:     "Device Name",
    source:     "Source",
    start:      "Last Backup",
    backedUp:   "Files Backed Up",
    failed:     "Files Failed",
    totalSize:  "Total Size",
  };

  let rawRows = [];
  let viewRows = [];

  // ---------- load via JSONP --------------------------------------
  function loadData() {
    const tbody = document.getElementById("backups-data");
    tbody.innerHTML =
      `<tr><td colspan="7" class="loading-message">Loading backup data...</td></tr>`;

    const s = document.createElement("script");
    s.src = GVIZ_URL;
    s.onerror = () => alert("Error loading sheet data");
    (document.head || document.body).appendChild(s);
  }

  // Helper: normalize column labels to match even if spacing/case changes
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  function idxBy(headers, name) {
    const want = norm(name);
    return headers.findIndex(h => norm(h) === want);
  }

  // Google calls this when the JSONP arrives
  window.onGviz = function(resp) {
    const table = resp.table;
    const headers = (table.cols || []).map((c, i) => (c.label || c.id || `Col${i+1}`)).map(s => s.trim());

    const map = {
      status:    idxBy(headers, COLS.status),
      device:    idxBy(headers, COLS.device),
      source:    idxBy(headers, COLS.source),
      start:     idxBy(headers, COLS.start),
      backedUp:  idxBy(headers, COLS.backedUp),
      failed:    idxBy(headers, COLS.failed),
      totalSize: idxBy(headers, COLS.totalSize),
    };

    function cellVal(c) {
      if (!c) return "";
      // prefer formatted text, else raw
      return (c.f ?? c.v ?? "").toString();
    }
    function cellNum(c) {
      if (!c) return 0;
      let v = (c.v ?? c.f ?? "").toString().trim();
      // Treat em dash / dash / blanks as zero
      if (!v || v === "—" || v === "–" || v === "-") return 0;
      // remove commas/spaces
      v = v.replace(/,/g, "").replace(/\s+/g, "");
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }

    rawRows = (table.rows || []).map(r => r.c || []).map(c => ({
      [COLS.status]:     cellVal(c[map.status]),
      [COLS.device]:     cellVal(c[map.device]),
      [COLS.source]:     cellVal(c[map.source]),
      [COLS.start]:      cellVal(c[map.start]),
      [COLS.backedUp]:   cellNum(c[map.backedUp]),
      [COLS.failed]:     cellNum(c[map.failed]),
      [COLS.totalSize]:  cellVal(c[map.totalSize]),
    })).filter(r => r[COLS.status]);

    buildDeviceOptions(rawRows);
    buildSourceOptions(rawRows);
    applyFilters();
    document.getElementById("update-time").textContent = new Date().toLocaleString();
  };

  // ---------- dropdowns -------------------------------------------
  function buildDeviceOptions(rows) {
    const sel = document.getElementById("device-filter");
    const devices = [...new Set(rows.map(r => r[COLS.device]).filter(Boolean))].sort();
    sel.innerHTML = `<option value="All">All Devices</option>` + devices.map(d => `<option>${d}</option>`).join("");
  }
  function buildSourceOptions(rows) {
    const sel = document.getElementById("source-filter");
    if (!sel) return;
    const sources = [...new Set(rows.map(r => r[COLS.source]).filter(Boolean))].sort();
    sel.innerHTML = `<option value="All Sources">All Sources</option>` + sources.map(s => `<option>${s}</option>`).join("");
  }

  // ---------- filters + render ------------------------------------
  function applyFilters() {
    const device = document.getElementById("device-filter").value;
    const source = document.getElementById("source-filter")?.value || "All Sources";
    const status = document.getElementById("status-filter").value;
    const range  = document.getElementById("date-filter").value;   // "all" or N days
    const now    = Date.now();
    const maxAge = range === "all" ? Infinity : Number(range) * 86400000;

    viewRows = rawRows.filter(r => {
      const okStatus = status === "All Statuses" || r[COLS.status] === status;
      const okDevice = device === "All" || r[COLS.device] === device;
      const okSource = source === "All Sources" || r[COLS.source] === source;

      let okDate = true;
      if (maxAge !== Infinity) {
        const ts = parseDate(r[COLS.start]);
        okDate = ts && (now - ts <= maxAge);
      }
      return okStatus && okDevice && okSource && okDate;
    });

    renderCards(viewRows);
    renderTable(viewRows);
  }

  // Accepts 09-03-2025 12:00:43, 09/03/2025 12:00:43, or ISO strings
  function parseDate(str) {
    if (!str) return null;
    if (str instanceof Date) return str.getTime();
    const s = String(str).trim();

    const m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const [, mo, da, yr, hh, mm, ss] = m.map(Number);
      return new Date(yr, mo - 1, da, hh, mm, ss || 0).getTime();
    }
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }

  // ---------- summary cards ---------------------------------------
  function renderCards(rows) {
    document.getElementById("total-backups"     ).textContent = rows.length;
    document.getElementById("successful-backups").textContent = rows.filter(r => r[COLS.status] === "Successful").length;
    document.getElementById("warning-backups"   ).textContent = rows.filter(r => r[COLS.status] === "Warning").length;
    document.getElementById("failed-backups"    ).textContent = rows.filter(r => r[COLS.status] === "Failed").length;
  }

  // ---------- table ------------------------------------------------
  function renderTable(rows) {
    const tbody = document.getElementById("backups-data");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">No backups match the filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr class="${norm(r[COLS.status])}">
        <td>${r[COLS.status] || ""}</td>
        <td>${r[COLS.device] || ""}</td>
        <td>${r[COLS.source] || ""}</td>
        <td>${r[COLS.start]  || ""}</td>
        <td>${Number.isFinite(r[COLS.backedUp]) ? r[COLS.backedUp] : 0}</td>
        <td>${Number.isFinite(r[COLS.failed])   ? r[COLS.failed]   : 0}</td>
        <td>${r[COLS.totalSize] ?? ""}</td>
      </tr>`).join("");
  }

  // ---------- bind buttons & initial load --------------------------
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("apply-filters").addEventListener("click", applyFilters);
    document.getElementById("refresh-btn").addEventListener("click", () => location.reload());
    loadData();
  });
})();
