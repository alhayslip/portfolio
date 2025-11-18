import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

let commits = [];
let xScale, yScale;

/* ------------------------------------------------------------------
   LOAD + PROCESS DATA
------------------------------------------------------------------ */
async function loadData() {
  const rows = await d3.csv("loc.csv", row => {
    const dt = row.datetime
      ? new Date(row.datetime)
      : new Date(
          row.date + "T" + (row.time || "00:00:00")
        );

    return {
      ...row,
      datetime: dt,
      line: +row.line,
      file: row.file,
      commit: row.commit,
      url: row.url,
      type: row.type
    };
  });

  // Group by commit → build commit-level objects
  return d3.groups(rows, d => d.commit)
    .map(([id, rows]) => {
      const dt = new Date(rows[0].datetime);
      return {
        id,
        datetime: dt,
        url: rows[0].url,
        totalLines: d3.sum(rows, r => r.line),
        lines: rows
      };
    })
    .sort((a, b) => a.datetime - b.datetime);  // Ensure correct order
}

/* ------------------------------------------------------------------
   SCATTERPLOT
------------------------------------------------------------------ */
function renderScatterPlot(commits) {
  const width = 900;
  const height = 500;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  // X-axis: time
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right]);

  // Y-axis: commit index
  yScale = d3.scaleLinear()
    .domain([0, commits.length - 1])
    .range([height - margin.bottom, margin.top]);

  // Draw axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(d3.timeDay.every(2)));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale));

  // Dot layer
  svg.append("g").attr("class", "dots");

  // Draw initial plot (all commits)
  updateScatterPlot(commits);
}

function updateScatterPlot(subset) {
  const svg = d3.select("#chart svg");

  const dots = svg.select(".dots")
    .selectAll("circle")
    .data(subset, d => d.id);

  dots.join(
    enter => enter.append("circle")
      .attr("cx", d => xScale(d.datetime))
      .attr("cy", (_, i) => yScale(i))
      .attr("r", 6)
      .attr("fill", "steelblue")
      .style("opacity", 0.85),
    update => update
      .attr("cx", d => xScale(d.datetime))
      .attr("cy", (_, i) => yScale(i)),
    exit => exit.remove()
  );
}

/* ------------------------------------------------------------------
   SCROLL STORY TEXT FOR STEP 3
------------------------------------------------------------------ */
function buildStory(commits) {
  d3.select("#scatter-story")
    .selectAll(".step")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html(d => `
      <p>
        On ${d.datetime.toLocaleString("en", {
          dateStyle: "full",
          timeStyle: "short"
        })},
        I made <a href="${d.url}" target="_blank">a glorious commit</a>.
        I edited ${d.totalLines} lines across
        ${d3.rollups(d.lines, v => v.length, r => r.file).length} files.
      </p>
    `);
}

/* ------------------------------------------------------------------
   SCROLLAMA — UPDATE SCATTERPLOT ON SCROLL
------------------------------------------------------------------ */
function setupScrollama(commits) {
  const scroller = scrollama();

  scroller.setup({
    container: "#scrolly-1",
    step: "#scrolly-1 .step",
    offset: 0.6
  })
  .onStepEnter(response => {
    const commit = response.element.__data__;

    // Show only the current commit as the “focus”
    updateScatterPlot([commit]);
  });
}

/* ------------------------------------------------------------------
   BOOTSTRAP
------------------------------------------------------------------ */
loadData().then(data => {
  commits = data;

  renderScatterPlot(commits);
  buildStory(commits);
  setupScrollama(commits);
});

















