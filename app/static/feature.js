let gameHubOpen = false;
let activeGame = "snake";

let snakeInterval = null;
let tetrisInterval = null;
let platformerInterval = null;

let snakeState = null;
let tetrisState = null;
let platformerState = null;

function toggleSnake() {
    if (gameHubOpen) {
        closeGameHub();
    } else {
        openGameHub();
    }
}

function openGameHub() {
    gameHubOpen = true;
    renderGameHub();
    startActiveGame();
}

function closeGameHub() {
    stopAllGames();

    const container = document.getElementById("snake-container");
    if (container) {
        container.innerHTML = "";
    }

    gameHubOpen = false;
}

function renderGameHub() {
    const container = document.getElementById("snake-container");
    if (!container) return;

    container.innerHTML = `
        <div id="gamehub-overlay" style="
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.72);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9998;
        ">
            <div style="
                width: 680px;
                max-width: calc(100vw - 30px);
                background: #1e1e1e;
                border: 1px solid #444;
                border-radius: 14px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.45);
                padding: 16px;
                color: #fff;
                font-family: Arial, sans-serif;
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                ">
                    <div style="font-size: 22px; font-weight: bold;">
                        Пасхалки
                    </div>
                    <button id="gamehub-close" style="
                        background: #333;
                        color: white;
                        border: 1px solid #555;
                        border-radius: 8px;
                        padding: 6px 10px;
                        cursor: pointer;
                    ">✕</button>
                </div>

                <div style="
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                ">
                    <button id="tab-snake" style="
                        flex: 1;
                        min-width: 120px;
                        padding: 10px;
                        border-radius: 10px;
                        border: 1px solid ${activeGame === "snake" ? "#66cc66" : "#555"};
                        background: ${activeGame === "snake" ? "#254225" : "#2d2d2d"};
                        color: white;
                        cursor: pointer;
                    ">Змейка</button>

                    <button id="tab-tetris" style="
                        flex: 1;
                        min-width: 120px;
                        padding: 10px;
                        border-radius: 10px;
                        border: 1px solid ${activeGame === "tetris" ? "#66ccff" : "#555"};
                        background: ${activeGame === "tetris" ? "#1f3545" : "#2d2d2d"};
                        color: white;
                        cursor: pointer;
                    ">Тетрис</button>

                    <button id="tab-platformer" style="
                        flex: 1;
                        min-width: 120px;
                        padding: 10px;
                        border-radius: 10px;
                        border: 1px solid ${activeGame === "platformer" ? "#ffcc66" : "#555"};
                        background: ${activeGame === "platformer" ? "#4a3315" : "#2d2d2d"};
                        color: white;
                        cursor: pointer;
                    ">Платформер</button>
                </div>

                <div id="gamehub-content"></div>

                <div style="
                    margin-top: 12px;
                    color: #aaa;
                    font-size: 13px;
                    line-height: 1.5;
                ">
                    Tab — переключить игру · Esc — закрыть
                </div>
            </div>
        </div>
    `;

    document.getElementById("gamehub-close")?.addEventListener("click", closeGameHub);
    document.getElementById("tab-snake")?.addEventListener("click", () => switchGame("snake"));
    document.getElementById("tab-tetris")?.addEventListener("click", () => switchGame("tetris"));
    document.getElementById("tab-platformer")?.addEventListener("click", () => switchGame("platformer"));
}

function switchGame(gameName) {
    if (!gameHubOpen || activeGame === gameName) return;

    stopAllGames();
    activeGame = gameName;
    renderGameHub();
    startActiveGame();
}

function startActiveGame() {
    if (activeGame === "snake") {
        renderSnakeUI();
        startSnake();
    } else if (activeGame === "tetris") {
        renderTetrisUI();
        startTetris();
    } else if (activeGame === "platformer") {
        renderPlatformerUI();
        startPlatformer();
    }
}

function stopAllGames() {
    if (snakeInterval) {
        clearInterval(snakeInterval);
        snakeInterval = null;
    }

    if (tetrisInterval) {
        clearInterval(tetrisInterval);
        tetrisInterval = null;
    }

    if (platformerInterval) {
        clearInterval(platformerInterval);
        platformerInterval = null;
    }

    snakeState = null;
    tetrisState = null;
    platformerState = null;
}

/* =========================
   SNAKE
========================= */

function renderSnakeUI() {
    const content = document.getElementById("gamehub-content");
    if (!content) return;

    const best = Number(localStorage.getItem("snake_best_score") || 0);

    content.innerHTML = `
        <div style="display: flex; justify-content: center;">
            <div id="snake-wrapper" style="position: relative; width: 300px;">
                <canvas id="snake" width="300" height="300" style="
                    display:block;
                    background:#111;
                    border:2px solid #555;
                    border-radius: 8px;
                "></canvas>

                <div id="snake-overlay" style="
                    display: none;
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.65);
                    color: white;
                    font-size: 18px;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 20px;
                    box-sizing: border-box;
                    line-height: 1.5;
                ">
                    Игра окончена
                    <br><br>
                    Нажми стрелку, чтобы начать заново
                </div>

                <div id="snake-stats" style="
                    margin-top: 8px;
                    color: #ddd;
                    font-size: 14px;
                    text-align: center;
                    user-select: none;
                ">
                    Счёт: <span id="snake-score">0</span> |
                    Рекорд: <span id="snake-best">${best}</span>
                </div>
            </div>
        </div>
    `;
}

function startSnake() {
    const canvas = document.getElementById("snake");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("snake-overlay");
    const scoreEl = document.getElementById("snake-score");
    const bestEl = document.getElementById("snake-best");

    const cellSize = 10;
    const gridSize = 30;
    const storageKey = "snake_best_score";

    let snake = [{ x: 10, y: 10 }];
    let dx = 1;
    let dy = 0;
    let score = 0;
    let bestScore = Number(localStorage.getItem(storageKey) || 0);
    let gameOver = false;
    let waitingForRestart = false;

    if (bestEl) bestEl.textContent = String(bestScore);
    if (scoreEl) scoreEl.textContent = "0";
    if (overlay) overlay.style.display = "none";

    let food = randomFood();

    snakeState = {
        handleKey(e) {
            if (!gameHubOpen || activeGame !== "snake") return;

            const isArrow =
                e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight";

            if (!isArrow) return;

            e.preventDefault();

            if (waitingForRestart) {
                stopAllGames();
                renderSnakeUI();
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
        }
    };

    function randomFood() {
        let newFood;

        do {
            newFood = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize)
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

        return newFood;
    }

    function updateScore() {
        if (scoreEl) scoreEl.textContent = String(score);

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem(storageKey, String(bestScore));
        }

        if (bestEl) bestEl.textContent = String(bestScore);
    }

    function endGame() {
        gameOver = true;
        waitingForRestart = true;

        if (snakeInterval) {
            clearInterval(snakeInterval);
            snakeInterval = null;
        }

        if (overlay) overlay.style.display = "flex";
    }

    function draw() {
        if (!gameHubOpen || activeGame !== "snake" || gameOver) return;

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
            score += 1;
            updateScore();
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
        ctx.fillRect(
            food.x * cellSize,
            food.y * cellSize,
            cellSize,
            cellSize
        );
    }

    if (snakeInterval) clearInterval(snakeInterval);
    snakeInterval = setInterval(draw, 100);
}

/* =========================
   TETRIS
========================= */

function renderTetrisUI() {
    const content = document.getElementById("gamehub-content");
    if (!content) return;

    const best = Number(localStorage.getItem("tetris_best_score") || 0);

    content.innerHTML = `
        <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
            <div style="position: relative;">
                <canvas id="tetris" width="300" height="600" style="
                    display:block;
                    background:#111;
                    border:2px solid #555;
                    border-radius: 8px;
                "></canvas>

                <div id="tetris-overlay" style="
                    display:none;
                    position:absolute;
                    inset:0;
                    background: rgba(0,0,0,0.7);
                    color:white;
                    font-size:18px;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    padding:20px;
                    box-sizing:border-box;
                    line-height:1.5;
                ">
                    Игра окончена
                    <br><br>
                    Нажми Enter для рестарта
                </div>
            </div>

            <div style="min-width: 90px; color:#ddd; font-size:14px; line-height:1.8;">
                <div>Счёт: <span id="tetris-score">0</span></div>
                <div>Рекорд: <span id="tetris-best">${best}</span></div>
                <div style="margin-top: 12px; color:#aaa;">
                    ← → двигать
                    <br>↓ ускорить
                    <br>↑ / Space поворот
                    <br>Enter рестарт
                </div>
            </div>
        </div>
    `;
}

function startTetris() {
    const canvas = document.getElementById("tetris");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("tetris-score");
    const bestEl = document.getElementById("tetris-best");
    const overlay = document.getElementById("tetris-overlay");

    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 30;
    const storageKey = "tetris_best_score";

    const COLORS = [
        null,
        "#00f0f0",
        "#f0f000",
        "#a000f0",
        "#00f000",
        "#f00000",
        "#0000f0",
        "#f0a000"
    ];

    const SHAPES = [
        [],
        [[1, 1, 1, 1]],
        [[2, 2], [2, 2]],
        [[0, 3, 0], [3, 3, 3]],
        [[0, 4, 4], [4, 4, 0]],
        [[5, 5, 0], [0, 5, 5]],
        [[6, 0, 0], [6, 6, 6]],
        [[0, 0, 7], [7, 7, 7]]
    ];

    let board = createBoard();
    let score = 0;
    let bestScore = Number(localStorage.getItem(storageKey) || 0);
    let gameOver = false;

    let player = createPiece();

    if (scoreEl) scoreEl.textContent = "0";
    if (bestEl) bestEl.textContent = String(bestScore);
    if (overlay) overlay.style.display = "none";

    tetrisState = {
        handleKey(e) {
            if (!gameHubOpen || activeGame !== "tetris") return;

            if (gameOver && e.key === "Enter") {
                e.preventDefault();
                stopAllGames();
                renderTetrisUI();
                startTetris();
                return;
            }

            if (gameOver) return;

            if (e.key === "ArrowLeft") {
                e.preventDefault();
                movePlayer(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                movePlayer(1);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                dropPlayer();
            } else if (e.key === "ArrowUp" || e.key === " ") {
                e.preventDefault();
                rotatePlayer();
            }
        }
    };

    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function randomType() {
        return 1 + Math.floor(Math.random() * 7);
    }

    function createPiece() {
        const type = randomType();
        const matrix = SHAPES[type].map(row => [...row]);

        return {
            matrix,
            x: Math.floor(COLS / 2) - Math.ceil(matrix[0].length / 2),
            y: 0
        };
    }

    function drawCell(x, y, value) {
        ctx.fillStyle = COLORS[value];
        ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
        ctx.strokeStyle = "#1e1e1e";
        ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
    }

    function drawBoard() {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    drawCell(x, y, board[y][x]);
                } else {
                    ctx.strokeStyle = "#1b1b1b";
                    ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
                }
            }
        }
    }

    function drawMatrix(matrix, offsetX, offsetY) {
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x]) {
                    drawCell(x + offsetX, y + offsetY, matrix[y][x]);
                }
            }
        }
    }

    function draw() {
        drawBoard();
        drawMatrix(player.matrix, player.x, player.y);
    }

    function collide(matrix, offsetX, offsetY) {
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (!matrix[y][x]) continue;

                const newX = x + offsetX;
                const newY = y + offsetY;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
        return false;
    }

    function merge() {
        for (let y = 0; y < player.matrix.length; y++) {
            for (let x = 0; x < player.matrix[y].length; x++) {
                if (player.matrix[y][x]) {
                    board[player.y + y][player.x + x] = player.matrix[y][x];
                }
            }
        }
    }

    function clearLines() {
        let cleared = 0;

        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                cleared++;
                y++;
            }
        }

        if (cleared > 0) {
            score += cleared * 100;

            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem(storageKey, String(bestScore));
            }

            if (scoreEl) scoreEl.textContent = String(score);
            if (bestEl) bestEl.textContent = String(bestScore);
        }
    }

    function movePlayer(dir) {
        if (!collide(player.matrix, player.x + dir, player.y)) {
            player.x += dir;
            draw();
        }
    }

    function dropPlayer() {
        if (!collide(player.matrix, player.x, player.y + 1)) {
            player.y++;
            draw();
            return;
        }

        merge();
        clearLines();
        player = createPiece();

        if (collide(player.matrix, player.x, player.y)) {
            gameOver = true;
            if (overlay) overlay.style.display = "flex";

            if (tetrisInterval) {
                clearInterval(tetrisInterval);
                tetrisInterval = null;
            }
            return;
        }

        draw();
    }

    function rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                rotated[x][rows - 1 - y] = matrix[y][x];
            }
        }

        return rotated;
    }

    function rotatePlayer() {
        const rotated = rotateMatrix(player.matrix);

        if (!collide(rotated, player.x, player.y)) {
            player.matrix = rotated;
            draw();
            return;
        }

        if (!collide(rotated, player.x - 1, player.y)) {
            player.x -= 1;
            player.matrix = rotated;
            draw();
            return;
        }

        if (!collide(rotated, player.x + 1, player.y)) {
            player.x += 1;
            player.matrix = rotated;
            draw();
        }
    }

    draw();

    if (tetrisInterval) clearInterval(tetrisInterval);
    tetrisInterval = setInterval(() => {
        if (!gameHubOpen || activeGame !== "tetris" || gameOver) return;
        dropPlayer();
    }, 500);
}

/* =========================
   PLATFORMER BIG LEVEL
========================= */

function renderPlatformerUI() {
    const content = document.getElementById("gamehub-content");
    if (!content) return;

    const best = Number(localStorage.getItem("platformer_best_score") || 0);

    content.innerHTML = `
        <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
            <div style="position: relative;">
                <canvas id="platformer" width="620" height="320" style="
                    display:block;
                    background:#6fc2ff;
                    border:2px solid #555;
                    border-radius: 8px;
                    max-width: 100%;
                    height: auto;
                "></canvas>

                <div id="platformer-overlay" style="
                    display:none;
                    position:absolute;
                    inset:0;
                    background: rgba(0,0,0,0.68);
                    color:white;
                    font-size:18px;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    padding:20px;
                    box-sizing:border-box;
                    line-height:1.5;
                "></div>
            </div>

            <div style="min-width: 140px; color:#ddd; font-size:14px; line-height:1.8;">
                <div>Очки: <span id="platformer-score">0</span></div>
                <div>Рекорд: <span id="platformer-best">${best}</span></div>
                <div style="margin-top: 12px; color:#aaa;">
                    ← → / A D — идти
                    <br>↑ / W / Space — прыжок
                    <br>Enter — рестарт
                </div>
            </div>
        </div>
    `;
}

function startPlatformer() {
    const canvas = document.getElementById("platformer");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const overlay = document.getElementById("platformer-overlay");
    const scoreEl = document.getElementById("platformer-score");
    const bestEl = document.getElementById("platformer-best");

    const storageKey = "platformer_best_score";

    const gravity = 0.42;
    const moveSpeed = 2.8;
    const jumpPower = -8.8;

    const viewWidth = canvas.width;
    const viewHeight = canvas.height;

    let score = 0;
    let bestScore = Number(localStorage.getItem(storageKey) || 0);
    let gameOver = false;
    let won = false;
    let cameraX = 0;
    let level = 1;

    if (scoreEl) scoreEl.textContent = "0";
    if (bestEl) bestEl.textContent = String(bestScore);
    if (overlay) overlay.style.display = "none";

    const player = {
        x: 40,
        y: 220,
        w: 18,
        h: 28,
        vx: 0,
        vy: 0,
        onGround: false,
        facing: 1
    };

    const keys = {
        left: false,
        right: false
    };

    let world = {};
    let groundSegments = [];
    let platforms = [];
    let blocks = [];
    let coins = [];
    let enemies = [];
    let flyers = [];
    let flag = {};

    function loadLevel1() {
        level = 1;
        world = {
            width: 4200,
            height: 320,
            groundY: 260
        };

        groundSegments = [
            { x: 0, w: 430 },
            { x: 490, w: 250 },
            { x: 800, w: 420 },
            { x: 1280, w: 280 },
            { x: 1620, w: 460 },
            { x: 2140, w: 290 },
            { x: 2490, w: 420 },
            { x: 2970, w: 320 },
            { x: 3350, w: 370 },
            { x: 3780, w: 420 }
        ];

        platforms = [
            { x: 180, y: 220, w: 60, h: 12 },
            { x: 260, y: 190, w: 60, h: 12 },
            { x: 560, y: 210, w: 60, h: 12 },
            { x: 880, y: 220, w: 60, h: 12 },
            { x: 960, y: 190, w: 60, h: 12 },
            { x: 1040, y: 160, w: 60, h: 12 },
            { x: 1360, y: 210, w: 70, h: 12 },
            { x: 1460, y: 180, w: 70, h: 12 },
            { x: 1720, y: 215, w: 70, h: 12 },
            { x: 1800, y: 185, w: 70, h: 12 },
            { x: 1880, y: 155, w: 70, h: 12 },
            { x: 2220, y: 205, w: 70, h: 12 },
            { x: 2320, y: 175, w: 70, h: 12 },
            { x: 2590, y: 220, w: 60, h: 12 },
            { x: 2670, y: 190, w: 60, h: 12 },
            { x: 3050, y: 210, w: 70, h: 12 },
            { x: 3150, y: 180, w: 70, h: 12 },
            { x: 3430, y: 220, w: 70, h: 12 },
            { x: 3510, y: 190, w: 70, h: 12 },
            { x: 3860, y: 210, w: 70, h: 12 },
            { x: 3940, y: 180, w: 70, h: 12 }
        ];

        blocks = [
            { x: 330, y: 180, w: 22, h: 22 },
            { x: 352, y: 180, w: 22, h: 22 },
            { x: 374, y: 180, w: 22, h: 22 },

            { x: 1100, y: 150, w: 22, h: 22 },
            { x: 1122, y: 150, w: 22, h: 22 },
            { x: 1144, y: 150, w: 22, h: 22 },
            { x: 1166, y: 150, w: 22, h: 22 },

            { x: 2000, y: 170, w: 22, h: 22 },
            { x: 2022, y: 170, w: 22, h: 22 },
            { x: 2044, y: 170, w: 22, h: 22 },

            { x: 2840, y: 180, w: 22, h: 22 },
            { x: 2862, y: 180, w: 22, h: 22 },
            { x: 2884, y: 180, w: 22, h: 22 },
            { x: 2906, y: 180, w: 22, h: 22 },

            { x: 3640, y: 165, w: 22, h: 22 },
            { x: 3662, y: 165, w: 22, h: 22 },
            { x: 3684, y: 165, w: 22, h: 22 }
        ];

        coins = [
            { x: 195, y: 195, r: 6, taken: false },
            { x: 275, y: 165, r: 6, taken: false },
            { x: 575, y: 185, r: 6, taken: false },
            { x: 895, y: 195, r: 6, taken: false },
            { x: 975, y: 165, r: 6, taken: false },
            { x: 1055, y: 135, r: 6, taken: false },
            { x: 1378, y: 185, r: 6, taken: false },
            { x: 1478, y: 155, r: 6, taken: false },
            { x: 1738, y: 190, r: 6, taken: false },
            { x: 1818, y: 160, r: 6, taken: false },
            { x: 1898, y: 130, r: 6, taken: false },
            { x: 2238, y: 180, r: 6, taken: false },
            { x: 2338, y: 150, r: 6, taken: false },
            { x: 2608, y: 195, r: 6, taken: false },
            { x: 2688, y: 165, r: 6, taken: false },
            { x: 3068, y: 185, r: 6, taken: false },
            { x: 3168, y: 155, r: 6, taken: false },
            { x: 3448, y: 195, r: 6, taken: false },
            { x: 3528, y: 165, r: 6, taken: false },
            { x: 3878, y: 185, r: 6, taken: false },
            { x: 3958, y: 155, r: 6, taken: false },
            { x: 4100, y: 225, r: 6, taken: false }
        ];

        enemies = [
            { x: 620, y: 243, w: 18, h: 17, minX: 520, maxX: 710, speed: 1.0, dir: 1, alive: true },
            { x: 1010, y: 243, w: 18, h: 17, minX: 830, maxX: 1190, speed: 1.15, dir: -1, alive: true },
            { x: 1450, y: 243, w: 18, h: 17, minX: 1300, maxX: 1530, speed: 1.05, dir: 1, alive: true },
            { x: 1860, y: 243, w: 18, h: 17, minX: 1640, maxX: 2050, speed: 1.15, dir: -1, alive: true },
            { x: 2350, y: 243, w: 18, h: 17, minX: 2160, maxX: 2410, speed: 1.2, dir: 1, alive: true },
            { x: 2760, y: 243, w: 18, h: 17, minX: 2510, maxX: 2890, speed: 1.1, dir: -1, alive: true },
            { x: 3200, y: 243, w: 18, h: 17, minX: 3000, maxX: 3270, speed: 1.25, dir: 1, alive: true },
            { x: 3600, y: 243, w: 18, h: 17, minX: 3370, maxX: 3710, speed: 1.1, dir: -1, alive: true }
        ];

        flyers = [];

        flag = {
            x: 4120,
            y: 160,
            w: 12,
            h: 100
        };
    }

    function loadLevel2() {
        level = 2;
        world = {
            width: 5600,
            height: 320,
            groundY: 260
        };

        groundSegments = [
            { x: 0, w: 340 },
            { x: 420, w: 260 },
            { x: 760, w: 360 },
            { x: 1200, w: 240 },
            { x: 1520, w: 420 },
            { x: 2020, w: 260 },
            { x: 2360, w: 400 },
            { x: 2850, w: 260 },
            { x: 3200, w: 420 },
            { x: 3700, w: 260 },
            { x: 4050, w: 430 },
            { x: 4560, w: 300 },
            { x: 4940, w: 660 }
        ];

        platforms = [
            { x: 140, y: 220, w: 60, h: 12 },
            { x: 220, y: 190, w: 60, h: 12 },
            { x: 520, y: 200, w: 70, h: 12 },
            { x: 860, y: 210, w: 70, h: 12 },
            { x: 960, y: 180, w: 70, h: 12 },
            { x: 1280, y: 210, w: 70, h: 12 },
            { x: 1360, y: 180, w: 70, h: 12 },
            { x: 1660, y: 200, w: 80, h: 12 },
            { x: 1760, y: 170, w: 80, h: 12 },
            { x: 2140, y: 220, w: 70, h: 12 },
            { x: 2460, y: 200, w: 80, h: 12 },
            { x: 2560, y: 170, w: 80, h: 12 },
            { x: 2920, y: 210, w: 80, h: 12 },
            { x: 3300, y: 220, w: 80, h: 12 },
            { x: 3400, y: 190, w: 80, h: 12 },
            { x: 3780, y: 200, w: 80, h: 12 },
            { x: 4140, y: 220, w: 80, h: 12 },
            { x: 4240, y: 190, w: 80, h: 12 },
            { x: 4620, y: 210, w: 80, h: 12 },
            { x: 5080, y: 190, w: 90, h: 12 },
            { x: 5200, y: 160, w: 90, h: 12 }
        ];

        blocks = [
            { x: 620, y: 170, w: 22, h: 22 },
            { x: 642, y: 170, w: 22, h: 22 },
            { x: 664, y: 170, w: 22, h: 22 },

            { x: 1880, y: 160, w: 22, h: 22 },
            { x: 1902, y: 160, w: 22, h: 22 },
            { x: 1924, y: 160, w: 22, h: 22 },
            { x: 1946, y: 160, w: 22, h: 22 },

            { x: 3540, y: 170, w: 22, h: 22 },
            { x: 3562, y: 170, w: 22, h: 22 },
            { x: 3584, y: 170, w: 22, h: 22 },

            { x: 4700, y: 160, w: 22, h: 22 },
            { x: 4722, y: 160, w: 22, h: 22 },
            { x: 4744, y: 160, w: 22, h: 22 },
            { x: 4766, y: 160, w: 22, h: 22 }
        ];

        coins = [
            { x: 155, y: 195, r: 6, taken: false },
            { x: 235, y: 165, r: 6, taken: false },
            { x: 540, y: 175, r: 6, taken: false },
            { x: 880, y: 185, r: 6, taken: false },
            { x: 980, y: 155, r: 6, taken: false },
            { x: 1300, y: 185, r: 6, taken: false },
            { x: 1380, y: 155, r: 6, taken: false },
            { x: 1680, y: 175, r: 6, taken: false },
            { x: 1780, y: 145, r: 6, taken: false },
            { x: 2160, y: 195, r: 6, taken: false },
            { x: 2480, y: 175, r: 6, taken: false },
            { x: 2580, y: 145, r: 6, taken: false },
            { x: 2940, y: 185, r: 6, taken: false },
            { x: 3320, y: 195, r: 6, taken: false },
            { x: 3420, y: 165, r: 6, taken: false },
            { x: 3800, y: 175, r: 6, taken: false },
            { x: 4160, y: 195, r: 6, taken: false },
            { x: 4260, y: 165, r: 6, taken: false },
            { x: 4640, y: 185, r: 6, taken: false },
            { x: 5100, y: 165, r: 6, taken: false },
            { x: 5220, y: 135, r: 6, taken: false },
            { x: 5480, y: 225, r: 6, taken: false }
        ];

        enemies = [
            { x: 560, y: 243, w: 18, h: 17, minX: 450, maxX: 660, speed: 1.1, dir: 1, alive: true },
            { x: 1010, y: 243, w: 18, h: 17, minX: 790, maxX: 1110, speed: 1.2, dir: -1, alive: true },
            { x: 1710, y: 243, w: 18, h: 17, minX: 1540, maxX: 1910, speed: 1.15, dir: 1, alive: true },
            { x: 2490, y: 243, w: 18, h: 17, minX: 2380, maxX: 2730, speed: 1.2, dir: -1, alive: true },
            { x: 3360, y: 243, w: 18, h: 17, minX: 3220, maxX: 3600, speed: 1.25, dir: 1, alive: true },
            { x: 4210, y: 243, w: 18, h: 17, minX: 4070, maxX: 4470, speed: 1.15, dir: -1, alive: true },
            { x: 5150, y: 243, w: 18, h: 17, minX: 4960, maxX: 5520, speed: 1.3, dir: 1, alive: true }
        ];

        flyers = [
            { x: 700, y: 90, w: 24, h: 12, minX: 520, maxX: 980, speed: 2.2, dir: 1, alive: true },
            { x: 1500, y: 70, w: 24, h: 12, minX: 1300, maxX: 1840, speed: 2.5, dir: -1, alive: true },
            { x: 2450, y: 85, w: 24, h: 12, minX: 2280, maxX: 2730, speed: 2.6, dir: 1, alive: true },
            { x: 3500, y: 75, w: 24, h: 12, minX: 3300, maxX: 3900, speed: 2.4, dir: -1, alive: true },
            { x: 4700, y: 80, w: 24, h: 12, minX: 4520, maxX: 5320, speed: 2.8, dir: 1, alive: true }
        ];

        flag = {
            x: 5520,
            y: 160,
            w: 12,
            h: 100
        };
    }

    function resetPlayerPosition() {
        player.x = 40;
        player.y = 220;
        player.vx = 0;
        player.vy = 0;
        player.onGround = false;
        cameraX = 0;
    }

    function startLevel1() {
        loadLevel1();
        resetPlayerPosition();
        gameOver = false;
        won = false;
        if (overlay) overlay.style.display = "none";
    }

    function startLevel2() {
        loadLevel2();
        resetPlayerPosition();
        gameOver = false;
        won = false;
        if (overlay) overlay.style.display = "none";
    }

    startLevel1();

    platformerState = {
        handleKey(e) {
            if (!gameHubOpen || activeGame !== "platformer") return;

            if ((gameOver || won) && e.key === "Enter") {
                e.preventDefault();
                stopAllGames();
                renderPlatformerUI();
                startPlatformer();
                return;
            }

            if (e.type === "keydown") {
                if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                    e.preventDefault();
                    keys.left = true;
                } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                    e.preventDefault();
                    keys.right = true;
                } else if (
                    e.key === "ArrowUp" ||
                    e.key === "w" ||
                    e.key === "W" ||
                    e.key === " "
                ) {
                    e.preventDefault();
                    if (!gameOver && !won && player.onGround) {
                        player.vy = jumpPower;
                        player.onGround = false;
                    }
                }
            } else if (e.type === "keyup") {
                if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                    keys.left = false;
                } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                    keys.right = false;
                }
            }
        }
    };

    function updateScore(add) {
        score += add;
        if (scoreEl) scoreEl.textContent = String(score);

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem(storageKey, String(bestScore));
            if (bestEl) bestEl.textContent = String(bestScore);
        }
    }

    function rectsIntersect(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    function circleRectIntersect(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        return dx * dx + dy * dy < circle.r * circle.r;
    }

    function showOverlay(text) {
        if (!overlay) return;
        overlay.style.display = "flex";
        overlay.innerHTML = text;
    }

    function loseGame() {
        gameOver = true;
        showOverlay("Ты проиграл<br><br>Нажми Enter для рестарта");
        if (platformerInterval) {
            clearInterval(platformerInterval);
            platformerInterval = null;
        }
    }

    function winGame() {
        if (level === 1) {
            startLevel2();
            return;
        }

        won = true;
        updateScore(100);
        showOverlay("Ты прошёл оба уровня!<br><br>Нажми Enter для новой игры");
        if (platformerInterval) {
            clearInterval(platformerInterval);
            platformerInterval = null;
        }
    }

    function getSolidRects() {
        const solids = [];

        for (const seg of groundSegments) {
            solids.push({
                x: seg.x,
                y: world.groundY,
                w: seg.w,
                h: world.height - world.groundY
            });
        }

        for (const p of platforms) {
            solids.push(p);
        }

        for (const b of blocks) {
            solids.push(b);
        }

        return solids;
    }

    function updateEnemies() {
        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            enemy.x += enemy.speed * enemy.dir;

            if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) {
                enemy.dir *= -1;
            }
        }
    }

    function updateFlyers() {
        if (level !== 2) return;

        for (const flyer of flyers) {
            if (!flyer.alive) continue;

            flyer.x += flyer.speed * flyer.dir;

            if (flyer.x <= flyer.minX || flyer.x + flyer.w >= flyer.maxX) {
                flyer.dir *= -1;
            }

            if (rectsIntersect(player, flyer)) {
                loseGame();
                return;
            }
        }
    }

    function updatePlayer() {
        if (keys.left && !keys.right) {
            player.vx = -moveSpeed;
            player.facing = -1;
        } else if (keys.right && !keys.left) {
            player.vx = moveSpeed;
            player.facing = 1;
        } else {
            player.vx = 0;
        }

        player.x += player.vx;
        player.x = Math.max(0, Math.min(world.width - player.w, player.x));

        player.vy += gravity;
        player.y += player.vy;
        player.onGround = false;

        const solids = getSolidRects();

        for (const solid of solids) {
            const playerRect = { x: player.x, y: player.y, w: player.w, h: player.h };

            if (rectsIntersect(playerRect, solid)) {
                const prevBottom = player.y + player.h - player.vy;
                const prevTop = player.y - player.vy;
                const prevRight = player.x + player.w - player.vx;
                const prevLeft = player.x - player.vx;

                if (prevBottom <= solid.y + 4 && player.vy >= 0) {
                    player.y = solid.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                } else if (prevTop >= solid.y + solid.h - 4 && player.vy < 0) {
                    player.y = solid.y + solid.h;
                    player.vy = 0;
                } else if (prevRight <= solid.x + 4 && player.vx > 0) {
                    player.x = solid.x - player.w;
                } else if (prevLeft >= solid.x + solid.w - 4 && player.vx < 0) {
                    player.x = solid.x + solid.w;
                }
            }
        }

        if (player.y > world.height + 60) {
            loseGame();
        }

        cameraX = player.x - 220;
        cameraX = Math.max(0, Math.min(world.width - viewWidth, cameraX));
    }

    function updateCoins() {
        for (const coin of coins) {
            if (!coin.taken && circleRectIntersect(coin, player)) {
                coin.taken = true;
                updateScore(10);
            }
        }
    }

    function updateEnemyCollision() {
        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            if (rectsIntersect(player, enemy)) {
                const playerBottom = player.y + player.h;
                const enemyTop = enemy.y;

                if (player.vy > 0 && playerBottom - 6 <= enemyTop + 8) {
                    enemy.alive = false;
                    player.vy = -5.4;
                    updateScore(25);
                } else {
                    loseGame();
                    return;
                }
            }
        }
    }

    function updateFlagCollision() {
        if (rectsIntersect(player, flag)) {
            winGame();
        }
    }

    function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);

        if (level === 1) {
            sky.addColorStop(0, "#72c6ff");
            sky.addColorStop(1, "#d9f1ff");
        } else {
            sky.addColorStop(0, "#2f2147");
            sky.addColorStop(1, "#0f1a2f");
        }

        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, viewWidth, viewHeight);

        if (level === 1) {
            const clouds = [
                { x: 80, y: 45 }, { x: 360, y: 35 }, { x: 720, y: 52 }, { x: 1080, y: 38 },
                { x: 1450, y: 48 }, { x: 1840, y: 38 }, { x: 2220, y: 55 }, { x: 2600, y: 40 },
                { x: 2980, y: 50 }, { x: 3380, y: 35 }, { x: 3780, y: 52 }
            ];

            for (const c of clouds) {
                const cx = c.x - cameraX;
                ctx.fillStyle = "#ffffffbb";
                ctx.fillRect(cx, c.y, 46, 16);
                ctx.fillRect(cx + 10, c.y - 8, 26, 16);
            }

            const hills = [
                { x: 120, w: 120, h: 55 },
                { x: 670, w: 150, h: 72 },
                { x: 1320, w: 120, h: 58 },
                { x: 2080, w: 160, h: 76 },
                { x: 2870, w: 130, h: 60 },
                { x: 3550, w: 150, h: 74 }
            ];

            for (const hill of hills) {
                const hx = hill.x - cameraX;
                ctx.fillStyle = "#79b85f";
                ctx.beginPath();
                ctx.moveTo(hx, world.groundY);
                ctx.quadraticCurveTo(hx + hill.w / 2, world.groundY - hill.h, hx + hill.w, world.groundY);
                ctx.closePath();
                ctx.fill();
            }
        } else {
            const stars = [
                { x: 120, y: 40 }, { x: 260, y: 70 }, { x: 420, y: 35 }, { x: 630, y: 90 },
                { x: 880, y: 60 }, { x: 1100, y: 45 }, { x: 1340, y: 85 }, { x: 1600, y: 55 },
                { x: 1890, y: 40 }, { x: 2210, y: 70 }, { x: 2500, y: 50 }, { x: 2790, y: 95 },
                { x: 3140, y: 40 }, { x: 3480, y: 65 }, { x: 3810, y: 50 }, { x: 4170, y: 85 },
                { x: 4550, y: 40 }, { x: 4900, y: 70 }, { x: 5300, y: 55 }
            ];

            for (const s of stars) {
                const sx = s.x - cameraX;
                ctx.fillStyle = "#ffffffcc";
                ctx.fillRect(sx, s.y, 2, 2);
            }

            ctx.fillStyle = "#e8d8a8";
            ctx.beginPath();
            ctx.arc(520 - cameraX, 60, 26, 0, Math.PI * 2);
            ctx.fill();

            const darkHills = [
                { x: 180, w: 150, h: 45 },
                { x: 900, w: 180, h: 60 },
                { x: 1780, w: 140, h: 52 },
                { x: 2660, w: 170, h: 58 },
                { x: 3600, w: 160, h: 55 },
                { x: 4700, w: 190, h: 62 }
            ];

            for (const hill of darkHills) {
                const hx = hill.x - cameraX;
                ctx.fillStyle = "#243b2d";
                ctx.beginPath();
                ctx.moveTo(hx, world.groundY);
                ctx.quadraticCurveTo(hx + hill.w / 2, world.groundY - hill.h, hx + hill.w, world.groundY);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    function drawGround() {
        for (const seg of groundSegments) {
            const x = seg.x - cameraX;

            ctx.fillStyle = level === 1 ? "#8b5a2b" : "#4b3a2a";
            ctx.fillRect(x, world.groundY, seg.w, world.height - world.groundY);

            ctx.fillStyle = level === 1 ? "#b97a3b" : "#6b5640";
            ctx.fillRect(x, world.groundY, seg.w, 5);
        }
    }

    function drawPlatforms() {
        for (const p of platforms) {
            const x = p.x - cameraX;
            ctx.fillStyle = level === 1 ? "#8b5a2b" : "#5e4a35";
            ctx.fillRect(x, p.y, p.w, p.h);

            ctx.fillStyle = level === 1 ? "#b97a3b" : "#7d6750";
            ctx.fillRect(x, p.y, p.w, 4);
        }
    }

    function drawBlocks() {
        for (const b of blocks) {
            const x = b.x - cameraX;
            ctx.fillStyle = level === 1 ? "#c8863b" : "#7f6a52";
            ctx.fillRect(x, b.y, b.w, b.h);
            ctx.strokeStyle = level === 1 ? "#7d4e18" : "#524434";
            ctx.strokeRect(x, b.y, b.w, b.h);
        }
    }

    function drawCoins() {
        for (const coin of coins) {
            if (coin.taken) continue;
            const x = coin.x - cameraX;

            ctx.fillStyle = "#ffd84a";
            ctx.beginPath();
            ctx.arc(x, coin.y, coin.r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#d9a400";
            ctx.stroke();
        }
    }

    function drawEnemies() {
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const x = enemy.x - cameraX;

            ctx.fillStyle = level === 1 ? "#8b3d1f" : "#5a2f44";
            ctx.fillRect(x, enemy.y, enemy.w, enemy.h);

            ctx.fillStyle = "#f1d0a0";
            ctx.fillRect(x + 2, enemy.y + 2, enemy.w - 4, 5);
        }
    }

    function drawFlyers() {
        if (level !== 2) return;

        for (const flyer of flyers) {
            if (!flyer.alive) continue;
            const x = flyer.x - cameraX;

            ctx.fillStyle = "#cfd6e6";
            ctx.fillRect(x, flyer.y, flyer.w, flyer.h);

            ctx.fillStyle = "#9aa6c0";
            ctx.fillRect(x - 4, flyer.y + 3, 4, 2);
            ctx.fillRect(x + flyer.w, flyer.y + 3, 4, 2);
        }
    }

    function drawFlag() {
        const x = flag.x - cameraX;

        ctx.fillStyle = "#444";
        ctx.fillRect(x, flag.y, 4, flag.h);

        ctx.fillStyle = level === 1 ? "#ff4d4d" : "#7ad6ff";
        ctx.beginPath();
        ctx.moveTo(x + 4, flag.y);
        ctx.lineTo(x + 34, flag.y + 14);
        ctx.lineTo(x + 4, flag.y + 28);
        ctx.closePath();
        ctx.fill();
    }

    function drawPlayer() {
        const x = player.x - cameraX;

        ctx.fillStyle = "#d33";
        ctx.fillRect(x, player.y, player.w, player.h);

        ctx.fillStyle = "#2244cc";
        ctx.fillRect(x, player.y + 12, player.w, 14);

        ctx.fillStyle = "#ffcc99";
        ctx.fillRect(x + 3, player.y + 3, 12, 8);

        ctx.fillStyle = "#aa0000";
        ctx.fillRect(x + 1, player.y, 16, 5);
    }

    function draw() {
        ctx.clearRect(0, 0, viewWidth, viewHeight);
        drawBackground();
        drawGround();
        drawPlatforms();
        drawBlocks();
        drawCoins();
        drawFlag();
        drawEnemies();
        drawFlyers();
        drawPlayer();
    }

    function tick() {
        if (!gameHubOpen || activeGame !== "platformer" || gameOver || won) return;

        updateEnemies();
        updateFlyers();
        updatePlayer();
        updateCoins();
        updateEnemyCollision();
        updateFlagCollision();
        draw();
    }

    draw();

    if (platformerInterval) clearInterval(platformerInterval);
    platformerInterval = setInterval(tick, 1000 / 60);
}

/* =========================
   GLOBAL KEYS
========================= */

document.addEventListener("keydown", (e) => {
    if (!gameHubOpen) return;

    if (e.key === "Escape") {
        e.preventDefault();
        closeGameHub();
        return;
    }

    if (e.key === "Tab") {
        e.preventDefault();

        if (activeGame === "snake") {
            switchGame("tetris");
        } else if (activeGame === "tetris") {
            switchGame("platformer");
        } else {
            switchGame("snake");
        }
        return;
    }

    if (activeGame === "snake" && snakeState?.handleKey) {
        snakeState.handleKey(e);
    } else if (activeGame === "tetris" && tetrisState?.handleKey) {
        tetrisState.handleKey(e);
    } else if (activeGame === "platformer" && platformerState?.handleKey) {
        platformerState.handleKey(e);
    }
});

document.addEventListener("keyup", (e) => {
    if (!gameHubOpen) return;

    if (activeGame === "platformer" && platformerState?.handleKey) {
        platformerState.handleKey(e);
    }
});