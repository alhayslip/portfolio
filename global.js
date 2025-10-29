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
  if (p.title === "Academic Projects") {
    const dropdown = document.createElement("div");
    dropdown.classList.add("dropdown");

    const button = document.createElement("button");
    button.classList.add("dropbtn");
    button.textContent = "Academic Projects ▾";
    dropdown.append(button);

    const dropdownContent = document.createElement("div");
    dropdownContent.classList.add("dropdown-content");

   const subpages = [
      { url: "projects/index.html", title: "All Projects" },
      { url: "projects/project1.html", title: "Project 1" },
      { url: "projects/project2.html", title: "Project 2" },
      { url: "projects/project3.html", title: "Project 3" },
      { url: "projects/project4.html", title: "Project 4" }
    ];

    for (let sp of subpages) {
      const link = document.createElement("a");
      link.href = BASE_PATH + sp.url;
      link.textContent = sp.title;
      dropdownContent.append(link);
    }

    dropdown.append(dropdownContent);
    nav.append(dropdown);
  } 

  else {
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

const form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
  event.preventDefault(); 
  const data = new FormData(form);
  let url = form.action + "?";
  const params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  url += params.join("&");
  location.href = url;
});

export async function fetchJSON(url){
  try{
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    console.log('Fetch response:', response);
    const data = await response.json();
    return data;
  } catch (error){
    console.error('Error fetching or parsing JSON data:', error);
    return [];
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement){
    console.error('Container element not found or invalid.');
    return;
  }

  const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!headings.includes(headingLevel)){
    console.warn(`Invalid heading level "${headingLevel}" provided. Defaulting to <h2>.`);
    headingLevel = 'h2';
  }

  containerElement.innerHTML = '';

  if (!projects || projects.length === 0){
    containerElement.innerHTML = `<p>No projects to display.</p>`;
    return;
  }

  projects.forEach(project => {
    const article = document.createElement('article');

    const title = project.title || 'This project does not have a title';
    const image = project.image || 'https://en.wikipedia.org/wiki/Tabby_cat';
    const description = project.description || 'This is a placeholder';

    article.innerHTML = `
      <${headingLevel}>${title}</${headingLevel}>
      <img src="${image}" alt="${title}">
      <p>${description}</p>
    `;

    containerElement.appendChild(article);
  });
}

export async function fetchGitHubData(username) {
  const response = await fetch(`https://api.github.com/users/${username}`);
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();
}

export function renderProject(project) {
  return `
    <div class="project">
      <img src="${project.image}" alt="${project.title}">
      <div class="project-text">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <p class="project-year">${project.year}</p>
      </div>
    </div>
  `;
}