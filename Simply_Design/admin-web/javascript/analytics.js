// Analytics page charts (Chart.js, loaded via CDN in the <head>).
// Only runs here, since no other page has these canvases.
document.addEventListener("DOMContentLoaded", function () {
  if (typeof Chart === "undefined") return;

  var revenueCanvas = document.getElementById("revenueChart");
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  var axisColor = isDark ? "#9a9586" : "#777";
  var gridColor = isDark ? "#332f23" : "#eee";
  var tooltipBg = isDark ? "#262318" : "#ffffff";
  var tooltipTitleColor = isDark ? "#f1f1f1" : "#1a1a1a";
  var tooltipBorderColor = isDark ? "#433e2e" : "#e4d6c4";

  // ----- Revenue Overview (bar chart) -----
  if (revenueCanvas) {
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Jan-Dec. May-Sep are placeholder values: replace with your real monthly revenue.
    var revenue = [1700, 3000, 2600, 2100, 1800, 1500, 1200, 1000, 800, 700, 900, 1275];

    // Draws a soft gray band behind the column currently being hovered,
    // the full height of the chart — like a column highlight, not just the bar.
    var columnHighlight = {
      id: "columnHighlight",
      beforeDatasetsDraw: function (chart) {
        var active = chart.getActiveElements();
        if (!active.length) return;

        var index = active[0].index;
        var xScale = chart.scales.x;
        var area = chart.chartArea;
        var centerX = xScale.getPixelForValue(index);
        var half = (xScale.width / xScale.ticks.length) / 2;

        var ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(20, 12, 4, 0.07)";
        ctx.fillRect(centerX - half, area.top, half * 2, area.bottom - area.top);
        ctx.restore();
      },
    };

    new Chart(revenueCanvas, {
      type: "bar",
      data: {
        labels: months,
        datasets: [{
          data: revenue,
          backgroundColor: "#d99a1e",
          borderRadius: 4,
          maxBarThickness: 46,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: axisColor,
              font: { size: 12 },
              autoSkip: false,
              maxRotation: 0,
              // Full month names on wide charts, short ones when space is tight
              callback: function (value) {
                return this.chart.width < 720 ? shortMonths[value] : months[value];
              },
            },
          },
          y: {
            beginAtZero: true,
            min: 0,
            max: 3400,
            ticks: { stepSize: 850, color: axisColor, font: { size: 12 } },
            grid: { color: gridColor },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            displayColors: false,
            backgroundColor: tooltipBg,
            titleColor: tooltipTitleColor,
            titleFont: { weight: "700", size: 13 },
            bodyColor: "#2f6fed",
            bodyFont: { size: 12 },
            borderColor: tooltipBorderColor,
            borderWidth: 1,
            padding: 10,
            caretSize: 6,
            callbacks: {
              title: function (items) { return shortMonths[items[0].dataIndex]; },
              label: function (item) { return "Revenue : " + item.formattedValue; },
            },
          },
        },
      },
      plugins: [columnHighlight],
    });
  }
});

// ---------------------------------------------------------------
// Rental Activity History: search + status filter, same pattern as
// the tables on the other pages.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var tbody = document.getElementById("rentalHistoryBody");
  var searchInput = document.getElementById("rentalHistorySearch");
  var statusSelect = document.getElementById("rentalHistoryStatus");
  if (!tbody) return;

  var noResults = document.createElement("tr");
  noResults.className = "no-results-row";
  var noResultsCell = document.createElement("td");
  noResultsCell.colSpan = 7;
  noResultsCell.className = "no-results";
  noResultsCell.textContent = "No matching results.";
  noResults.appendChild(noResultsCell);
  noResults.style.display = "none";
  tbody.appendChild(noResults);

  function apply() {
    var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var statusFilter = statusSelect && statusSelect.selectedIndex > 0 ? statusSelect.value.toLowerCase() : "";
    var visibleCount = 0;

    Array.prototype.forEach.call(tbody.rows, function (row) {
      if (row === noResults) return;

      var text = (row.cells[0].textContent + " " + row.cells[1].textContent).toLowerCase();
      var status = row.cells[6].textContent.trim().toLowerCase();
      var matchesSearch = !query || text.indexOf(query) !== -1;
      var matchesStatus = !statusFilter || status === statusFilter;

      var visible = matchesSearch && matchesStatus;
      row.style.display = visible ? "" : "none";
      if (visible) visibleCount++;
    });

    noResults.style.display = visibleCount === 0 ? "" : "none";
  }

  if (searchInput) searchInput.addEventListener("input", apply);
  if (statusSelect) statusSelect.addEventListener("change", apply);
  apply();
});

// ---------------------------------------------------------------
// Print and Download Report buttons.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var printBtn = document.getElementById("printReportBtn");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  var downloadBtn = document.getElementById("downloadReportBtn");
  var table = document.getElementById("rentalHistoryTable");
  if (downloadBtn && table) {
    downloadBtn.addEventListener("click", function () {
      var rows = [["Customer Name", "Item", "Category", "Rent Date", "Due Date", "Amount", "Status"]];
      Array.prototype.forEach.call(table.tBodies[0].rows, function (row) {
        if (row.classList.contains("no-results-row") || row.style.display === "none") return;
        var cells = Array.prototype.map.call(row.cells, function (td) { return td.textContent.trim(); });
        rows.push(cells);
      });

      var csv = rows.map(function (r) {
        return r.map(function (cell) { return '"' + cell.replace(/"/g, '""') + '"'; }).join(",");
      }).join("\r\n");

      var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "rental-activity-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }
});