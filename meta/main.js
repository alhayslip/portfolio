import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

// -----------------------------
// Global state
// -----------------------------
let data = [];
let commits = [];
let filteredCommits = [];

let commitProgress = 100; // 0–100
let commitMaxTime;
let timeScale;

let xScale, yScale;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

const sliderEl = document.getElementById("commit-progress");
const timeEl = document.getElementById("commit-time");

// -----------------------------
// Data loading & processing
// -----------------------------
async function loadData() {
  const rows = await d3.csv("loc.csv", row => {
    const dt = row.datetime
      ? new Date(row.datetime)
      : new Date(
          row.date +
            "T" +
            (row.time || "00:00:00") +
            (row.timezone || "")
        );

    return {
      ...row,
      datetime: dt,
      line: +row.line,
      depth: +row.depth,
      length: +row.length
    };
  });

  data = rows;
  commits = processCommits(rows);

  // Time scale for commitProgress → date
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  commitMaxTime = timeScale.invert(commitProgress);
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  renderScatterPlot(data, filteredCommits);
  updateCommitStats(filteredCommits);
  updateFileDisplay(filteredCommits);
  buildScrollyText();
  setupScrollama();
  setupSlider();
}

// Group rows into commits with summary fields
function processCommits(rows) {
  return d3.groups(rows, d => d.commit)
    .map(([id, rows]) => {
      const dt = rows[0].datetime;
      const hourFrac = dt.getHours() + dt.getMinutes() / 60;

      return {
        id,
        datetime: dt,
        hourFrac,
        author: rows[0].author,
        url: rows[0].url || "#",
        totalLines: d3.sum(rows, r => r.line || 0),
        maxDepth: d3.max(rows, r => r.depth || 0),
        longestLine: d3.max(rows, r => r.length || 0),
        maxLines: d3.max(rows, r => r.line || 0),
        // line-level details
        lines: rows.map(r => ({
          file: r.file,
          type: r.type || "other",
          line: r.line || 0,
          depth: r.depth || 0,
          length: r.length || 0
        }))
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}

// -----------------------------
// Scatterplot (Step 1.2+1.3)
// -----------------------------
function renderScatterPlot(data, commitsToShow) {
  const width = 1000;
  const height = 600;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };
  const usable = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usable.left, usable.right]);

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(2))
    .tickFormat(d3.timeFormat("%b %d"));

  const yAxis = d3.axisLeft(yScale)
    .tickValues(d3.range(0, 25, 4))
    .tickFormat(d => `${String(d).padStart(2, "0")}:00`);

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${usable.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usable.left}, 0)`)
    .call(yAxis);

  svg.append("g")
    .attr("class", "dots");

  updateScatterPlot(data, commitsToShow);
}

function updateScatterPlot(data, commitsToShow) {
  const svg = d3.select("#chart").select("svg");
  if (svg.empty()) return;

  // Update x-domain based on filtered commits
  xScale.domain(d3.extent(commitsToShow, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commitsToShow, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([4, 30]);

  const xAxis = d3.axisBottom(xScale)
    .ticks(d3.timeDay.every(2))
    .tickFormat(d3.timeFormat("%b %d"));

  // Clear and redraw x-axis
  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.call(xAxis);

  const dots = svg.select("g.dots");

  // Sort so big circles draw underneath small ones
  const sortedCommits = d3.sort(commitsToShow, d => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, d => d.id) // key = commit id (Step 1.3)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7);
}

// -----------------------------
// Commit summary stats (Step 1)
// -----------------------------
function updateCommitStats(commitsToShow) {
  const statsEl = document.getElementById("stats");
  if (!commitsToShow.length) {
    statsEl.innerHTML = "";
    return;
  }

  const allLines = commitsToShow.flatMap(d => d.lines);

  const totalCommits = commitsToShow.length;
  const totalFiles = new Set(allLines.map(l => l.file)).size;
  const totalLOC = d3.sum(commitsToShow, d => d.totalLines);
  const maxDepth = d3.max(allLines, l => l.depth) ?? 0;
  const longestLine = d3.max(allLines, l => l.length) ?? 0;
  const maxLines = d3.max(commitsToShow, d => d.maxLines) ?? 0;

  const stat = (label, value) => `
    <div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;

  statsEl.innerHTML =
    stat("Commits", totalCommits) +
    stat("Files", totalFiles) +
    stat("Total LOC", totalLOC) +
    stat("Max depth", maxDepth) +
    stat("Longest line", longestLine) +
    stat("Max lines", maxLines);
}

// -----------------------------
// STEP 2 – File unit visualization
// -----------------------------
function updateFileDisplay(commitsToShow) {
  const lines = commitsToShow.flatMap(d => d.lines);

  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length); // Step 2.3

  const container = d3.select("#files")
    .selectAll("div.file-row")
    .data(files, d => d.name)
    .join(
      enter => {
        const row = enter.append("div").attr("class", "file-row");
        row.append("dt");
        row.append("dd");
        return row;
      }
    );

  container.select("dt")
    .html(d => `
      <code>${d.name}</code>
      <small>${d.lines.length} lines</small>
    `);

  // One dot per line, colored by technology (Step 2.4)
  container.select("dd")
    .selectAll("div.loc")
    .data(d => d.lines)
    .join("div")
    .attr("class", "loc")
    .each(function (line) {
      this.style.setProperty("--color", colors(line.type));
    });
}

// -----------------------------
// STEP 1.1 & 1.2 – Slider wiring
// -----------------------------
function onTimeSliderChange() {
  commitProgress = +sliderEl.value;
  commitMaxTime = timeScale.invert(commitProgress);

  timeEl.textContent = commitMaxTime.toLocaleString("en", {
    dateStyle: "long",
    timeStyle: "short"
  });

  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  if (filteredCommits.length === 0) return;

  updateScatterPlot(data, filteredCommits);
  updateCommitStats(filteredCommits);
  updateFileDisplay(filteredCommits);
}

function setupSlider() {
  sliderEl.min = 0;
  sliderEl.max = 100;
  sliderEl.value = commitProgress;
  sliderEl.addEventListener("input", onTimeSliderChange);
  onTimeSliderChange(); // initialize
}

// -----------------------------
// STEP 3 – Scrollytelling
// -----------------------------
function buildScrollyText() {
  d3.select("#scatter-story")
    .selectAll(".step")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html((d, i) => `
      On ${d.datetime.toLocaleString("en", {
        dateStyle: "full",
        timeStyle: "short",
      })},
      I made <a href="${d.url}" target="_blank">
      ${i > 0 ? "another glorious commit" : "my first commit, and it was glorious"}
      </a>.
      I edited ${d.totalLines} lines across ${
        d3.rollups(
          d.lines,
          D => D.length,
          l => l.file
        ).length
      } files.
      Then I looked over all I had made, and I saw that it was very good.
    `);
}

function setupScrollama() {
  const scroller = scrollama();

  scroller
    .setup({
      container: "#scrolly-1",
      step: "#scrolly-1 .step",
      offset: 0.6
    })
    .onStepEnter(response => {
      const commit = response.element.__data__;

      // When a step enters, set commitMaxTime to that commit
      commitMaxTime = commit.datetime;
      commitProgress = timeScale(commitMaxTime);
      sliderEl.value = commitProgress;

      timeEl.textContent = commitMaxTime.toLocaleString("en", {
        dateStyle: "long",
        timeStyle: "short"
      });

      filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

      updateScatterPlot(data, filteredCommits);
      updateCommitStats(filteredCommits);
      updateFileDisplay(filteredCommits);
    });
}

// -----------------------------
// Kick everything off
// -----------------------------
loadData();


























