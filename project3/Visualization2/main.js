// See original API call:
// https://open-meteo.com/en/docs#latitude=32.87765&longitude=-117.237396&current=&minutely_15=&hourly=temperature_2m&daily=&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FLos_Angeles&models=

// Note from Sam: I ran this code to get the data for the weather at Center
// Hall, then saved the JSON as a file called weather-data.json.

// const params = {
//   latitude: 32.87765,
//   longitude: -117.237396,
//   hourly: 'temperature_2m',
//   temperature_unit: 'fahrenheit',
//   wind_speed_unit: 'mph',
//   precipitation_unit: 'inch',
//   timezone: 'America/Los_Angeles',
// };
// const url = 'https://api.open-meteo.com/v1/forecast';

// const queryString = new URLSearchParams(params).toString();
// const fullUrl = `${url}?${queryString}`;

// fetch(fullUrl)
//   .then((response) => response.json())
//   .then((data) => console.log(data));

// See original API call:
// https://open-meteo.com/en/docs#latitude=32.87765&longitude=-117.237396&current=&minutely_15=&hourly=temperature_2m&daily=&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FLos_Angeles&models=

// Note from Sam: I ran this code to get the data for the weather at Center
// Hall, then saved the JSON as a file called weather-data.json.

// const params = {
//   latitude: 32.87765,
//   longitude: -117.237396,
//   hourly: 'temperature_2m',
//   temperature_unit: 'fahrenheit',
//   wind_speed_unit: 'mph',
//   precipitation_unit: 'inch',
//   timezone: 'America/Los_Angeles',
// };
// const url = 'https://api.open-meteo.com/v1/forecast';

// const queryString = new URLSearchParams(params).toString();
// const fullUrl = `${url}?${queryString}`;

// fetch(fullUrl)
//   .then((response) => response.json())
//   .then((data) => console.log(data));

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let fullData = [];

async function init() {
  fullData = await d3.csv("allegations.csv");

  fullData.forEach(d => {
    d.complainant_age_incident = +d.complainant_age_incident;
  });

const years = Array.from(new Set(fullData.map(d => +d.year_received)))
  .filter(y => y >= 1999 && y <= 2019) 
  .sort((a, b) => a - b);

  const dropdown = d3.select("#yearFilter");
  dropdown.append("option")
    .attr("value", "all")
    .text("All Years");

  dropdown.selectAll("option.year")
    .data(years)
    .enter()
    .append("option")
    .attr("class", "year")
    .attr("value", d => d)
    .text(d => d);

  dropdown.on("change", () => {
    createBoxPlot(dropdown.node().value);
  });

  createBoxPlot("all");  
}

function createBoxPlot(selectedYear) {
  d3.select("#boxplot").selectAll("*").remove();

  const numericColumn = "complainant_age_incident";
  const groupColumn = "complainant_ethnicity";

  let filteredData = fullData.filter(d =>
    !isNaN(d[numericColumn]) &&
    d[numericColumn] >= 10 &&
    d[numericColumn] <= 100 &&
    d[groupColumn] &&
    d[groupColumn].trim() !== "" &&
    d[groupColumn] !== "etblank"
  );

  if (selectedYear !== "all") {
    filteredData = filteredData.filter(d => d.year_received === selectedYear);
  }

  const groupedData = d3.groups(filteredData, d => d[groupColumn]);

  const width = 900;
  const height = 500;
  const margin = { top: 40, right: 30, bottom: 150, left: 80 };

  if (groupedData.length === 0) {
  const svg = d3.select("#boxplot")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .style("text-anchor", "middle")
    .style("font-size", "20px")
    .text("No data available for selected year");
  return;
}

  const svg = d3.select("#boxplot")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleBand()
    .domain(groupedData.map(d => d[0]))
    .range([margin.left, width - margin.right])
    .padding(0.3);

  const stats = groupedData.map(([key, values]) => {
    const sorted = values.map(d => d[numericColumn]).sort(d3.ascending);
    return {
      key,
      min: sorted[0],
      q1: d3.quantile(sorted, 0.25),
      median: d3.quantile(sorted, 0.5),
      q3: d3.quantile(sorted, 0.75),
      max: sorted[sorted.length - 1]
    };
  });

  const y = d3.scaleLinear()
    .domain([d3.min(stats, d => d.min), d3.max(stats, d => d.max)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal(d3.schemeSet2)
    .domain(stats.map(d => d.key));

  svg.selectAll(".box")
    .data(stats)
    .enter()
    .append("rect")
    .attr("class", "box")
    .attr("x", d => x(d.key))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.q3))
    .attr("height", d => y(d.q1) - y(d.q3))
    .attr("fill", d => color(d.key))
    .attr("opacity", 0.8);

  svg.selectAll(".median")
    .data(stats)
    .enter()
    .append("line")
    .attr("class", "median")
    .attr("x1", d => x(d.key))
    .attr("x2", d => x(d.key) + x.bandwidth())
    .attr("y1", d => y(d.median))
    .attr("y2", d => y(d.median))
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  svg.selectAll(".whisker-line")
    .data(stats)
    .enter()
    .append("line")
    .attr("x1", d => x(d.key) + x.bandwidth() / 2)
    .attr("x2", d => x(d.key) + x.bandwidth() / 2)
    .attr("y1", d => y(d.min))
    .attr("y2", d => y(d.max))
    .attr("stroke", "black");

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "14px")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "16px");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 50)
    .style("text-anchor", "middle")
    .style("font-size", "18px")
    .text("Ethnicity of Complainant");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .style("text-anchor", "middle")
    .style("font-size", "18px")
    .text("Age of Complainant");

}

init();