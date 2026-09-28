const $ = (s) => document.querySelector(s);

const TYPES = ['Long Gown', 'Cocktail Dress', 'Men Suit'];

const PIN = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 9l-8 8z"/></svg>';

// [code, type, color, size]
const items = [
  ['LGBLUE0001', 'Long Gown', 'Blue', 'M'],
  ['LGBLUE0002', 'Long Gown', 'Blue', 'S'],
  ['LGBLUE0003', 'Long Gown', 'Blue', 'L'],
  ['LGGREE0001', 'Long Gown', 'Green', 'M'],
  ['LGGREE0002', 'Long Gown', 'Green', 'XL'],
  ['CDRED0001', 'Cocktail Dress', 'Red', 'S'],
  ['CDRED0002', 'Cocktail Dress', 'Red', 'M'],
  ['CDBLUE0001', 'Cocktail Dress', 'Blue', 'L'],
  ['CDBLUE0002', 'Cocktail Dress', 'Blue', 'S'],
  ['CDGREE0001', 'Cocktail Dress', 'Green', 'M'],
  ['MSBLAC0001', 'Men Suit', 'Black', 'L'],
  ['MSBLAC0002', 'Men Suit', 'Black', 'XL'],
  ['MSBLUE0001', 'Men Suit', 'Blue', 'M'],
  ['MSBLUE0002', 'Men Suit', 'Blue', 'L'],
  ['MSGREE0001', 'Men Suit', 'Green', 'M'],
].map(([code, type, color, size]) => ({ code, type, color, size, price: 1500, place: 'Tayabas' }));

// Sample reservations (start, end) used to mark items as booked for the chosen dates
const booked = {
  LGBLUE0002: ['2026-10-08', '2026-10-12'],
  CDRED0001: ['2026-10-01', '2026-10-04'],
  MSBLAC0002: ['2026-10-15', '2026-10-18'],
};

const peso = (n) => '₱' + n.toLocaleString('en-PH');

function isBooked(item, from, to) {
  const b = booked[item.code];
  const start = from || to, end = to || from;
  return Boolean(b && start && b[0] <= end && b[1] >= start);
}

function cardHTML(i, from, to) {
  const taken = isBooked(i, from, to);
  return `
    <button class="card" type="button" data-code="${i.code}" data-booked="${taken}">
      <div class="photo"></div>
      <span class="badge ${taken ? 'booked' : ''}">${taken ? 'Booked' : CHECK + 'Available'}</span>
      <div class="info">
        <div class="code">${i.code}</div>
        <div class="tags">
          <span class="tag loc">${PIN}${i.place}</span>
          <span class="tag color">${i.color.slice(0, 4)}</span>
        </div>
        <div class="price">${peso(i.price)} <small>/ rental</small></div>
      </div>
    </button>`;
}

function render() {
  const type = $('#type').value, size = $('#size').value, color = $('#color').value;
  const q = $('#search').value.trim().toLowerCase();
  const from = $('#pickup').value, to = $('#return').value;

  const shown = items.filter((i) =>
    (!type || i.type === type) &&
    (!size || i.size === size) &&
    (!color || i.color === color) &&
    (!q || [i.code, i.type, i.color].join(' ').toLowerCase().includes(q))
  );

  $('#catalog').innerHTML = TYPES.map((t) => {
    const list = shown.filter((i) => i.type === t);
    if (!list.length) return '';
    return `
      <section class="group">
        <h2>${t} <small>${list.length} suit${list.length > 1 ? 's' : ''}</small></h2>
        <div class="grid">${list.map((i) => cardHTML(i, from, to)).join('')}</div>
      </section>`;
  }).join('') || '<p class="empty">No items match your filters. Try clearing them.</p>';

  const suits = shown.filter((i) => i.type === 'Men Suit').length;
  $('#status').textContent = `Showing ${shown.length - suits} gown, ${suits} suits`;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// Dates: pickup can't be in the past, return can't be before pickup
$('#pickup').min = new Date().toISOString().slice(0, 10);
$('#pickup').addEventListener('change', (e) => {
  const ret = $('#return');
  ret.min = e.target.value;
  if (ret.value && ret.value < e.target.value) ret.value = '';
});

// Filters update live; Search button and Enter also work
$('#filters').addEventListener('change', render);
$('#search').addEventListener('input', render);
$('#filters').addEventListener('submit', (e) => { e.preventDefault(); render(); });
$('#filters').addEventListener('reset', () => {
  $('#return').removeAttribute('min');
  setTimeout(render); // wait for the form to clear its fields
});

$('#catalog').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  toast(card.dataset.booked === 'true'
    ? `${card.dataset.code} is booked for those dates.`
    : `${card.dataset.code} selected. Log in to reserve it.`);
});

render();