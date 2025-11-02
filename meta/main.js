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

  const numFiles = d3.groups(data, d => d.file).length;
  dl.append("dt").text("Number of files");
  dl.append("dd").text(numFiles);

  const maxDepth = d3.max(data, d => d.depth);
  dl.append("dt").text("Maximum depth");
  dl.append("dd").text(maxDepth);

  const avgDepth = d3.mean(data, d => d.depth).toFixed(2);
  dl.append("dt").text("Average depth");
  dl.append("dd").text(avgDepth);

  const maxLineLength = d3.max(data, d => d.length);
  dl.append("dt").text("Longest line length");
  dl.append("dd").text(maxLineLength);

  const avgLineLength = d3.mean(data, d => d.length).toFixed(2);
  dl.append("dt").text("Average line length");
  dl.append("dd").text(avgLineLength);

  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  const avgFileLength = d3.mean(fileLengths, d => d[1]).toFixed(1);
  dl.append("dt").text("Average file length");
  dl.append("dd").text(avgFileLength);

  const longestFile = d3.greatest(fileLengths, d => d[1]);
  dl.append("dt").text("Longest file");
  dl.append("dd").text(longestFile ? longestFile[0] : "N/A");

  const commitsByAuthor = d3.rollups(
    commits,
    v => v.length,
    d => d.author
  );
  const topAuthor = d3.greatest(commitsByAuthor, d => d[1]);
  dl.append("dt").text("Most active author");
  dl.append("dd").text(topAuthor ? `${topAuthor[0]} (${topAuthor[1]} commits)` : "N/A");

  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    d => new Date(d.datetime).toLocaleString("en", { dayPeriod: "short" })
  );
  const topPeriod = d3.greatest(workByPeriod, d => d[1]);
  dl.append("dt").text("Most work done");
  dl.append("dd").text(topPeriod ? topPeriod[0] : "N/A");

  const commitsByDay = d3.rollups(
    commits,
    v => v.length,
    d => d.datetime.toLocaleString("en", { weekday: "long" })
  );
  const topDay = d3.greatest(commitsByDay, d => d[1]);
  dl.append("dt").text("Most active day");
  dl.append("dd").text(topDay ? topDay[0] : "N/A");
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 20, right: 40, bottom: 50, left: 60 };

  const commitsByDate = d3.rollups(
    commits,
    v => v.length,
    d => d.datetime.toISOString().slice(0, 10)
  );
  const dailyCommits = commitsByDate.map(([date, count]) => ({
    date: new Date(date),
    count
  }));

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("overflow", "visible");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dailyCommits, d => d.date))
    .range([margin.left, width - margin.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(dailyCommits, d => d.count)])
    .range([height - margin.bottom, margin.top])
    .nice();

  const dots = svg.append("g").attr("class", "dots");
  dots
    .selectAll("circle")
    .data(dailyCommits)
    .join("circle")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.count))
    .attr("r", 6)
    .attr("fill", "steelblue")
    .attr("opacity", 0.8);

  const xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(d3.timeFormat("%b %d"));
  const yAxis = d3.axisLeft(yScale).ticks(6);

  svg
    .append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .call(g => g.append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "black")
      .attr("text-anchor", "middle")
      .text("Date"));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis)
    .call(g => g.append("text")
      .attr("x", -50)
      .attr("y", margin.top)
      .attr("fill", "black")
      .attr("text-anchor", "start")
      .text("Total commits per day"));
}
