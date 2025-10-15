console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home Page" },
  { url: "projects/", title: "Academic Projects" },
  { url: "contact/", title: "Contact Information" },
  { url: "resume/", title: "My Resume" },
  { url: "https://github.com/alhayslip/portfolio", title: "My GitHub Page" },
];

const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/' // Local server
    : 'https://github.com/alhayslip/portfolio'; // GitHub Pages repo name

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
}

 url = !url.startsWith("http") ? BASE_PATH + url : url;

let a = document.createElement('a');
a.href = url;
a.textContent = title;
nav.append(a);

a.classList.toggle(
  'current',
  a.host === location.host && a.pathname === location.pathname,
);

a.toggleAttribute("target", a.host !== location.host);

