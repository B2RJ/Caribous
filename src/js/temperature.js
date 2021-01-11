function displayTemperature(

    modePresentation = false,
    width = 700,
    height = 400
) {
    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 30, bottom: 30, left: 60 },
        width = width - margin.left - margin.right,
        height = height - margin.top - margin.bottom;

    // For the verification of date
    let startYear = moment().subtract(33, 'year').toDate();

    // Set the ranges
    let x = d3.scaleTime().range([0, width]);
    let y = d3.scaleLinear().range([height, 0]);

    // Define the line 
    let temperatureLine = d3.line()
        .x(function (d) { return x(d.Year); })
        .y(function (d) { return y(d.Average); });

    // Adds the svg canvas
    let svg = d3.select("#content_viz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    d3.csv("https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/data/ourdata/SeasonAverage.csv").then(data => {

        //When reading the csv, I must format variables:
        return data.filter(elem => new Date(elem.Year) > startYear).map(elem => {
            return { Year: d3.timeParse("%Y")(elem.Year), Average: elem.Average, Season: elem.Season }
        })
    }).then(data => {
        // Scale the range of the data
        x.domain(d3.extent(data, function (d) { return d.Year; }));
        y.domain([d3.min(data, function (d) { return d.Average; }) - 2, d3.max(data, function (d) { return d.Average; })]);

        // Group the entries by season
        dataNest = Array.from(
            d3.group(data, d => d.Season), ([key, value]) => ({ key, value })
        );

        // set the colour scale
        let color = d3.scaleOrdinal(d3.schemeCategory10);

        legendSpace = width / dataNest.length; // spacing for the legend
        // Loop through each season / key
        dataNest.forEach(function (d, i) {
            svg.append("path")

                .attr("class", "line line_tmp")
                .style("stroke", function () { // Add the colours dynamically
                    return d.color = color(i);
                })
                .attr("d", temperatureLine(d.value));

            svg.append("text")
                .attr("x", (legendSpace / 2) + i * legendSpace)  // space legend
                .attr("y", height + (margin.bottom / 2) + 13)
                .attr("class", "legend")    // style the legend
                .style("fill", function () { // Add the colours dynamically
                    return d.color = color(i);
                })
                .text(d.key);
        });

        // Add the X Axis
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        // Add the Y Axis
        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y));

        // Add title
        svg.append("svg:text")
            .attr("class", "title")
            .attr("x", width / 3)
            .attr("y", 0)
            .text("Evolution of the temperature");
    })
}