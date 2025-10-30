import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = [];
let query = '';
let searchInput;
let projectsContainer;
let projectsTitle;
let selectedIndex = -1;
let currentPieData = [];
let color; 

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
  drawPieChart(projects);
}

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
  color = d3.scaleOrdinal(d3.schemeSet2);
  const arcs = pie(data);

  svg
    .attr('viewBox', [-radius * 2, -radius * 2, radius * 4, radius * 4])
    .selectAll('path')
    .data(arcs)
    .join('path')
    .attr('fill', (d) => color(d.data.label))
    .attr('d', arc)
    .attr('opacity', (_, i) =>
      selectedIndex === -1 || selectedIndex === i ? 1 : 0.4
    )
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null))
    .on('click', function (event, d) {
      const idx = d3.select(this).datum().index;
      selectedIndex = selectedIndex === idx ? -1 : idx;

      svg.selectAll('path').attr('opacity', (_, j) =>
        selectedIndex === -1 || selectedIndex === j ? 1 : 0.4
      );

      legend.selectAll('li').attr('class', (_, j) =>
        j === selectedIndex ? 'selected' : null
      );

      updateFilteredView(); 
    });


  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .html(
      (d, i) =>
        `<span class="swatch" style="background-color:${color(
          d.label
        )}"></span>${d.label}: ${d.value}`
    )
    .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null))
    .on('click', (event, d) => {
      const idx = data.findIndex((a) => a.label === d.label);
      selectedIndex = selectedIndex === idx ? -1 : idx;

      svg.selectAll('path').attr('opacity', (_, j) =>
        selectedIndex === -1 || selectedIndex === j ? 1 : 0.4
      );

      legend.selectAll('li').attr('class', (_, j) =>
        j === selectedIndex ? 'selected' : null
      );

      updateFilteredView();
    });
}