const listFunction = []
const listViz = ["temprature", "movement", "repartition_death", "all_trajectories", "trajectory", "death_map"]
const urlTexts = "https://raw.githubusercontent.com/B2RJ/Data-Visualization-Anthropocene/main/src/texts.json"
let texts;
$(async _ => { // Appelé quand le doc et load en entié
    $.getJSON(urlTexts, function (json) {
        // console.log(json); // this will show the info it in firebug console
        texts = json
        // Initialise la visualisation
        $("#prev").hide();
        // displayTemperature($("#viz-body").width(),$("#viz-body").height())
        listFunction.push(displayTemperature)
        listFunction.push(displayMovement)
        listFunction.push(displayDeathRepartition)
        listFunction.push(displayAllTrajectories)
        listFunction.push(displayTrajectory)
        listFunction.push(displayDeathMap)
        $(".card").height($("#viz-body").height())
        $("#advanced").on("click", _ => loadVisu());
        loadVisu()
    });
})

let index_vizu = 0


// Next Visualisation
function nextVisu() {
    $("#prev").show();
    index_vizu += 1
    loadVisu()
    if (listFunction.length - 1 == index_vizu) {
        $("#next").hide()
    }
}

// Prev Visualisation
function prevVisu() {
    $("#next").show();
    index_vizu -= 1
    loadVisu()
    if (0 == index_vizu) {
        $("#prev").hide()
    }
}

// Charge une vizu
function loadVisu() {
    $("#viz-body").empty()
    $("#viz-legend").html("")
    // On charge le prog
    $("#viz-description").text(texts.description[listViz[index_vizu]]);
    listFunction[index_vizu](
        $("#viz-body").width(),
        $("#viz-body").height(),
        !$('#advanced').is(":checked"),
        1 << 15)
}

function speechSynth() {
    if (window.speechSynthesis.getVoices() == undefined || window.speechSynthesis.getVoices().length == 0) {
        window.speechSynthesis.onvoiceschanged = function () { speechSynth() }
    } else {
        window.speechSynthesis.cancel()
        console.log(window.speechSynthesis)
        window.speechSynthesis.getVoices();
        let voices = speechSynthesis.getVoices()
        selectedVoices = []
        for (let voice of voices) {
            if (voice.lang == "fr-FR") {
                selectedVoices.push(voice)
            }
        }
        if (selectedVoices.length > 0) {
            let utterThis = new SpeechSynthesisUtterance(texts.speech[listViz[index_vizu]]);
            utterThis.onend = function (event) {
                console.log('SpeechSynthesisUtterance.onend');
            }
            utterThis.onerror = function (event) {
                console.error('SpeechSynthesisUtterance.onerror');
            }
            utterThis.voice = selectedVoices[selectedVoices.length - 1];
            utterThis.pitch = 1;
            utterThis.rate = 1;
            window.speechSynthesis.speak(utterThis);
        }
    }
}