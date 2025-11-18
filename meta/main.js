import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

//Return the globals//
let raw = [];
let commits = [];
let xScale, yScale;

//Return the colors//
const typeColor = {
  js: "#1f77b4",
  css: "#2ca02c",
  html: "#ff7f0e",
  json: "#9467bd",
  other: "#7f7f7f"
};


//Load and process data//
async function loadData() {
  const rows = await d3.csv("loc.csv", (row) => {
    const dt = row.datetime
      ? new Date(row.datetime)
      : new Date(row.date + "T" + (row.time || "00:00:00") + (row.timezone || ""));

    return {
      ...row,
      datetime: dt,
      line: +row.line,
      depth: +row.depth,
      length: +row.length,
      type: row.type || "other",
      file: row.file
    };
  });

  return rows;
}

function processCommits(data) {
  return d3.groups(data, d => d.commit)
    .map(([id, rows]) => {
      const dt = new Date(rows[0].datetime);
      return {
        id,
        author: rows[0].author,
        datetime: dt,
        hourFrac: dt.getHours() + dt.getMinutes() / 60,
        totalLines: d3.sum(rows, r => r.line || 0),
        url: rows[0].url || "#",
        lines: rows.map(r => ({
          type: r.type || "other",
          file: r.file,
          line: r.line
        }))
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}


//scatterplot rendering//
function renderScatterPlot(commits) {
  const width = 1200;
  const height = 700;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };

  const usable = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom
  };

  const svg = d3.select("#chart")
    .html("")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usable.left, usable.right]);

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  // Axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${usable.bottom})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(d3.timeDay.every(2))
        .tickFormat(d3.timeFormat("%a %d"))
    );

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usable.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickValues(d3.range(0, 25, 2))
        .tickFormat(d => `${String(d).padStart(2, "0")}:00`)
    );

  svg.append("g").attr("class", "dots");

  updateScatterPlot(commits);
}

function updateScatterPlot(subset) {
  const svg = d3.select("#chart svg");
  if (svg.empty()) return;

  // Dot radius scale
  const extent = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain(extent)
    .range([3, 15]);

  const update = svg.select(".dots")
    .selectAll("circle")
    .data(subset, d => d.id);

  update.join(
    enter => enter.append("circle")
      .attr("cx", d => xScale(d.datetime))
      .attr("cy", d => yScale(d.hourFrac))
      .attr("r", 0)
      .attr("fill", "steelblue")
      .style("opacity", 0.85)
      .transition()
      .duration(350)
      .attr("r", d => rScale(d.totalLines)),
    update => update
      .transition()
      .duration(350)
      .attr("cx", d => xScale(d.datetime))
      .attr("cy", d => yScale(d.hourFrac))
      .attr("r", d => rScale(d.totalLines))
  );
}


//file unit visualization//
function updateFileDisplay(commitArr) {
  const lines = commitArr.flatMap(d => d.lines);

  const files = d3.groups(lines, r => r.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const rows = d3.select("#files")
    .selectAll(".file-row")
    .data(files, d => d.name)
    .join(
      enter => {
        const row = enter.append("div").attr("class", "file-row");
        row.append("dt");
        row.append("dd");
        return row;
      },
      update => update,
      exit => exit.remove()
    );

  rows.select("dt").html(d =>
    `<code>${d.name}</code><small>${d.lines.length} lines</small>`
  );

  rows.select("dd")
    .selectAll(".loc")
    .data(d => d.lines)
    .join(
      enter => enter.append("div")
        .attr("class", "loc")
        .style("--color", d => typeColor[d.type] || typeColor.other),
      update => update,
      exit => exit.remove()
    );
}


//Return scrolly 1 visualization//
function setupScatterScrolly() {
  d3.select("#scatter-story")
    .selectAll(".step")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html(d => `
      <p>
        On <strong>${d.datetime.toLocaleString()}</strong>,
        commit <code>${d.id.slice(0,7)}</code> modified
        <strong>${d.totalLines}</strong> lines.
      </p>
    `);

  const scroller = scrollama();

  scroller.setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
    offset: 0.6
  })
  .onStepEnter(resp => {
    const commit = resp.element.__data__;
    updateScatterPlot([commit]);
  });
}


//REturn scrolly 2 file units//
function setupFileScrolly() {

  // Lab requirement: duplicate commit data for the second scrolly
  const commitsCopy = commits.map(d => structuredClone(d));

  d3.select("#files-story")
    .selectAll(".step")
    .data(commitsCopy)
    .join("div")
    .attr("class", "step")
    .html(d => `
      <p>
        Commit <code>${d.id.slice(0,7)}</code> modified
        <strong>${d.lines.length}</strong> lines across
        <strong>${d3.groups(d.lines, r => r.file).length}</strong> files.
      </p>
    `);

  const scroller = scrollama();

  scroller.setup({
    container: "#scrolly-2",
    step: "#scrolly-2 .step",
    offset: 0.6
  })
  .onStepEnter(resp => {
    const commit = resp.element.__data__;
    updateFileDisplay([commit]);
  });
}


//bootsrap everything//
loadData().then(rows => {
  raw = rows;
  commits = processCommits(rows);

  renderScatterPlot(commits);
  setupScatterScrolly();

  updateFileDisplay(commits);
  setupFileScrolly();
});















