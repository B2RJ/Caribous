function displayTemperature(
    modePresentation = false,
    zoomValue = 1 << 15,
    width = 1100,
    height = 733
) {
    // set the dimensions and margins of the graph
    const margin = { top: 10, right: 30, bottom: 30, left: 40 },
        mgw = width - margin.left - margin.right,
        mgh = height - margin.top - margin.bottom;

    // For the verification of date
    let startYear = moment().subtract(33, 'year').toDate();

    // Set the ranges
    let x = d3.scaleTime().range([0, mgw]);
    let y = d3.scaleLinear().range([mgh, 0]);

    // Define the line 
    let temperatureLine = d3.line()
        .x(function (d) { return x(d.Year); })
        .y(function (d) { return y(d.Average); });

    // Adds the svg canvas
    let svg = d3.select("#viz-body")
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
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
        let color = (i) => {
            let colors = ["orange","steelblue"]
            return colors[i]
        };


        let legende = d3.select("#viz-legend").append("div")
                .attr("class","alert alert-dark")
        // Loop through each season / key
        dataNest.forEach(function (d, i) {
            svg.append("path")

                .attr("class", "line line_tmp")
                .style("stroke", function () { // Add the colours dynamically
                    return d.color = color(i);
                })
                .attr("d", temperatureLine(d.value));
        });
        let names = ["Température moyenne estivale","Température moyenne hivernale"]
        for (let i = 0; i < names.length; i++){
            legende.append("p").html("<b style='font-size: 36px; position:relative;top:5px; color:"+color(i)+"'>—</b> "+names[i])
        }

        // Add the X Axis
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + mgh + ")")
            .call(d3.axisBottom(x));

        // Add the Y Axis
        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y));

        // Add title
        d3.select("#viz-title").text("Evolution de la température")
    })
}
