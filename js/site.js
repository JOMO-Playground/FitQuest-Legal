(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  if (!header) return;

  var current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var nav = header.querySelector('nav');
  if (!nav) {
    nav = document.createElement('nav');
    header.appendChild(nav);
  }
  nav.id = 'site-navigation';
  nav.setAttribute('aria-label', 'Primary');

  var items = [
    ['index.html', 'Product'],
    ['releases.html', 'Releases'],
    ['about.html', 'About'],
    ['support.html', 'Support'],
    ['account.html', 'My Progress'],
  ];
  nav.replaceChildren();
  items.forEach(function (item) {
    var link = document.createElement('a');
    link.href = item[0];
    link.textContent = item[1];
    if (current === item[0]) link.setAttribute('aria-current', 'page');
    if (item[0] === 'account.html') link.className = 'nav-action';
    nav.appendChild(link);
  });

  var menu = document.createElement('button');
  menu.className = 'menu-button';
  menu.type = 'button';
  menu.setAttribute('aria-controls', nav.id);
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
  menu.innerHTML = '<span></span><span></span>';
  header.insertBefore(menu, nav);

  function closeMenu() {
    header.classList.remove('menu-open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
  }

  menu.addEventListener('click', function () {
    var open = header.classList.toggle('menu-open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  nav.addEventListener('click', closeMenu);
  window.addEventListener('resize', function () {
    if (window.innerWidth > 860) closeMenu();
  }, { passive: true });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMenu();
      menu.focus();
    }
  });

  var year = document.querySelector('[data-current-year]');
  if (year) year.textContent = String(new Date().getFullYear());
}());
