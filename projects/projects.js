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

let data = [1, 2, 3, 4, 5, 5];

let radius = 50;


let arcGenerator = d3.arc()
  .innerRadius(0) 
  .outerRadius(radius);

let sliceGenerator = d3.pie();

let arcData = sliceGenerator(data);

let arcs = arcData.map(d => arcGenerator(d));

let colors = d3.scaleOrdinal(d3.schemeTableau10);

arcs.forEach((arc, i) => {
  svg.append('path')
    .attr('d', arc)
    .attr('fill', colors(i));
});




