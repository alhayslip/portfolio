const svg = d3.select("#chart");
const width = +svg.attr("width");
const height = +svg.attr("height");
const margin = { top: 40, right: 100, bottom: 50, left: 60 };

const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().range([0, plotWidth]);
const y = d3.scaleLinear().range([plotHeight, 0]);
const color = d3.scaleOrdinal(d3.schemeSet2);

const line = d3.line()
  .x(d => x(d.Year))
  .y(d => y(d.Count));

d3.csv("allegations.csv").then(data => {
data.forEach(d => {
  d.Year = +d.year_received;     
  d.Gender = d.complainant_gender?.trim();  
  d.Precinct = d.precinct?.trim();     
});

data = data.filter(d => d.Gender === "Male" || d.Gender === "Female");

const precincts = Array.from(new Set(data.map(d => +d.Precinct)))
  .sort((a, b) => a - b)                                         
  .map(String); 

  const select = d3.select("#precinctSelect");
  select.selectAll("option")
    .data(precincts)
    .enter()
    .append("option")
    .text(d => d);

  updateChart(precincts[0]);

  select.on("change", function() {
    updateChart(this.value);
  });

  function updateChart(selectedPrecinct) {
    const filtered = data.filter(d => d.Precinct === selectedPrecinct);

    const grouped = d3.rollup(
      filtered,
      v => v.length,
      d => d.Gender,
      d => d.Year
    );

    const series = Array.from(grouped, ([Gender, yearMap]) => ({
      Gender,
      values: Array.from(yearMap, ([Year, Count]) => ({ Year, Count }))
        .sort((a, b) => d3.ascending(a.Year, b.Year))
    }));

    const allYears = Array.from(new Set(filtered.map(d => d.Year)));
    const maxCount = d3.max(series.flatMap(s => s.values.map(v => v.Count)));

    x.domain(d3.extent(allYears));
    y.domain([0, maxCount]).nice();
    color.domain(series.map(s => s.Gender));

    g.selectAll("*").remove();

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${plotHeight})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g").call(d3.axisLeft(y));

const totalComplaints = filtered.length;   

g.append("text")
  .attr("x", plotWidth / 2)
  .attr("y", -10)
  .attr("text-anchor", "middle")
  .attr("font-weight", "bold")
  .text(`Total Complaints in Precinct ${selectedPrecinct}: ${totalComplaints}`);

  g.append("g")
  .attr("transform", `translate(0,${plotHeight})`)
  .call(d3.axisBottom(x).tickFormat(d3.format("d")));

g.append("g")
  .call(d3.axisLeft(y));

  g.append("text")
  .attr("class", "Year of Complaint")
  .attr("x", plotWidth / 2)
  .attr("y", plotHeight + 40)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .attr("font-weight", "bold")
  .text("Year");

g.append("text")
  .attr("class", "Total Number of Complaints")
  .attr("x", -plotHeight / 2)
  .attr("y", -40)
  .attr("text-anchor", "middle")
  .attr("font-size", "14px")
  .attr("font-weight", "bold")
  .attr("transform", "rotate(-90)") 
  .text("Number of Complaints");

g.selectAll(".line")
  .data(series)
  .join("path")
  .attr("class", "line")
  .attr("d", d => line(d.values))
  .attr("stroke", d => color(d.Gender))
  .attr("fill", "none")             
  .attr("stroke-width", 2);

    g.selectAll(".dot")
      .data(series.flatMap(s => s.values.map(v => ({ ...v, Gender: s.Gender }))))
      .join("circle")
      .attr("cx", d => x(d.Year))
      .attr("cy", d => y(d.Count))
      .attr("r", 4)
      .attr("fill", d => color(d.Gender))
      .attr("opacity", 0.8);

    const legend = g.selectAll(".legend")
      .data(series)
      .join("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${plotWidth + 20},${i * 25})`);

    legend.append("rect")
      .attr("width", 14)
      .attr("height", 14)
      .attr("fill", d => color(d.Gender));

    legend.append("text")
      .attr("x", 20)
      .attr("y", 11)
      .text(d => d.Gender);
  }
});
