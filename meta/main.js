import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

//load the data

async function loadData() {
  const data = await d3.csv("loc.csv", row => {
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

  console.log("✅ Loaded rows:", data.length);
  return data;
}

function processCommits(rows) {
  return d3.groups(rows, d => d.commit).map(([id, group]) => {
    const first = group[0];
    const dt = new Date(first.datetime);

    return {
      id,
      author: first.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: d3.sum(group, r => r.line || 0),
      lines: group.map(r => ({
        type: r.type,
        line: r.line || 0,
      }))
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

//commit the summary statistics

function renderCommitInfo(rawData, commits) {
  const dl = d3.select("#stats")
    .append("dl")
    .attr("class", "stats");

  dl.append("dt").html('Total <abbr title="Lines of Code">LOC</abbr>');
  dl.append("dd").text(rawData.length);

  dl.append("dt").text("Total commits");
  dl.append("dd").text(commits.length);

  const numFiles = d3.groups(rawData, d => d.file).length;
  dl.append("dt").text("Number of files");
  dl.append("dd").text(numFiles);

  dl.append("dt").text("Average depth");
  dl.append("dd").text(d3.mean(rawData, d => d.depth)?.toFixed(2) ?? "N/A");

  dl.append("dt").text("Average line length");
  dl.append("dd").text(d3.mean(rawData, d => d.length)?.toFixed(2) ?? "N/A");
}

//draw the scatterplot

function renderScatterPlot(rawData, commits) {
  const width = 1200,
        height = 768,
        margin = { top: 40, right: 40, bottom: 60, left: 60 };

  const usable = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("font-family", "sans-serif")
    .style("background-color", "white");

  //define the xscales

  const xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usable.left, usable.right])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([3, 15]);

  const sorted = d3.sort(commits, d => -d.totalLines);

  //define the gridlines 

  svg.append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usable.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat("")
        .tickSize(-usable.width)
    )
    .selectAll("line")
    .attr("stroke", "#ccc")
    .attr("stroke-opacity", 0.6);

  //define brush

  const brush = d3.brush()
    .extent([
      [usable.left, usable.top],
      [usable.right, usable.bottom],
    ])
    .on("start brush end", brushed);

  svg.append("g")
    .attr("class", "brush")
    .call(brush);

//define the dots

  const dots = svg.append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(sorted)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
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

//define the axes

  svg.append("g")
    .attr("transform", `translate(0,${usable.bottom})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(d3.timeDay.every(2))
        .tickFormat(d3.timeFormat("%a %d"))
    )
    .selectAll("text")
    .attr("transform", "rotate(-15)")
    .style("text-anchor", "end");

  svg.append("g")
    .attr("transform", `translate(${usable.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickValues(d3.range(0, 25, 2))
        .tickFormat(d => d.toString().padStart(2, "0") + ":00")
    );

  //define the labels

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Date");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Time of Day");

//define the functionality for the brush selection handlers

  function commitIsInside(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }

  function displaySelectedCount(selection) {
    const list = selection
      ? commits.filter(d => commitIsInside(selection, d))
      : [];

    const target = document.querySelector("#selection-count");
    if (target) {
      target.textContent = list.length
        ? `${list.length} commits selected`
        : "No commits selected";
    }
    return list;
  }

  function displayLanguageBreakdown(selection) {
    const selected = selection
      ? commits.filter(d => commitIsInside(selection, d))
      : [];

    const container = document.getElementById("language-breakdown");
    if (!container) return;

    if (!selected.length) {
      container.innerHTML = "";
      return;
    }

    const lines = selected.flatMap(d => d.lines);
    if (!lines.length) {
      container.innerHTML = "<p>No language data available</p>";
      return;
    }

    const breakdown = d3.rollup(
      lines,
      v => v.length,
      d => d.type
    );

    container.innerHTML = "";
    for (const [type, count] of breakdown) {
      const pct = d3.format(".1~%")(count / lines.length);
      container.innerHTML += `<dt>${type}</dt><dd>${count} lines (${pct})</dd>`;
    }
  }

  function brushed(event) {
    const selection = event.selection;

    svg.selectAll("circle")
      .classed("selected", d => commitIsInside(selection, d));

    displaySelectedCount(selection);
    displayLanguageBreakdown(selection);
  }
}

//load and render the data

loadData().then(data => {
  const commits = processCommits(data);
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
});





