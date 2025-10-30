import { fetchJSON, renderProjects } from '../global.js';

let projects = [];
let query = '';
let searchInput;
let projectsContainer;
let projectsTitle;
let selectedIndex = -1;

async function loadProjects() {
  try {
    projects = await fetchJSON('../lib/projects.json');
    projectsContainer = document.querySelector('.projects');
    projectsTitle = document.querySelector('.projects-title');

    renderProjects(projects, projectsContainer, 'h2');

    if (projectsTitle) {
      projectsTitle.textContent = `${projects.length} Projects`;
    }

    drawPieChart(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

loadProjects();

searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');
  drawPieChart(filteredProjects);
});

async function drawPieChart(projectsGiven) {
  const d3 = await import('https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm');
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  const radius = 50;

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  if (!projectsGiven || projectsGiven.length === 0) return;

  const rolledData = d3.rollups(projectsGiven, v => v.length, d => d.year);
  const data = rolledData.map(([year, count]) => ({ label: year, value: count }));

  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const color = d3.scaleOrdinal(d3.schemeSet2);
  const arcs = pie(data);

  svg
    .attr('viewBox', [-radius * 2, -radius * 2, radius * 4, radius * 4])
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('fill', d => color(d.data.label))
    .attr('d', arc)
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null))
    .on('click', (event, d) => {
      const idx = arcs.findIndex(a => a.data.label === d.data.label);
      selectedIndex = selectedIndex === idx ? -1 : idx;

      svg.selectAll('path')
        .attr('class', (_, j) => (j === selectedIndex ? 'selected' : null));

      legend.selectAll('li')
        .attr('class', (_, j) => (j === selectedIndex ? 'selected' : null));

      if (selectedIndex === -1) {
        renderProjects(projectsGiven, projectsContainer, 'h2');
      } else {
        const selectedYear = data[selectedIndex].label;
        const filtered = projectsGiven.filter(p => p.year === selectedYear);
        renderProjects(filtered, projectsContainer, 'h2');
      }
    });

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .text(d => `${d.label}: ${d.value}`)
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null))
    .on('click', (event, d) => {
      const idx = data.findIndex(a => a.label === d.label);
      selectedIndex = selectedIndex === idx ? -1 : idx;

      svg.selectAll('path')
        .attr('class', (_, j) => (j === selectedIndex ? 'selected' : null));

      legend.selectAll('li')
        .attr('class', (_, j) => (j === selectedIndex ? 'selected' : null));

      if (selectedIndex === -1) {
        renderProjects(projectsGiven, projectsContainer, 'h2');
      } else {
        const selectedYear = data[selectedIndex].label;
        const filtered = projectsGiven.filter(p => p.year === selectedYear);
        renderProjects(filtered, projectsContainer, 'h2');
      }
    });
}