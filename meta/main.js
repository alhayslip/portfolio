import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => {
    const parsedDate = row.datetime
      ? new Date(row.datetime)
      : new Date(row.date + "T" + (row.time || "00:00:00") + (row.timezone || ""));
    return {
      ...row,
      line: +row.line,
      depth: +row.depth,
      length: +row.length,
      datetime: parsedDate,
    };
  });
  console.log("✅ Loaded rows:", data.length);
  return data;
}

function processCommits(data) {
  return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, datetime } = first;
    return {
      id: commit,
      author,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
  });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select("#stats").append("dl").attr("class", "stats");

  dl.append("dt").html('Total <abbr title="Lines of Code">LOC</abbr>');
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
  
  const usableArea = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("font-family", "sans-serif")
    .style("background-color", "white");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left},0)`)
    .call(
      d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width)
    )
    .selectAll("line")
    .attr("stroke", "#ccc")
    .attr("stroke-opacity", 0.6);

  svg
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(commits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", 5)
    .attr("fill", "steelblue")
    .attr("opacity", 0.8);

  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.timeDay.every(2))
    .tickFormat(d3.timeFormat("%a %d"));

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, "0") + ":00");

  svg
    .append("g")
    .attr("transform", `translate(0,${usableArea.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-15)")
    .style("text-anchor", "end");

  svg
    .append("g")
    .attr("transform", `translate(${usableArea.left},0)`)
    .call(yAxis);
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Date");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Time of Day");
}

loadData().then((data) => {
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
});




