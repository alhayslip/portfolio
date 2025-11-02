import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;
      const ret = {
        id: commit,
        url: "https://github.com/vis-society/lab-7/commit/" + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };
      Object.defineProperty(ret, "lines", {
        value: lines,
        configurable: true,
        enumerable: false,
        writable: false,
      });
      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").append("dl").attr("class", "stats");
  dl.append("dt").html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append("dd").text(data.length);
  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 40, bottom: 50, left: 60 };

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([height - margin.bottom, margin.top]);

  const dots = svg.append("g").attr("class", "dots");

  dots
    .selectAll("circle")
    .data(commits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .attr("opacity", 0.7);

  const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%b %d"));
  const yAxis = d3.axisLeft(yScale).ticks(12).tickFormat((d) => `${d}:00`);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .call((g) => g.append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Date"));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis)
    .call((g) => g.append("text")
      .attr("x", -40)
      .attr("y", margin.top)
      .attr("fill", "black")
      .attr("text-anchor", "start")
      .text("Time of day (hours)"));
}

const data = await loadData();
const commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);




