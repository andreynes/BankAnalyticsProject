(function () {
    // SVG иконки
    const copyIconSVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.3333 6H7.33333C6.59695 6 6 6.59695 6 7.33333V13.3333C6 14.0697 6.59695 14.6667 7.33333 14.6667H13.3333C14.0697 14.6667 14.6667 14.0697 14.6667 13.3333V7.33333C14.6667 6.59695 14.0697 6 13.3333 6Z" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.33333 10H2.66667C1.93029 10 1.33333 9.40305 1.33333 8.66667V2.66667C1.33333 1.93029 1.93029 1.33333 2.66667 1.33333H8.66667C9.40305 1.33333 10 1.93029 10 2.66667V3.33333" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;


    const chartIconSVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.6667 12H1.33333V4" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4 8L7.33333 5.33333L10 8L14.6667 4" stroke="currentColor" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;


    // Функция для получения данных из API
    async function fetchData(query) {
        try {
            console.log('Searching for:', query);
            const response = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received data:', data);
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }


    // Инициализация обработчиков событий
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("searchButton").addEventListener("click", onSearch);
    });


    async function onSearch() {
        const query = document.getElementById("queryInput").value.trim().toLowerCase();
        console.log('Searching for:', query);


        try {
            const data = await fetchData(query);
            console.log('Received data:', data);
            
            if (!data || data.length === 0) {
                showResult(`<span class="error">Данные не найдены</span>`);
                return;
            }


            const document = data[0]; // Берем первый найденный документ
            const terms = query.toLowerCase().split(' ');


            if (terms[1] === 'выручка') {
                const revenueData = document.data.find(item => item.indicator.toLowerCase() === 'выручка');
                if (terms[2] && revenueData) { // Если указан год
                    showRevenueYear(revenueData, terms[2]);
                } else if (revenueData) {
                    showRevenueTable(revenueData);
                }
            } else if (terms[1] === 'прибыль') {
                const profitData = document.data.find(item => item.indicator.toLowerCase() === 'прибыль');
                if (profitData) {
                    showNetProfitTable(profitData);
                }
            } else {
                // Показываем все показатели
                showCompanyIndicators(document.data);
            }
        } catch (error) {
            console.error('Search error:', error);
            showResult(`<span class="error">Ошибка при получении данных: ${error.message}</span>`);
        }
    }


    function showRevenueYear(revenueData, year) {
        if (!revenueData.values[year]) {
            showResult(`<span class="error">Данные о выручке за ${year} год не найдены</span>`);
            return;
        }


        const resultHTML = `
            <div class="result-item">
                Выручка за ${year} год: ${formatNumber(revenueData.values[year])} руб.
                <button class="copy-btn" data-year="${year}" title="Скопировать число">
                    ${copyIconSVG}
                </button>
            </div>
        `;
        showResult(resultHTML);
        
        const copyBtn = document.querySelector(".copy-btn");
        if (copyBtn) {
            copyBtn.addEventListener("click", function () {
                copyWithFeedback(revenueData.values[year].toString(), copyBtn, false);
            });
        }
    }


    function showRevenueTable(revenueData) {
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


        Object.entries(revenueData.values).forEach(([year, value]) => {
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
        setupTableEventHandlers(revenueData.values);
    }


    function showNetProfitTable(profitData) {
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


        Object.entries(profitData.values).forEach(([year, value]) => {
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
        setupTableEventHandlers(profitData.values);
    }


    function showCompanyIndicators(data) {
        const revenue = data.find(item => item.indicator.toLowerCase() === 'выручка');
        const profit = data.find(item => item.indicator.toLowerCase() === 'прибыль');


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


    function showResult(html) {
        document.getElementById("result").innerHTML = html;
    }


    function copyWithFeedback(text, button, isHtml = false) {
        const originalContent = button.innerHTML;
        
        if (isHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            navigator.clipboard.writeText(tempDiv.innerText);
        } else {
            navigator.clipboard.writeText(text);
        }
        
        showFeedback(button, originalContent);
    }


    function showFeedback(button, originalContent) {
        button.innerHTML = `<span class="copy-text">Скопировано!</span>`;
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.classList.remove('copied');
        }, 2000);
    }


    function copyTableHtml(tableId, button) {
        const table = document.getElementById(tableId);
        if (table) {
            copyWithFeedback(table.outerHTML, button, true);
        }
    }


    function formatNumber(number) {
        return new Intl.NumberFormat('ru-RU').format(number);
    }


    function copyChart(values, button) {
        // Здесь можно добавить логику для создания и копирования графика
        showFeedback(button, button.innerHTML);
    }


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






