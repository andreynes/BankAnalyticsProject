(function () {
    // SVG-иконки (копирование и зеленая галочка) в стиле Jay Copilot
    const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      viewBox="0 0 24 24">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>`;

    const checkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="green"
      viewBox="0 0 24 24">
        <path d="M20.285 6.709a1 1 0 0 0-1.414-1.418l-9.18 9.204L5.13 11.238a1 1 0 1 0-1.415 1.414l5.013 5.037a1 1 0 0 0 1.415 0l9.012-9.17z"/>
    </svg>`;

    // Новая иконка для графика (можно заменить на любую понравившуюся)
    const chartIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         viewBox="0 0 24 24">
           <line x1="3" y1="12" x2="7" y2="12"></line>
           <line x1="3" y1="18" x2="11" y2="18"></line>
           <line x1="3" y1="6"  x2="5" y2="6"></line>
           <polyline points="8 9 10 11 12 9 14 11 16 9"></polyline>
    </svg>`;

    // Данные выручки по годам
    const revenueData = {
        "2022": 41304544,
        "2023": 71644966,
        "2024": 98217663
    };

    // Данные чистой прибыли по годам
    const netProfitData = {
        "2022": 4455294,
        "2023": 9452030,
        "2024": 13745800
    };

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("searchButton").addEventListener("click", onSearch);
    });

    function onSearch() {
        const query = document.getElementById("queryInput").value.trim().toLowerCase();
        if (query === "полипласт выручка 2024") {
            showRevenueYear("2024");
        } else if (query === "полипласт выручка") {
            showRevenueTable();
        } else if (query === "полипласт чистая прибыль") {
            showNetProfitTable();
        } else if (query === "полипласт") {
            showCompanyIndicators();
        } else {
            showResult(
                `<span class="error">Запрос не поддерживается. Используйте: "полипласт выручка 2024", "полипласт выручка", "полипласт чистая прибыль" или "полипласт".</span>`
            );
        }
    }

    // Отображение выручки за конкретный год с кнопкой копирования (индивидуальный результат – plain text)
    function showRevenueYear(year) {
        const revenue = revenueData[year];
        const resultHTML = `
            <div class="result-item">
                Выручка за ${year} год: ${formatNumber(revenue)} руб.
                <button class="copy-btn" data-year="${year}" title="Скопировать число">
                    ${copyIconSVG}
                </button>
            </div>
        `;
        showResult(resultHTML);
        const copyBtn = document.querySelector(".copy-btn");
        if (copyBtn) {
            copyBtn.addEventListener("click", function () {
                copyWithFeedback(revenue.toString(), copyBtn, false);
            });
        }
    }

    // Отображение таблицы с выручкой по всем годам (команда "полипласт выручка")
    function showRevenueTable() {
        let tableHTML = `
            <div class="table-header">
                <button id="copyTable" class="copy-table-btn" title="Скопировать таблицу">
                    ${copyIconSVG} Копировать таблицу
                </button>
                <button id="copyChart" class="copy-chart-btn" title="Скопировать график">
                    ${chartIconSVG} График
                </button>
            </div>
            <table id="revenueTable">
                <thead>
                    <tr>
                        <th>Год</th>
                        <th>Выручка</th>
                        <th>Копировать</th>
                    </tr>
                </thead>
                <tbody>
        `;
        for (const year of Object.keys(revenueData)) {
            tableHTML += `
                    <tr>
                        <td>${year}</td>
                        <td>${formatNumber(revenueData[year])} руб.</td>
                        <td>
                            <button class="copy-btn" data-year="${year}" title="Скопировать число">
                                ${copyIconSVG}
                            </button>
                        </td>
                    </tr>
            `;
        }
        tableHTML += `
                </tbody>
            </table>
        `;
        showResult(tableHTML);

        // Обработчики для копирования отдельного числа
        const copyButtons = document.querySelectorAll(".copy-btn");
        copyButtons.forEach((btn) => {
            btn.addEventListener("click", function () {
                const year = btn.getAttribute("data-year");
                copyWithFeedback(revenueData[year].toString(), btn, false);
            });
        });
        // Обработчик для копирования таблицы (HTML без колонки "Копировать")
        const copyTableBtn = document.getElementById("copyTable");
        if (copyTableBtn) {
            copyTableBtn.addEventListener("click", function () {
                copyTableHtml("revenueTable", copyTableBtn);
            });
        }
        // Обработчик для копирования графика
        const copyChartBtn = document.getElementById("copyChart");
        if (copyChartBtn) {
            copyChartBtn.addEventListener("click", function () {
                copyChart("revenue", copyChartBtn);
            });
        }
    }

    // Отображение таблицы с чистой прибылью по годам (команда "полипласт чистая прибыль")
    function showNetProfitTable() {
        let tableHTML = `
            <div class="table-header">
                <button id="copyNetProfitTable" class="copy-table-btn" title="Скопировать таблицу">
                    ${copyIconSVG} Копировать таблицу
                </button>
            </div>
            <table id="netProfitTable">
                <thead>
                    <tr>
                        <th>Год</th>
                        <th>Чистая прибыль</th>
                        <th>Копировать</th>
                    </tr>
                </thead>
                <tbody>
        `;
        for (const year of Object.keys(netProfitData)) {
            tableHTML += `
                    <tr>
                        <td>${year}</td>
                        <td>${formatNumber(netProfitData[year])} руб.</td>
                        <td>
                            <button class="copy-btn" data-year="${year}" title="Скопировать число">
                                ${copyIconSVG}
                            </button>
                        </td>
                    </tr>
            `;
        }
        tableHTML += `
                </tbody>
            </table>
        `;
        showResult(tableHTML);

        const copyButtons = document.querySelectorAll(".copy-btn");
        copyButtons.forEach((btn) => {
            btn.addEventListener("click", function () {
                const year = btn.getAttribute("data-year");
                copyWithFeedback(netProfitData[year].toString(), btn, false);
            });
        });
        const copyTableBtn = document.getElementById("copyNetProfitTable");
        if (copyTableBtn) {
            copyTableBtn.addEventListener("click", function () {
                copyTableHtml("netProfitTable", copyTableBtn);
            });
        }
    }

    // Отображение комбинированной таблицы с показателями (команда "полипласт")
    function showCompanyIndicators() {
        let tableHTML = `
            <div class="table-header">
                <button id="copyCompanyTable" class="copy-table-btn" title="Скопировать таблицу">
                    ${copyIconSVG} Копировать таблицу
                </button>
            </div>
            <table id="companyTable">
                <thead>
                    <tr>
                        <th>Год</th>
                        <th>Выручка</th>
                        <th>Чистая прибыль</th>
                        <th>Копировать</th>
                    </tr>
                </thead>
                <tbody>
        `;
        for (const year of Object.keys(revenueData)) {
            tableHTML += `
                    <tr>
                        <td>${year}</td>
                        <td>${formatNumber(revenueData[year])} руб.</td>
                        <td>${formatNumber(netProfitData[year])} руб.</td>
                        <td>
                            <button class="copy-btn" data-year="${year}" title="Скопировать показатели">
                                ${copyIconSVG}
                            </button>
                        </td>
                    </tr>
            `;
        }
        tableHTML += `
                </tbody>
            </table>
        `;
        showResult(tableHTML);

        const copyButtons = document.querySelectorAll(".copy-btn");
        copyButtons.forEach((btn) => {
            btn.addEventListener("click", function () {
                const year = btn.getAttribute("data-year");
                const textToCopy = `Год: ${year}, Выручка: ${formatNumber(revenueData[year])} руб., Чистая прибыль: ${formatNumber(netProfitData[year])} руб.`;
                copyWithFeedback(textToCopy, btn, false);
            });
        });
        const copyTableBtn = document.getElementById("copyCompanyTable");
        if (copyTableBtn) {
            copyTableBtn.addEventListener("click", function () {
                copyTableHtml("companyTable", copyTableBtn);
            });
        }
    }

    // Функция копирования графика. Создает canvas, рисует диаграмму и копирует изображение.
    function copyChart(metric, buttonElement) {
        let data, label;
        if (metric === "revenue") {
            data = revenueData;
            label = "Выручка";
        } else {
            // Дополнительные показатели можно добавить по аналогии
            return;
        }

        // Создаем canvas для рисования графика
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");

        // Заливка фона белым цветом
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Параметры графика
        const margin = 40;
        const chartWidth = canvas.width - margin * 2;
        const chartHeight = canvas.height - margin * 2;
        const years = Object.keys(data);
        const values = Object.values(data);
        const maxVal = Math.max(...values);
        const barWidth = chartWidth / (years.length * 2);

        // Отрисовка заголовка графика
        ctx.fillStyle = "#000";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, canvas.width / 2, margin / 2);

        // Отрисовка столбцов и подписей
        years.forEach((year, index) => {
            const value = data[year];
            const barHeight = (value / maxVal) * chartHeight;
            const x = margin + index * 2 * barWidth + barWidth / 2;
            const y = canvas.height - margin - barHeight;
            // Столбец
            ctx.fillStyle = "#4285F4";
            ctx.fillRect(x, y, barWidth, barHeight);
            // Подпись года
            ctx.fillStyle = "#000";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(year, x + barWidth / 2, canvas.height - margin + 15);
        });

        // Преобразование canvas в изображение (Blob) и копирование в буфер обмена
        canvas.toBlob(function (blob) {
            const clipboardItem = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([clipboardItem]).then(function () {
                showFeedback(buttonElement);
            }).catch(function (err) {
                alert("Ошибка копирования графика: " + err);
            });
        });
    }

    // Функция вывода HTML-контента в элемент с id "result"
    function showResult(htmlContent) {
        document.getElementById("result").innerHTML = htmlContent;
    }

    // Функция копирования с обратной связью (для текста или HTML)
    function copyWithFeedback(data, buttonElement, isHtml = false) {
        if (isHtml) {
            const blobHtml = new Blob([data], { type: "text/html" });
            const blobText = new Blob([data], { type: "text/plain" });
            const clipboardItem = new ClipboardItem({
                "text/html": blobHtml,
                "text/plain": blobText
            });
            navigator.clipboard.write([clipboardItem]).then(function () {
                showFeedback(buttonElement);
            }).catch(function (err) {
                alert("Ошибка копирования: " + err);
            });
        } else {
            navigator.clipboard.writeText(data)
                .then(function () {
                    showFeedback(buttonElement);
                })
                .catch(function (err) {
                    alert("Ошибка копирования: " + err);
                });
        }
    }

    // Функция отображения обратной связи, заменяет содержимое кнопки на галочку с текстом "Скопировано"
    function showFeedback(buttonElement) {
        const originalContent = buttonElement.innerHTML;
        buttonElement.innerHTML = checkIconSVG + `<span class="copy-text"> Скопировано</span>`;
        buttonElement.classList.add("copied");
        setTimeout(function () {
            buttonElement.innerHTML = originalContent;
            buttonElement.classList.remove("copied");
        }, 3000);
    }

    // Функция копирования HTML таблицы без колонки "Копировать"
    function copyTableHtml(tableId, buttonElement) {
        const tableElement = document.getElementById(tableId);
        if (tableElement) {
            const clonedTable = tableElement.cloneNode(true);
            const headerRow = clonedTable.querySelector("thead tr");
            if (headerRow) {
                headerRow.deleteCell(-1);
            }
            const bodyRows = clonedTable.querySelectorAll("tbody tr");
            bodyRows.forEach(function (row) {
                row.deleteCell(-1);
            });
            const html = clonedTable.outerHTML;
            copyWithFeedback(html, buttonElement, true);
        }
    }

    // Функция форматирования числа (добавление пробелов-разделителей)
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
})();

