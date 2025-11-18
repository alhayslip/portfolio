import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

let data = [];
let commits = [];

let xScale, yScale;
let colors = d3.scaleOrdinal(d3.schemeTableau10);


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

  return rows;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([id, rows]) => {
      const dt = new Date(rows[0].datetime);
      return {
        id,
        author: rows[0].author,
        datetime: dt,
        hourFrac: dt.getHours() + dt.getMinutes() / 60,
        totalLines: d3.sum(rows, (r) => r.line || 0),
        url: rows[0].url || "#",

        // line-level details per commit
        lines: rows.map((r) => ({
          type: r.type || "other",
          line: r.line || 0,
          file: r.file
        }))
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}

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

  const svg = d3
    .select("#chart")
    .html("")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
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

  updateScatterPlot(commits);
}

function updateScatterPlot(commits) {
  const svg = d3.select("#chart svg");
  if (svg.empty()) return;

  xScale.domain(d3.extent(commits, (d) => d.datetime));

  svg.select("g.x-axis").call(
    d3.axisBottom(xScale)
      .ticks(d3.timeDay.every(2))
      .tickFormat(d3.timeFormat("%a %d"))
  );

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 15]);

  const dots = svg.select(".dots");

  dots
    .selectAll("circle")
    .data(commits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7);
}

function updateFileDisplay(commitList) {
  const lines = commitList.flatMap((d) => d.lines);

  const files = d3
    .groups(lines, (d) => d.file)
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
    (d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`
  );

  rows
    .select("dd")
    .selectAll("div.loc")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .each(function (d) {
      this.style.setProperty("--color", colors(d.type));
    });
}

function setupScatterScrolly() {
  d3.select("#scatter-story")
    .selectAll(".step")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html(d => `
      <p>On 
      <strong>${d.datetime.toLocaleString("en", {
        dateStyle: "full",
        timeStyle: "short",
      })}</strong>,
      I made commit <code>${d.id.slice(0, 7)}</code> modifying 
      <strong>${d.totalLines}</strong> lines.</p>
    `);

  const scroller1 = scrollama();

  scroller1
    .setup({
      container: "#scrolly-1",
      step: "#scrolly-1 .step",
      offset: 0.6
    })
    .onStepEnter((response) => {
      const commit = response.element.__data__;
      updateScatterPlot([commit]);
    });
}

function setupFileScrolly() {
  d3.select("#files-story")
    .selectAll(".step")
    .data(commits)
    .join("div")
    .attr("class", "step")
    .html(d => `
      <p>
        Commit <code>${d.id.slice(0,7)}</code> modified
        <strong>${d.lines.length}</strong> lines
        across <strong>${d3.groups(d.lines, r => r.file).length}</strong> files.
      </p>
    `);

  const scroller2 = scrollama();

  scroller2
    .setup({
      container: "#scrolly-2",
      step: "#scrolly-2 .step",
      offset: 0.6
    })
    .onStepEnter((response) => {
      const commit = response.element.__data__;
      updateFileDisplay([commit]);
    });
}

loadData().then((rows) => {
  data = rows;
  commits = processCommits(data);

  // Scatterplot (Step 3)
  renderScatterPlot(commits);
  setupScatterScrolly();

  updateFileDisplay(commits);  
  setupFileScrolly();         
});













