console.log('IT’S ALIVE!');

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const navLinks = $$("nav a");

let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname,
);

if (currentLink) {
  // or if (currentLink !== undefined)
  currentLink.classList.add('current');
}

currentLink.classList.add('current');
