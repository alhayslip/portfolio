import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let data = [];
let commits = [];
let filteredCommits = [];

let xScale, yScale, timeScale;
let commitProgress = 100;
let commitMaxTime = null;

async function loadData() {
  const rows = await d3.csv("loc.csv", (row) => {
    const parsedDate = row.datetime
      ? new Date(row.datetime)
      : new Date(
          row.date +
            "T" +
            (row.time || "00:00:00") +
            (row.timezone || "")
        );

    return {
      ...row,
      line: +row.line,
      depth: +row.depth,
      length: +row.length,
      datetime: parsedDate,
    };
  });

  console.log("Loaded rows:", rows.length);
  return rows;
}

function processCommits(data) {
  return d3.groups(data, (d) => d.commit).map(([id, rows]) => {
    const first = rows[0];
    const dt = new Date(first.datetime);

    return {
      id,
      author: first.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: d3.sum(rows, (r) => r.line || 0),
      lines: rows.map((r) => ({
        type: r.type || "other",
        line: r.line || 0,
        file: r.file,
      })),
    };
  });
}

function updateTooltipVisibility(show) {
  document.getElementById("commit-tooltip").hidden = !show;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  if (!tooltip) return;

  const [x, y] = d3.pointer(event);
  tooltip.style.left = `${x + 20}px`;
  tooltip.style.top = `${y + 20}px`;
}

function renderTooltipContent(commit) {
  if (!commit) return;

  document.getElementById("commit-link").textContent =
    commit.id.slice(0, 7);

  document.getElementById("commit-date").textContent =
    commit.datetime.toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  document.getElementById("commit-time-tooltip").textContent =
    commit.datetime.toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });

  document.getElementById("commit-author").textContent =
    commit.author ?? "Unknown";

  document.getElementById("commit-lines").textContent =
    commit.totalLines ?? "0";
}

function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").html("").append("dl").attr("class", "stats");

  dl.append("dt").html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append("dd").text(data.length);

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  const numFiles = d3.groups(data, (d) => d.file).length;
  dl.append("dt").text("Number of files");
  dl.append("dd").text(numFiles);

  dl.append("dt").text("Average depth");
  dl.append("dd").text(d3.mean(data, (d) => d.depth)?.toFixed(2) ?? "N/A");

  dl.append("dt").text("Average line length");
  dl.append("dd").text(d3.mean(data, (d) => d.length)?.toFixed(2) ?? "N/A");
}

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }));

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
    (d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`
  );

  rows
    .select("dd")
    .selectAll("div.loc")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc");
}

function renderScatterPlot(data, commits) {
  const width = 1200;
  const height = 768;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };

  const usable = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .html("")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usable.left, usable.right]);

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.timeDay.every(2))
    .tickFormat(d3.timeFormat("%a %d"));

  const yAxis = d3
    .axisLeft(yScale)
    .tickValues(d3.range(0, 25, 2))
    .tickFormat((d) => `${String(d).padStart(2, "0")}:00`);

  svg
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${usable.bottom})`)
    .call(xAxis);

  svg
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usable.left}, 0)`)
    .call(yAxis);

  svg.append("g").attr("class", "dots");

  updateScatterPlot(data, commits);
}

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");
  if (svg.empty()) return;

  xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 15]);

  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.timeDay.every(2))
    .tickFormat(d3.timeFormat("%a %d"));

  svg.select("g.x-axis").call(xAxis);

  const dots = svg.select("g.dots");
  const sorted = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sorted, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      d3.select(event.currentTarget).style("fill-opacity", 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mousemove", updateTooltipPosition)
    .on("mouseleave", function () {
      d3.select(this).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });
}

const timeSlider = document.getElementById("commit-progress");
const sliderTimeDisplay = document.getElementById("commit-time");

function onTimeSliderChange() {
  commitProgress = +timeSlider.value;
  commitMaxTime = timeScale.invert(commitProgress);

  sliderTimeDisplay.textContent = commitMaxTime.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

loadData().then((rows) => {
  data = rows;
  commits = processCommits(data);
  filteredCommits = commits;

  timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, 100]);

  commitMaxTime = timeScale.invert(commitProgress);

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
  updateFileDisplay(commits);

  timeSlider.addEventListener("input", onTimeSliderChange);
  onTimeSliderChange();
});








