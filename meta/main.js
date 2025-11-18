import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

//global state
let commits = [];
let filteredCommits = [];

let lines = filteredCommits.flatMap((d) => d.lines);
let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  });
 
let xScale, yScale, timeScale;
let commitProgress = 100;
let commitMaxTime = null;

//load the data 

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => {
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

  console.log("Loaded rows:", data.length);
  return data;
}

//process the commits
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
        type: r.type,
        line: r.line || 0,
        file: r.file,          // ← ADD THIS
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
    commit.id?.slice(0, 7) ?? "";

  document.getElementById("commit-date").textContent =
    commit.datetime?.toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) ?? "";

  document.getElementById("commit-time").textContent =
    commit.datetime?.toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    }) ?? "";

  document.getElementById("commit-author").textContent =
    commit.author ?? "Unknown";

  document.getElementById("commit-lines").textContent =
    commit.totalLines ?? "0";
}

//return the commit stats

function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").html("").append("dl").attr("class", "stats");

  dl.append("dt").html(
    'Total <abbr title="Lines of Code">LOC</abbr>'
  );
  dl.append("dd").text(data.length);

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  const numFiles = d3.groups(data, (d) => d.file).length;
  dl.append("dt").text("Number of files");
  dl.append("dd").text(numFiles);

  const avgDepth = d3.mean(data, (d) => d.depth)?.toFixed(2);
  dl.append("dt").text("Average depth");
  dl.append("dd").text(avgDepth ?? "N/A");

  const avgLineLength = d3.mean(data, (d) => d.length)?.toFixed(2);
  dl.append("dt").text("Average line length");
  dl.append("dd").text(avgLineLength ?? "N/A");
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
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .html("") // ensure empty
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("font-family", "sans-serif");

  // SCALES
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usable.left, usable.right])
    .nice();

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
    .tickFormat((d) => d.toString().padStart(2, "0") + ":00");

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

//udpate scatterplot when the slider moves 

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");
  if (svg.empty()) return;

  const width = 1200;
  const height = 768;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };

  const usable = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 15]);

  //update x axis
  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.timeDay.every(2))
    .tickFormat(d3.timeFormat("%a %d"));

  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  // update the dots on the scatterplot
  const dots = svg.select("g.dots");
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, (d) => d.id) // ★ STABLE KEY (Step 1.3)
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

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  // group by file
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }));

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


  container.select("dt").html(d =>
    `<code>${d.name}</code><small>${d.lines.length} lines</small>`
  );


  container.select("dd")
    .selectAll("div.loc")
    .data(d => d.lines)
    .join("div")
    .attr("class", d => `loc type-${d.type || "other"}`);
}


const timeSlider = document.getElementById("commit-progress");
const timeDisplay = document.getElementById("commit-time");

function onTimeSliderChange() {
  commitProgress = +timeSlider.value;
  commitMaxTime = timeScale.invert(commitProgress);

  timeDisplay.textContent = commitMaxTime.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits); 
  updateUnitVisualization(filteredCommits);
}

let data;

loadData().then((rows) => {
  data = rows;
  commits = processCommits(data);
  filteredCommits = commits;

  //here is the time scale for the slider
  timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, 100]);

  commitMaxTime = timeScale.invert(commitProgress);

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
  updateFileDisplay(commits);
  updateUnitVisualization(commits);

 //here are the slider events
  timeSlider.addEventListener("input", onTimeSliderChange);
  onTimeSliderChange();
});






