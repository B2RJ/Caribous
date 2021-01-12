function displayTrajectory(
    width = 700,
    height = 400,
    modePresentation = true,
    zoomValue = 1 << 14, // Zoom dans l'image
    initialScale = zoomValue,
    initialCenter = [-122, 55]
) {
    /*----- Graphical global components -----*/

    // main component
    const main = d3.select("#viz-body")
    // title component
    d3.select("#viz-title").text("Trajectoires des caribous")

    // map component
    const svg = main.append("div")
        .attr("id", "trajectory")
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
    let image = svg.append("g") // Création d'un graphique dans le svg
        .attr("pointer-events", "none") // Supprime l'event de clique sur le graphique
        .selectAll("image") // Setup les image mais pas encore créées

    // slider component
    const sliderSvg = main.append("div")
        .attr("id", "slider")
        .append("svg")
        .attr("width", width)
        .attr("height", 100)
        .append("g")
        .attr("transform", "translate(20, 20)")
    let slider

    // select list component
    const span = main.append("span")
    const herdList = span.append("select")
        .attr("id", "herd-names")
    // Affiche un spinner
    d3.select("#viz-description")
        .append("div")
        .attr("id", "traj-loading")
        .attr("class", "spinner-border")
        .attr("role", "status")
        .append("span")
        .attr("class", "visually-hidden")
        .text("Loading...")

    if (modePresentation) {
        main.select("#slider").attr("hidden", "")
        main.select("#herd-names").attr("hidden", "")
    }
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

    let alreadyInitZoomed = false
    let fetchedData = []
    let herdNameData = []
    let yearDates = []
    let sliderData = []

    const arrowHeadWidth = 12, arrowHeadHeight = arrowHeadWidth
    const arrowPoints = [[2, 2], [10, 6], [2, 10], [6, 6], [2, 2]]

    const repoPrefix = "https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/data/ourdata/trajectory_by_site/"
    const herdNames = ["burnt_pine", "graham", "hart_ranges", "kennedy", "moberly", "narraway", "quintette", "scott"]
    const defaultHerdName = "Hart Ranges"


    /*----- Initialization and update functions -----*/

    // Load plain csv data from repo
    getDataLoading().then(data => {
        const displayHerdNames = getHerdNames()
        fetchedData = data.map((dataframe, i) => {
            const data = dataframe.reduce((result, elem) => {
                const year = new Date(elem.date).getFullYear() //TODO: check if split("-") is fastest

                if (year in result) result[year][elem.date] = [...result[year][elem.date] || [], elem]
                else {
                    result[year] = []
                    result[year][elem.date] = [elem]
                }

                return result
            }, {})

            return {
                herdName: displayHerdNames[i],
                years: Object.keys(data),
                data: data
            }
        })

        // create select list for herd names
        createSelectList(displayHerdNames)

        // setup of zoom event handling
        svg
            .call(zoom)
            .on("dblclick.zoom", null)
            .on("mousedown.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("touchend.zoom", null)

        // initialize all things related to herdname (current data, slider, map)
        herdList.dispatch("change")
    })

    // Create the select list for herdnames & settle event
    function createSelectList(herdNames) {
        herdList
            .selectAll("option")
            .data(herdNames)
            .enter()
            .append("option")
            .attr("value", d => d)
            .property("selected", d => d === defaultHerdName)
            .text(d => d)

        herdList
            .on("change", () => {
                new Promise(resolve => {
                    d3.select("#traj-loading")
                        .append("div")
                        .attr("id", "traj-loading")
                        .attr("class", "spinner-border")
                        .attr("role", "status")
                        .append("span")
                        .attr("class", "visually-hidden")
                        .text("Loading...")
                    setTimeout(() => resolve(1), 1)
                }).then(d => {
                    updateDataFromSelectedHerdName() //update current herd data
                    updateSlider() //update the slider accordingly
                    svg.call(zoom.transform, zoomTransform) //update map accordingly
                    d3.select("#traj-loading").remove();
                })
            })
    }

    // Update data from current selected herdname
    function updateDataFromSelectedHerdName() {
        herdNameData = fetchedData.find(obj => obj.herdName === herdList.node().value)
    }

    // Update data from current slider range
    function updateDataFromSlider() {
        sliderData = Object.values(herdNameData.data).map(dates => {
            return Object.entries(dates).map(date => {
                const individualCoords = date[1].map(row => [parseFloat(row.longitude), parseFloat(row.latitude)])
                return {
                    date: new Date(date[0]),
                    individuals: individualCoords,
                    center: getCenterFromCoords(individualCoords)
                }
            })
        })
    }

    // Initialize or update the slider when zooming/moving on map
    function updateSlider() {
        updateDataFromSlider() // update objects related to current date range on slider

        yearDates = getDatesByYear()

        // consts for slider display
        const firstJanuaryDates = yearDates.map(row => row[0])
        const minDate = firstJanuaryDates[0]
        const maxDate = firstJanuaryDates[firstJanuaryDates.length - 1]

        if (alreadyInitZoomed) {
            sliderSvg
                .call(slider
                    .domain([minDate, maxDate])
                    .tickValues(firstJanuaryDates)
                    .marks(firstJanuaryDates)
                    .value([minDate, maxDate])
                )
        } else {
            let oldSliderRange

            slider = d3
                .sliderBottom()
                .domain([minDate, maxDate])
                .width(650)
                .tickValues(firstJanuaryDates)
                .marks(firstJanuaryDates)
                .tickFormat(d3.timeFormat("%Y"))
                .fill("red")
                .value([minDate, maxDate])
                .on("start", () => {
                    oldSliderRange = slider.value().map(value => new Date(value))
                })
                .on("end", (newSliderRange) => {
                    const sliderRange = newSliderRange.map(value => new Date(value))
                    if (sliderRange[0].getTime() === sliderRange[1].getTime()) {
                        sliderSvg
                            .call(slider.value(oldSliderRange))

                        throw ": YOU CAN'T SET SLIDER TICKS WITH SAME VALUES !"
                    }

                    svg.call(zoom.transform, zoomTransform)
                })

            sliderSvg
                .call(slider)
        }
    }

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

        // load useful data
        const usefulData = getUsefulData()

        // data for lines and arrow heads
        const firstYear = usefulData[0]
        const lastYear = usefulData[usefulData.length - 1]

        const dateRange = [firstYear.range[0].center, lastYear.range[1].center]
        const lines = svg.selectAll("path").data([dateRange])

        // data for polygon (all dates, including intermediate dates)
        const secondPoints = usefulData.flatMap(row => row.all.flatMap(date => date.individuals))
        const secondArea = ((secondPoints.length > 2) ? d3.polygonHull(secondPoints) : secondPoints)
            .map(coords => projection(coords).join(","))
            .join(" ")

        // other updates
        if (alreadyInitZoomed) {
            lines
                .transition()
                .ease(d3.easeLinear)
                .duration(100)
                .attr("d", d3.line()
                    .x(d => projection(d)[0])
                    .y(d => projection(d)[1]))
        }
        // initialization
        else {
            lines
                .enter()
                .append("path")
                .attr("marker-end", "url(#arrow)")
                .attr("d", d3.line()
                    .x(d => projection(d)[0])
                    .y(d => projection(d)[1]))
                .style("stroke", "blue")
                .style("stroke-linecap", "round")

            svg
                .append("defs")
                .append("marker")
                .attr("id", "arrow")
                .attr("viewBox", [0, 0, arrowHeadWidth, arrowHeadHeight])
                .attr("refX", arrowHeadWidth / 2)
                .attr("refY", arrowHeadHeight / 2)
                .attr("markerWidth", arrowHeadWidth)
                .attr("markerHeight", arrowHeadHeight)
                .attr("orient", "auto")
                .append("path")
                .attr("d", d3.line()(arrowPoints))
                .style("fill", "blue")

            alreadyInitZoomed = true
        }

        // update polygon
        svg
            .select("polygon")
            .remove()

        svg
            .append("polygon")
            .attr("points", secondArea)
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("fill", "blue")
            .attr("opacity", 0.25)
    }



    /*_______________ UTILS FUNCTIONS _______________*/

    Array.prototype.distinct = function () {
        return this.filter((elem, index, self) => self.indexOf(elem) === index)
    }

    // works only with year array !
    Array.prototype.withFakeYear = function () {
        return this.concat(this[this.length - 1] + 1)
    }

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

    function getUniqueYears() {
        return herdNameData.years.map(year => parseInt(year))
    }

    function getDatesByYear() {
        return getUniqueYears().withFakeYear().map((year, i) => [
            new Date(year, 0, 1), //fake date, just for slider display
            (sliderData[i] || []) //all true dates of the year
        ])
    }


    /*----- Map related functions -----*/

    function getDatesByYearRange() {
        const sliderRange = slider.value().map(value => new Date(value).getFullYear()) //because d3js-slider return a unix time and a date value
        return yearDates.filter(row => {
            const year = row[0].getFullYear()
            return sliderRange[0] <= year && year < sliderRange[1]
        }).map(row => row[1])
    }

    function getUsefulData() {
        return getDatesByYearRange().map(dates => {
            return {
                range: [dates[0], dates[dates.length - 1]],
                all: dates
            }
        })
    }
}