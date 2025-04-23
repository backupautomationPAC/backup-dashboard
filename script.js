// Backup Dashboard • script.js (sortable columns)
document.addEventListener('DOMContentLoaded', function() {
  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7ld_Xk6exjhviNdm30N1MKaa7huWDGjtdR5BvQbG9D_-TCWPTRMRlcDK4Sd58f08KcKYDRWhbTVuM/pub?output=csv";

  const COLS = {
    status: "Status",
    device: "Computer Name",
    source: "Source",
    start: "Backup Start Time",
    backedUp: "Files backed up now",
    failed: "Files failed to backup",
    considered: "Files considered for backup"
  };

  let rawRows = [];
  let viewRows = [];
  let sortCol = null;
  let sortDir = "asc";

  /* ---------- Initialize the app ---------- */
  function init() {
    // Verify elements exist before adding event listeners
    const applyFiltersBtn = document.getElementById("apply-filters");
    const refreshBtn = document.getElementById("refresh-btn");
    
    if (!applyFiltersBtn || !refreshBtn) {
      console.error("Critical elements missing from DOM");
      document.getElementById("backups-data").innerHTML = `
        <tr><td colspan="7" style="color:red">
          Error: Page failed to load properly. Please refresh.
        </td></tr>`;
      return;
    }

    applyFiltersBtn.addEventListener("click", applyFilters);
    refreshBtn.addEventListener("click", loadData);
    bindHeaderClicks();
    loadData();
  }

  /* ---------- fetch & parse ---------- */
  function loadData() {
    const tbody = document.getElementById("backups-data");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="7" class="loading-message">Loading backup data...</td></tr>`;

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: ({ data, errors }) => {
        if (errors?.length) {
          tbody.innerHTML = `<tr><td colspan="7" style="color:red">Error parsing data: ${errors[0].message}</td></tr>`;
          return;
        }
        
        rawRows = data.filter(r => r[COLS.status]);
        buildDeviceOptions(rawRows);
        applyFilters();
        
        const updateTime = document.getElementById("update-time");
        if (updateTime) {
          updateTime.textContent = new Date().toLocaleString();
        }
      },
      error: err => {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="color:red">
          Error loading data. ${err.message || 'Check console for details'}
        </td></tr>`;
      }
    });
  }

  /* ---------- device dropdown ---------- */
  function buildDeviceOptions(rows) {
    const sel = document.getElementById("device-filter");
    const devices = [...new Set(rows.map(r => r[COLS.device]))].filter(Boolean).sort();
    sel.innerHTML = `<option value="All">All Devices</option>` + devices.map(d => `<option>${d}</option>`).join("");
  }

  /* ---------- filter & sort ---------- */
  function applyFilters() {
    const status = document.getElementById("status-filter").value;
    const device = document.getElementById("device-filter").value;
    const range = document.getElementById("date-filter").value;
    const now = Date.now();
    const maxAge = range === "all" ? Infinity : Number(range) * 86400000;

    viewRows = rawRows.filter(r => {
      const okStatus = status === "All Statuses" || r.Status === status;
      const okDevice = device === "All" || r[COLS.device] === device;
      let okDate = true;
      
      if (maxAge !== Infinity) {
        const ts = parseDate(r[COLS.start]);
        okDate = ts && (now - ts <= maxAge);
      }
      return okStatus && okDevice && okDate;
    });

    if (sortCol) sortViewRows();
    renderCards(viewRows);
    renderTable(viewRows);
  }

  function sortViewRows() {
    const dir = sortDir === "asc" ? 1 : -1;
    viewRows.sort((a, b) => {
      let vA, vB;
      if (sortCol === "source") { vA = vB = 0; }
      else if (sortCol === "start") {
        vA = parseDate(a[COLS.start]) || 0;
        vB = parseDate(b[COLS.start]) || 0;
      } else {
        vA = a[COLS[sortCol]];
        vB = b[COLS[sortCol]];
      }
      if (typeof vA === "number" && typeof vB === "number") return (vA - vB) * dir;
      return String(vA).localeCompare(String(vB)) * dir;
    });
  }

  /* ---------- date parser ---------- */
  function parseDate(str) {
    const m = str && str.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(`${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:${m[6]}Z`).getTime();
  }

  /* ---------- summary cards ---------- */
  function renderCards(rows) {
    document.getElementById("total-backups").textContent = rows.length;
    document.getElementById("successful-backups").textContent = rows.filter(r => r.Status === "Successful").length;
    document.getElementById("warning-backups").textContent = rows.filter(r => r.Status === "Warning").length;
    document.getElementById("failed-backups").textContent = rows.filter(r => r.Status === "Failed").length;
  }

  /* ---------- table ---------- */
  function renderTable(rows) {
    const tbody = document.getElementById("backups-data");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">No backups match the filters.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = rows.map(r => `
      <tr class="${r.Status.toLowerCase()}">
        <td>${r.Status}</td>
        <td>${r[COLS.device] || ""}</td>
        <td>IDrive</td>
        <td>${r[COLS.start] || ""}</td>
        <td>${r[COLS.backedUp] || 0}</td>
        <td>${r[COLS.failed] || 0}</td>
        <td>${r[COLS.considered] || 0}</td>
      </tr>`).join("");

    document.querySelectorAll("th[data-col]").forEach(th => {
      th.classList.remove("sort-asc", "sort-desc");
      if (th.dataset.col === sortCol) th.classList.add(`sort-${sortDir}`);
    });
  }

  /* ---------- header clicks ---------- */
  function bindHeaderClicks() {
    document.querySelectorAll("th[data-col]").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        if (sortCol === col) sortDir = sortDir === "asc" ? "desc" : "asc";
        else { sortCol = col; sortDir = "asc"; }
        applyFilters();
      });
    });
  }

  // Start the application
  init();
});
