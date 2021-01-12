function displayDeathRepartition(
    width = 700,
    height = 400,
    modePresentation = false,
    zoomValue = 1 << 14
){
    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 30, bottom: 30, left: 60 },
        width = width - margin.left - margin.right,
        height = height - margin.top - margin.bottom,
        legendCellSize = 20,
        keys = ["Other", "Predation", "Vehicle Collision"],
        colors = ["#7bccc4", "#2b8cbe", "#084081"];

    // Adds the svg canvas
    const svg = d3.select("#viz-body").append("svg")
        .attr("id", "svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    d3.csv("https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/data/ourdata/death_cause_stats.csv").then(data => {

        // Diagram builder. keys = study_site
        var stack = d3.stack()
            .keys(keys)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        // Data with the builder
        var series = stack(data);

        // Set the range
        const x = d3.scaleBand()
            .domain(data.map(d => d.last_known_timestamp))
            .range([0, width])
            .padding(0.1);
        const y = d3.scaleLinear()
            .domain([0, d3.max(series[series.length - 1], d => d[1])])
            .range([height, 0]);

        // Add the X Axis
        const xAxis = d3.axisBottom(x)

        // Add the Y Axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "middle");

        svg.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(y).ticks(10))
            .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .style("text-anchor", "end")
            .text("nombre de morts");

        // Group the data 
        let groups = svg.selectAll("g.death_cause")
            .data(series)
            .enter().append("g")
            .style("fill", (d, i) => colors[i]);

        // Build the square
        let rect = groups.selectAll("rect")
            .data(d => d)
            .enter()
            .append("rect")
            .attr("x", d => x(d.data.last_known_timestamp))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d[1]))
            .attr("height", d => height - y(d[1] - d[0]));

        d3.select("#viz-title").text("Répartition des morts par catégorie et par an")
        // Add the legend
        // To display the study_site in the correct order
        let reverseColors = colors.reverse();
        let reverseKeys = keys.reverse();

        // The position of the square
        let legend = svg.append('g')
            .attr('transform', 'translate(10, 20)');

        // Position of the square
        legend.selectAll()
            .data(reverseColors)
            .enter().append('rect')
            .attr('height', legendCellSize + 'px')
            .attr('width', legendCellSize + 'px')
            .attr('x', 5)
            .attr('y', (d, i) => i * legendCellSize)
            .style("fill", d => d);

        // Same thing for the text
        legend.selectAll()
            .data(reverseKeys)
            .enter().append('text')
            .attr("transform", (d, i) => "translate(" + (legendCellSize + 10) + ", " + (i * legendCellSize) + ")")
            .attr("dy", legendCellSize / 1.6)
            .style("font-size", "13px")
            .style("fill", "grey")
            .text(d => d);
    });
}