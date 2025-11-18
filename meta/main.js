import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

let commits = [];
let xScale, yScale;

/* ============================================================
   Load + Process Data
============================================================ */
async function loadData() {
  const rows = await d3.csv("loc.csv", r => {
    const dt = r.datetime
      ? new Date(r.datetime)
      : new Date(r.date + "T" + (r.time || "00:00:00"));

    return {
      ...r,
      datetime: dt,
      line: +r.line,
      depth: +r.depth,
      length: +r.length
    };
  });

  // Group by commit
  return d3.groups(rows, d => d.commit)
    .map(([id, lines]) => {
      const dt = lines[0].datetime;
      const hourFrac = dt.getHours() + dt.getMinutes() / 60;

      return {
        id,
        datetime: dt,
        hourFrac,
        totalLines: d3.sum(lines, d => d.line),
        maxDepth: d3.max(lines, d => d.depth),
        longestLine: d3.max(lines, d => d.length),
        maxLines: d3.max(lines, d => d.line),
        url: lines[0].url,
        files: d3.groups(lines, d => d.file)
          .map(([file, rows]) => ({ file, rows })),
        lines
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}

/* ============================================================
   Unified Scatterplot
============================================================ */
function renderScatter() {
  const width = 900;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };

  const svg = d3.select("#chart")
    .html("")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  // X = date, Y = time-of-day
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right]);

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(d3.timeDay.every(2))
        .tickFormat(d3.timeFormat("%b %d"))
    );

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickValues(d3.range(0, 25, 4))
        .tickFormat(d => `${String(d).padStart(2, "0")}:00`)
    );

  svg.append("g").attr("class", "dots");
}

/* ============================================================
   Unified Update Function (slider + scrollytelling)
============================================================ */
function updateScatter(commitArray) {
  const svg = d3.select("#chart svg");

  svg.select(".dots")
    .selectAll("circle")
    .data(commitArray, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", 10)
    .attr("fill", "steelblue")
    .attr("opacity", 0.85);
}

/* ============================================================
   Dot Plot (unique color per file)
============================================================ */
function updateFiles(commit) {
  // unique color per file (not per line)
  const color = d3.scaleOrdinal()
    .domain(commit.files.map(f => f.file))
    .range(d3.schemeTableau10);

  const rows = d3.select("#files")
    .selectAll(".file-row")
    .data(commit.files, d => d.file);

  const enter = rows.enter()
    .append("div")
    .attr("class", "file-row");

  enter.append("dt");
  enter.append("dd");

  const merged = enter.merge(rows);

  merged.select("dt")
    .html(d => `
      <code>${d.file}</code>
      <small>${d.rows.length} lines</small>
    `);

  // all dots for the same file share color
  merged.select("dd")
    .selectAll(".loc")
    .data(d => d.rows)
    .join("div")
    .attr("class", "loc")
    .style("--color", d => color(d.file));

  rows.exit().remove();
}

/* ============================================================
   Summary Statistics
============================================================ */
function updateStats(commit) {
  const stat = document.getElementById("stats");
  stat.innerHTML = "";

  const add = (label, value) => {
    const d = document.createElement("div");
    d.innerHTML = `
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    `;
    stat.appendChild(d);
  };

  add("Commits", 1);
  add("Files", commit.files.length);
  add("Total LOC", commit.totalLines);
  add("Max depth", commit.maxDepth);
  add("Longest line", commit.longestLine);
  add("Max lines", commit.maxLines);
}

/* ============================================================
   Slider (all commits up to this point)
============================================================ */
function setupSlider() {
  const slider = document.getElementById("commit-slider");
  const dateLabel = document.getElementById("current-date");

  slider.min = 0;
  slider.max = commits.length - 1;
  slider.value = commits.length - 1;

  function change() {
    const idx = +slider.value;
    const commit = commits[idx];

    // update date label
    dateLabel.textContent = commit.datetime.toLocaleString();

    // show ALL commits up to the slider index
    updateScatter(commits.slice(0, idx + 1));

    updateFiles(commit);
    updateStats(commit);
  }

  slider.addEventListener("input", change);
  change();
}

/* ============================================================
   Scrollytelling (Step 3)
============================================================ */
function buildScrollyStory() {
  d3.select("#scatter-story")
    .selectAll(".step")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html((d, i) => `
      <p>
        On ${d.datetime.toLocaleString("en", {
          dateStyle: "full",
          timeStyle: "short",
        })},
        I made <a href="${d.url}" target="_blank">
        ${i === 0 ? "my first glorious commit" : "another glorious commit"}
        </a>.
        I edited ${d.totalLines} lines across
        ${d3.rollups(d.lines, D => D.length, r => r.file).length} files.
      </p>
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
    .onStepEnter(res => {
      const commit = res.element.__data__;
      // scrollytelling shows just that commit
      updateScatter([commit]);
    });
}

/* ============================================================
   Bootstrap
============================================================ */
loadData().then(data => {
  commits = data;

  renderScatter();
  setupSlider();

  buildScrollyStory();
  setupScrollama();
});

























