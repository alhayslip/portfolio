console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home Page"},
  { url: "projects/", title: "Academic Projects"},
  { url: "contact/", title: "Contact Information"},
  { url: "https://github.com/alhayslip", title: "My GitHub Page"},
  { url: "resume/", title: "My Resume"},
];

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"                 
    : "/portfolio/";       

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;
  let a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  a.toggleAttribute("target", a.host !== location.host);

  nav.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

const select = document.querySelector("#theme-select");

function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
  localStorage.colorScheme = scheme;
  select.value = scheme;
}

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener("input", (event) => {
  setColorScheme(event.target.value);
});