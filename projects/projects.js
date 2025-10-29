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

document.addEventListener("DOMContentLoaded", () => {
  import('https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm').then((d3) => {

    const svg = d3.select('#projects-pie-plot');
    const legend = d3.select('.legend');

    console.log('SVG exists?', svg.node());

    if (svg.empty()) {
      console.error("SVG not found in DOM yet.");
      return;
    }

    let data = [
      { value: 1, label: 'Hamburgers' },
      { value: 2, label: 'Potatoes' },
      { value: 3, label: 'Fries' }
    ];

    let radius = 50;

    let arcGenerator = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    let sliceGenerator = d3.pie().value(d => d.value);

    let arcData = sliceGenerator(data);

    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    svg.selectAll('path')
      .data(arcData)
      .enter()
      .append('path')
        .attr('d', arcGenerator)
        .attr('fill', (d, i) => colors(i));

    legend.selectAll('li')
      .data(data)
      .enter()
      .append('li')
        .attr('style', (d, i) => `--color:${colors(i)}`)
        .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
});


