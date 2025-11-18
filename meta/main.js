import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

//globals//
let data = [];
let commits = [];
let filteredCommits = [];

let xScale, yScale, timeScale;
let commitProgress = 100;
let commitMaxTime = null;

let colors = d3.scaleOrdinal(d3.schemeTableau10);

//Load Data//
async function loadData() {
  const rows = await d3.csv("loc.csv", (row) => {
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

  console.log("Loaded rows:", rows.length);
  return rows;
}

//Process Commits//
function processCommits(data) {
  return d3.groups(data, (d) => d.commit).map(([id, rows]) => {
    const dt = new Date(rows[0].datetime);

    return {
      id,
      author: rows[0].author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: d3.sum(rows, (r) => r.line || 0),

      // Keep each line's type + file
      lines: rows.map((r) => ({
        type: r.type || "other",
        line: r.line || 0,
        file: r.file
      }))
    };
  });
}

//Tooltip//
function updateTooltipVisibility(show) {
  document.getElementById("commit-tooltip").hidden = !show;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  const [x, y] = d3.pointer(event);
  tooltip.style.left = `${x + 20}px`;
  tooltip.style.top = `${y + 20}px`;
}

function renderTooltipContent(commit) {
  document.getElementById("commit-link").textContent = commit.id.slice(0, 7);
  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleDateString();
  document.getElementById("commit-time-tooltip").textContent =
    commit.datetime.toLocaleTimeString();
  document.getElementById("commit-author").textContent = commit.author;
  document.getElementById("commit-lines").textContent = commit.totalLines;
}

//Return the Stats//
function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").html("").append("dl");

  dl.append("dt").html(`Total <abbr title="Lines of Code">LOC</abbr>`);
  dl.append("dd").text(data.length);

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  dl.append("dt").text("Number of files");
  dl.append("dd").text(d3.groups(data, d => d.file).length);

  dl.append("dt").text("Average depth");
  dl.append("dd").text(d3.mean(data, d => d.depth)?.toFixed(2) ?? "N/A");

  dl.append("dt").text("Average line length");
  dl.append("dd").text(d3.mean(data, d => d.length)?.toFixed(2) ?? "N/A");
}

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const rows = d3
    .select("#files")
    .selectAll("div.file-row")
    .data(files, (d) => d.name)
    .join((enter) => {
      const row = enter.append("div").attr("class", "file-row");
      row.append("dt");
      row.append("dd");
      return row;
    });

  rows.select("dt").html(
    d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`
  );

  rows.select("dd")
    .selectAll("div.loc")
    .data(d => d.lines)
    .join("div")
    .attr("class", "loc")
    .each(function(d) {
      this.style.setProperty("--color", colors(d.type));
    });
}

//Return a scatterplot//
function renderScatterPlot(data, commits) {
  const width = 1200;
  const height = 768;
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

  updateScatterPlot(data, commits);
}

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart svg");
  if (svg.empty()) return;

  xScale.domain(d3.extent(commits, d => d.datetime));

  svg.select("g.x-axis")
    .call(
      d3.axisBottom(xScale)
        .ticks(d3.timeDay.every(2))
        .tickFormat(d3.timeFormat("%a %d"))
    );

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 15]);

  svg.select(".dots")
    .selectAll("circle")
    .data(d3.sort(commits, d => -d.totalLines), d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", updateTooltipPosition)
    .on("mouseleave", function() {
      d3.select(this).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

//Return a slider//
const timeSlider = document.getElementById("commit-progress");
const timeOutput = document.getElementById("commit-time");

function onTimeSliderChange() {
  commitProgress = +timeSlider.value;
  commitMaxTime = timeScale.invert(commitProgress);

  timeOutput.textContent =
    commitMaxTime.toLocaleString("en-US", {
      dateStyle: "long",
      timeStyle: "short"
    });

  filteredCommits =
    commits.filter(d => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

//Initialize the data//
loadData().then((rows) => {
  data = rows;
  commits = processCommits(data);
  filteredCommits = commits;

  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  commitMaxTime = timeScale.invert(commitProgress);

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
  updateFileDisplay(commits);

  timeSlider.addEventListener("input", onTimeSliderChange);
  onTimeSliderChange();
});










