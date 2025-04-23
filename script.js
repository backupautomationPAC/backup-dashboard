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

  /* [Rest of your existing functions remain exactly the same] */
  /* Include all other functions exactly as you had them: */
  /* buildDeviceOptions, applyFilters, sortViewRows, parseDate, */
  /* renderCards, renderTable, bindHeaderClicks */

  // Start the application
  init();
});
