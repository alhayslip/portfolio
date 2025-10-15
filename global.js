console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home Page" },
  { url: "projects/", title: "Academic Projects" },
  { url: "contact/", title: "Contact Information" },
  { url: "https://github.com/alhayslip", title: "My GitHub Page" }
  { url: "resume/", title: "My Resume"},
,
];


const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/" 
    : "https://github.com/alhayslip/portfolio"; 

// Create the nav element and insert it at the top of <body>
let nav = document.createElement("nav");
document.body.prepend(nav);

// Loop through the pages and create links
for (let p of pages) {
  let url = p.url;
  let title = p.title;

  // If the link is relative (not external), prefix it with BASE_PATH
  url = !url.startsWith("http") ? BASE_PATH + url : url;

  // Create the <a> element
  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;

  // Step 3.2: Highlight the current page
  // Compare the host and pathname to mark the current page link
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  // Step 3.2: Open external links in a new tab
  a.toggleAttribute("target", a.host !== location.host);

  // Add the link to the nav
  nav.append(a);
}
