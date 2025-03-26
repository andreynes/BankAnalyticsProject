(function () {
    // ... (оставляем SVG-иконки без изменений) ...

    // Функция для получения данных из API
    async function fetchData(query) {
        try {
            console.log('Searching for:', query); // Для отладки
            const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data); // Для отладки
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }
    

    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("searchButton").addEventListener("click", onSearch);
    });

    async function onSearch() {
        const query = document.getElementById("queryInput").value.trim().toLowerCase();
        try {
            const data = await fetchData(query);
            
            if (!data || data.length === 0) {
                showResult(`<span class="error">Данные не найдены</span>`);
                return;
            }

            // Определяем тип запроса по тегам
            const tags = data.tags || [];
            if (tags.includes('выручка') && query.includes('2024')) {
                showRevenueYear(data, "2024");
            } else if (tags.includes('выручка')) {
                showRevenueTable(data);
            } else if (tags.includes('прибыль')) {
                showNetProfitTable(data);
            } else {
                showCompanyIndicators(data);
            }
        } catch (error) {
            showResult(`<span class="error">Ошибка при получении данных: ${error.message}</span>`);
        }
    }

    function showRevenueYear(data, year) {
        const revenue = data.data.find(item => 
            item.indicator === 'Выручка' && 
            item.values[year]
        );

        if (!revenue) {
            showResult(`<span class="error">Данные о выручке за ${year} год не найдены</span>`);
            return;
        }

        const resultHTML = `
            <div class="result-item">
                Выручка за ${year} год: ${formatNumber(revenue.values[year])} руб.
                <button class="copy-btn" data-year="${year}" title="Скопировать число">
                    ${copyIconSVG}
                </button>
            </div>
        `;
        showResult(resultHTML);
        
        const copyBtn = document.querySelector(".copy-btn");
        if (copyBtn) {
            copyBtn.addEventListener("click", function () {
                copyWithFeedback(revenue.values[year].toString(), copyBtn, false);
            });
        }
    }

    function showRevenueTable(data) {
        const revenue = data.data.find(item => item.indicator === 'Выручка');
        if (!revenue) {
            showResult(`<span class="error">Данные о выручке не найдены</span>`);
            return;
        }

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

        Object.entries(revenue.values).forEach(([year, value]) => {
            tableHTML += `
                <tr>
                    <td>${year}</td>
                    <td>${formatNumber(value)} руб.</td>
                    <td>
                        <button class="copy-btn" data-year="${year}" title="Скопировать число">
                            ${copyIconSVG}
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        showResult(tableHTML);

        // Добавляем обработчики событий
        setupTableEventHandlers(revenue.values);
    }

    function showNetProfitTable(data) {
        const profit = data.data.find(item => item.indicator === 'Прибыль');
        if (!profit) {
            showResult(`<span class="error">Данные о прибыли не найдены</span>`);
            return;
        }

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

        Object.entries(profit.values).forEach(([year, value]) => {
            tableHTML += `
                <tr>
                    <td>${year}</td>
                    <td>${formatNumber(value)} руб.</td>
                    <td>
                        <button class="copy-btn" data-year="${year}" title="Скопировать число">
                            ${copyIconSVG}
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        showResult(tableHTML);

        setupTableEventHandlers(profit.values);
    }

    function showCompanyIndicators(data) {
        const revenue = data.data.find(item => item.indicator === 'Выручка');
        const profit = data.data.find(item => item.indicator === 'Прибыль');

        if (!revenue || !profit) {
            showResult(`<span class="error">Данные о показателях не найдены</span>`);
            return;
        }

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

        Object.keys(revenue.values).forEach(year => {
            tableHTML += `
                <tr>
                    <td>${year}</td>
                    <td>${formatNumber(revenue.values[year])} руб.</td>
                    <td>${formatNumber(profit.values[year])} руб.</td>
                    <td>
                        <button class="copy-btn" data-year="${year}" title="Скопировать показатели">
                            ${copyIconSVG}
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        showResult(tableHTML);

        setupCompanyTableEventHandlers(revenue.values, profit.values);
    }

    // ... (оставляем вспомогательные функции без изменений: copyChart, showResult, copyWithFeedback, showFeedback, copyTableHtml, formatNumber) ...

    function setupTableEventHandlers(values) {
        const copyButtons = document.querySelectorAll(".copy-btn");
        copyButtons.forEach((btn) => {
            btn.addEventListener("click", function () {
                const year = btn.getAttribute("data-year");
                copyWithFeedback(values[year].toString(), btn, false);
            });
        });

        const copyTableBtn = document.querySelector(".copy-table-btn");
        if (copyTableBtn) {
            copyTableBtn.addEventListener("click", function () {
                copyTableHtml(copyTableBtn.parentElement.nextElementSibling.id, copyTableBtn);
            });
        }

        const copyChartBtn = document.querySelector(".copy-chart-btn");
        if (copyChartBtn) {
            copyChartBtn.addEventListener("click", function () {
                copyChart(values, copyChartBtn);
            });
        }
    }

    function setupCompanyTableEventHandlers(revenueValues, profitValues) {
        const copyButtons = document.querySelectorAll(".copy-btn");
        copyButtons.forEach((btn) => {
            btn.addEventListener("click", function () {
                const year = btn.getAttribute("data-year");
                const textToCopy = `Год: ${year}, Выручка: ${formatNumber(revenueValues[year])} руб., Чистая прибыль: ${formatNumber(profitValues[year])} руб.`;
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
})();


