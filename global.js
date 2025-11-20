console.log("GLOBAL.JS LOADED");

// ---------------------------
// Utility helpers
// ---------------------------
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// ---------------------------
// Path handling (Local vs GitHub Pages)
// ---------------------------
const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

// ---------------------------
// Navigation Pages
// ---------------------------
const pages = [
  { url: "", title: "Home Page" },
  { url: "projects/", title: "Academic Projects" },
  { url: "contact/", title: "Contact Information" },
  { url: "https://github.com/alhayslip", title: "My GitHub Page" },
  { url: "meta/", title: "Meta" },
  { url: "resume/", title: "My Resume" }
];

// ---------------------------
// Build the Nav Bar
// ---------------------------
const nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  // Dropdown for Academic Projects
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

  } else {
    // Regular nav link
    const isExternal = p.url.startsWith("http");

    const a = document.createElement("a");
    a.href = isExternal ? p.url : BASE_PATH + p.url;
    a.textContent = p.title;

    // Highlight current page
    if (!isExternal) {
      const currentPath = location.pathname.replace(/\/$/, "");
      const linkPath = a.pathname.replace(/\/$/, "");

      a.classList.toggle("current", currentPath === linkPath);
    }

    // External links open in new tab
    if (isExternal) a.target = "_blank";

    nav.append(a);
  }
}

// ---------------------------
// Theme Switcher
// ---------------------------
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

const themeSelect = document.querySelector("#theme-select");

function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
  localStorage.colorScheme = scheme;
  themeSelect.value = scheme;
}

// Load saved theme
if (localStorage.colorScheme) {
  setColorScheme(localStorage.colorScheme);
}

// Change theme
themeSelect.addEventListener("input", (event) => {
  setColorScheme(event.target.value);
});

// ---------------------------
// Optional: Handle contact page form
// (Only runs if a form exists)
// ---------------------------
const form = document.querySelector("form");

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    let url = form.action + "?";
    const params = [];

    for (let [name, value] of data.entries()) {
      params.push(`${name}=${encodeURIComponent(value)}`);
    }

    url += params.join("&");
    location.href = url;
  });
}

// ---------------------------
// Fetch helper (for project JSON files)
// ---------------------------
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error("fetchJSON error:", err);
    return [];
  }
}

// ---------------------------
// Render project list
// ---------------------------
export function renderProjects(projects, container, headingLevel = "h2") {
  if (!container) return;

  container.innerHTML = "";

  if (!projects.length) {
    container.innerHTML = "<p>No projects to display.</p>";
    return;
  }

  projects.forEach((project) => {
    const article = document.createElement("article");
    article.innerHTML = `
      <${headingLevel}>${project.title || "Untitled Project"}</${headingLevel}>
      ${project.image ? `<img src="${project.image}" alt="${project.title}">` : ""}
      <div class="project-text">
        <p>${project.description || ""}</p>
        <p class="project-year">${project.year || "N/A"}</p>
        ${
          project.url
            ? `<a href="${project.url}" target="_blank" class="project-link">View Project ↗</a>`
            : ""
        }
      </div>
    `;
    container.appendChild(article);
  });
}

// ---------------------------
// Render single project card
// ---------------------------
export function renderProject(project) {
  return `
    <div class="project">
      <img src="${project.image}" alt="${project.title}">
      <div class="project-text">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <p class="project-year">${project.year || "N/A"}</p>
      </div>
    </div>
  `;
}

// ---------------------------
// Fetch GitHub user info
// ---------------------------
export async function fetchGitHubData(username) {
  const response = await fetch(`https://api.github.com/users/${username}`);
  if (!response.ok) throw new Error(`GitHub API: HTTP ${response.status}`);
  return response.json();
}
