// Page animations: fade-up reveal, count-up numbers, growing chart bars.
// Also holds the Inventory "Add Item" popup (second section, at the bottom).
// Loaded in <head>. The animations are skipped if the visitor prefers reduced motion.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Turns on the hidden start state in style.css (before the page is painted)
  document.documentElement.classList.add("js-anim");

  var REVEAL = ".welcome, .stat, .chart-card, .activity-card, .panel, .inv-table tbody tr";

  // Two frames so the hidden state is painted before the transition starts
  function nextFrame(fn) {
    requestAnimationFrame(function () { requestAnimationFrame(fn); });
  }

  // 1. Cards, panels and table rows fade up one after another
  function revealItems() {
    var items = document.querySelectorAll(REVEAL);
    nextFrame(function () {
      items.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i * 70, 700) + "ms";
        el.classList.add("in");
      });
    });
  }

  // 2. Chart bars grow from zero to their set height
  function growBars() {
    document.querySelectorAll(".bar").forEach(function (bar, i) {
      var target = bar.style.height;
      bar.style.height = "0%";
      bar.style.transitionDelay = 400 + i * 80 + "ms";
      nextFrame(function () { bar.style.height = target; });
    });
  }

  // 3. Stat numbers count up (works with a prefix like the peso sign)
  function countUp() {
    document.querySelectorAll(".stat strong").forEach(function (el, i) {
      var match = el.textContent.trim().match(/^(\D*)([\d,]+)(\D*)$/);
      if (!match) return;

      var prefix = match[1];
      var suffix = match[3];
      var target = parseInt(match[2].replace(/,/g, ""), 10);
      var duration = 1000;
      var start = null;

      el.textContent = prefix + "0" + suffix;

      function tick(now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(target * eased).toLocaleString("en-US") + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }

      setTimeout(function () { requestAnimationFrame(tick); }, 200 + i * 100);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    revealItems();
    growBars();
    countUp();
  });
})();

// ---------------------------------------------------------------
// Inventory page: "+ Add Item" popup (blurred background) and new rows.
// Waits for the page to load; does nothing on pages without the popup.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.getElementById("addItemModal");
  var form = document.getElementById("addItemForm");
  var openBtn = document.getElementById("openAddItem");
  var tbody = document.getElementById("inventoryBody");
  var modalTitle = document.getElementById("addItemTitle");
  var submitBtn = document.getElementById("itemSubmitBtn");
  if (!overlay || !form || !openBtn || !tbody) return;

  var lastFocused = null;
  var editingRow = null; // the <tr> being edited, or null while adding

  function setSelectByText(select, text) {
    var target = text.trim().toLowerCase();
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].textContent.trim().toLowerCase() === target) {
        select.selectedIndex = i;
        return;
      }
    }
  }

  function showModal() {
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.documentElement.classList.add("modal-open");
    setTimeout(function () { form.elements.code.focus(); }, 60);
  }

  function openModalToAdd() {
    editingRow = null;
    if (modalTitle) modalTitle.textContent = "Add New Item";
    if (submitBtn) submitBtn.textContent = "Save Item";
    form.reset();
    showModal();
  }

  function openModalToEdit(row) {
    editingRow = row;
    if (modalTitle) modalTitle.textContent = "Edit Item";
    if (submitBtn) submitBtn.textContent = "Save Changes";

    var cells = row.cells;
    form.elements.code.value = cells[0].textContent.trim();
    form.elements.name.value = cells[1].textContent.trim();
    setSelectByText(form.elements.category, cells[2].textContent.trim());
    setSelectByText(form.elements.size, cells[3].textContent.trim());
    form.elements.color.value = cells[4].textContent.trim();
    form.elements.price.value = cells[5].textContent.replace(/[^\d.]/g, "");
    setSelectByText(form.elements.status, cells[6].textContent.trim());

    showModal();
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.documentElement.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  }

  openBtn.addEventListener("click", openModalToAdd);

  // Edit buttons open this same popup, pre-filled with that row's values.
  // Delegated on the table body, so rows added later are covered too.
  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-edit");
    if (btn) openModalToEdit(btn.closest("tr"));
  });

  // Cancel button
  overlay.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", closeModal);
  });

  // Click on the blurred background
  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) closeModal();
  });

  // Escape closes, Tab stays inside the modal
  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key !== "Tab") return;

    var focusable = overlay.querySelectorAll("input, select, button");
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  function cell(text, className) {
    var td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text;
    return td;
  }

  function buildActionsCell() {
    var actionsCell = document.createElement("td");
    var actions = document.createElement("div");
    actions.className = "actions";
    ["Edit", "Delete"].forEach(function (label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-sm" + (label === "Delete" ? " btn-danger" : " btn-edit");
      btn.textContent = label;
      actions.appendChild(btn);
    });
    actionsCell.appendChild(actions);
    return actionsCell;
  }

  function buildStatusCell(status) {
    var td = document.createElement("td");
    var badge = document.createElement("span");
    badge.className = "badge " + status.toLowerCase();
    badge.textContent = status.toUpperCase();
    td.appendChild(badge);
    return td;
  }

  function fillStatusCell(td, status) {
    td.textContent = "";
    var badge = document.createElement("span");
    badge.className = "badge " + status.toLowerCase();
    badge.textContent = status.toUpperCase();
    td.appendChild(badge);
  }

  // Save Item: update the row being edited, or add a new one
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var status = data.get("status");
    var values = [
      { text: data.get("code").trim().toUpperCase(), cls: "code" },
      { text: data.get("name").trim(), cls: "item" },
      { text: data.get("category"), cls: "" },
      { text: data.get("size"), cls: "" },
      { text: data.get("color").trim(), cls: "" },
      { text: "\u20B1" + Number(data.get("price")).toLocaleString("en-US"), cls: "price" }
    ];

    if (editingRow) {
      values.forEach(function (v, i) {
        editingRow.cells[i].textContent = v.text;
        editingRow.cells[i].className = v.cls;
      });
      fillStatusCell(editingRow.cells[6], status);
      closeModal();
      return;
    }

    var row = document.createElement("tr");
    values.forEach(function (v) { row.appendChild(cell(v.text, v.cls)); });
    row.appendChild(buildStatusCell(status));
    row.appendChild(buildActionsCell());

    tbody.appendChild(row);
    // Let the row fade in like the others (see animations.js / style.css)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { row.classList.add("in"); });
    });

    closeModal();
  });
});

// ---------------------------------------------------------------
// Customers page: "+ New Customer" popup (blurred background) and new rows.
// Waits for the page to load; does nothing on pages without the popup.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.getElementById("addCustomerModal");
  var form = document.getElementById("addCustomerForm");
  var openBtn = document.getElementById("openAddCustomer");
  var tbody = document.getElementById("customersBody");
  var modalTitle = document.getElementById("addCustomerTitle");
  var submitBtn = document.getElementById("customerSubmitBtn");
  if (!overlay || !form || !openBtn || !tbody) return;

  var lastFocused = null;
  var editingRow = null; // the <tr> being edited, or null while adding

  function showModal() {
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.documentElement.classList.add("modal-open");
    setTimeout(function () { form.elements.name.focus(); }, 60);
  }

  function openModalToAdd() {
    editingRow = null;
    if (modalTitle) modalTitle.textContent = "Add Customer";
    if (submitBtn) submitBtn.textContent = "Save Customer";
    form.reset();
    showModal();
  }

  function openModalToEdit(row) {
    editingRow = row;
    if (modalTitle) modalTitle.textContent = "Edit Customer";
    if (submitBtn) submitBtn.textContent = "Save Changes";

    var cells = row.cells;
    form.elements.name.value = cells[0].textContent.trim();
    form.elements.contact.value = cells[1].textContent.trim();
    form.elements.email.value = cells[2].textContent.trim();
    form.elements.location.value = cells[3].textContent.trim();

    showModal();
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.documentElement.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  }

  openBtn.addEventListener("click", openModalToAdd);

  // Edit buttons open this same popup, pre-filled with that row's values.
  // Delegated on the table body, so rows added later are covered too.
  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-edit");
    if (btn) openModalToEdit(btn.closest("tr"));
  });

  overlay.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", closeModal);
  });

  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key !== "Tab") return;

    var focusable = overlay.querySelectorAll("input, select, button");
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  function cell(text, className) {
    var td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text;
    return td;
  }

  // Save Customer: update the row being edited (name/contact/email/location
  // only — Rentals, Total Spent and Last Rental aren't part of this form),
  // or add a brand-new row.
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);

    if (editingRow) {
      editingRow.cells[0].textContent = data.get("name").trim();
      editingRow.cells[1].textContent = data.get("contact").trim();
      editingRow.cells[2].textContent = data.get("email").trim();
      editingRow.cells[3].textContent = data.get("location").trim();
      closeModal();
      return;
    }

    var row = document.createElement("tr");
    row.appendChild(cell(data.get("name").trim(), "item"));
    row.appendChild(cell(data.get("contact").trim()));
    row.appendChild(cell(data.get("email").trim()));
    row.appendChild(cell(data.get("location").trim()));
    row.appendChild(cell("0"));
    row.appendChild(cell("\u20B10", "price"));
    row.appendChild(cell("\u2014"));

    var actionsCell = document.createElement("td");
    var actions = document.createElement("div");
    actions.className = "actions";
    ["Edit", "Delete"].forEach(function (label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-sm" + (label === "Delete" ? " btn-danger" : " btn-edit");
      btn.textContent = label;
      actions.appendChild(btn);
    });
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { row.classList.add("in"); });
    });

    closeModal();
  });
});

// ---------------------------------------------------------------
// Rentals page: "+ New Rental" popup (blurred background) and new rows.
// Waits for the page to load; does nothing on pages without the popup.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.getElementById("newRentalModal");
  var form = document.getElementById("newRentalForm");
  var openBtn = document.getElementById("openNewRental");
  var tbody = document.getElementById("rentalsBody");
  if (!overlay || !form || !openBtn || !tbody) return;

  var itemSelect = form.elements.itemChoice;
  var totalInput = form.elements.total;
  var lastFocused = null;
  var nextIdNumber = 914; // one past the highest sample rental id, SD-2026-0913

  function syncTotalToItem() {
    var opt = itemSelect.options[itemSelect.selectedIndex];
    totalInput.value = opt ? opt.dataset.price : "";
  }

  function openModal() {
    lastFocused = document.activeElement;
    form.reset();
    syncTotalToItem();
    overlay.classList.add("open");
    document.documentElement.classList.add("modal-open");
    setTimeout(function () { form.elements.customer.focus(); }, 60);
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.documentElement.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  }

  openBtn.addEventListener("click", openModal);
  itemSelect.addEventListener("change", syncTotalToItem);

  overlay.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", closeModal);
  });

  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (!overlay.classList.contains("open")) return;
    if (e.key === "Escape") { closeModal(); return; }
    if (e.key !== "Tab") return;

    var focusable = overlay.querySelectorAll("input, select, button");
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  function cell(text, className) {
    var td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text;
    return td;
  }

  function badgeCell(text, className) {
    var td = document.createElement("td");
    var span = document.createElement("span");
    span.className = "badge " + className;
    span.textContent = text.toUpperCase();
    td.appendChild(span);
    return td;
  }

  // Create Rental: add a new row to the table
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var itemName = itemSelect.options[itemSelect.selectedIndex].textContent.split(" - ")[0];
    var payment = data.get("payment");
    var rentalId = "SD-2026-" + String(nextIdNumber++).padStart(4, "0");

    var row = document.createElement("tr");
    row.appendChild(cell(rentalId, "code"));
    row.appendChild(cell(data.get("customer"), "item"));
    row.appendChild(cell(itemName));
    row.appendChild(cell(data.get("pickup")));
    row.appendChild(cell(data.get("return")));
    row.appendChild(cell("\u20B1" + Number(data.get("total")).toLocaleString("en-US"), "price"));
    row.appendChild(badgeCell(payment, payment.toLowerCase()));
    row.appendChild(badgeCell("Active", "active"));

    var actionsCell = document.createElement("td");
    var actions = document.createElement("div");
    actions.className = "actions";
    var returnBtn = document.createElement("button");
    returnBtn.type = "button";
    returnBtn.className = "btn-sm btn-return";
    returnBtn.textContent = "Return";
    actions.appendChild(returnBtn);
    var deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-sm btn-danger";
    deleteBtn.textContent = "Delete";
    actions.appendChild(deleteBtn);
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { row.classList.add("in"); });
    });

    closeModal();
  });
});

// ---------------------------------------------------------------
// Search boxes and dropdown filters (Inventory, Rentals, Customers,
// Locations): hides table rows that don't match, live as you type or
// pick an option. Works for rows added later too (Add Item, Add
// Customer, Create Rental), since it reads the table each time it runs.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  // One reusable filter for a search box plus optional dropdowns.
  // getRowText(row) returns the text a row is searched on.
  // filters: [{ select, getRowValue(row) }] — a row must match every
  // dropdown whose first option ("All ...") isn't the one selected.
  function setupTableFilter(tbody, searchInput, filters, getRowText, colspan) {
    if (!tbody) return;

    var noResults = document.createElement("tr");
    noResults.className = "no-results-row";
    var noResultsCell = document.createElement("td");
    noResultsCell.colSpan = colspan;
    noResultsCell.className = "no-results";
    noResultsCell.textContent = "No matching results.";
    noResults.appendChild(noResultsCell);
    noResults.style.display = "none";
    tbody.appendChild(noResults);

    function apply() {
      var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var visibleCount = 0;

      Array.prototype.forEach.call(tbody.rows, function (row) {
        if (row === noResults) return;

        var matchesSearch = !query || getRowText(row).toLowerCase().indexOf(query) !== -1;
        var matchesFilters = filters.every(function (f) {
          if (f.select.selectedIndex === 0) return true; // "All ..." option
          return f.getRowValue(row).toLowerCase() === f.select.value.toLowerCase();
        });

        var visible = matchesSearch && matchesFilters;
        row.style.display = visible ? "" : "none";
        if (visible) visibleCount++;
      });

      noResults.style.display = visibleCount === 0 ? "" : "none";
    }

    if (searchInput) searchInput.addEventListener("input", apply);
    filters.forEach(function (f) { f.select.addEventListener("change", apply); });

    // Re-check whenever a row is added or removed elsewhere on the page
    new MutationObserver(apply).observe(tbody, { childList: true });

    apply();
  }

  function textOf(row, index) {
    return row.cells[index] ? row.cells[index].textContent : "";
  }

  // Inventory: search by code/item/color, filter by category and status
  setupTableFilter(
    document.getElementById("inventoryBody"),
    document.getElementById("inventorySearch"),
    (function () {
      var filters = [];
      var categorySelect = document.getElementById("inventoryCategory");
      var statusSelect = document.getElementById("inventoryStatus");
      if (categorySelect) filters.push({ select: categorySelect, getRowValue: function (row) { return textOf(row, 2); } });
      if (statusSelect) filters.push({ select: statusSelect, getRowValue: function (row) { return textOf(row, 6); } });
      return filters;
    })(),
    function (row) { return textOf(row, 0) + " " + textOf(row, 1) + " " + textOf(row, 4); },
    8
  );

  // Rentals: search by rental id/customer/item, filter by status
  setupTableFilter(
    document.getElementById("rentalsBody"),
    document.getElementById("rentalsSearch"),
    (function () {
      var statusSelect = document.getElementById("rentalsStatus");
      return statusSelect ? [{ select: statusSelect, getRowValue: function (row) { return textOf(row, 7); } }] : [];
    })(),
    function (row) { return textOf(row, 0) + " " + textOf(row, 1) + " " + textOf(row, 2); },
    9
  );

  // Customers: search by name/contact/email/location, no dropdown
  setupTableFilter(
    document.getElementById("customersBody"),
    document.getElementById("customersSearch"),
    [],
    function (row) { return textOf(row, 0) + " " + textOf(row, 1) + " " + textOf(row, 2) + " " + textOf(row, 3); },
    8
  );

  // Locations: search by customer/address, no dropdown
  setupTableFilter(
    document.getElementById("locationsBody"),
    document.getElementById("locationsSearch"),
    [],
    function (row) { return textOf(row, 0) + " " + textOf(row, 1); },
    3
  );
});

// ---------------------------------------------------------------
// Delete buttons (Inventory, Rentals, Customers): the row slides and
// fades out, then the gap closes smoothly before the row is removed.
// Works for rows added later too, and removes instantly if the visitor
// prefers reduced motion. Deleting is not saved, a refresh brings rows back.
// ---------------------------------------------------------------
(function () {
  var FADE_MS = 280;
  var COLLAPSE_MS = 260;

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-sm.btn-danger");
    if (!btn) return;

    var row = btn.closest("tr");
    if (!row || row.classList.contains("removing")) return;
    row.classList.add("removing");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      row.remove();
      return;
    }

    // 1. Slide and fade out
    row.classList.add("row-out");

    // 2. Close the gap
    setTimeout(function () { collapseRow(row); }, FADE_MS);

    // 3. Remove from the page
    setTimeout(function () { row.remove(); }, FADE_MS + COLLAPSE_MS + 40);
  });

  // Table cells can't shrink on their own, so the content of each cell
  // is wrapped in a box whose height animates down to 0.
  function collapseRow(row) {
    var boxes = [];
    Array.prototype.forEach.call(row.cells, function (td) {
      var box = document.createElement("div");
      box.className = "cell-collapse";
      while (td.firstChild) box.appendChild(td.firstChild);
      td.appendChild(box);
      box.style.height = box.offsetHeight + "px";
      boxes.push(box);
    });

    void row.offsetHeight; // apply the fixed heights before animating
    row.classList.add("row-collapse");
    boxes.forEach(function (box) { box.style.height = "0px"; });
  }
})();