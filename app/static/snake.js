(function () {
    const snakeContainer = document.getElementById("snake-container");
    const secretBtn = document.getElementById("secret-btn");

    if (!snakeContainer || !secretBtn) {
        alert("Не найден snake-container или secret-btn");
        return;
    }

    secretBtn.style.width = "80px";
    secretBtn.style.height = "80px";
    secretBtn.style.opacity = "0.5";
    secretBtn.style.background = "red";
    secretBtn.style.zIndex = "99999";

    function testClick() {
        alert("КЛИК ПО КНОПКЕ ЕСТЬ");
        snakeContainer.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.8);
                z-index: 99998;
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

    window.toggleSnake = testClick;
    secretBtn.onclick = testClick;
    secretBtn.addEventListener("click", testClick);
})();