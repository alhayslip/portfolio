import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function createHistogram(columnName) {
  const data = await d3.csv("allegations.csv");

  data.forEach(d => {
    d[columnName] = +d[columnName];
  });

  const selectedValues = data
    .map(d => +d[columnName])
    .filter(v => !isNaN(v) && v >= 20 && v <= 60);

  const margin = { top: 20, right: 140, bottom: 87, left: 130};
  const width = 870 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#histogram")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const binThresholds = [20, 25, 30, 35, 40, 45, 50, 55, 61];
  const histogram = d3.histogram()
    .domain([20, 61])
    .thresholds(binThresholds);

  const bins = histogram(selectedValues);

const color = d3.scaleSequential()
  .domain([0, bins.length - 1])  
  .interpolator(d3.interpolateGreens); 

  const x = d3.scaleLinear()
    .domain([20, 61])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .range([height, 0]);

  svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("y", d => y(d.length))
    .attr("height", d => height - y(d.length))
    .attr("fill", (d, i) => color(i));

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "18px");

  svg.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "20px");

  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 25)
    .style("font-size", "20px")
    .text("Age of Police Officer Involved in Complaint");

svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -margin.left + 45) 
  .style("font-size", "20px")
  .style("text-anchor", "middle")
  .text("Number of Values for Each Bin");

  const legend = svg.append("g")
    .attr("transform", `translate(${width + 20}, 10)`);

legend.append("text")
  .attr("class", "legend-title")
  .attr("x", -100)
  .attr("y", -10)
  .style("font-size", "16px")
  .style("font-weight", "bold")
  .style("text-anchor", "right")
  .text("Age Groups of Police Officers");

bins.forEach((d, i) => {
  const group = legend.append("g")
    .attr("transform", `translate(0, ${i * 22})`);

group.append("rect")
  .attr("width", 14)
  .attr("height", 14)
  .attr("fill", color(i));

        const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("padding", "8px")
    .style("background", "white")
    .style("border", "1px solid #888")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "14px")
    .style("display", "none");

  svg.selectAll("rect")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.7);

      tooltip.style("display", "block")
        .html(`
          <b>Age Range:</b> ${d.x0}–${d.x1 - 1} <br>
          <b>Count:</b> ${d.length}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", (event.pageY - 40) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.style("display", "none");
    });

  group.append("text")
    .attr("x", 20)
    .attr("y", 11)
    .style("font-size", "14px")
    .text(`${d.x0}–${d.x1 - 1}`);
});
}

createHistogram("mos_age_incident");