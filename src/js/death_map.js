function displayDeathMap(
    width = 700,
    height = 400,
    modePresentation = true,
    zoomValue = 1 << 14, // Zoom dans l'image
    initialScale = zoomValue,
    initialCenter = [-122, 55],
) {
    d3.select("#viz-title").text("Carte des zones de mort des caribous")
    d3.select("#viz-description").text("Sur cette visualisation nous avons regroupé les zones \"à risques\" pour les caribous. On constate que le territoire des Kennedy vu précédemment contient une grande zone de disparitions. En plaçant votre curseur sur un cercle, vous pouvez voir précisément les différents lieux. On constate que le sud de leur territoire est propice aux attaques par des prédateurs. Cette information permet d'apporter une explication à la migration de ce troupeau.")
    let legend = d3.select("#viz-legend").append("div")
        .attr("class","alert alert-dark")
    const reddot = "<div class='big dot' style='background-color:rgba(255,0,0,0.1); border:1px solid rgba(255,0,0,0.4);'></div>"
    legend.append("p").html("Survole les <b><i>zones de danger</i></b> ( "+reddot+" ) pour obtenir plus d'informations")
    /*----- Graphical global components -----*/

    const svg = d3.select("#viz-body")
        .append("svg")
        .lower()
        .attr("viewBox", [0, 0, width, height])
        .attr('width', width)
        .attr('height', height)
    // Création d'un graphique dans le svg
    let image = svg.append("g")
        .attr("pointer-events", "none") // Supprime l'event de clique sur le graphique
        .selectAll("image") // Setup les image mais pas encore créées


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

    let clustersDeaths = []
    let clustersDangerZones = []

    const csvUrl = "https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/data/ourdata/death_reasons.csv"


    /*----- Main process -----*/

    // Load plain csv data from repo
    d3.csv(csvUrl).then(data => {
        clustersDeaths = getClusterDeaths(data)
        clustersDangerZones = clustersDeaths.map(c => [getMeanCoords(c), c.length])

        svg
            .call(zoom) // Setup de l'event de gestion du zoom
            .on("dblclick.zoom", null)
            .on("mousedown.zoom", null)
            .on("touchstart.zoom", null)
            .on("touchmove.zoom", null)
            .on("touchend.zoom", null)
            .call(zoom.transform, zoomTransform) // Placement de la vue aux coordonnées choisies
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

        const clustersData = []
        for (let i = 0; i < clustersDangerZones.length; i++) {
            clustersData.push({
                deaths: svg.selectAll(".deaths_" + i).data(clustersDeaths[i]),
                zones: svg.selectAll(".zones_" + i).data([clustersDangerZones[i]])
            })
        }

        for (let i = 0; i < clustersData.length; i++) {
            let cd = clustersData[i]
            cd.deaths.enter().append("circle")
                .attr("class", "deaths_" + i)
                .attr("r", 5)
                .attr("cx", d => projection(d[1])[0])
                .attr("cy", d => projection(d[1])[1])
                .style("fill", "None")

            cd.zones.enter().append("circle")
                .attr("class", "zones_" + i)
                .attr("r", d => 4 + 2 * d[1])
                .attr("cx", d => projection(d[0])[0])
                .attr("cy", d => projection(d[0])[1])
                .style("stroke", "rgba(255,0,0,0.4)")
                .style("fill", "rgba(255,0,0,0.1)")
                .on("mouseover", () => {
                    let p = 0, v = 0, o = 0
                    const pcol = "black", vcol = "purple", ocol = "blue"
                    svg.selectAll(".deaths_" + i).style("fill", d => {
                        switch (d[0]) {
                            case "Predation": p++; return pcol
                            case "Vehicle Collision": v++; return vcol
                            case "Other": o++; return ocol
                        }
                    })

                    // TODO: use legend...
                    let list = legend.append("ul")
                    if (p > 0) {
                        const pdot = "<div class='small dot' style='background-color:"+pcol+";'></div>"
                        list.append("li").html("<b>"+p+"</b> caribous ont été tués par un prédateur ( "+pdot+" Loup, Ours, Carcajou...)")
                    }
                    if (v > 0) {
                        const vdot = "<div class='small dot' style='background-color:"+vcol+";'></div>"
                        list.append("li").html("<b>"+v+"</b> caribous ont été renversés par un véhicule ( "+vdot+" Voiture, Train...)")
                    }
                    if (o > 0) {
                        const odot = "<div class='small dot' style='background-color:"+ocol+";'></div>"
                        list.append("li").html("<b>"+o+"</b> caribous sont morts pour une autre raison ( "+odot+" Accident, Cause inconnue...)")
                    }
                })
                .on("mouseleave", () => {
                    svg.selectAll(".deaths_" + i).style("fill", "None")
                    legend.select("ul").remove()
                })
        }
    }



    /*_______________ UTILS FUNCTIONS _______________*/
    function getMeanCoords(cluster) {
        const longs = cluster.map(c => c[1][0]);
        const lats = cluster.map(c => c[1][1]);
        return [(Math.min(...longs) + Math.max(...longs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]
    }

    function getClusters(data) {
        const dict = {};
        data.forEach(d => {
            if (!dict.hasOwnProperty(d.cluster)) dict[d.cluster] = []
            dict[d.cluster].push(d)
        });
        return Object.values(dict);
    }

    function getDeathInfo(cluster) {
        return cluster.map(d => [d.death_cause, [parseFloat(d.deploy_off_longitude), parseFloat(d.deploy_off_latitude)]])
    }

    function getClusterDeaths(data) {
        return getClusters(data).map(c => getDeathInfo(c))
    }

    function url(x, y, z) {
        return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/${z}/${x}/${y}${devicePixelRatio > 1 ? "@2x" : ""}?access_token=pk.eyJ1IjoicGF3YXJvIiwiYSI6ImNramI5NDIyMDdqMGYydnBkeGVrcGNydDUifQ.k7aT1uH2iIZEAnUC38-QJw`
    }
}
