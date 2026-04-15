const debugInfo = document.getElementById("debugInfo");

let tick = 0;

function setDebug(text) {
    if (debugInfo) {
        debugInfo.textContent = text;
    }
}

setDebug("JS загрузился");

setInterval(() => {
    tick++;
    setDebug("Тик: " + tick + " | " + new Date().toLocaleTimeString());
}, 3000);