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
  const commits = d3.groups(data, d => d.commit).map(([id, rows]) => ({
    id,
    author: rows[0].author,
    datetime: new Date(rows[0].datetime),
    hourFrac:
      new Date(rows[0].datetime).getHours() +
      new Date(rows[0].datetime).getMinutes() / 60,
    totalLines: d3.sum(rows, d => +d.line || 0),
    lines: rows.map(r => ({ type: r.type, line: +r.line || 0 }))
  }));
  return commits;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById("commit-tooltip");
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById("commit-tooltip");
  if (!tooltip) return;
  const [x, y] = d3.pointer(event);
  tooltip.style.left = `${x + 20}px`;
  tooltip.style.top = `${y + 20}px`;
}

function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;
  document.getElementById("commit-link").textContent = commit.id?.slice(0, 7);
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

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 15]);
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width))
    .selectAll("line")
    .attr("stroke", "#ccc")
    .attr("stroke-opacity", 0.6);

  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom],
    ])
    .on("start brush end", brushed);

  svg.append("g").attr("class", "brush").call(brush);

  const dotsGroup = svg.append("g").attr("class", "dots");

  dotsGroup
    .selectAll("circle")
    .data(sortedCommits)
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
    .on("mousemove", (event) => updateTooltipPosition(event))
    .on("mouseleave", (event) => {
      d3.select(event.currentTarget).style("fill-opacity", 0.7);
      updateTooltipVisibility(false);
    });

  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.timeDay.every(2))
    .tickFormat(d3.timeFormat("%a %d"));

  const yAxis = d3
    .axisLeft(yScale)
    .tickValues(d3.range(0, 25, 2))
    .tickFormat((d) => String(d).padStart(2, "0") + ":00");

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

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const countElement = document.querySelector("#selection-count");
    if (countElement)
      countElement.textContent = `${
        selectedCommits.length || "No"
      } commits selected`;
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById("language-breakdown");
    if (!container) return;
    if (!selectedCommits.length) {
      container.innerHTML = "";
      return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines || []);
    if (lines.length === 0) {
      container.innerHTML = "<p>No language data available</p>";
      return;
    }

    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );

    container.innerHTML = "";
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format(".1~%")(proportion);
      container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
    }
  }

  function brushed(event) {
    const selection = event.selection;
    const circles = svg.selectAll("circle");

    if (!selection) {
      circles.classed("selected", false);
      renderSelectionCount(null);
      renderLanguageBreakdown(null);
      return;
    }

    circles.classed("selected", (d) => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
}

loadData().then((data) => {
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
});




