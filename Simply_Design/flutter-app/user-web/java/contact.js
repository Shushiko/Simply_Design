// Edit these links to point to the shop's real pages
const SOCIALS = [
  { label: 'Facebook', name: 'Simply by Jun Barreto Tabi', url: 'https://www.facebook.com/', icon: 'facebook' },
  { label: 'Facebook', name: 'Jun Barreto Tabi', url: 'https://m.me/', icon: 'messenger' },
];

const ICONS = {
  facebook: '<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="12" fill="#1877f2"/><path fill="#fff" d="M13.4 19v-6h2l.4-2.4h-2.4V9.2c0-.7.3-1.2 1.3-1.2h1.2V6c-.2 0-1-.1-1.8-.1-1.9 0-3.1 1.1-3.1 3.2v1.5H9V13h2v6z"/></svg>',
  messenger: '<svg viewBox="0 0 24 24" width="26" height="26"><path fill="#0084ff" d="M12 2C6.5 2 2 6.2 2 11.5c0 2.9 1.3 5.4 3.4 7.1V22l3.1-1.7c1 .3 2 .4 3.5.4 5.5 0 10-4.2 10-9.5S17.5 2 12 2z"/><path fill="#fff" d="M5.900 14.500l3.300-5.200 2.600 2.600 4.300-2.600-3.300 5.200-2.600-2.600z"/></svg>',
};

const EXT = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>';

document.querySelector('#socials').innerHTML = SOCIALS.map((s) => `
  <a class="social" href="${s.url}" target="_blank" rel="noopener">
    <span class="ico">${ICONS[s.icon]}</span>
    <span><b>${s.label.toUpperCase()}</b><em>${s.name}</em></span>
    <span class="ext">${EXT}</span>
  </a>`).join('');

// "Contact Us" takes the visitor to the social media links
document.querySelector('#contact').addEventListener('click', () => {
  const panel = document.querySelector('#social-panel');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  panel.classList.add('flash');
  setTimeout(() => panel.classList.remove('flash'), 1600);
});