let snakeActive = false;
let snakeInterval = null;
let waitingForRestart = false;

function toggleSnake() {
    const container = document.getElementById("snake-container");

    if (snakeActive) {
        stopSnake();
        container.innerHTML = "";
        snakeActive = false;
        return;
    }

    snakeActive = true;
    container.innerHTML = `
        <div id="snake-wrapper" style="position: relative; width: 300px; height: 300px;">
            <canvas id="snake" width="300" height="300"></canvas>
            <div id="snake-overlay" style="
                display: none;
                position: absolute;
                inset: 0;
                background: rgba(0,0,0,0.65);
                color: white;
                font-family: Arial, sans-serif;
                font-size: 18px;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 20px;
                box-sizing: border-box;
            ">
                Игра окончена

Нажми стрелку, чтобы начать заново
            </div>
        </div>
    `;

    startSnake();
}

function stopSnake() {
    if (snakeInterval) {
        clearInterval(snakeInterval);
        snakeInterval = null;
    }

    waitingForRestart = false;
    document.onkeydown = null;
}

function startSnake() {
    const canvas = document.getElementById("snake");
    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("snake-overlay");

    const cellSize = 10;
    const gridSize = 30;

    let snake = [{ x: 10, y: 10 }];
    let dx = 1;
    let dy = 0;
    let food = randomFood();
    let gameOver = false;

    if (overlay) {
        overlay.style.display = "none";
    }

    waitingForRestart = false;

    document.onkeydown = (e) => {
        if (!snakeActive) return;

        const isArrow =
            e.key === "ArrowUp" ||
            e.key === "ArrowDown" ||
            e.key === "ArrowLeft" ||
            e.key === "ArrowRight";

        if (!isArrow) return;

        if (waitingForRestart) {
            startSnake();
            return;
        }

        if (e.key === "ArrowUp" && dy !== 1) {
            dx = 0;
            dy = -1;
        }
        if (e.key === "ArrowDown" && dy !== -1) {
            dx = 0;
            dy = 1;
        }
        if (e.key === "ArrowLeft" && dx !== 1) {
            dx = -1;
            dy = 0;
        }
        if (e.key === "ArrowRight" && dx !== -1) {
            dx = 1;
            dy = 0;
        }
    };

    function randomFood() {
        return {
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
        };
    }

    function endGame() {
        gameOver = true;
        waitingForRestart = true;

        if (snakeInterval) {
            clearInterval(snakeInterval);
            snakeInterval = null;
        }

        if (overlay) {
            overlay.style.display = "flex";
        }
    }

    function draw() {
        if (gameOver) return;

        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const nextX = snake[0].x + dx;
        const nextY = snake[0].y + dy;

        if (nextX < 0 || nextX >= gridSize || nextY < 0 || nextY >= gridSize) {
            endGame();
            return;
        }

        const head = { x: nextX, y: nextY };

        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            endGame();
            return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            food = randomFood();
        } else {
            snake.pop();
        }

        ctx.fillStyle = "lime";
        snake.forEach(segment => {
            ctx.fillRect(
                segment.x * cellSize,
                segment.y * cellSize,
                cellSize,
                cellSize
            );
        });

        ctx.fillStyle = "red";
        ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
    }

    if (snakeInterval) {
        clearInterval(snakeInterval);
    }

    snakeInterval = setInterval(draw, 100);
}