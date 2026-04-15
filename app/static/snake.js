let snakeActive = false;

function toggleSnake() {
  const container = document.getElementById("snake-container");

  if (snakeActive) {
    container.innerHTML = "";
    snakeActive = false;
    return;
  }

  snakeActive = true;

  container.innerHTML = `<canvas id="snake" width="300" height="300"></canvas>`;
  startSnake();
}

function startSnake() {
  const canvas = document.getElementById("snake");
  const ctx = canvas.getContext("2d");

  let snake = [{ x: 10, y: 10 }];
  let dx = 1;
  let dy = 0;
  let food = { x: 15, y: 15 };

  document.onkeydown = (e) => {
    if (e.key === "ArrowUp") { dx = 0; dy = -1; }
    if (e.key === "ArrowDown") { dx = 0; dy = 1; }
    if (e.key === "ArrowLeft") { dx = -1; dy = 0; }
    if (e.key === "ArrowRight") { dx = 1; dy = 0; }
  };

  function draw() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 300, 300);

    ctx.fillStyle = "lime";
    snake.forEach(s => ctx.fillRect(s.x * 10, s.y * 10, 10, 10));

    ctx.fillStyle = "red";
    ctx.fillRect(food.x * 10, food.y * 10, 10, 10);

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      food = {
        x: Math.floor(Math.random() * 30),
        y: Math.floor(Math.random() * 30)
      };
    } else {
      snake.pop();
    }
  }

  setInterval(draw, 100);
}