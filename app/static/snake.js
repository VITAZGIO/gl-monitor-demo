const snakeContainer = document.getElementById("snake-container");

let snakeVisible = false;
let gameInterval = null;
let direction = "RIGHT";
let nextDirection = "RIGHT";
let snake = [];
let food = null;
let score = 0;
let record = Number(localStorage.getItem("snakeRecord") || 0);

const gridSize = 20;
const tileCount = 20;

function createFood() {
    let newFood;

    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

    return newFood;
}

function renderSnakeGame() {
    snakeContainer.innerHTML = `
        <div id="snake-overlay" style="
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9998;
        ">
            <div style="
                background: #1e1e1e;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                text-align: center;
            ">
                <div style="color:#fff; font-size:24px; margin-bottom:12px;">
                    Змейка
                </div>
                <canvas id="snake-canvas" width="${gridSize * tileCount}" height="${gridSize * tileCount}" style="
                    background:#111;
                    border:2px solid #555;
                    display:block;
                    margin:0 auto 12px auto;
                "></canvas>
                <div id="snake-score" style="color:#fff; margin-bottom:6px;">Съедено ягод: ${score}</div>
                <div id="snake-record" style="color:#aaa;">Рекорд: ${record}</div>
                <div style="color:#888; margin-top:10px; font-size:14px;">
                    Управление: стрелки. ESC — закрыть
                </div>
            </div>
        </div>
    `;
}

function draw() {
    const canvas = document.getElementById("snake-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);

    ctx.fillStyle = "lime";
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });

    const scoreEl = document.getElementById("snake-score");
    const recordEl = document.getElementById("snake-record");

    if (scoreEl) scoreEl.textContent = `Съедено ягод: ${score}`;
    if (recordEl) recordEl.textContent = `Рекорд: ${record}`;
}

function resetGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = "RIGHT";
    nextDirection = "RIGHT";
    score = 0;
    food = createFood();
}

function step() {
    direction = nextDirection;

    const head = { ...snake[0] };

    if (direction === "UP") head.y -= 1;
    if (direction === "DOWN") head.y += 1;
    if (direction === "LEFT") head.x -= 1;
    if (direction === "RIGHT") head.x += 1;

    if (head.x < 0) head.x = tileCount - 1;
    if (head.x >= tileCount) head.x = 0;
    if (head.y < 0) head.y = tileCount - 1;
    if (head.y >= tileCount) head.y = 0;

    const hitSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);
    if (hitSelf) {
        resetGame();
        draw();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 1;

        if (score > record) {
            record = score;
            localStorage.setItem("snakeRecord", String(record));
        }

        food = createFood();
    } else {
        snake.pop();
    }

    draw();
}

function startGame() {
    resetGame();
    renderSnakeGame();
    draw();

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(step, 150);
}

function closeSnake() {
    snakeVisible = false;

    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }

    snakeContainer.innerHTML = "";
}

window.toggleSnake = function () {
    if (snakeVisible) {
        closeSnake();
    } else {
        snakeVisible = true;
        startGame();
    }
};

document.addEventListener("keydown", (event) => {
    if (!snakeVisible) return;

    if (event.key === "Escape") {
        closeSnake();
        return;
    }

    if (event.key === "ArrowUp" && direction !== "DOWN") {
        nextDirection = "UP";
    } else if (event.key === "ArrowDown" && direction !== "UP") {
        nextDirection = "DOWN";
    } else if (event.key === "ArrowLeft" && direction !== "RIGHT") {
        nextDirection = "LEFT";
    } else if (event.key === "ArrowRight" && direction !== "LEFT") {
        nextDirection = "RIGHT";
    }
});