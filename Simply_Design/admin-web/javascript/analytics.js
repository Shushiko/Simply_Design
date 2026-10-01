// Analytics page charts (Chart.js v3/v4 syntax)
// Runs on window "load" so it works even though chart.min.js is loaded after this file.

window.addEventListener('load', function () {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js did not load. Check the path to chart.min.js.');
    return;
  }

  // ---------- Today's date in the top bar ----------
  var topDate = document.getElementById('topDate');
  if (topDate) {
    topDate.textContent = new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // ---------- Revenue Overview: January to December ----------
  var months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // One value per month, January to December.
  // Jan-Apr and Oct-Dec come from your current chart; May-Sep are 0 placeholders. Replace with real numbers.
  var revenue = [1700, 3000, 2600, 2100, 0, 0, 0, 0, 0, 700, 900, 1300];

  // Grey highlight band behind the hovered month
  var hoverBand = {
    id: 'hoverBand',
    beforeDatasetsDraw: function (chart) {
      var active = chart.tooltip && chart.tooltip.getActiveElements ? chart.tooltip.getActiveElements() : [];
      if (!active.length) return;
      var ctx = chart.ctx;
      var area = chart.chartArea;
      var x = active[0].element.x;
      var step = chart.scales.x.width / months.length;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
      ctx.fillRect(x - step / 2, area.top, step, area.bottom - area.top);
      ctx.restore();
    }
  };

  var revenueCanvas = document.getElementById('revenueChart');
  if (revenueCanvas && !Chart.getChart(revenueCanvas)) {
    new Chart(revenueCanvas, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue',
          data: revenue,
          backgroundColor: '#d99a1e',
          hoverBackgroundColor: '#e09400',
          borderRadius: 4,
          maxBarThickness: 46
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#111111',
            bodyColor: '#1a5fd0',
            borderColor: '#dddddd',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              title: function (items) { return shortMonths[items[0].dataIndex]; },
              label: function (item) { return 'Revenue : ' + item.parsed.y.toLocaleString('en-US'); }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 12 }, color: '#666', maxRotation: 0, autoSkip: false }
          },
          y: {
            beginAtZero: true,
            max: 3400,
            ticks: {
              stepSize: 850,
              color: '#666',
              callback: function (v) { return v.toLocaleString('en-US'); }
            },
            grid: { color: '#ececec' }
          }
        }
      },
      plugins: [hoverBand]
    });
  }

  // ---------- Popular Categories donut ----------
  var donutCanvas = document.getElementById('categoriesChart');
  if (donutCanvas && !Chart.getChart(donutCanvas)) {
    new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Long Gown Dress', 'Men suit', 'Cocktail Dress'],
        datasets: [{
          data: [70, 20, 10],
          backgroundColor: ['#5b3b22', '#c9a47c', '#e8b73c'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (item) { return item.label + ': ' + item.parsed + '%'; }
            }
          }
        }
      }
    });
  }
});