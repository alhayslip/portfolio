import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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
    if (projectsTitle) projectsTitle.textContent = `${projects.length} Projects`;

    drawPieChart(projects);
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

loadProjects();

searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  updateFilteredView();
});

function updateFilteredView() {
  let filteredBySearch = projects.filter((p) =>
    Object.values(p).join('\n').toLowerCase().includes(query)
  );


  if (selectedIndex !== -1 && currentPieData.length > selectedIndex) {
    let selectedYear = currentPieData[selectedIndex].label;
    filteredBySearch = filteredBySearch.filter((p) => p.year === selectedYear);
  }

  renderProjects(filteredBySearch, projectsContainer, 'h2');
  drawPieChart(filteredBySearch);
}

let currentPieData = [];

function drawPieChart(projectsGiven) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');
  const radius = 50;

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  if (!projectsGiven || projectsGiven.length === 0) return;

  const rolledData = d3.rollups(projectsGiven, (v) => v.length, (d) => d.year);
  const data = rolledData.map(([year, count]) => ({ label: year, value: count }));
  currentPieData = data;

  const pie = d3.pie().value((d) => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  const color = d3.scaleOrdinal(d3.schemeSet2);
  const arcs = pie(data);

  const paths = svg
    .attr('viewBox', [-radius * 2, -radius * 2, radius * 4, radius * 4])
    .selectAll('path')
    .data(arcs, (d) => d.data.label);

  paths
    .join(
      (enter) =>
        enter
          .append('path')
          .attr('fill', (d) => color(d.data.label))
          .attr('d', arc)
          .attr('opacity', 0)
          .call((enter) =>
            enter
              .transition()
              .duration(500)
              .attr('opacity', 1)
          ),
      (update) =>
        update.call((update) =>
          update
            .transition()
            .duration(500)
            .attr('fill', (d) => color(d.data.label))
            .attr('d', arc)
        ),
      (exit) =>
        exit.call((exit) =>
          exit
            .transition()
            .duration(300)
            .attr('opacity', 0)
            .remove()
        )
    )
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null))
    .on('click', function (event, d) {
      const idx = d3.select(this).datum().index;
      selectedIndex = selectedIndex === idx ? -1 : idx;
      updateFilteredView();
    });

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .text((d) => `${d.label}: ${d.value}`)
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null))
    .on('click', (event, d) => {
      const idx = data.findIndex((a) => a.label === d.label);
      selectedIndex = selectedIndex === idx ? -1 : idx;
      updateFilteredView();
    });
}