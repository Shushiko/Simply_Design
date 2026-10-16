// Edit these links to point to the shop's real pages
const SOCIALS = [
  { label: 'Facebook', name: 'Simply by Jun Barreto Tabi', url: 'https://www.facebook.com/Junbarrettotabi', icon: 'facebook' },
  { label: 'Facebook', name: 'Jun Barreto Tabi', url: 'https://www.facebook.com/messages/t/117627959642970', icon: 'messenger' },
  { label: 'Email', name: 'junbarretotabi@gmail.com', url: 'mailto:junbarretotabi@gmail.com', icon: 'email' },
  { label: 'Phone', name: '0967 366 1552', url: 'tel:+639673661552', icon: 'phone' },
];

const ICONS = {
  facebook: '<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="12" fill="#1877f2"/><path fill="#fff" d="M13.4 19v-6h2l.4-2.4h-2.4V9.2c0-.7.3-1.2 1.3-1.2h1.2V6c-.2 0-1-.1-1.8-.1-1.9 0-3.1 1.1-3.1 3.2v1.5H9V13h2v6z"/></svg>',
  messenger: '<svg viewBox="0 0 24 24" width="26" height="26"><path fill="#0084ff" d="M12 2C6.5 2 2 6.2 2 11.5c0 2.9 1.3 5.4 3.4 7.1V22l3.1-1.7c1 .3 2 .4 3.5.4 5.5 0 10-4.2 10-9.5S17.5 2 12 2z"/><path fill="#fff" d="M5.900 14.500l3.300-5.200 2.600 2.600 4.300-2.600-3.300 5.200-2.600-2.600z"/></svg>',
  email: '<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="12" fill="#a0622a"/><rect x="5.500" y="7.500" width="13" height="9" rx="1.500" fill="none" stroke="#fff" stroke-width="1.600"/><path d="m6 8.500 6 4.500 6-4.500" fill="none" stroke="#fff" stroke-width="1.600" stroke-linejoin="round"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="12" fill="#25a244"/><g transform="translate(6 6) scale(0.5)"><path fill="none" stroke="#fff" stroke-width="2.800" stroke-linejoin="round" d="M22 16.920v3a2 2 0 0 1-2.180 2 19.790 19.790 0 0 1-8.630-3.070 19.500 19.500 0 0 1-6-6 19.790 19.790 0 0 1-3.070-8.670A2 2 0 0 1 4.110 2h3a2 2 0 0 1 2 1.720 12.840 12.840 0 0 0 .7 2.810 2 2 0 0 1-.45 2.110L8.090 9.910a16 16 0 0 0 6 6l1.270-1.270a2 2 0 0 1 2.110-.45 12.840 12.840 0 0 0 2.810.7A2 2 0 0 1 22 16.920z"/></g></svg>',
};

const EXT = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>';

document.querySelector('#socials').innerHTML = SOCIALS.map((s) => {
  // Web links open in a new tab; mailto: and tel: open the mail / phone app instead
  const attrs = /^https?:/i.test(s.url) ? ' target="_blank" rel="noopener"' : '';
  return `
  <a class="social" href="${s.url}"${attrs}>
    <span class="ico ${s.icon}">${ICONS[s.icon]}</span>
    <span><b>${s.label.toUpperCase()}</b><em>${s.name}</em></span>
    <span class="ext">${EXT}</span>
  </a>`;
}).join('');

// "Contact Us" takes the visitor to the social media links
document.querySelector('#contact').addEventListener('click', () => {
  const panel = document.querySelector('#social-panel');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  panel.classList.add('flash');
  setTimeout(() => panel.classList.remove('flash'), 1600);
});