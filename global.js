console.log('IT’S ALIVE!');

let $ = (selector) => document.querySelector(selector);
let $$ = (selector) => Array.from(document.querySelectorAll(selector));

let navLinks = $$("nav a");

let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname,
);

currentLink.classList.add('current');

