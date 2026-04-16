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

/* =========================
   PLATFORMER (DAY + NIGHT LEVEL)
========================= */

function startPlatformer() {
    const canvas = document.getElementById("platformer");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const viewWidth = canvas.width;
    const viewHeight = canvas.height;

    const gravity = 0.42;
    const moveSpeed = 2.8;
    const jumpPower = -8.5;

    let level = 1;
    let cameraX = 0;
    let meteors = [];

    let player = {
        x: 40,
        y: 220,
        w: 18,
        h: 28,
        vx: 0,
        vy: 0,
        onGround: false
    };

    function createLevel(lvl) {
        if (lvl === 1) {
            return {
                width: 3000,
                groundY: 260,
                platforms: [
                    { x: 200, y: 210, w: 60, h: 12 },
                    { x: 500, y: 200, w: 60, h: 12 },
                    { x: 900, y: 180, w: 60, h: 12 },
                    { x: 1300, y: 200, w: 60, h: 12 }
                ],
                deadlyPlatforms: [],
                flagX: 2850
            };
        }

        // 🌙 НОЧНОЙ УРОВЕНЬ
        return {
            width: 4500,
            groundY: 260,
            platforms: [
                { x: 400, y: 200, w: 60, h: 12 },
                { x: 480, y: 170, w: 60, h: 12 },
                { x: 560, y: 140, w: 60, h: 12 },
                { x: 1200, y: 200, w: 60, h: 12 },
                { x: 1600, y: 170, w: 60, h: 12 },
                { x: 2000, y: 140, w: 60, h: 12 },
                { x: 2500, y: 200, w: 60, h: 12 },
                { x: 3000, y: 180, w: 60, h: 12 },
                { x: 3500, y: 150, w: 60, h: 12 }
            ],
            deadlyPlatforms: [
                { x: 1200, y: 200, w: 60, h: 12 },
                { x: 2000, y: 140, w: 60, h: 12 },
                { x: 3000, y: 180, w: 60, h: 12 }
            ],
            flagX: 4300
        };
    }

    let world = createLevel(level);

    const keys = { left: false, right: false };

    platformerState = {
        handleKey(e) {
            if (e.type === "keydown") {
                if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
                if (e.key === "ArrowRight" || e.key === "d") keys.right = true;

                if ((e.key === "ArrowUp" || e.key === " ") && player.onGround) {
                    player.vy = jumpPower;
                    player.onGround = false;
                }
            }

            if (e.type === "keyup") {
                if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
                if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
            }
        }
    };

    function rects(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    function updatePlayer() {
        player.vx = 0;

        if (keys.left) player.vx = -moveSpeed;
        if (keys.right) player.vx = moveSpeed;

        player.x += player.vx;

        player.vy += gravity;
        player.y += player.vy;
        player.onGround = false;

        const solids = [
            { x: 0, y: world.groundY, w: world.width, h: 50 },
            ...world.platforms
        ];

        for (let s of solids) {
            if (rects(player, s)) {
                if (player.vy > 0) {
                    player.y = s.y - player.h;
                    player.vy = 0;
                    player.onGround = true;

                    // ☠️ смертельные платформы
                    if (world.deadlyPlatforms.some(p => p.x === s.x && p.y === s.y)) {
                        resetGame();
                    }
                }
            }
        }

        if (player.y > 400) resetGame();

        cameraX = player.x - 200;
        cameraX = Math.max(0, Math.min(world.width - viewWidth, cameraX));
    }

    function spawnMeteor() {
        if (level !== 2) return;

        meteors.push({ 
            x:cameraX + viewWidth + 50,
            y: Math.random() * 150,
            vx: -4 - Math.random() * 2,
            vy: 1.5 + Math.random()
        });
    }

    function updateMeteors() {
        for (let m of meteors) {
            m.x += m.vx;
            m.y += m.vy;

            if (rects(player, { x: m.x, y: m.y, w: 10, h: 10 })) {
                resetGame();
            }
        }

        meteors = meteors.filter(m => m.x > cameraX - 100);
    }

    function drawBackground() {
        if (level === 1) {
            ctx.fillStyle = "#87ceeb";
        } else {
            ctx.fillStyle = "#1a1a2e";
        }
        ctx.fillRect(0, 0, viewWidth, viewHeight);
    }

    function drawWorld() {
        ctx.fillStyle = "#654321";

        // земля
        ctx.fillRect(-cameraX, world.groundY, world.width, 50);

        // платформы
        for (let p of world.platforms) {
            ctx.fillStyle = world.deadlyPlatforms.some(d => d.x === p.x)
                ? "#aa0000"
                : "#8b5a2b";

            ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);
        }

        // флаг
        ctx.fillStyle = "white";
        ctx.fillRect(world.flagX - cameraX, world.groundY - 60, 5, 60);
    }

    function drawMeteors() {
        ctx.fillStyle = "orange";
        meteors.forEach(m => {
            ctx.fillRect(m.x - cameraX, m.y, 6, 6);
        });
    }

    function drawPlayer() {
        ctx.fillStyle = "red";
        ctx.fillRect(player.x - cameraX, player.y, player.w, player.h);
    }

    function nextLevel() {
        level = 2;
        world = createLevel(level);
        player.x = 40;
        player.y = 200;
        meteors = [];
    }

    function resetGame() {
        level = 1;
        world = createLevel(level);
        player.x = 40;
        player.y = 200;
        meteors = [];
    }

    function tick() {
        updatePlayer();
        updateMeteors();

        if (Math.random() < 0.02) spawnMeteor();

        if (player.x > world.flagX) {
            if (level === 1) {
                nextLevel();
            } else {
                resetGame();
            }
        }

        ctx.clearRect(0, 0, viewWidth, viewHeight);
        drawBackground();
        drawWorld();
        drawMeteors();
        drawPlayer();
    }

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