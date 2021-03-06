function displayAllTrajectories(
    modePresentation = true,
    zoomValue = 1 << 15, // Zoom dans l'image
    width = 1100,
    height = 733,
    initialScale = zoomValue,
    initialCenter = [-122, 55]
) {
    /*----- Graphical global components -----*/

    // main component
    const main = d3.select("#viz-body")
    // title component
    d3.select("#viz-title").text("Mise en contexte")
    // legend component
    let legend = d3.select("#viz-legend")

    // map component
    const svg = main.append("div")
        .attr("id", "trajectory")
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
    let image = svg.append("g") // Création d'un graphique dans le svg
        .attr("pointer-events", "none") // Supprime l'event de clique sur le graphique
        .selectAll("image") // Setup les image mais pas encore créées

    let herdshover = d3.select("#trajectory").append("div")
        .attr("id", "herds_hover")
        .attr("class", "btn-group flex-wrap")
        .style("top", "-37px")
        .style("width", "100%")
    /*----- D3JS Setup (params, events, etc.) -----*/

    // Setup de la projection (mercator, coordonnées polaires --> coordonnées cartésiennes)
    const projection = d3.geoMercator()
        .scale(1 / (2 * Math.PI))
        .translate([0, 0])

    // Setup du nombre de pavé present dans l'image et leur taille
    const tile = d3.tile()
        .extent([[0, 0], [width, height]])
        .tileSize(200)

    // Définition de l'échelle de zoom (min/max), de sa taille et de l'event associé
    const zoom = d3.zoom()
        .scaleExtent([zoomValue, zoomValue])
        .extent([[0, 0], [width, height]])
        .on("zoom", ({ transform }) => zoomed(transform))

    const zoomTransform = d3.zoomIdentity // Appel à l'évenement
        .translate(width / 2, height / 2)
        .scale(-initialScale)
        .translate(...projection(initialCenter))
        .scale(-1)



    /*_______________ DATA LOADING & HANDLING _______________*/


    /*----- Global variables -----*/


    let fetchedData = []

    const arrowHeadWidth = 12, arrowHeadHeight = arrowHeadWidth
    const arrowPoints = [[2, 2], [10, 6], [2, 10], [6, 6], [2, 2]]

    const repoPrefix = "https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/data/ourdata/trajectory_by_site/"
    const herdNames = ["burnt_pine", "graham", "hart_ranges", "kennedy", "moberly", "narraway", "quintette", "scott"]


    /*----- Initialization and update functions -----*/


    // Load plain csv data from repo
    getDataLoading().then(data => {
        legend = legend.append("div")
            .attr("class", "alert alert-dark")

        const displayHerdNames = getHerdNames()

        fetchedData = data.map((dataframe, i) => {
            // group data by herdname and dates
            const groupedData = Object.entries(dataframe.reduce((result, elem) => {
                result[elem.date] = [...result[elem.date] || [], elem]
                return result
            }, {}))

            // get centers (for first and last year)
            const firstYear = groupedData[0][0].split("-")[0]
            const lastYear = groupedData[groupedData.length - 1][0].split("-")[0]

            const firstCenter = getCenterFromCoords(
                groupedData.filter(row => row[0].split("-")[0] == firstYear)
                    .flatMap(row => row[1].map(indiv => [parseFloat(indiv.longitude), parseFloat(indiv.latitude)])))
            const lastCenter = getCenterFromCoords(
                groupedData.filter(row => row[0].split("-")[0] == lastYear)
                    .flatMap(row => row[1].map(indiv => [parseFloat(indiv.longitude), parseFloat(indiv.latitude)])))

            // get individuals
            const individualCoords = groupedData.flatMap(row => row[1].map(indiv => [parseFloat(indiv.longitude), parseFloat(indiv.latitude)]))

            return {
                herdName: displayHerdNames[i],
                centers: [firstCenter, lastCenter],
                individuals: individualCoords
            }
        })

        // setup of zoom event handling
        svg
            .call(zoom)
            .on("dblclick.zoom", null)
            .on("mousedown.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("touchend.zoom", null)
            .call(zoom.transform, zoomTransform)
    })


    // Initialize or update the map when zooming/moving on map
    function zoomed(transform) {

        // On récupère le numéro des pavés en fonction du context de la view (position et niveau de zoom)
        const tiles = tile(transform)

        // On crée/actualise les images présentes dans le graphique
        // Chaque image représente une portion de carte et chaque image est un pavé
        image = image.data(tiles, d => d).join("image")
            .attr("xlink:href", d => url(...d))
            .attr("x", ([x]) => (x + tiles.translate[0]) * tiles.scale)
            .attr("y", ([, y]) => (y + tiles.translate[1]) * tiles.scale)
            .attr("width", tiles.scale)
            .attr("height", tiles.scale)

        projection
            .scale(transform.k / (2 * Math.PI))
            .translate([transform.x, transform.y])


        // legend html
        let arrowsIcons = "<div style='width: 50px;display:inline-block;position:relative;'>"
        let trapezoidIcons = "<div style='width: 50px;display:inline-block;position:relative;'>"

        for(let i = 0; i < 2; i++) {
            const color = d3.schemeCategory10[i]
            const polystroke = d3.color(color).copy({ opacity: 0.75 })
            const polyfill = d3.color(color).copy({ opacity: 0.25 })
            const ecartArrowLeft = 8*i
            const ecartArrowTop = ecartArrowLeft - 40
            const ecartPolyLeft = 12*i
            const ecartPolyTop = 4*i - 20
            let ardir = "&rarr;"
            if(i === 1) ardir = "&larr;"
            arrowsIcons += "<b style='color:"+color+";font-size:36px;position:absolute;top:"+ecartArrowTop+"px;left:"+ecartArrowLeft+"px;'>"+ardir+"</b>"
            trapezoidIcons += "<b><div class='trapezoid' style='border:1px solid "+polystroke+";background:"+polyfill+";position:absolute;top:"+ecartPolyTop+"px;left:"+ecartPolyLeft+"px;'></div></b>"
        }

        // display data on map
        fetchedData.forEach((herdData, i) => {

            // get color from color scheme
            //const color = d3.interpolateSpectral(i / fetchedData.length)
            const color = d3.schemeCategory10[i]
            const polystroke = d3.color(color).copy({ opacity: 0.75 })
            const polyfill = d3.color(color).copy({ opacity: 0.25 })

            // append to hover
            herdshover.append("button")
                .attr("id", "hh"+i)
                .attr("class", "btn")
                .style("background-color", polystroke)
                .style("border", "1px solid " + color)
                .text(herdData.herdName)
                .on("mouseover", () => {
                    svg.selectAll("polygon").style('opacity', 0.3)
                    svg.select("#area-"+i).style('opacity', 1)
                })
                .on("mouseleave", () => {
                    svg.selectAll("polygon").style('opacity', 1)
                })

            // data for polygon (all dates)
            const individuals = herdData.individuals
            const area = ((individuals.length > 2) ? d3.polygonHull(individuals) : individuals)
                .map(coords => projection(coords).join(","))
                .join(" ")

            svg
                .append("polygon")
                .attr("id", "area-" + i)
                .attr("points", area)
                .style("stroke", polystroke)
                .style("fill", polyfill)

            // display arrow heads
            svg
                .append("defs")
                .append("marker")
                .attr("id", "arrow-" + i)
                .attr("viewBox", [0, 0, arrowHeadWidth, arrowHeadHeight])
                .attr("refX", arrowHeadWidth / 2)
                .attr("refY", arrowHeadHeight / 2)
                .attr("markerWidth", arrowHeadWidth)
                .attr("markerHeight", arrowHeadHeight)
                .attr("orient", "auto")
                .append("path")
                .attr("d", d3.line()(arrowPoints))
                .style("fill", color)

            // display lines
            svg.selectAll("#line" + i)
                .data([herdData.centers])
                .enter()
                .append("path")
                .attr("id", "line-" + i)
                .attr("marker-end", "url(#arrow-" + i + ")")
                .attr("d", d3.line()
                    .x(d => projection(d)[0])
                    .y(d => projection(d)[1]))
                .style("stroke", color)
                .style("stroke-linecap", "round")
        })

        // legend
        legend.append("p").html(arrowsIcons + "</div> Trajectoire médiane des troupeaux")
        legend.append("p").html(trapezoidIcons + "</div> Zone couverte par les troupeaux")
        const square = "<div style='display: inline-block; background:"+d3.schemeCategory10[0]+"; height:20px; width:20px;position:relative;top:5px;'></div>"
        legend.append("p").html("Survolez les <b><i>boutons de couleur</i></b> ( "+square+" ) pour isoler un troupeau.")
    }



    /*_______________ UTILS FUNCTIONS _______________*/


    function url(x, y, z) {
        return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/${z}/${x}/${y}${devicePixelRatio > 1 ? "@2x" : ""}?access_token=pk.eyJ1IjoicGF3YXJvIiwiYSI6ImNramI5NDIyMDdqMGYydnBkeGVrcGNydDUifQ.k7aT1uH2iIZEAnUC38-QJw`
    }


    /*----- Data loading functions -----*/

    function getDataLoading() {
        return Promise.all(herdNames.map(name => d3.csv(repoPrefix + name + ".csv")))
    }


    /*----- Herdname list related functions -----*/

    function getHerdNames() {
        return herdNames.map(name => name.replace("_", " ")).map(name => name.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "))
    }


    /*----- Date slider related functions -----*/

    function getCenterFromCoords(coords) {
        const longitudes = coords.map(c => c[0])
        const latitudes = coords.map(c => c[1])
        const centerLongitude = (Math.min(...longitudes) + Math.max(...longitudes)) / 2
        const centerLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2
        return [centerLongitude, centerLatitude]
    }
}
