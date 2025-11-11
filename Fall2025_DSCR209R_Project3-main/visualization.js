// Import D3
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Select SVG element
const svg = d3.select("#heatmap");
const width = +svg.attr("width");
const height = +svg.attr("height");

// Select yearSlider & yearLabel html elements
const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");

// Color scale setup
const colorScale = d3.scaleSequential(d3.interpolateYlOrRd);

// Load data from JSON & GeoJSON
Promise.all([
  d3.json("data/complaints_by_precinct.json"),
  d3.json("data/nyc_precincts.geojson")
]).then(([data, geoData]) => {
  // Convert numeric values
  data.forEach(d => {
    d.year_received = +d.year_received;
    d.total_complaints = +d.total_complaints;
    d.precinct = d.precinct.toString();
  });

//Remove data points where the number of complaint in a year is 0
  const complaintsByYear = d3.rollups(
  data,
  v => d3.sum(v, d => d.total_complaints),
  d => d.year_received
);

// Keep only years that have at least one complaint
const years = complaintsByYear
  .filter(([year, total]) => total > 0)
  .map(([year]) => year)
  .sort((a, b) => a - b);

  //update the data to exclude data points with empty years 
  data = data.filter(d => years.includes(d.year_received));

// Determine year range dynamically
  yearSlider.min = years[0];
  yearSlider.max = years[years.length - 1];
  yearSlider.value = years[0];
  yearLabel.textContent = years[0];

  // Get sorted list of precinct IDs
  const precincts = [...new Set(data.map(d => d.precinct))].sort();

  // Compute global max complaint count & set color scale
  const maxComplaints = d3.max(data, d => d.total_complaints);
  colorScale.domain([0, maxComplaints]);

// Map projection and path generator
const projection = d3.geoMercator()
  .fitSize([width, height], geoData);

const path = d3.geoPath().projection(projection);

// Draw Heatmap
function updateHeatmap(selectedYear) {
  yearLabel.textContent = selectedYear; // update label next to slider

   const yearRows = data.filter(
    d => d.year_received === +selectedYear && d.total_complaints > 0
  ); // rows for this year only and have at least one complaint

  const byPrecinct = new Map(yearRows.map(d => [d.precinct, d.total_complaints])); // lookup: precinct -> total

  //compute the total complaints for the entire year
  const totalYearComplaints = d3.sum(yearRows, d => d.total_complaints);

 //attach totals and percent of totals to every precicnct in the GEO Json use 0 is missing 
    geoData.features.forEach(f => {
      const p = String(f.properties.precinct);
      const complaints = byPrecinct.get(p) ?? 0;
      f.properties.total_complaints = complaints;
      f.properties.percent_of_total = totalYearComplaints > 0
        ? (complaints / totalYearComplaints) * 100
        : 0;
    });

  // bind all precinct to paths 
  const precinctPaths = svg.selectAll(".precinct") // bind polygons to svg
    .data(geoData.features, d => String(d.properties.precinct));

precinctPaths.join(
    enter => enter.append("path")
      .attr("class", "precinct")
      .attr("d", path)
      .attr("stroke", "#444")
      .attr("stroke-width", 0.5)
      .attr("fill", d =>
        d.properties.total_complaints === 0
          ? "#e0e0e0" 
          : colorScale(d.properties.total_complaints)
      )
      .append("title")
      .text(d =>
        `Precinct: ${d.properties.precinct}\nComplaints: ${d.properties.total_complaints}`
      ),

   update => update
      .transition().duration(250)
      .attr("fill", d =>
        d.properties.total_complaints === 0
          ? "#e0e0e0"
          : colorScale(d.properties.total_complaints)
      ),

    exit => exit.remove()
  );

  // update tooltip text dynamically 
  svg.selectAll(".precinct title")
    .text(d =>
      `Precinct: ${d.properties.precinct}\nComplaints: ${d.properties.total_complaints}`
    );
}

  // Draw Color Legend, decreased height to make the legend more readable
  const legendWidth = 300;
  const legendHeight = 10;

  const legendSvg = d3.select("body") // Add svg object for legend
    .append("svg")
    .attr("width", legendWidth + 80)
    .attr("height", 60)
    .attr("class", "legend");

  const legendGroup = legendSvg.append("g")
    .attr("transform", "translate(40,20)");

  // Create a gradient for the legend
  const defs = legendSvg.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "legend-gradient");

  linearGradient.selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", d => d)
    .attr("stop-color", d => colorScale(d * maxComplaints));

  // Draw legend rectangle
  legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  // Add numeric axis under legend
  const legendScale = d3.scaleLinear()
    .domain([0, maxComplaints])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(6)
    .tickSize(legendHeight + 3);

  legendGroup.append("g") // Position and draw legend
    .attr("transform", `translate(0,${legendHeight})`)
    .call(legendAxis)
    .call(g => g.select(".domain").remove());

  legendGroup.append("text") // Add legend title
    .attr("x", legendWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Total Complaints");

  // Initialize heatmap on page load
  updateHeatmap(+yearSlider.value);

  // Add eventListener to slider
  yearSlider.addEventListener("input", e => {
    updateHeatmap(+e.target.value);
  });

  // --- Create info box for brushing summary so that it is reusable and never duplicated---
const infoBox = d3.select("body").selectAll("#brush-info")
  .data([null])
  .join("div")
  .attr("id", "brush-info")
  .style("margin-top", "10px")
  .style("font-family", "sans-serif")
  .style("line-height", "1.4")
  .html("<strong>Selected precincts:</strong> None<br><strong>Total complaints:</strong> 0");

  // --- Add brushing functionality ---
  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("brush end", brushed);

  const brushGroup = svg.append("g")
    .attr("class", "brush")
    .call(brush);

  // --- Brushing behavior ---
  function brushed({ selection }) {
    if (!selection) {
      svg.selectAll(".precinct").classed("selected", false);
      infoBox.html("<strong>Selected precincts:</strong> None<br><strong>Total complaints:</strong> 0");
      return;
    }

    const [[x0, y0], [x1, y1]] = selection;
    let totalComplaints = 0;
    const selectedPrecincts = [];
    const precinctBreakdown = [];

    const totalYearComplaints = d3.sum(
      svg.selectAll(".precinct").data(),
      d => d.properties.total_complaints
    );

    svg.selectAll(".precinct")
      .classed("selected", d => {
        const [cx, cy] = path.centroid(d);
        if (!cx || !cy) return false;
        const selected = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
        if (selected) {
          const precinct = d.properties.precinct;
          const complaints = d.properties.total_complaints;
          totalComplaints += complaints;
          precinctBreakdown.push({
            precinct,
            complaints,
            percent: totalYearComplaints > 0
              ? (complaints / totalYearComplaints) * 100
              : 0
          });
          selectedPrecincts.push(precinct);
        }
        return selected;
      });

    // Sort precincts numerically for readability

    const breakdownText = precinctBreakdown.length
      ? precinctBreakdown
          .sort((a, b) => d3.ascending(+a.precinct, +b.precinct))
          .map(p =>
            `&nbsp;&nbsp;${p.precinct}: ${p.complaints} (${p.percent.toFixed(1)}%)`
          )
          .join("<br>")
      : "None";

    // Update info box with per-precinct list and total
    infoBox.html(`
      <strong>Selected precincts:</strong> ${
        selectedPrecincts.length > 0 ? selectedPrecincts.join(", ") : "None"
      }<br>
      <strong>Complaints per precinct:</strong><br>
      ${breakdownText}<br>
      <strong>Total complaints:</strong> ${totalComplaints.toLocaleString()} 
      (${((totalComplaints / totalYearComplaints) * 100).toFixed(1)}% of year total)
    `);
  }


  // --- Keep brush totals in sync when year changes ---
  yearSlider.addEventListener("input", e => {
    updateHeatmap(+e.target.value);
    brushed({ selection: d3.brushSelection(svg.select(".brush").node()) });
  });
});