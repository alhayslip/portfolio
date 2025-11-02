import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg = d3.select("#bubbleChart");
const width = +svg.attr("width");
const height = +svg.attr("height");
const margin = { top: 40, right: 160, bottom: 70, left: 80 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("allegations.csv").then(data => {
  data.columns = data.columns.map(c => c.trim());
  data.forEach(d => {
    d.year_received = d.year_received?.trim();
    d.precinct = d.precinct?.trim();
    const parsedYear = +d.year_received;
    d.year = parsedYear >= 2000 && parsedYear <= 2025 ? parsedYear : NaN;
  });
  data = data.filter(d => !isNaN(d.year) && d.precinct);

  const grouped = d3.rollups(
    data,
    v => v.length,
    d => d.year,
    d => d.precinct
  );

  const flatData = [];
  grouped.forEach(([year, precincts]) => {
    precincts.forEach(([precinct, count]) => {
      flatData.push({ year, precinct, count });
    });
  });

  const x = d3.scaleLinear()
    .domain(d3.extent(flatData, d => d.year))
    .range([0, plotWidth])
    .nice();

  const y = d3.scaleLinear()
    .domain([0, d3.max(flatData, d => d.count)])
    .range([plotHeight, 0])
    .nice();

  const precincts = Array.from(new Set(flatData.map(d => d.precinct))).sort(d3.ascending);
  const color = d3.scaleOrdinal()
    .domain(precincts)
    .range(d3.schemeTableau10);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(flatData, d => d.count)])
    .range([2, 20]);

  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g").call(d3.axisLeft(y));


  g.append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + 50)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Year");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -plotHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Total Complaints");

  g.append("text")
    .attr("x", plotWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .attr("font-size", "16px")
    .text("Total Complaints per Year by Precinct");

  function update(selectedPrecinct) {
    const filteredData =
      selectedPrecinct === "All"
        ? flatData
        : flatData.filter(d => d.precinct === selectedPrecinct);

    const circles = g.selectAll("circle")
      .data(filteredData, d => d.year + "-" + d.precinct);

    circles.join(
      enter => enter.append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 0)
        .attr("fill", d => color(d.precinct))
        .attr("opacity", 0.7)
        .transition()
        .duration(600)
        .attr("r", d => r(d.count)),

      update => update
        .transition()
        .duration(400)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", d => r(d.count))
        .attr("fill", d => color(d.precinct)),

      exit => exit
        .transition()
        .duration(300)
        .attr("r", 0)
        .remove()
    );
  }

  const legend = g.append("g")
    .attr("transform", `translate(${plotWidth + 30}, 0)`);

  legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-weight", "bold")
    .text("Precinct");

  precincts.forEach((precinct, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    row.append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", color(precinct));
    row.append("text")
      .attr("x", 20)
      .attr("y", 11)
      .style("font-size", "12px")
      .text(precinct);
  });

  const dropdown = d3.select("#precinctSelect");
  dropdown
    .selectAll("option")
    .data(["All", ...precincts])
    .enter()
    .append("option")
    .text(d => d);

  dropdown.on("change", function () {
    const selected = this.value;
    update(selected);
  });

  update("All");
});

