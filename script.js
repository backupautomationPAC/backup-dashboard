// ------------------------------------------------------
// Backup Dashboard  •  script.js  (Device dropdown)
// ------------------------------------------------------
(() => {
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7ld_Xk6exjhviNdm30N1MKaa7huWDGjtdR5BvQbG9D_-TCWPTRMRlcDK4Sd58f08KcKYDRWhbTVuM/pub?output=csv";

  const COLS = {
    status:     "Status",
    device:     "Computer Name",
    backupSet:  "Backup Set",
    start:      "Backup Start Time",
    considered: "Files considered for backup",
    present:    "Files already present",
    backedUp:   "Files backed up now",
    failed:     "Files failed to backup",
  };

  let rawRows = [];
  let viewRows = [];

  // -------- fetch & parse -----------------------------------------
  function loadData() {
    const tbody = document.getElementById("backups-data");
    tbody.innerHTML = `<tr><td colspan="7" class="loading-message">Loading backup data...</td></tr>`;

    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: ({ data }) => {
        rawRows = data.filter(r => r[COLS.status]);
        buildFilterOptions(rawRows);
        applyFilters();
        document.getElementById("update-time").textContent =
          new Date().toLocaleString();
      },
      error: err => { console.error(err); alert("Error loading sheet data"); }
    });
  }

  // -------- build dropdowns ---------------------------------------
  function buildFilterOptions(rows) {
    const deviceSel = document.getElementById("device-filter");
    const devices   = [...new Set(rows.map(r => r[COLS.device]))]
                      .filter(Boolean).sort();

    deviceSel.innerHTML =
      `<option value="All">All Devices</option>` +
      devices.map(d => `<option>${d}</option>`).join("");
  }

  // -------- filter + render ---------------------------------------
  function applyFilters() {
    const status = document.getElementById("status-filter").value;
    const device = document.getElementById("device-filter").value;

    viewRows = rawRows.filter(r => {
      const okStatus = status === "All Statuses" || r[COLS.status] === status;
      const okDevice = device === "All"         || r[COLS.device] === device;
      return okStatus && okDevice;
    });

    renderCards(viewRows);
    renderTable(viewRows);
  }

  // -------- summary cards -----------------------------------------
  function renderCards(rows) {
    const total   = rows.length;
    const success = rows.filter(r => r[COLS.status] === "Successful").length;
    const failed  = rows.filter(r => r[COLS.status] === "Failed").length;
    const warning = rows.filter(r => r[COLS.status] === "Warning").length;

    document.getElementById("total-backups").textContent      = total;
    document.getElementById("successful-backups").textContent = success;
    document.getElementById("failed-backups").textContent     = failed;
    document.getElementById("warning-backups").textContent    = warning;
  }

  // -------- table -------------------------------------------------
  function renderTable(rows) {
    const tbody = document.getElementById("backups-data");
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7">No backups match the filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr class="${r[COLS.status].toLowerCase()}">
        <td>${r[COLS.status]  || ""}</td>
        <td>${r[COLS.device]  || ""}</td>
        <td>IDrive</td>
        <td>${r[COLS.start]   || ""}</td>
        <td>${r[COLS.backedUp]|| 0}</td>
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
