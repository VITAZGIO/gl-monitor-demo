let snakeActive = false;
let snakeInterval = null;

function toggleSnake() {
    const container = document.getElementById("snake-container");

    if (snakeActive) {
        container.innerHTML = "";
        snakeActive = false;

        if (snakeInterval) {
            clearInterval(snakeInterval);
            snakeInterval = null;
        }

        document.onkeydown = null;
        return;
    }

    snakeActive = true;
    container.innerHTML = `<canvas id="snake" width="300" height="300"></canvas>`;
    startSnake();
}

function startSnake() {
    const canvas = document.getElementById("snake");
    const ctx = canvas.getContext("2d");

    const cellSize = 10;
    const gridSize = 30;

    let snake = [{ x: 10, y: 10 }];
    let dx = 1;
    let dy = 0;
    let food = { x: 15, y: 15 };
    let gameOver = false;

    document.onkeydown = (e) => {
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

    function draw() {
        if (gameOver) return;

        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const nextX = snake[0].x + dx;
        const nextY = snake[0].y + dy;

        if (nextX < 0 || nextX >= gridSize || nextY < 0 || nextY >= gridSize) {
            gameOver = true;
            clearInterval(snakeInterval);
            snakeInterval = null;
            alert("Игра окончена");
            return;
        }

        const head = { x: nextX, y: nextY };

        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            gameOver = true;
            clearInterval(snakeInterval);
            snakeInterval = null;
            alert("Игра окончена");
            return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            food = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize)
            };
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