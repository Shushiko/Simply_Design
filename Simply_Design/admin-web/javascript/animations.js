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
// Top-bar date: shows today's real date instead of a fixed one.
// Runs on every page, even with reduced motion, since it isn't an
// animation. Re-checks a little after midnight in case the page is
// left open overnight.
// ---------------------------------------------------------------
(function () {
  function showToday() {
    var el = document.getElementById("topDate");
    if (!el) return;
    el.textContent = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function scheduleMidnightRefresh() {
    var now = new Date();
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    var timer = setTimeout(function () {
      showToday();
      scheduleMidnightRefresh();
    }, midnight - now);
    // Node-style timers expose unref(); browsers don't, and don't need it.
    if (timer && typeof timer.unref === "function") timer.unref();
  }

  document.addEventListener("DOMContentLoaded", function () {
    showToday();
    scheduleMidnightRefresh();
  });
})();

// ---------------------------------------------------------------
// Photo lightbox: click a photo to see it full-size, with a dimmed
// background. Works for table thumbnails anywhere on the page, and
// for the modal's own photo preview (wired up where that popup is
// set up, further down). Images added later are covered too, since
// the click is delegated on the document.
// ---------------------------------------------------------------
(function () {
  var overlay, img, prevBtn, nextBtn, counter;
  var list = []; // the photos being browsed
  var idx = 0;

  function makeNav(cls, label, symbol, dir) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "lightbox-nav " + cls;
    b.setAttribute("aria-label", label);
    b.innerHTML = symbol;
    b.addEventListener("click", function () { step(dir); });
    return b;
  }

  function build() {
    overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Photo preview");

    img = document.createElement("img");
    img.className = "lightbox-img";
    img.alt = "";
    overlay.appendChild(img);

    prevBtn = makeNav("prev", "Previous photo", "&#10094;", -1);
    nextBtn = makeNav("next", "Next photo", "&#10095;", 1);
    counter = document.createElement("span");
    counter.className = "lightbox-count";
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(counter);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    overlay.appendChild(closeBtn);

    closeBtn.addEventListener("click", closeLightbox);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) closeLightbox();
    });

    document.body.appendChild(overlay);
  }

  function show() {
    img.src = list[idx];
    var multi = list.length > 1;
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
    counter.hidden = !multi;
    counter.textContent = (idx + 1) + " / " + list.length;
  }

  function step(dir) {
    if (list.length < 2) return;
    idx = (idx + dir + list.length) % list.length;
    show();
  }

  // src = the photo to show; photos (optional) = all photos of that item, so
  // the arrows can browse through them
  function openLightbox(src, photos) {
    if (!src) return;
    if (!overlay) build();
    list = photos && photos.length > 1 ? photos : [src];
    idx = Math.max(0, list.indexOf(src));
    show();
    overlay.classList.add("open");
    document.documentElement.classList.add("lightbox-open");
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.documentElement.classList.remove("lightbox-open");
  }

  document.addEventListener("keydown", function (e) {
    if (!overlay || !overlay.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  // Any table thumbnail photo opens the lightbox when clicked
  document.addEventListener("click", function (e) {
    var thumbImg = e.target.closest(".thumb img");
    if (!thumbImg) return;
    var all = [];
    var row = thumbImg.closest("tr");
    if (row && row.dataset.photos) {
      try { all = JSON.parse(row.dataset.photos) || []; } catch (err) { all = []; }
    }
    openLightbox(thumbImg.src, all);
  });

  // Made available to the Inventory popup code further down
  window.openPhotoLightbox = openLightbox;
})();
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

  // ----- Item photo (left side of the popup) -----
  var MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
  var photoInput = document.getElementById("itemPhoto");
  var photoPreview = document.getElementById("itemPhotoPreview");
  var photoImg = document.getElementById("itemPhotoImg");
  var photoBtn = document.getElementById("itemPhotoBtn");
  var photoBtnText = document.getElementById("itemPhotoBtnText");
  var photoRemove = document.getElementById("itemPhotoRemove");
  var photoError = document.getElementById("itemPhotoError");
  var MAX_PHOTOS = 5;
  var photos = [];      // data URLs; the first one is the cover shown in the table
  var activeIdx = 0;    // which photo the big preview is showing
  var photoThumbs = document.getElementById("itemPhotoThumbs");
  var photoCount = document.getElementById("itemPhotoCount");

  function showPhotoError(message) {
    if (!photoError) return;
    photoError.textContent = message || "";
    photoError.hidden = !message;
  }

  // Small side strip: one slot per possible photo (filled, "+" for the next one, or empty)
  function renderThumbs() {
    if (!photoThumbs) return;
    photoThumbs.textContent = "";
    for (var i = 0; i < MAX_PHOTOS; i++) {
      var slot = document.createElement("button");
      slot.type = "button";
      if (i < photos.length) {
        slot.className = "thumb-slot filled" + (i === activeIdx ? " active" : "");
        slot.setAttribute("aria-label", "Show photo " + (i + 1) + (i === 0 ? " (cover photo)" : ""));
        if (i === 0) slot.title = "Cover photo (shown in the table)";
        var pic = document.createElement("img");
        pic.src = photos[i];
        pic.alt = "";
        slot.appendChild(pic);
        if (i === 0) {
          var star = document.createElement("span");
          star.className = "cover-star";
          star.innerHTML = '<i class="fa-solid fa-star" aria-hidden="true"></i>';
          slot.appendChild(star);
        }
        slot.addEventListener("click", (function (n) {
          return function () {
            activeIdx = n;
            renderPhotos();
            if (photoThumbs.children[n]) photoThumbs.children[n].focus();
          };
        })(i));
      } else if (i === photos.length) {
        slot.className = "thumb-slot add";
        slot.setAttribute("aria-label", "Add a photo");
        slot.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
        slot.addEventListener("click", function () { if (photoInput) photoInput.click(); });
      } else {
        slot.className = "thumb-slot empty";
        slot.disabled = true;
        slot.tabIndex = -1;
        slot.setAttribute("aria-hidden", "true");
      }
      photoThumbs.appendChild(slot);
    }
  }

  function renderPhotos() {
    if (activeIdx >= photos.length) activeIdx = Math.max(0, photos.length - 1);
    var has = photos.length > 0;
    var full = photos.length >= MAX_PHOTOS;
    if (photoImg) {
      if (has) photoImg.src = photos[activeIdx];
      else photoImg.removeAttribute("src");
    }
    if (photoPreview) photoPreview.classList.toggle("has-photo", has);
    if (photoRemove) photoRemove.hidden = !has;
    if (photoCount) photoCount.textContent = photos.length + "/" + MAX_PHOTOS;
    if (photoBtn) photoBtn.disabled = full;
    if (photoBtnText) photoBtnText.textContent = full ? "Maximum 5 photos" : (has ? "Add Photo" : "Upload Photo");
    renderThumbs();
  }

  function setPhotos(list) {
    photos = (list || []).filter(Boolean).slice(0, MAX_PHOTOS);
    activeIdx = 0;
    showPhotoError("");
    renderPhotos();
  }

  // A table row keeps its photos in data-photos (all of them) and data-photo (the cover)
  function getRowPhotos(row) {
    if (row.dataset.photos) {
      try {
        var arr = JSON.parse(row.dataset.photos);
        if (Array.isArray(arr)) return arr;
      } catch (err) { /* fall through */ }
    }
    return row.dataset.photo ? [row.dataset.photo] : [];
  }

  function saveRowPhotos(row) {
    if (photos.length) {
      row.dataset.photo = photos[0];
      row.dataset.photos = JSON.stringify(photos);
    } else {
      delete row.dataset.photo;
      delete row.dataset.photos;
    }
  }

  if (photoInput) {
    if (photoBtn) photoBtn.addEventListener("click", function () { photoInput.click(); });
    if (photoPreview) photoPreview.addEventListener("click", function () {
      if (photoPreview.classList.contains("has-photo")) window.openPhotoLightbox(photoImg.src, photos);
      else photoInput.click();
    });
    if (photoRemove) photoRemove.addEventListener("click", function () {
      photos.splice(activeIdx, 1);
      showPhotoError("");
      renderPhotos();
    });

    photoInput.addEventListener("change", function () {
      var files = Array.prototype.slice.call(photoInput.files || []);
      photoInput.value = ""; // so picking the same file again still fires "change"
      if (!files.length) return;

      var room = MAX_PHOTOS - photos.length;
      if (room <= 0) { showPhotoError("You can add up to " + MAX_PHOTOS + " photos."); return; }

      var message = "";
      var accepted = [];
      files.forEach(function (file) {
        if (file.type.indexOf("image/") !== 0) {
          message = "Please choose image files only (JPG, PNG, WEBP...).";
        } else if (file.size > MAX_PHOTO_BYTES) {
          message = "A photo over 5 MB was skipped. Please choose smaller ones.";
        } else {
          accepted.push(file);
        }
      });
      if (accepted.length > room) {
        accepted = accepted.slice(0, room);
        message = "You can add up to " + MAX_PHOTOS + " photos, so only the first " + room + " were added.";
      }
      showPhotoError(message);
      if (!accepted.length) return;

      var results = new Array(accepted.length);
      var pending = accepted.length;
      function done() {
        pending--;
        if (pending) return;
        var added = results.filter(Boolean);
        if (!added.length) return;
        photos = photos.concat(added).slice(0, MAX_PHOTOS);
        activeIdx = Math.max(0, photos.length - added.length); // show the first photo just added
        renderPhotos();
      }
      accepted.forEach(function (file, i) {
        var reader = new FileReader();
        reader.onload = function () { results[i] = reader.result; done(); };
        reader.onerror = function () { showPhotoError("Couldn't read one of the files. Please try again."); done(); };
        reader.readAsDataURL(file);
      });
    });
  }

  // Item cell = small photo (or a placeholder) + the item name
  function renderItemCell(td, name, photo) {
    td.textContent = "";
    var wrap = document.createElement("span");
    wrap.className = "item-cell";

    var thumb = document.createElement("span");
    thumb.className = "thumb";
    if (photo) {
      var img = document.createElement("img");
      img.src = photo;
      img.alt = "";
      thumb.appendChild(img);
    } else {
      var icon = document.createElement("i");
      icon.className = "fa-regular fa-image";
      icon.setAttribute("aria-hidden", "true");
      thumb.appendChild(icon);
    }

    var label = document.createElement("span");
    label.textContent = name;
    wrap.appendChild(thumb);
    wrap.appendChild(label);
    td.appendChild(wrap);
  }

  // Give the rows that are already on the page their photo/placeholder too
  Array.prototype.forEach.call(tbody.rows, function (row) {
    if (row.cells[1]) renderItemCell(row.cells[1], row.cells[1].textContent.trim(), row.dataset.photo || "");
  });

  function setSelectByText(select, text) {
    if (!select || !select.options) return;
    var target = text.trim().toLowerCase();
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].textContent.trim().toLowerCase() === target) {
        select.selectedIndex = i;
        return;
      }
    }
  }

  // Status can only be changed when editing; a new item is always Available.
  var statusField = document.getElementById("statusField");
  var statusNote = document.getElementById("autoStatusNote");
  function setStatusMode(isEdit) {
    if (statusField) statusField.hidden = !isEdit;
    if (statusNote) statusNote.hidden = isEdit;
  }

  // ----- Item code: generated automatically, can't be typed in, never repeats -----
  // Format: category initials + first 4 letters of the color + a 4-digit running number
  // (Long Gown + Blue -> LGBLUE0001, then LGBLUE0002, ...).
  var codeInput = form.elements.code;
  var colorInput = form.elements.color;
  var issuedCodes = {}; // every code seen or handed out on this page, so a deleted code is never reused

  function rowCode(row) {
    return row.cells[0] ? row.cells[0].textContent.trim().toUpperCase() : "";
  }

  Array.prototype.forEach.call(tbody.rows, function (row) {
    var code = rowCode(row);
    if (code) issuedCodes[code] = true;
  });

  function codeExists(code) {
    if (issuedCodes[code]) return true;
    return Array.prototype.some.call(tbody.rows, function (row) { return rowCode(row) === code; });
  }

  function generateCode() {
    var colorPart = colorInput.value.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase();
    if (!colorPart) return ""; // can't build a code until there is a color
    var categoryPart = form.elements.category.value.trim().split(/\s+/).map(function (w) {
      return w.charAt(0);
    }).join("").toUpperCase();
    var prefix = categoryPart + colorPart;

    // Highest number already used with this prefix (in the table or issued earlier)
    var pattern = new RegExp("^" + prefix + "(\\d+)$");
    var highest = 0;
    function check(code) {
      var m = pattern.exec(code);
      if (m) highest = Math.max(highest, parseInt(m[1], 10));
    }
    Array.prototype.forEach.call(tbody.rows, function (row) { check(rowCode(row)); });
    Object.keys(issuedCodes).forEach(check);

    // Safety net: keep counting up until the code is really unused
    var next = highest + 1;
    var code;
    do {
      code = prefix + String(next++).padStart(4, "0");
    } while (codeExists(code));
    return code;
  }

  // While adding, the code follows the Category and Color. An existing item keeps its code.
  function updateCode() {
    if (editingRow) return;
    codeInput.value = generateCode();
  }

  form.elements.category.addEventListener("change", updateCode);
  colorInput.addEventListener("input", function () {
    colorInput.setCustomValidity("");
    updateCode();
  });

  function showModal() {
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.documentElement.classList.add("modal-open");
    setTimeout(function () { form.elements.name.focus(); }, 60);
  }

  function openModalToAdd() {
    editingRow = null;
    if (modalTitle) modalTitle.textContent = "Add New Item";
    if (submitBtn) submitBtn.textContent = "Save Item";
    form.reset();
    colorInput.setCustomValidity("");
    updateCode();
    setPhotos([]);
    setStatusMode(false);
    showModal();
  }

  function openModalToEdit(row) {
    editingRow = row;
    if (modalTitle) modalTitle.textContent = "Edit Item";
    if (submitBtn) submitBtn.textContent = "Save Changes";
    setStatusMode(true);

    var cells = row.cells;
    form.elements.code.value = cells[0].textContent.trim();
    form.elements.name.value = cells[1].textContent.trim();
    setSelectByText(form.elements.category, cells[2].textContent.trim());
    setSelectByText(form.elements.size, cells[3].textContent.trim());
    form.elements.color.value = cells[4].textContent.trim();
    form.elements.price.value = cells[5].textContent.replace(/[^\d.]/g, "");
    setSelectByText(form.elements.status, cells[6].textContent.trim());
    setPhotos(getRowPhotos(row));

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
    if (btn) { openModalToEdit(btn.closest("tr")); return; }

    // Clicking anywhere else on an item row also opens the edit popup.
    // Ignore the Delete button and the photo thumbnail (it opens the lightbox).
    if (e.target.closest(".btn-sm, .thumb img, a, input, select")) return;
    var row = e.target.closest("tr");
    if (!row || row.classList.contains("removing") || row.classList.contains("no-results-row")) return;
    if (!row.querySelector(".btn-edit")) return;
    openModalToEdit(row);
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

    var focusable = Array.prototype.filter.call(
      overlay.querySelectorAll("input, select, button"),
      function (el) { return !el.hidden && el.offsetParent !== null; }
    );
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
    // New items are always Available; only an edit can change the status
    var status = editingRow ? (data.get("status") || "Available") : "Available";

    // The code can't be edited: an existing item keeps its own, a new one gets a fresh unique code
    var code = editingRow ? rowCode(editingRow) : generateCode();
    if (!code) {
      colorInput.setCustomValidity("Please enter a color name (letters) so the item code can be generated.");
      colorInput.reportValidity();
      return;
    }
    issuedCodes[code] = true;

    var values = [
      { text: code, cls: "code" },
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
      renderItemCell(editingRow.cells[1], values[1].text, photos[0] || "");
      saveRowPhotos(editingRow);
      fillStatusCell(editingRow.cells[6], status);
      closeModal();
      return;
    }

    var row = document.createElement("tr");
    values.forEach(function (v) { row.appendChild(cell(v.text, v.cls)); });
    renderItemCell(row.cells[1], values[1].text, photos[0] || "");
    saveRowPhotos(row);
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

  // The Edit button, or a click anywhere else on a customer row, opens this same
  // popup pre-filled with that row's values. The Delete button keeps doing its own job.
  // Delegated on the table body, so rows added later are covered too.
  function rowToEdit(target) {
    if (target.closest(".btn-sm, a, input, select")) return null;
    var row = target.closest("tr");
    if (!row || row.parentNode !== tbody) return null;
    if (row.classList.contains("removing") || row.classList.contains("no-results-row")) return null;
    return row.querySelector(".btn-edit") ? row : null;
  }

  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-edit");
    if (btn) { openModalToEdit(btn.closest("tr")); return; }

    var row = rowToEdit(e.target);
    if (row) openModalToEdit(row);
  });

  // Keyboard: Tab to a row, then Enter or Space opens it
  tbody.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target.tagName !== "TR") return; // let the buttons handle their own keys
    var row = rowToEdit(e.target);
    if (!row) return;
    e.preventDefault();
    openModalToEdit(row);
  });

  // Make the rows focusable (also rows added later)
  function decorate(row) {
    if (row.classList.contains("no-results-row") || row.hasAttribute("data-clickable")) return;
    row.setAttribute("data-clickable", "");
    row.tabIndex = 0;
    row.title = "Click to edit customer";
  }
  Array.prototype.forEach.call(tbody.rows, decorate);
  new MutationObserver(function () { Array.prototype.forEach.call(tbody.rows, decorate); })
    .observe(tbody, { childList: true });

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

  // ----- Return button: marks the rental as Returned -----
  // ----- Auto-delete: a Returned rental disappears AUTO_DELETE_DAYS after its return date -----
  var AUTO_DELETE_DAYS = 30; // change this number; 0 turns auto-delete off
  var RETURN_COL = 4;
  var STATUS_COL = 7;

  function pad(n) { return String(n).padStart(2, "0"); }
  function toISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || "").trim());
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function isReturned(row) {
    var badge = row.cells[STATUS_COL] && row.cells[STATUS_COL].querySelector(".badge");
    return !!badge && badge.classList.contains("returned");
  }

  // The day the countdown starts from: the day it was marked Returned here,
  // otherwise the rental's Return date
  function returnedOn(row) {
    return parseISO(row.dataset.returnedOn || (row.cells[RETURN_COL] ? row.cells[RETURN_COL].textContent : ""));
  }

  function deleteDate(row) {
    var d = returnedOn(row);
    return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + AUTO_DELETE_DAYS) : null;
  }

  function isExpired(row) {
    if (!(AUTO_DELETE_DAYS > 0) || !isReturned(row)) return false;
    var due = deleteDate(row);
    return !!due && new Date() >= due;
  }

  // Hover tip on the RETURNED badge: when it was returned and when it will be removed
  function labelReturned(row) {
    var badge = row.cells[STATUS_COL] && row.cells[STATUS_COL].querySelector(".badge.returned");
    var d = returnedOn(row);
    if (!badge || !d) return;
    var tip = "Returned on " + toISO(d);
    if (AUTO_DELETE_DAYS > 0) tip += " \u2022 removed automatically on " + toISO(deleteDate(row));
    badge.title = tip;
  }

  function markReturned(row) {
    if (!row || isReturned(row)) return;
    row.dataset.returnedOn = toISO(new Date());

    var td = row.cells[STATUS_COL];
    td.textContent = "";
    var badge = document.createElement("span");
    badge.className = "badge returned";
    badge.textContent = "RETURNED";
    td.appendChild(badge);
    labelReturned(row);

    var returnBtn = row.querySelector(".btn-return");
    if (returnBtn) returnBtn.remove();

    if (badge.animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      badge.animate(
        [{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
        { duration: 260, easing: "ease-out" }
      );
    }

    // Let the Status filter re-check this row (e.g. while the list is filtered to "Active")
    var statusFilter = document.getElementById("rentalsStatus");
    if (statusFilter) statusFilter.dispatchEvent(new Event("change"));
  }

  // Works for rows added later too, since the click is handled on the table body
  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-return");
    if (btn) markReturned(btn.closest("tr"));
  });

  // Removes rentals whose time is up. On page load they just vanish; while the
  // page stays open they slide out like a normal Delete (it reuses the Delete button).
  function sweepExpired(animated) {
    if (!(AUTO_DELETE_DAYS > 0)) return;
    Array.prototype.slice.call(tbody.rows).forEach(function (row) {
      if (row.classList.contains("removing") || !isExpired(row)) return;
      var deleteBtn = row.querySelector(".btn-danger");
      if (animated && deleteBtn) deleteBtn.click();
      else row.remove();
    });
  }

  sweepExpired(false);
  Array.prototype.forEach.call(tbody.rows, labelReturned);
  setInterval(function () { sweepExpired(true); }, 60 * 1000);
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


// ---------------------------------------------------------------
// Rentals page: click anywhere on a rental row (except its Return /
// Delete buttons) to see that customer's full details (contact info,
// totals and every rental they have).
// Does nothing on pages without the popup.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var tbody = document.getElementById("rentalsBody");
  var overlay = document.getElementById("customerModal");
  if (!tbody || !overlay) return;

  // Table columns on the Rentals page
  var COL = { id: 0, customer: 1, item: 2, pickup: 3, ret: 4, total: 5, payment: 6, status: 7 };

  // ----- Customer contact details -----
  // Used when the Customers page can't be read (for example when the files are
  // opened by double-clicking instead of through a web server). Keep these in
  // step with the Customers page. Key = the name in lower case.
  var details = {
    "christine luna": { contact: "0917 123 4567", email: "christine.luna@email.com", location: "Lucena City, Quezon" },
    "maria santos":   { contact: "0918 234 5678", email: "maria.santos@email.com",   location: "Lucena City, Quezon" },
    "ana reyes":      { contact: "0919 345 6789", email: "ana.reyes@email.com",      location: "Lucena City, Quezon" }
  };

  // When the site runs on a web server, read the real details from customers.html
  // so this popup always matches the Customers page.
  if (window.fetch && window.DOMParser) {
    fetch("customers.html")
      .then(function (res) { return res.ok ? res.text() : Promise.reject(); })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, "text/html");
        Array.prototype.forEach.call(doc.querySelectorAll("#customersBody tr"), function (r) {
          var c = r.cells;
          if (!c || c.length < 4) return;
          details[c[0].textContent.trim().toLowerCase()] = {
            contact: c[1].textContent.trim(),
            email: c[2].textContent.trim(),
            location: c[3].textContent.trim()
          };
        });
      })
      .catch(function () { /* keep the built-in details above */ });
  }

  var nameEl = document.getElementById("customerName");
  var avatarEl = document.getElementById("customerAvatar");
  var rentalsEl = document.getElementById("customerRentals");
  var spentEl = document.getElementById("customerSpent");
  var lastEl = document.getElementById("customerLast");
  var contactEl = document.getElementById("customerContact");
  var emailEl = document.getElementById("customerEmail");
  var locationEl = document.getElementById("customerLocation");
  var callBtn = document.getElementById("customerCall");
  var mailBtn = document.getElementById("customerMail");
  var mapBtn = document.getElementById("customerMap");
  var historyBody = document.getElementById("customerHistoryBody");
  var lastFocused = null;

  // ----- Make the rows clickable (also for rows added later) -----
  function decorate(row) {
    if (row.classList.contains("no-results-row") || row.hasAttribute("data-clickable")) return;
    row.setAttribute("data-clickable", "");
    row.tabIndex = 0;
    row.title = "View customer details";
  }
  Array.prototype.forEach.call(tbody.rows, decorate);
  new MutationObserver(function () { Array.prototype.forEach.call(tbody.rows, decorate); })
    .observe(tbody, { childList: true });

  // ----- Collect this customer's rentals from the table -----
  function rentalsFor(name) {
    var list = [];
    Array.prototype.forEach.call(tbody.rows, function (row) {
      if (row.classList.contains("no-results-row") || row.classList.contains("removing")) return;
      if (!row.cells[COL.customer] || row.cells[COL.customer].textContent.trim() !== name) return;
      var statusBadge = row.cells[COL.status].querySelector(".badge");
      var paymentBadge = row.cells[COL.payment].querySelector(".badge");
      list.push({
        id: row.cells[COL.id].textContent.trim(),
        item: row.cells[COL.item].textContent.trim(),
        pickup: row.cells[COL.pickup].textContent.trim(),
        ret: row.cells[COL.ret].textContent.trim(),
        total: row.cells[COL.total].textContent.trim(),
        amount: parseInt(row.cells[COL.total].textContent.replace(/[^\d]/g, ""), 10) || 0,
        paymentText: paymentBadge ? paymentBadge.textContent : "",
        paymentClass: paymentBadge ? paymentBadge.className : "badge",
        statusText: statusBadge ? statusBadge.textContent : "",
        statusClass: statusBadge ? statusBadge.className : "badge"
      });
    });
    // newest pick-up date first
    list.sort(function (a, b) { return b.pickup.localeCompare(a.pickup); });
    return list;
  }

  function td(text, className) {
    var c = document.createElement("td");
    if (className) c.className = className;
    c.textContent = text;
    return c;
  }

  function badgeTd(text, className) {
    var c = document.createElement("td");
    var span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    c.appendChild(span);
    return c;
  }

  function setInfo(el, value) {
    el.textContent = value || "Not on file";
  }

  // Turns a button on (gives it a link) or off (no link = greyed out, not clickable)
  function setAction(btn, href, offTitle) {
    if (href) {
      btn.setAttribute("href", href);
      btn.removeAttribute("aria-disabled");
      btn.removeAttribute("title");
    } else {
      btn.removeAttribute("href");
      btn.setAttribute("aria-disabled", "true");
      btn.title = offTitle;
    }
  }

  function setActions(info) {
    var phone = (info.contact || "").replace(/[^\d+]/g, "");
    var email = (info.email || "").trim();
    var place = (info.location || "").trim();

    // Call: opens the phone / calling app (on a computer, whatever app handles calls)
    setAction(callBtn, phone.replace(/\D/g, "").length >= 7 ? "tel:" + phone : "", "No valid contact number on file");
    // Send Email: opens the email app with this address ready
    setAction(mailBtn, /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) ? "mailto:" + email : "", "No valid email address on file");
    // View Location: opens the place in Google Maps in a new tab
    setAction(mapBtn, place ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place) : "", "No location on file");
  }

  function fill(name) {
    var info = details[name.toLowerCase()] || {};
    var list = rentalsFor(name);

    nameEl.textContent = name;
    avatarEl.textContent = name.split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();

    var spent = list.reduce(function (sum, r) { return sum + r.amount; }, 0);
    rentalsEl.textContent = list.length;
    spentEl.textContent = "\u20B1" + spent.toLocaleString("en-US");
    lastEl.textContent = list.length ? list[0].pickup : "\u2014";

    setInfo(contactEl, info.contact);
    setInfo(emailEl, info.email);
    setInfo(locationEl, info.location);
    setActions(info);

    historyBody.textContent = "";
    if (!list.length) {
      var empty = document.createElement("tr");
      var emptyCell = td("No rentals yet.", "cust-empty");
      emptyCell.colSpan = 7;
      empty.appendChild(emptyCell);
      historyBody.appendChild(empty);
      return;
    }
    list.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.appendChild(td(r.id, "code"));
      tr.appendChild(td(r.item));
      tr.appendChild(td(r.pickup));
      tr.appendChild(td(r.ret));
      tr.appendChild(td(r.total, "price"));
      tr.appendChild(badgeTd(r.paymentText, r.paymentClass));
      tr.appendChild(badgeTd(r.statusText, r.statusClass));
      historyBody.appendChild(tr);
    });
  }

  function openModal(name) {
    fill(name);
    lastFocused = document.activeElement;
    overlay.classList.add("open");
    document.documentElement.classList.add("modal-open");
    var closeBtn = overlay.querySelector(".cust-close");
    setTimeout(function () { if (closeBtn) closeBtn.focus(); }, 60);
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.documentElement.classList.remove("modal-open");
    if (lastFocused) lastFocused.focus();
  }

  // Click on a row (or Enter / Space while the row is focused). The Return and
  // Delete buttons keep doing their own job and don't open the popup.
  function customerNameFrom(target) {
    if (target.closest("button, a, input, select")) return "";
    var row = target.closest("tr");
    if (!row || row.parentNode !== tbody) return "";
    if (row.classList.contains("removing") || row.classList.contains("no-results-row")) return "";
    return row.cells[COL.customer] ? row.cells[COL.customer].textContent.trim() : "";
  }

  tbody.addEventListener("click", function (e) {
    var name = customerNameFrom(e.target);
    if (name) openModal(name);
  });

  tbody.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target.tagName !== "TR") return; // let the buttons handle their own keys
    var name = customerNameFrom(e.target);
    if (!name) return;
    e.preventDefault();
    openModal(name);
  });

  // Close buttons, blurred background, Escape
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

    var focusable = overlay.querySelectorAll("button, a[href]");
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
});


// ---------------------------------------------------------------
// Dashboard "Weekly Sales Report": hovering a day highlights its column
// and shows a small tooltip with that day's sales. Each .bar-col needs a
// data-value (the amount in pesos). Does nothing on pages without the chart.
// Runs even with reduced motion, since it isn't an animation.
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  var chart = document.querySelector(".dashboard-page .chart");
  if (!chart) return;

  var tip = document.createElement("div");
  tip.className = "chart-tip";
  tip.setAttribute("aria-hidden", "true");
  chart.appendChild(tip);

  function show(col, e) {
    var value = Number(col.dataset.value);
    var label = col.querySelector("span");
    if (!label || isNaN(value)) return;

    tip.innerHTML = "";
    var title = document.createElement("strong");
    title.textContent = label.textContent;
    var line = document.createElement("span");
    line.textContent = "Sales : \u20B1" + value.toLocaleString("en-US");
    tip.appendChild(title);
    tip.appendChild(line);

    // Follow the pointer; flip to the left side near the right edge
    var box = chart.getBoundingClientRect();
    var x = e.clientX - box.left + 14;
    var y = e.clientY - box.top - tip.offsetHeight - 10;
    if (x + tip.offsetWidth > chart.clientWidth) x = e.clientX - box.left - tip.offsetWidth - 14;
    tip.style.left = Math.max(0, x) + "px";
    tip.style.top = Math.max(0, y) + "px";
    tip.classList.add("show");
  }

  chart.querySelectorAll(".bar-col").forEach(function (col) {
    col.addEventListener("pointerenter", function (e) { col.classList.add("is-hover"); show(col, e); });
    col.addEventListener("pointermove", function (e) { show(col, e); });
    col.addEventListener("pointerleave", function () { col.classList.remove("is-hover"); tip.classList.remove("show"); });
  });
});


// ---------------------------------------------------------------
// Sidebar profile photo: shows the photo saved in Settings in place of
// the "AD" initials, on every page. Runs even with reduced motion, since
// it isn't an animation. Settings stores the photo under the same key.
// ---------------------------------------------------------------
(function () {
  var PHOTO_KEY = "simplyDesignProfilePhoto";

  function applySidebarAvatar() {
    var src = "";
    try { src = localStorage.getItem(PHOTO_KEY) || ""; } catch (e) {}

    document.querySelectorAll(".sidebar .avatar").forEach(function (el) {
      if (!el.dataset.initials) el.dataset.initials = el.textContent.trim();
      if (src) {
        el.textContent = "";
        el.style.backgroundImage = 'url("' + src + '")';
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
      } else {
        el.textContent = el.dataset.initials;
        el.style.backgroundImage = "";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", applySidebarAvatar);

  // If the photo is changed in another open tab, update this one too
  window.addEventListener("storage", function (e) {
    if (e.key === PHOTO_KEY) applySidebarAvatar();
  });
})();