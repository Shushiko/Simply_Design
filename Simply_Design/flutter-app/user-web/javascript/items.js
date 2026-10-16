// Shared catalog data: used by script.js (catalog) and booking.js (item page).
// Edit items, prices and descriptions here once.

const BUY_PRICE = { 'Long Gown': 8500, 'Cocktail Dress': 6500, 'Men Suit': 9500 };
const WAISTLINE = { S: '20 - 26 inches', M: '23 - 29 inches', L: '26 - 32 inches', XL: '29 - 35 inches' };
const DESCRIPTIONS = { LGBLUE0001: 'Blue light Long Gown' };

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
].map(([code, type, color, size]) => ({
  code, type, color, size,
  price: 1500,
  buy: BUY_PRICE[type],
  waist: WAISTLINE[size],
  desc: DESCRIPTIONS[code] || `${color} ${type}`,
  place: 'Tayabas',
}));

// Sample reservations (start, end)
const booked = {
  LGBLUE0002: ['2026-10-08', '2026-10-12'],
  CDRED0001: ['2026-10-01', '2026-10-04'],
  MSBLAC0002: ['2026-10-15', '2026-10-18'],
};

const peso = (n) => '\u20b1' + n.toLocaleString('en-PH');

// Local date as YYYY-MM-DD
function todayStr() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Booked when the chosen dates overlap a reservation (needs at least one date)
function isBookedRange(item, from, to) {
  const b = booked[item.code];
  const start = from || to, end = to || from;
  return Boolean(b && start && b[0] <= end && b[1] >= start);
}

// Booked today?
function isBooked(item) {
  const t = todayStr();
  return isBookedRange(item, t, t);
}