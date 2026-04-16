(function () {
    const snakeContainer = document.getElementById("snake-container");
    const secretBtn = document.getElementById("secret-btn");

    if (!snakeContainer || !secretBtn) {
        alert("Не найден snake-container или secret-btn");
        return;
    }

    function launchTest(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        alert("КНОПКА СРАБОТАЛА");

        snakeContainer.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 2147483646;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 32px;
            ">
                ЗМЕЙКА ЗАПУСТИЛАСЬ
            </div>
        `;
    }

    window.toggleSnake = launchTest;

    secretBtn.onclick = launchTest;
    secretBtn.onmousedown = launchTest;
    secretBtn.onpointerdown = launchTest;
    secretBtn.ontouchstart = launchTest;

    secretBtn.addEventListener("click", launchTest, { passive: false });
    secretBtn.addEventListener("mousedown", launchTest, { passive: false });
    secretBtn.addEventListener("pointerdown", launchTest, { passive: false });
    secretBtn.addEventListener("touchstart", launchTest, { passive: false });
})();