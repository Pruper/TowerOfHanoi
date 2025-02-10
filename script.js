const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

canvas.addEventListener("mousemove", function (e) {
    let mouseCoords = getRelativeCoordinates(e, canvas);

    hoveredThird = Math.floor(3 * mouseCoords.x / canvas.width);
    if (hoveredThird > 2 || hoveredThird < 0) hoveredThird = -1;
});

canvas.addEventListener("mouseleave", function (e) {
    hoveredThird = -1;
    draggingThird = -1;
});

canvas.addEventListener("mousedown", function (e) {
    let mouseCoords = getRelativeCoordinates(e, canvas);
    draggingThird = Math.floor(3 * mouseCoords.x / canvas.width);
    if (draggingThird > 2 || draggingThird < 0) draggingThird = -1;
});

canvas.addEventListener("mouseup", function (e) {
    makeMove(draggingThird, hoveredThird);

    draggingThird = -1;
});

let hoveredThird = -1; // the third of the screen the mouse is in
let draggingThird = -1; // the currently held portion the mouse is in
function render() {
    // background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // hovered third of screen
    ctx.fillStyle = draggingThird != -1 ? (isMoveLegal(draggingThird, hoveredThird) ? "#B7FFB7" : "#FFC7C7") : "#FFFFC7";
    ctx.fillRect(0 + (canvas.width / 3) * hoveredThird, 0, canvas.width / 3, canvas.height);
    // dragging third of screen
    ctx.fillStyle = "#F7F797";
    ctx.fillRect(0 + (canvas.width / 3) * draggingThird, 0, canvas.width / 3, canvas.height);

    // draw the three pegs
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#FF7F7F";
        let bx = (canvas.width / 3) * i;
        let by = 0;

        ctx.fillRect(bx + 32, by + 384, 192, 16); // base
        ctx.fillRect(bx + 120, by + 96, 16, 288); // pole
    }

    // draw the disks
    for (let i = 0; i < 3; i++) {
        let pegX = (canvas.width / 3) * i + 128; // center on peg
        let pegY = 384; // height of peg
        let peg = gameState.state[i];

        for (let j = 0; j < peg.length; j++) {
            let diskSize = peg[j] * 24 + 64; // 64px + 24px for each larger one
            let diskY = pegY - (j + 1) * 24; // bottom up

            ctx.fillStyle = `hsl(${peg[j] * 40}, 80%, 60%)`; // disk color varies slightly (man I love hue)
            ctx.fillRect(pegX - diskSize / 2, diskY, diskSize, 24);
        }
    }

    // game progress text
    ctx.font = "24px Arial"
    ctx.fillStyle = "#000055"
    ctx.fillText(gameState.movesMade + " moves", 5, 24);
    if (hasWon()) {
        ctx.font = "bold 24px Arial";
        ctx.fillStyle = "#B29433";
        ctx.fillText(gameState.isLegitimate ? "Well done!" : "Game complete.", 5, 48);
    }

    // slider text
    document.querySelector("#diskAmountText").innerHTML = sliderValue();

    window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);

// game

let gameState = {
    numberOfDisks: 0,
    movesMade: 0,
    isLegitimate: true,
    state: [[], [], []]
};
restartGame();

function sliderValue() {
    return Number.parseInt(document.getElementById("diskAmountInput").value);
}

function restartGame(numberOfDisks = sliderValue()) {
    gameState.isLegitimate = true;
    gameState.movesMade = 0;
    gameState.numberOfDisks = numberOfDisks;
    gameState.state = [[], [], []];
    for (let i = numberOfDisks - 1; i >= 0; i--) {
        gameState.state[0].push(i);
    }
}

function randomRestartGame(numberOfDisks = sliderValue()) {
    gameState.isLegitimate = false;
    gameState.movesMade = 0;
    gameState.numberOfDisks = numberOfDisks;
    gameState.state = [[], [], []];
    for (let i = numberOfDisks - 1; i >= 0; i--) {
        let randomPeg = Math.floor(Math.random() * 3);
        gameState.state[randomPeg].push(i);
    }
}

function isMoveLegal(startPeg, endPeg) {
    return isMoveLegalState(gameState.state, startPeg, endPeg);
}

function isMoveLegalState(state, startPeg, endPeg) {
    if (startPeg === endPeg || state[startPeg].length === 0) return false;
    if (state[endPeg].length === 0) return true;
    return state[startPeg].slice(-1)[0] < state[endPeg].slice(-1)[0];
}

function makeMove(startPeg, endPeg) {
    if (!isMoveLegal(startPeg, endPeg)) return false;
    gameState.state[endPeg].push(gameState.state[startPeg].pop());
    gameState.movesMade++;
}

function hasWon() {
    return gameState.state.slice(-1)[0].length >= gameState.numberOfDisks;
}

function bestMove() {
    // breadth-first search algorithm to find the optimal move that will reach the finished game state the quickest

    if (hasWon()) return null; // game is finished already, no move to make

    let goalState = [[], [], []];
    for (let i = gameState.numberOfDisks - 1; i >= 0; i--) {
        goalState[2].push(i); // final goal, have all disks on last peg
    }

    let queue = [{ state: gameState.state.map(peg => [...peg]), moves: [] }]; // queue of states
    let visited = new Set();

    function stateToString(state) {
        return JSON.stringify(state);
    }

    while (queue.length > 0) {
        let { state, moves } = queue.shift();
        let stateStr = stateToString(state);

        if (visited.has(stateStr)) continue;
        visited.add(stateStr);

        if (JSON.stringify(state) === JSON.stringify(goalState)) { // bad object comparison but I couldn't think of another way :(
            return moves[0]; // return first move in the shortest sequence
        }

        for (let startPeg = 0; startPeg < 3; startPeg++) {
            for (let endPeg = 0; endPeg < 3; endPeg++) {
                if (isMoveLegalState(state, startPeg, endPeg)) {
                    let newState = state.map(peg => [...peg]);
                    newState[endPeg].push(newState[startPeg].pop());
                    
                    queue.push({
                        state: newState,
                        moves: [...moves, { startPeg, endPeg }]
                    });
                }
            }
        }
    }

    return null; // no move found (only happens in invalid position... at least I think so, anyway)
}

function makeBestMove() {
    let move = bestMove();
    if (move === null) return;

    gameState.isLegitimate = false;
    makeMove(move.startPeg, move.endPeg);
}

// utilities

function getRelativeCoordinates(event, element) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
}