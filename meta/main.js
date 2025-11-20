// META — Complete main.js with:
// ✔ Scatterplot
// ✔ File-lines dotplot
// ✔ Slider filtering
// ✔ Summary statistics
// ✔ Clean D3 architecture

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const LOC_CSV_PATH = "loc.csv";

/* -------------------------------------------------------------
   1. DATA LOADING + PROCESSING
------------------------------------------------------------- */

function mapRow(d) {
  return {
    id: d.commit,
    file: d.file.replace(/\\/g, "/"),
    line: +d.line,
    length: +d.length,
    depth: +d.depth,
    datetime: new Date(d.datetime),
    type: d.type
  };
}

function processCommits(rows) {
  return d3.rollups(
    rows,
    (D) => ({
      id: D[0].id,
      datetime: D[0].datetime,
      lines: D,
      totalLines: D.length,
      hourFrac:
        D[0].datetime.getHours() + D[0].datetime.getMinutes() / 60
    }),
    (d) => d.id
  )
    .map(([, commit]) => commit)
    .sort((a, b) => a.datetime - b.datetime); // chronological
}

let commits = [];
let filteredCommits = [];

let timeScale;
let commitMaxTime;
let xScale, yScale;

/* -------------------------------------------------------------
   2. INITIALIZE PAGE
------------------------------------------------------------- */

d3.csv(LOC_CSV_PATH).then((raw) => {
  const rows = raw.map(mapRow).filter((d) => !isNaN(d.datetime));
  commits = processCommits(rows);

  // IMPORTANT: Scatterplot first so scales exist
  renderScatterPlot(commits);

  initializeSlider();

  filteredCommits = commits;
  updateFileDisplay(filteredCommits);
  updateSummaryStats(filteredCommits);
});

/* -------------------------------------------------------------
   3. SLIDER + TIME LABEL
------------------------------------------------------------- */

function initializeSlider() {
  timeScale = d3
    .scaleTime()
    .domain([
      d3.min(commits, (d) => d.datetime),
      d3.max(commits, (d) => d.datetime)
    ])
    .range([0, 100]);

  document
    .getElementById("commit-progress")
    .addEventListener("input", onSliderChange);

  onSliderChange(); // initialize
}

function onSliderChange() {
  const pct = +document.getElementById("commit-progress").value;

  commitMaxTime = timeScale.invert(pct);

  document.getElementById("commit-time").textContent =
    commitMaxTime.toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short"
    });

  filteredCommits = commits.filter(
    (d) => d.datetime <= commitMaxTime
  );

  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
  updateSummaryStats(filteredCommits);
}

/* -------------------------------------------------------------
   4. COMMITS BY TIME OF DAY SCATTERPLOT
------------------------------------------------------------- */

function renderScatterPlot(data) {
  const width = 1000;
  const height = 420;
  const margin = { top: 10, right: 10, bottom: 30, left: 35 };

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  xScale = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.datetime))
    .range([margin.left, width - margin.right]);

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .attr("class", "x-axis")
    .attr(
      "transform",
      `translate(0, ${height - margin.bottom})`
    )
    .call(d3.axisBottom(xScale));

  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(6));

  svg.append("g").attr("class", "dots");

  updateScatterPlot(data);
}

function updateScatterPlot(data) {
  const svg = d3.select("#chart svg");

  xScale.domain(d3.extent(data, (d) => d.datetime));

  svg.select(".x-axis").call(d3.axisBottom(xScale));

  const [minLines, maxLines] = d3.extent(
    data,
    (d) => d.totalLines
  );
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([2, 30]);

  svg
    .select(".dots")
    .selectAll("circle")
    .data(data, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "#1f77b4")
    .style("opacity", 0.75);
}

/* -------------------------------------------------------------
   5. FILE LINES DOTPLOT (Colored by Technology)
------------------------------------------------------------- */

function updateFileDisplay(filtered) {
  const lines = filtered.flatMap((d) => d.lines);

  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const techTypes = Array.from(new Set(lines.map((d) => d.type)));
  const colors = d3
    .scaleOrdinal(d3.schemeTableau10)
    .domain(techTypes);

  const rows = d3
    .select("#files")
    .selectAll(".file-row")
    .data(files, (d) => d.name)
    .join((enter) => {
      const row = enter
        .append("div")
        .attr("class", "file-row");

      row.append("div").attr("class", "file-name");
      row.append("div").attr("class", "file-lines");
      row.append("div").attr("class", "file-dots");

      return row;
    });

  rows.select(".file-name").text((d) => d.name);
  rows
    .select(".file-lines")
    .text((d) => `${d.lines.length} lines`);

  rows
    .select(".file-dots")
    .selectAll(".loc")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .style("background", (d) => colors(d.type));
}

/* -------------------------------------------------------------
   6. SUMMARY STATISTICS
------------------------------------------------------------- */

function updateSummaryStats(filtered) {
  const totalCommits = filtered.length;
  const totalLines = d3.sum(filtered, (d) => d.totalLines);

  const allLines = filtered.flatMap((d) => d.lines);

  const fileCounts = d3.rollups(
    allLines,
    (v) => v.length,
    (d) => d.file
  );

  const totalFiles = fileCounts.length;

  const largestCommit = d3.max(
    filtered,
    (d) => d.totalLines
  );

  const [activeFile, activeLines] =
    fileCounts.sort((a, b) => b[1] - a[1])[0] || [
      "–",
      0
    ];

  const techSet = new Set(allLines.map((d) => d.type));
  const techString =
    [...techSet].join(", ") || "–";

  document.getElementById(
    "stat-commits"
  ).textContent = totalCommits;
  document.getElementById(
    "stat-lines"
  ).textContent = totalLines;
  document.getElementById(
    "stat-files"
  ).textContent = totalFiles;
  document.getElementById(
    "stat-largest"
  ).textContent = largestCommit;
  document.getElementById(
    "stat-active"
  ).textContent = `${activeFile} (${activeLines})`;
  document.getElementById(
    "stat-tech"
  ).textContent = techString;
}



































