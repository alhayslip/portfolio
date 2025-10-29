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
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

loadProjects();

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg = d3.select('#projects-pie-plot');
const radius = 50;

let data = [
  {value: 1, label:'Hamburgers'},
  {value: 2, label:'Potatoes'},
  {value: 3, label:'Fries'}
];

let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(radius);

let sliceGenerator = d3.pie().value((d) => d.value);

let arcData = sliceGenerator(data);

let arcs = arcData.map(d => arcGenerator(d));

let colors = d3.scaleOrdinal(d3.schemeTableau10);

arcs.forEach((arc, i) => {
  svg.append('path')
    .attr('d', arc)
    .attr('fill', colors(i));
});

let legend = d3.select('.legend');

data.forEach((d, i) => {
  legend.append('li')
    .attr('style', `--color:${colors(i)}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});



