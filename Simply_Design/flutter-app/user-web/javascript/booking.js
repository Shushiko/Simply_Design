// Booking page: shows one item, chosen from the catalog via booking.html?code=ITEMCODE
const $ = (s) => document.querySelector(s);

const MESSENGER_URL = 'https://www.facebook.com/messages/t/117627959642970';

const ICON_BACK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H4M10 6l-6 6 6 6"/></svg>';
const ICON_CAL = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const ICON_INFO = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l10 10-10 10L2 12z"/><path d="M12 7v6M12 16v1" stroke="#fff" stroke-width="2"/></svg>';
const ICON_MSGR = '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#0084ff" d="M12 2C6.5 2 2 6.2 2 11.5c0 2.9 1.3 5.4 3.4 7.1V22l3.1-1.7c1 .3 2 .4 3.5.4 5.5 0 10-4.2 10-9.5S17.5 2 12 2z"/><path fill="#fff" d="M5.9 14.5l3.3-5.2 2.6 2.6 4.3-2.6-3.3 5.2-2.6-2.6z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 9l-8 8z"/></svg>';

const code = new URLSearchParams(location.search).get('code');
const item = items.find((i) => i.code === code);
const root = $('#booking');

// Longest rental allowed: pickup day and return day both count (e.g. Oct 29 to Nov 2 = 5 days).
// Change this one number to raise or lower the limit.
const MAX_RENTAL_DAYS = 5;
const HINT_DEFAULT = `Select dates to check availability (maximum ${MAX_RENTAL_DAYS} days)`;

function parseDay(str) { const [y, m, d] = String(str).split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(str, n) {
  const d = parseDay(str), p = (x) => String(x).padStart(2, '0');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// number of days from pickup to return, counting both days
function rentalDays(from, to) { return Math.round((parseDay(to) - parseDay(from)) / 86400000) + 1; }
function fmtDay(str) { return parseDay(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

if (!item) {
  document.title = 'Item not found | Simply Design';
  root.innerHTML = `
    <div class="bk-back"><a href="../../../../index.html">${ICON_BACK} Back to Catalog</a></div>
    <p class="empty">We couldn't find that item. Please pick one from the catalog.</p>`;
} else {
  document.title = `${item.code} | Simply Design`;
  const taken = isBooked(item);

  root.innerHTML = `
    <div class="bk-back"><a href="../../../../index.html">${ICON_BACK} Back to Catalog</a></div>

    <div class="bk-grid">
      <div class="bk-photo" role="img" aria-label="Photo of ${item.code}"></div>

      <div class="bk-info">
        <p class="bk-pid">PRODUCT ID: ${item.code}</p>
        <div class="bk-title">
          <h1>${item.type}</h1>
          <span class="badge inline ${taken ? 'booked' : ''}">${taken ? 'Booked' : CHECK + 'Available'}</span>
        </div>

        <section class="bk-dates">
          <h2>${ICON_CAL} Check your dates</h2>
          <div class="bk-dates-row">
            <label>Pickup Date<input type="date" id="pickup"></label>
            <label>Return Date<input type="date" id="return"></label>
          </div>
          <p class="bk-hint" id="hint" aria-live="polite">${HINT_DEFAULT}</p>
        </section>

        <div class="bk-specs">
          <div class="bk-row"><span class="bk-label">Type</span><select aria-label="Type"><option>${item.type}</option></select></div>
          <div class="bk-row"><span class="bk-label">Color</span><select aria-label="Color"><option>${item.color.toUpperCase()}</option></select></div>
          <div class="bk-row"><span class="bk-label">Waistline</span><select aria-label="Waistline"><option>${item.waist}</option></select></div>
        </div>

        <hr class="bk-rule">
        <div class="bk-prices">
          <div class="bk-row"><span class="bk-label">Rental</span><span class="bk-rental">${peso(item.price)} <small>/ rental</small></span></div>
          <div class="bk-row"><span class="bk-label">Buy Price</span><span class="bk-buy">${peso(item.buy)}</span></div>
        </div>

        <hr class="bk-rule">
        <div class="bk-desc">
          <span class="bk-label">Description</span>
          <p>${item.desc}</p>
        </div>

        <hr class="bk-rule">
        <p class="bk-notice">${ICON_INFO} This is a browse-only page. To reserve this ${item.type === 'Men Suit' ? 'suit' : 'gown'} or inquire about availability, please contact us directly.</p>

        <p class="bk-login" id="loginNotice" role="alert" hidden>
          Must log in to rent item. <a href="${LOGIN_URL}">Log in</a> or <a href="${SIGNUP_URL}">Sign up</a>
        </p>

        <div class="bk-actions">
          <a class="bk-msgr" href="${MESSENGER_URL}" target="_blank" rel="noopener">${ICON_MSGR} Chat with us on Messenger</a>
          <button class="bk-rent" id="rent" type="button">Rent Now</button>
        </div>
      </div>
    </div>`;

  const pickup = $('#pickup'), ret = $('#return'), hint = $('#hint');
  pickup.min = todayStr();

  function check() {
    const from = pickup.value, to = ret.value;
    hint.className = 'bk-hint';
    if (!from && !to) { hint.textContent = HINT_DEFAULT; return null; }
    if (from && to && rentalDays(from, to) > MAX_RENTAL_DAYS) {
      hint.textContent = `Rentals are limited to ${MAX_RENTAL_DAYS} days. Please return it on or before ${fmtDay(addDays(from, MAX_RENTAL_DAYS - 1))}.`;
      hint.classList.add('bad');
      return false;
    }
    if (isBookedRange(item, from, to)) {
      hint.textContent = 'Sorry, this item is booked for those dates';
      hint.classList.add('bad');
      return false;
    }
    const n = from && to ? rentalDays(from, to) : 0;
    hint.textContent = 'Great news, this item is available for those dates' + (n ? ` (${n} day${n > 1 ? 's' : ''})` : '');
    hint.classList.add('ok');
    return true;
  }

  pickup.addEventListener('change', () => {
    ret.min = pickup.value;
    ret.max = pickup.value ? addDays(pickup.value, MAX_RENTAL_DAYS - 1) : '';   // later days are greyed out
    const tooLong = pickup.value && ret.value && ret.value > ret.max;
    if (ret.value && ret.value < pickup.value) ret.value = '';
    if (tooLong) {
      ret.value = '';
      hint.className = 'bk-hint bad';
      hint.textContent = `Rentals are limited to ${MAX_RENTAL_DAYS} days, so your return date was cleared. Please pick it again.`;
      return;
    }
    check();
  });
  ret.addEventListener('change', check);

  // Rent Now: needs free dates, then opens the payment popup (defined in booking.html)
  // Renting needs a login. Guests see "Must log in to rent item" and the button stays locked.
  const rentBtn = $('#rent'), loginNotice = $('#loginNotice');
  function syncRentLock() {
    const guest = !getUser();
    loginNotice.hidden = !guest;
    rentBtn.classList.toggle('locked', guest);
    rentBtn.setAttribute('aria-disabled', guest ? 'true' : 'false');
    rentBtn.textContent = guest ? 'Log in to Rent' : 'Rent Now';
  }
  syncRentLock();
  window.addEventListener('storage', syncRentLock);
  window.addEventListener('pageshow', syncRentLock);

  $('#rent').addEventListener('click', () => {
    if (!getUser()) { syncRentLock(); toast('Must log in to rent item.'); return; }
    if (!pickup.value || !ret.value) { toast('Please select your pickup and return dates first.'); return; }
    if (pickup.value < todayStr()) { toast('Pickup date cannot be in the past.'); return; }
    if (ret.value < pickup.value) { toast('Return date must be on or after the pickup date.'); return; }
    if (rentalDays(pickup.value, ret.value) > MAX_RENTAL_DAYS) { toast(`You can rent for up to ${MAX_RENTAL_DAYS} days only.`); check(); return; }
    if (check() === false) { toast(`${item.code} is booked for those dates.`); return; }
    openPayment({ item, from: pickup.value, to: ret.value });
  });
}

// ---------------------------------------------------------------
// Payment popup logic. booking.js calls openPayment({ item, from, to }) when Rent Now is clicked.
(function () {
  const $ = (s) => document.querySelector(s);
  const overlay = $('#payModal');
  let ctx = null, lastFocus = null, hideTimer = null;

  const show = (on) => {
    clearTimeout(hideTimer);
    if (on) {
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('show'));
      document.body.style.overflow = 'hidden';
    } else {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
      hideTimer = setTimeout(() => { overlay.hidden = true; }, 180);
      if (lastFocus) lastFocus.focus();
    }
  };

  const method = () => (document.querySelector('input[name="pay"]:checked') || {}).value;
  const syncCard = () => {
    $('#pmCard').hidden = method() !== 'Debit / Card';
    $('#pmNotice').hidden = method() !== 'Cash';
  };
  const setErr = (msg, field) => {
    $('#pmError').textContent = msg || '';
    document.querySelectorAll('#payModal input[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  };

  window.openPayment = function (info) {
    ctx = info;
    lastFocus = document.activeElement;
    $('#pmItem').textContent = info.item.type;
    $('#pmDates').textContent = info.from + ' ~ ' + info.to;
    $('#pmFee').textContent = peso(info.item.price);
    $('#pmNoticeText').textContent = `Please bring exact amount ${peso(info.item.price)} upon picking up your garment at our ${info.item.place} shop location. A valid government ID will be required.`;
    $('#pmForm').hidden = false;
    $('#pmDone').hidden = true;
    $('#pmDone').innerHTML = '';
    ['#cardNo', '#cardExp', '#cardCvv', '#renterName', '#renterPhone'].forEach((s) => { $(s).value = ''; });
    document.querySelector('input[name="pay"][value="GCash"]').checked = true;
    $('#pmTitle').textContent = 'Select Payment Method';
    syncCard(); setErr('');
    show(true);
    setTimeout(() => $('#pmCancel').focus(), 50);
  };

  document.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener('change', () => { syncCard(); setErr(''); }));

  // Input helpers
  $('#cardNo').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  });
  $('#cardExp').addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    e.target.value = v;
  });
  $('#cardCvv').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4); });
  $('#renterPhone').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^\d+ ]/g, ''); });

  function validate() {
    const m = method();
    if (!m) return setErr('Please choose a payment method.'), false;
    if (m === 'Debit / Card') {
      const no = $('#cardNo').value.replace(/\s/g, '');
      if (no.length !== 16) return setErr('Enter a valid 16-digit card number.', $('#cardNo')), false;
      const mm = $('#cardExp').value.match(/^(\d{2})\/(\d{2})$/);
      const now = new Date(), yy = now.getFullYear() % 100, cm = now.getMonth() + 1;
      if (!mm || +mm[1] < 1 || +mm[1] > 12 || +mm[2] < yy || (+mm[2] === yy && +mm[1] < cm)) {
        return setErr('Enter a valid expiry date (MM/YY).', $('#cardExp')), false;
      }
      if (!/^\d{3,4}$/.test($('#cardCvv').value)) return setErr('Enter your 3 or 4 digit CVV / CVC.', $('#cardCvv')), false;
    }
    if (!$('#renterName').value.trim()) return setErr('Please enter your full name.', $('#renterName')), false;
    if (!/^(\+63|0)9\d{9}$/.test($('#renterPhone').value.replace(/\s/g, ''))) {
      return setErr('Enter a valid mobile number, e.g. 0917 123 4567.', $('#renterPhone')), false;
    }
    setErr('');
    return true;
  }

  function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  // ---- Receipt download: draws the receipt on a canvas and saves it as a PNG ----
  const FONT = "'Inter', 'Segoe UI', Arial, sans-serif";

  function wrapText(c, text, maxW) {
    const lines = [];
    let line = '';
    text.split(' ').forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  function downloadReceipt(r) {
    const W = 640, S = 2, PAD = 32, ROW = 44, TOP = 150;
    const rows = [
      ['Reference', r.ref],
      ['Name', r.name],
      ['Item', r.item],
      ['Dates', r.dates],
      ['Payment', r.method],
      ['Contact', r.phone],
      ['Rental fee', r.fee],
    ];
    const note = (r.method === 'Cash'
      ? 'Please pay ' + r.fee + ' at the store when you pick up your item. '
      : 'We will message you to confirm your payment. ')
      + 'Please bring this receipt and a valid government ID when you pick up at our ' + r.place + ' shop.';

    const measure = document.createElement('canvas').getContext('2d');
    measure.font = '13px ' + FONT;
    const noteLines = wrapText(measure, note, W - PAD * 2 - 40);

    const cardH = rows.length * ROW + 16;
    const H = TOP + cardH + 30 + noteLines.length * 20 + 56;

    const cv = document.createElement('canvas');
    cv.width = W * S;
    cv.height = H * S;
    const x = cv.getContext('2d');
    x.scale(S, S);
    x.textBaseline = 'alphabetic';

    // background + header band
    x.fillStyle = '#fff3e4'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#a57035'; x.fillRect(0, 0, W, 100);
    x.fillStyle = '#fff';
    x.font = '700 28px ' + FONT; x.fillText('Simply Design', PAD, 48);
    x.font = '500 14px ' + FONT; x.fillText('Gown & Suit Rentals  |  Reservation Receipt', PAD, 74);

    x.fillStyle = '#666'; x.font = '13px ' + FONT;
    x.fillText('Issued: ' + r.issued, PAD, 128);

    // white card
    x.beginPath();
    if (x.roundRect) x.roundRect(PAD, TOP, W - PAD * 2, cardH, 10); else x.rect(PAD, TOP, W - PAD * 2, cardH);
    x.fillStyle = '#fff'; x.fill();
    x.strokeStyle = '#ddd'; x.lineWidth = 1; x.stroke();

    // rows
    rows.forEach(([label, value], i) => {
      const y = TOP + 8 + i * ROW;
      const last = i === rows.length - 1;
      if (i) {
        x.strokeStyle = '#eee';
        x.beginPath(); x.moveTo(PAD + 20, y + 0.5); x.lineTo(W - PAD - 20, y + 0.5); x.stroke();
      }
      x.textAlign = 'left';
      x.fillStyle = '#777'; x.font = '13px ' + FONT;
      x.fillText(label, PAD + 20, y + 27);
      x.textAlign = 'right';
      x.fillStyle = last ? '#a8622a' : '#111';
      x.font = (last ? '700 18px ' : '600 14px ') + FONT;
      x.fillText(value, W - PAD - 20, y + 27, 400);
    });

    // note + thank-you line
    x.textAlign = 'left';
    x.fillStyle = '#444'; x.font = '13px ' + FONT;
    noteLines.forEach((ln, i) => x.fillText(ln, PAD + 4, TOP + cardH + 34 + i * 20));
    x.textAlign = 'center';
    x.fillStyle = '#a57035'; x.font = '600 13px ' + FONT;
    x.fillText('Thank you for choosing Simply Design!', W / 2, H - 22);

    cv.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SimplyDesign-Receipt-' + r.ref + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  $('#pmConfirm').addEventListener('click', () => {
    if (typeof getUser === 'function' && !getUser()) { setErr('Must log in to rent item.'); return; }
    if (!validate()) return;
    const ref = 'SD-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const m = method();
    const receipt = {
      ref,
      name: $('#renterName').value.trim(),
      item: ctx.item.type + ' (' + ctx.item.code + ')',
      dates: ctx.from + ' ~ ' + ctx.to,
      method: m,
      phone: $('#renterPhone').value.trim(),
      fee: peso(ctx.item.price),
      place: ctx.item.place,
      issued: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
    };
    // Remember the rental for the profile page (My Orders); only saved when someone is logged in
    if (typeof saveOrder === 'function') {
      saveOrder({ ref, code: ctx.item.code, type: ctx.item.type, from: ctx.from, to: ctx.to,
        fee: ctx.item.price, method: m, place: ctx.item.place, created: new Date().toISOString() });
    }
    $('#pmTitle').textContent = 'Reservation Received';
    $('#pmForm').hidden = true;
    const done = $('#pmDone');
    done.innerHTML = `
      <div class="pm-done-ico"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h3>Thank you, ${esc($('#renterName').value.trim().split(' ')[0])}!</h3>
      <p>${m === 'Cash' ? 'Please pay at the store when you pick up your item.' : 'We will message you to confirm your payment.'}</p>
      <div class="pm-recap">
        <div><span>Reference</span><b>${ref}</b></div>
        <div><span>Item</span><b>${esc(ctx.item.type)} (${esc(ctx.item.code)})</b></div>
        <div><span>Dates</span><b>${ctx.from} ~ ${ctx.to}</b></div>
        <div><span>Payment</span><b>${esc(m)}</b></div>
        <div><span>Rental fee</span><b>${peso(ctx.item.price)}</b></div>
        <div><span>Contact</span><b>${esc($('#renterPhone').value.trim())}</b></div>
      </div>
      <div class="pm-actions">
        <button type="button" class="pm-download" id="pmDownload"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>Download Receipt</button>
        <a class="pm-confirm" href="../../../../index.html">Back to Catalog</a>
      </div>`;
    done.hidden = false;
    $('#pmDownload').addEventListener('click', () => downloadReceipt(receipt));
  });

  $('#pmCancel').addEventListener('click', () => { $('#pmTitle').textContent = 'Select Payment Method'; show(false); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) show(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) show(false); });
})();