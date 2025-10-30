import { fetchJSON, renderProjects } from '../global.js';

async function loadProjects() {
  try {
    const projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    const projectsTitle = document.querySelector('.projects-title');

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

let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value;

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});

async function drawPieChart(projects) {
  const d3 = await import('https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm');
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  const radius = 50;

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

let rolledData = d3.rollups(
  projectsGiven,
  v => v.length,
  d => d.year   
  );

  let data = rolledData.map(([year, count]) => ({
    value: count,
    label: year
  }));

  if (data.length === 0) return;

  const pie = d3.pie().value(d => d.count);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const color = d3.ScaleOrdinal(d3.schemeSet2);

  svg
    .attr('viewBox', [-radius * 2, -radius * 2, radius * 4, radius * 4])
    .selectAll('path')
    .data(pie(data))
    .join('path')
    .attr('fill', d => color(d.data.year))
    .attr('d', arc);

  legend
    .selectAll('div')
    .data(data)
    .join('div')
    .text(d => `${d.year}: ${d.count}`);
}

