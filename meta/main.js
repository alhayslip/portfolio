import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// ---------- CONFIG ----------
const LOC_CSV_PATH = "loc.csv";

// If your loc.csv uses different column names, change this mapper.
function mapRow(d) {
  // TRY these possibilities:
  //  - d.commit or d.commit_hash
  //  - d.datetime, d.date, or d.author_time
  //  - d.loc or d.lines or d.lines_changed
  //  - d.depth, d.max_line_length, d.max_lines
  return {
    commitId: d.commit || d.commit_hash,
    // Date/time of commit:
    date: new Date(d.datetime || d.date || d.author_time),
    file: d.file,
    loc: +d.loc, // total LOC in that file at that commit
    depth: d.depth !== undefined ? +d.depth : null,
    maxLineLength:
      d.max_line_length !== undefined ? +d.max_line_length : null,
    maxLines: d.max_lines !== undefined ? +d.max_lines : null
  };
}

// ---------- DOM ELEMENTS ----------
const slider = document.getElementById("commitSlider");
const commitTimeLabel = document.getElementById("commitTime");
const filesList = d3.select("#filesList");

const statCommits = document.getElementById("stat-commits");
const statFiles = document.getElementById("stat-files");
const statLoc = document.getElementById("stat-loc");
const statDepth = document.getElementById("stat-depth");
const statLongest = document.getElementById("stat-longest");
const statMaxLines = document.getElementById("stat-maxLines");

// ---------- TIME OF DAY CHART SETUP ----------
const timeSvg = d3.select("#time-chart");
const timeWidth = +timeSvg.attr("width");
const timeHeight = +timeSvg.attr("height");
const timeMargin = { top: 20, right: 20, bottom: 30, left: 50 };
const timeInnerWidth = timeWidth - timeMargin.left - timeMargin.right;
const timeInnerHeight = timeHeight - timeMargin.top - timeMargin.bottom;

const timeG = timeSvg
  .append("g")
  .attr("transform", `translate(${timeMargin.left},${timeMargin.top})`);

const yTime = d3
  .scaleLinear()
  .domain([0, 24])
  .range([timeInnerHeight, 0]);

const yAxis = d3
  .axisLeft(yTime)
  .ticks(13)
  .tickFormat(h => d3.timeFormat("%H:%M")(new Date(2000, 0, 1, h)));

timeG
  .append("g")
  .attr("class", "axis axis-y")
  .call(yAxis);

const xTime = d3
  .scaleLinear()
  .range([0, timeInnerWidth]); // domain set after we know commit count

timeG
  .append("g")
  .attr("class", "axis axis-x")
  .attr("transform", `translate(0,${timeInnerHeight})`);

// ---------- DATE FORMATTER ----------
const formatCommitTime = d3.timeFormat("%B %-d, %Y at %-I:%M %p");

// ---------- LOAD & PREP DATA ----------
d3.csv(LOC_CSV_PATH).then(raw => {
  const rows = raw.map(mapRow).filter(d => d.commitId && !isNaN(d.date));

  // group rows by commitId
  const grouped = d3.group(rows, d => d.commitId);

  let commits = Array.from(grouped, ([commitId, rowsForCommit]) => {
    // sort rows by file name for stable ordering
    rowsForCommit.sort((a, b) => d3.ascending(a.file, b.file));

    const date = rowsForCommit[0].date;

    const files = rowsForCommit.map(r => ({
      file: r.file,
      loc: r.loc,
      depth: r.depth,
      maxLineLength: r.maxLineLength,
      maxLines: r.maxLines
    }));

    const totalLoc = d3.sum(files, f => f.loc || 0);
    const maxDepth = d3.max(files, f =>
      f.depth != null ? f.depth : -Infinity
    );
    const longestLine = d3.max(files, f =>
      f.maxLineLength != null ? f.maxLineLength : -Infinity
    );
    const maxLines = d3.max(files, f =>
      f.maxLines != null ? f.maxLines : f.loc || -Infinity
    );

    return {
      commitId,
      date,
      files,
      totalLoc,
      maxDepth: maxDepth === -Infinity ? null : maxDepth,
      longestLine: longestLine === -Infinity ? null : longestLine,
      maxLines: maxLines === -Infinity ? null : maxLines
    };
  });

  // sort commits chronologically
  commits.sort((a, b) => d3.ascending(a.date, b.date));

  // attach index + time-of-day
  commits = commits.map((c, i) => ({
    ...c,
    index: i,
    timeOfDay:
      c.date.getHours() + c.date.getMinutes() / 60 + c.date.getSeconds() / 3600
  }));

  // Slider config
  slider.min = 0;
  slider.max = Math.max(commits.length - 1, 0);
  slider.value = 0;

  // xTime domain & axis now that we know commit count
  xTime.domain([0, Math.max(commits.length - 1, 1)]);
  const xAxis = d3
    .axisBottom(xTime)
    .ticks(0) // no labels, just baseline
    .tickSize(0);

  timeG
    .select(".axis-x")
    .call(xAxis);

  // lines-per-dot scaling so we don't draw thousands of dots
  const maxLocInAnyCommit = d3.max(commits, c =>
    d3.max(c.files, f => f.loc || 0)
  );
  const linesPerDot =
    maxLocInAnyCommit > 60 ? Math.ceil(maxLocInAnyCommit / 40) : 1;

  // ---------- RENDER FUNCTION ----------
  function render(commitIndex) {
    const i = Math.max(0, Math.min(commits.length - 1, commitIndex));
    const current = commits[i];
    const seen = commits.slice(0, i + 1);

    // Commit time label
    commitTimeLabel.textContent = formatCommitTime(current.date);

    // Stats bar (current commit only)
    statCommits.textContent = seen.length.toString();
    statFiles.textContent = current.files.length.toString();
    statLoc.textContent = current.totalLoc.toString();
    statDepth.textContent =
      current.maxDepth != null ? current.maxDepth.toString() : "–";
    statLongest.textContent =
      current.longestLine != null ? current.longestLine.toString() : "–";
    statMaxLines.textContent =
      current.maxLines != null ? current.maxLines.toString() : "–";

    // FILE UNIT ROWS — latest commit only
    filesList.selectAll("*").remove();

    const color = d3
      .scaleOrdinal()
      .domain(current.files.map(f => f.file))
      .range(d3.schemeTableau10);

    const rowsSel = filesList
      .selectAll(".file-row")
      .data(current.files, d => d.file)
      .enter()
      .append("div")
      .attr("class", "file-row");

    // left side: file path + lines text
    const left = rowsSel.append("div");

    left
      .append("div")
      .attr("class", "file-path")
      .text(d => d.file);

    left
      .append("div")
      .attr("class", "file-lines")
      .text(d => `${d.loc ?? 0} lines`);

    // right side: dots
    const right = rowsSel.append("div").attr("class", "file-dots");

    right.each(function (d) {
      const dotsContainer = d3.select(this);
      dotsContainer.selectAll("*").remove();

      const loc = d.loc || 0;
      const dotCount = Math.max(
        1,
        Math.round(loc / linesPerDot) || 1
      ); // at least 1 if file exists

      dotsContainer
        .selectAll("span")
        .data(d3.range(dotCount))
        .enter()
        .append("span")
        .attr("class", "file-dot")
        .style("--dot-color", color(d.file));
    });

    // TIME-OF-DAY SCATTER — all commits up to slider
    const dots = timeG
      .selectAll(".time-dot")
      .data(seen, d => d.commitId);

    dots
      .enter()
      .append("circle")
      .attr("class", "time-dot")
      .attr("r", 10)
      .attr("cx", d => xTime(d.index))
      .attr("cy", d => yTime(d.timeOfDay))
      .attr("fill", "#60a5fa")
      .merge(dots)
      .transition()
      .duration(150)
      .attr("cx", d => xTime(d.index))
      .attr("cy", d => yTime(d.timeOfDay));

    dots.exit().remove();
  }

  // Initial render
  render(+slider.value);

  // Slider handler
  slider.addEventListener("input", () => {
    render(+slider.value);
  });
});




























