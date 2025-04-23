// ------------------------------------------------------
// Backup Dashboard  •  script.js  (+ date filter, fixed)
// ------------------------------------------------------
(() => {
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7ld_Xk6exjhviNdm30N1MKaa7huWDGjtdR5BvQbG9D_-TCWPTRMRlcDK4Sd58f08KcKYDRWhbTVuM/pub?output=csv";

  const COLS = {
    status:   "Status",
    device:   "Computer Name",
    start:    "Backup Start Time",
    backedUp: "Files backed up now",
    failed:   "Files failed to backup",
    considered: "Files considered for backup"
  };

  let rawRows = [];
  let viewRows = [];

  // -------- fetch & parse -----------------------------------------
  function loadData() {
    const tbody = document.getElementById("backups-data");
    tbody.innerHTML =
      `<tr><td colspan="7" class="loading-message">Loading backup data...</td></tr>`;

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: ({ data }) => {
        rawRows = data.filter(r => r[COLS.status]);
        buildDeviceOptions(rawRows);
        applyFilters();
        document.getElementById("update-time").textContent =
          new Date().toLocaleString();
      },
      error: err => { console.error(err); alert("Error loading sheet data"); }
    });
  }

  // -------- device dropdown ---------------------------------------
  function buildDeviceOptions(rows) {
    const sel = document.getElementById("device-filter");
    const devices = [...new Set(rows.map(r => r[COLS.device]))]
      .filter(Boolean).sort();

    sel.innerHTML =
      `<option value="All">All Devices</option>` +
      devices.map(d => `<option>${d}</option>`).join("");
  }

  // -------- filter + render ---------------------------------------
  function applyFilters() {
    const status = document.getElementById("status-filter").value;
    const device = document.getElementById("device-filter").value;
    const range  = document.getElementById("date-filter").value;   // "all" or N days
    const now    = Date.now();
    const maxAge = range === "all" ? Infinity : Number(range) * 86400000; // ms

    viewRows = rawRows.filter(r => {
      const okStatus = status === "All Statuses" || r.Status === status;
      const okDevice = device === "All"         || r[COLS.device] === device;

      let okDate = true;
      if (maxAge !== Infinity) {
        const ts = parseDate(r[COLS.start]);
        okDate = ts && (now - ts <= maxAge);
      }
      return okStatus && okDevice && okDate;
    });

    renderCards(viewRows);
    renderTable(viewRows);
  }

  // -------- FIXED regex (single back-slashes) ----------------------
  function parseDate(str) {
    const m = str && str.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(`${m[3]}-${m[1]}-${m[2]}T${m[4]}:${m[5]}:${m[6]}Z`).getTime();
  }

  // -------- summary cards ----------------------------------------
  function renderCards(rows) {
    const tot = rows.length;
    document.getElementById("total-backups").textContent      = tot;
    document.getElementById("successful-backups").textContent = rows.filter(r => r.Status === "Successful").length;
    document.getElementById("failed-backups").textContent     = rows.filter(r => r.Status === "Failed").length;
    document.getElementById("warning-backups").textContent    = rows.filter(r => r.Status === "Warning").length;
  }

  // -------- table -------------------------------------------------
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
        <td>${r[COLS.failed]  || 0}</td>
        <td>${r[COLS.considered] || 0}</td>
      </tr>`).join("");
  }

  // -------- bind & initial load -----------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("apply-filters").addEventListener("click", applyFilters);
    document.getElementById("refresh-btn").addEventListener("click", loadData);
    loadData();
  });
})();
