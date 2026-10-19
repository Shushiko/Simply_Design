const $ = (s) => document.querySelector(s);

// booking.html lives in user-web/web; build its address from this file's own location so it works from index.html
const BOOKING_URL = new URL('../web/booking.html', document.currentScript.src).href;

const TYPES = ['Long Gown', 'Cocktail Dress', 'Men Suit'];

const PIN = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-4-4 1.4-1.4 2.6 2.6 6.6-6.6L18 9l-8 8z"/></svg>';

const STAR = '<svg viewBox="0 0 24 24" width="26" height="26" fill="#f6c26b" stroke="#d98a1f" stroke-width="1.6" stroke-linejoin="round"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>';

// Shown in the "Most Rented Items" row at the top of the catalog
const MOST_RENTED = ['LGBLUE0002', 'CDRED0002', 'LGGREE0001', 'MSBLUE0001', 'CDGREE0001'];

function cardHTML(i) {
  const taken = isBooked(i);
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
  const avail = $('#avail').value, price = $('#price').value;
  const inPrice = (p) => !price || (price === 'lt1000' ? p < 1000 : price === '1000-1500' ? p >= 1000 && p <= 1500 : p > 1500);

  const shown = items.filter((i) =>
    (!type || i.type === type) &&
    (!size || i.size === size) &&
    (!color || i.color === color) &&
    (!avail || (avail === 'Booked') === isBooked(i)) &&
    inPrice(i.price) &&
    (!q || [i.code, i.type, i.color].join(' ').toLowerCase().includes(q))
  );

  const sections = [
    {
      title: 'Most Rented Items', cls: 'most', icon: STAR,
      list: MOST_RENTED.map((code) => shown.find((i) => i.code === code)).filter(Boolean),
    },
    ...TYPES.map((t) => ({ title: t, list: shown.filter((i) => i.type === t) })),
  ].filter((g) => g.list.length);

  $('#catalog').innerHTML = sections.map((g) => `
    <section class="group ${g.cls || ''}">
      <h2>${g.icon || ''}${g.title} <small>${g.list.length} Item${g.list.length > 1 ? 's' : ''}</small></h2>
      <div class="grid">${g.list.map(cardHTML).join('')}</div>
    </section>`).join('') || '<p class="empty">No items match your filters. Try clearing them.</p>';

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

// Filters update live; Search button and Enter also work
$('#filters').addEventListener('change', render);
$('#search').addEventListener('input', render);
$('#filters').addEventListener('submit', (e) => { e.preventDefault(); render(); });
$('#filters').addEventListener('reset', () => {
  setTimeout(render); // wait for the form to clear its fields
});

// Clicking an item opens its booking page
$('#catalog').addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  location.href = BOOKING_URL + '?code=' + encodeURIComponent(card.dataset.code);
});

render();