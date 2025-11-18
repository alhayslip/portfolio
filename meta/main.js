import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// ------------------------------------------------------
// AUTO PATH for GitHub Pages vs localhost
// ------------------------------------------------------
const isGithub = location.hostname.includes("github.io");
const LOC_CSV_PATH = isGithub
  ? "/portfolio/meta/loc.csv"
  : "loc.csv";

// ------------------------------------------------------
// MAP ROWS EXACTLY TO YOUR CSV
// ------------------------------------------------------
function mapRow(d) {
  return {
    commitId: d.commit,
    file: d.file.replace(/\\/g, "/"),  // normalize windows paths
    line: +d.line,
    length: +d.length,
    depth: +d.depth,
    datetime: new Date(d.datetime),    // ISO format from elocuent
    type: d.type
  };
}

// ------------------------------------------------------
// LOAD + PROCESS DATA
// ------------------------------------------------------
d3.csv(LOC_CSV_PATH).then(raw => {
  if (!raw || raw.length === 0) {
    console.error("loc.csv NOT FOUND at:", LOC_CSV_PATH);
  }

  const rows = raw.map(mapRow).filter(d => !isNaN(d.datetime));

  // group by commit
  const commitsGrouped = d3.group(rows, d => d.commitId);

  let commits = [];

  for (const [commitId, rowsInCommit] of commitsGrouped) {
    // group by file inside commit
    const filesGrouped = d3.group(rowsInCommit, d => d.file);

    const files = [];

    for (const [file, lines] of filesGrouped) {
      const totalLoc = d3.sum(lines, r => r.length);
      const maxDepth = d3.max(lines, r => r.depth);
      const longestLine = d3.max(lines, r => r.length);
      const maxLines = d3.max(lines, r => r.line);

      files.push({
        file,
        loc: totalLoc,
        depth: maxDepth,
        maxLineLength: longestLine,
        maxLines
      });
    }

    const date = rowsInCommit[0].datetime;

    commits.push({
      commitId,
      date,
      files,
      totalLoc: d3.sum(files, f => f.loc),
      maxDepth: d3.max(files, f => f.depth),
      longestLine: d3.max(files, f => f.maxLineLength),
      maxLines: d3.max(files, f => f.maxLines)
    });
  }

  // sort chronologically
  commits.sort((a, b) => d3.ascending(a.date, b.date));

  // add index + time-of-day
  commits = commits.map((c, i) => ({
    ...c,
    index: i,
    timeOfDay: (
      c.date.getHours() +
      c.date.getMinutes() / 60 +
      c.date.getSeconds() / 3600
    )
  }));

  // ------------------------------------------------------
  // DOM REFERENCES
  // ------------------------------------------------------
  const slider = document.getElementById("commitSlider");
  const commitTimeLabel = document.getElementById("commitTime");
  const filesList = d3.select("#filesList");

  const statCommits = document.getElementById("stat-commits");
  const statFiles = document.getElementById("stat-files");
  const statLoc = document.getElementById("stat-loc");
  const statDepth = document.getElementById("stat-depth");
  const statLongest = document.getElementById("stat-longest");
  const statMaxLines = document.getElementById("stat-maxLines");

  // ------------------------------------------------------
  // TIME OF DAY CHART WITH **DATE ON X AXIS**
  // ------------------------------------------------------
  const svg = d3.select("#time-chart");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // y = time of day
  const yTime = d3.scaleLinear()
    .domain([0, 24])
    .range([innerHeight, 0]);

  g.append("g")
    .attr("class", "axis-y")
    .call(
      d3.axisLeft(yTime)
        .ticks(13)
        .tickFormat(h =>
          d3.timeFormat("%H:%M")(new Date(2000, 0, 1, h))
        )
    );

  // x = date scale
  const xTime = d3.scaleTime()
    .domain(d3.extent(commits, d => d.date))
    .range([0, innerWidth]);

  const xAxisGroup = g.append("g")
    .attr("class", "axis-x")
    .attr("transform", `translate(0,${innerHeight})`);

  xAxisGroup.call(
    d3.axisBottom(xTime)
      .ticks(d3.timeDay.every(4))         // one tick per day
      .tickFormat(d3.timeFormat("%b %d")) // "Oct 21"
  );

  const formatCommitTime = d3.timeFormat(
    "%B %-d, %Y at %-I:%M %p"
  );

  // ------------------------------------------------------
  // SLIDER SETUP
  // ------------------------------------------------------
  slider.min = 0;
  slider.max = commits.length - 1;
  slider.value = 0;

  // ------------------------------------------------------
  // RENDER FUNCTION
  // ------------------------------------------------------
  function render(index) {
    const i = Math.max(0, Math.min(commits.length - 1, index));
    const current = commits[i];
    const seen = commits.slice(0, i + 1);

    // update commit timestamp
    commitTimeLabel.textContent = formatCommitTime(current.date);

    // update stats
    statCommits.textContent = seen.length;
    statFiles.textContent = current.files.length;
    statLoc.textContent = current.totalLoc;
    statDepth.textContent = current.maxDepth ?? "–";
    statLongest.textContent = current.longestLine ?? "–";
    statMaxLines.textContent = current.maxLines ?? "–";

    // ------------------------------------------------------
    // FILE ROWS
    // ------------------------------------------------------
    filesList.selectAll("*").remove();

    const color = d3.scaleOrdinal()
      .domain(current.files.map(f => f.file))
      .range(d3.schemeTableau10);

    const rowsSel = filesList
      .selectAll(".file-row")
      .data(current.files)
      .enter()
      .append("div")
      .attr("class", "file-row");

    // left column
    const left = rowsSel.append("div");

    left.append("div")
      .attr("class", "file-path")
      .text(d => d.file);

    left.append("div")
      .attr("class", "file-lines")
      .text(d => `${d.loc} lines`);

    // right column: unit dots
    const right = rowsSel.append("div").attr("class", "file-dots");

    right.each(function (d) {
      const dotsContainer = d3.select(this);
      dotsContainer.selectAll("*").remove();

      const loc = d.loc;
      const maxDots = 18;
      const dotCount = Math.max(
        1,
        Math.round((loc / current.totalLoc) * maxDots)
      );

      dotsContainer
        .selectAll("span")
        .data(d3.range(dotCount))
        .enter()
        .append("span")
        .attr("class", "file-dot")
        .style("--dot-color", color(d.file));
    });

    // ------------------------------------------------------
    // TIME-OF-DAY SCATTER (DATE on X)
    // ------------------------------------------------------
    const dots = g.selectAll(".time-dot")
      .data(seen, d => d.commitId);

    dots.enter()
      .append("circle")
      .attr("class", "time-dot")
      .attr("r", 10)
      .attr("cx", d => xTime(d.date))
      .attr("cy", d => yTime(d.timeOfDay))
      .attr("fill", "#60a5fa")
      .merge(dots)
      .transition()
      .duration(150)
      .attr("cx", d => xTime(d.date))
      .attr("cy", d => yTime(d.timeOfDay));

    dots.exit().remove();
  }

  // initial render
  render(+slider.value);

  slider.addEventListener("input", () => {
    render(+slider.value);
  });
});

























