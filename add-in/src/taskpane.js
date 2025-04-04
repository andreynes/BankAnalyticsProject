(function () {
    // Состояние приложения
    let state = {
        selectedFileId: null,
        currentTags: [],
        previousTags: [],
        selectedBlockId: null,
        isLoading: false
    };

    // Инициализация после загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        const searchButton = document.getElementById('search-button');
        const tagInput = document.getElementById('tag-input');
    
        if (searchButton) {
            searchButton.addEventListener('click', handleSearch);
        }
    
        if (tagInput) {
            tagInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                }
            });
        }
    });
    

    // Объявляем функции, которые будут использоваться в HTML
    function handleSearch() {
        console.log('HandleSearch вызван')
        const tagInput = document.getElementById('tag-input');
        const tagsString = tagInput.value.trim();

        console.log('Введенные теги:', tagsString);
        
        if (!tagsString) {
            showNotification('error', 'Введите теги для поиска');
            return;
        }

        const tags = tagsString.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        console.log('Обработанные теги:', tags);

        if (tags.length > 0) {
            performSearch(tags);
        } else {
            showNotification('error', 'Введите корректные теги для поиска');
        }
    }

    // Вспомогательная функция для проверки готовности Office API
    async function checkOfficeSupport() {
        return new Promise((resolve, reject) => {
            try {
                if (!Office || !Office.context || !Office.context.document) {
                    reject(new Error('Office.js API не доступен'));
                    return;
                }
                if (!Office.context.document.setSelectedDataAsync) {
                    reject(new Error('Метод setSelectedDataAsync не поддерживается'));
                    return;
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Функция для отладки данных таблицы
    function logTableData(tableData) {
        console.log('=== Данные таблицы ===');
        console.log('Размерность:', tableData.length, 'x', (tableData[0] ? tableData[0].length : 0));
        tableData.forEach((row, i) => {
            console.log(`Строка ${i}:`, row);
        });
        console.log('===================');
    }

    function initializeApp() {
        console.log("Initializing app");
        
        // Привязка обработчиков событий
        const searchButton = document.getElementById('search-button');
        const tagInput = document.getElementById('tag-input');

        if (searchButton) {
            searchButton.onclick = handleSearch;
        }

        if (tagInput) {
            tagInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                }
            });
        }

        // Начальное состояние
        clearResults();
    }
    async function performSearch(tags) {
        try {
            showLoading();
            clearResults();

            console.log('Отправка запроса с тегами:', tags);

            const response = await fetch('http://localhost:3000/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tags })
            });

            const data = await response.json();
            console.log('Получены результаты:', data);

            if (data.success) {
                if (!data.results || data.results.length === 0) {
                    showNotification('info', 'Документы с указанными тегами не найдены');
                } else {
                    displayFiles(data.results);
                }
            } else {
                throw new Error(data.error || 'Ошибка при поиске');
            }

        } catch (error) {
            console.error('Search error:', error);
            showNotification('error', `Ошибка поиска: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    function displayFiles(files) {
        const container = document.getElementById('files-container');
        if (!container) {
            console.error('Files container not found');
            return;
        }
        container.innerHTML = '';

        if (!files || files.length === 0) {
            container.innerHTML = '<div class="no-results">Файлы с указанными тегами не найдены</div>';
            return;
        }

        files.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item';
            
            fileElement.innerHTML = `
                <div class="file-header">
                    <span class="file-name">${file.fileName}</span>
                    <span class="file-date">${formatDate(file.uploadDate)}</span>
                </div>
            `;
            
            fileElement.addEventListener('click', () => {
                document.querySelectorAll('.file-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                fileElement.classList.add('selected');
                state.selectedFileId = file._id;
                
                loadFileBlocks(file._id);
            });

            container.appendChild(fileElement);
        });
    }

    async function loadFileBlocks(fileId) {
        try {
            if (!fileId) {
                throw new Error('ID файла не указан');
            }

            showLoading();
            console.log('Загрузка блоков для файла:', fileId);

            const response = await fetch(`http://localhost:3000/api/search/blocks/${fileId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Полученные блоки:', data);

            if (data.success) {
                displayBlocks(data.blocks);
            } else {
                throw new Error(data.error || 'Ошибка получения блоков');
            }

        } catch (error) {
            console.error('Error loading blocks:', error);
            showNotification('error', `Ошибка загрузки блоков: ${error.message}`);
            clearBlocks();
        } finally {
            hideLoading();
        }
    }

    function displayBlocks(blocks) {
        const container = document.getElementById('blocks-container');
        if (!container) {
            console.error('Blocks container not found');
            return;
        }
        container.innerHTML = '';

        if (!blocks || blocks.length === 0) {
            container.innerHTML = '<div class="no-results">Блоки с указанными тегами не найдены</div>';
            return;
        }

        blocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = 'block-item';
            
            let blockContent = '';
            if (block.type === 'table') {
                const dimensions = block.dimensions || {
                    rows: block.content?.rows?.length || 0,
                    columns: block.content?.headers?.length || 0
                };
                const isOversized = dimensions.rows > 20 || dimensions.columns > 10;

                blockContent = `
                    <div class="block-header">
                        <span class="block-type">Таблица</span>
                        <span class="block-dimensions">
                            Размер таблицы: ${dimensions.rows}x${dimensions.columns}
                        </span>
                    </div>
                    <div class="block-preview">
                        ${isOversized ? `
                            <div class="oversized-warning">
                                Размер таблицы (${dimensions.rows}x${dimensions.columns})
                                превышает рекомендуемый (20x10).<br>
                                Добавьте дополнительные теги в строку поиска выше,
                                чтобы уточнить данные.
                            </div>
                        ` : `
                            <div class="table-preview">
                                <span>Таблица готова к просмотру</span>
                                <button class="primary-button" onclick="previewBlock('${block.id}')">
                                    Показать данные
                                </button>
                            </div>
                        `}
                    </div>`;
            } else {
                blockContent = `
                    <div class="block-header">
                        <span class="block-type">Текстовый блок</span>
                    </div>
                    <div class="block-preview">
                        <div class="text-preview">
                            ${block.content?.text ?
                                `${block.content.text.substring(0, 100)}${block.content.text.length > 100 ? '...' : ''}` :
                                'Текст отсутствует'}
                        </div>
                        <button class="primary-button" onclick="previewBlock('${block.id}')">
                            Показать данные
                        </button>
                    </div>`;
            }

            blockElement.innerHTML = blockContent;
            container.appendChild(blockElement);
        });
    }
    async function previewBlock(blockId) {
        try {
            showLoading();
            const response = await fetch(`/api/search/block/${blockId}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            const block = data.block;
            console.log('Полученный блок для предпросмотра:', block);

            const previewContainer = document.getElementById('preview-container');
            const insertButton = document.getElementById('insert-button');

            if (!previewContainer || !insertButton) {
                throw new Error('Контейнеры предпросмотра не найдены');
            }

            if (block.type === 'table') {
                // Создаем матрицу для данных
                const matrix = [];
                
                // Добавляем заголовки
                if (block.content && block.content.headers) {
                    const headerRow = block.content.headers.map(h => h.value);
                    matrix.push(headerRow);
                }
                
                // Добавляем строки с данными
                if (block.content && block.content.rows) {
                    block.content.rows.forEach(row => {
                        if (row.cells) {
                            const rowData = [];
                            for (let i = 0; i < block.content.headers.length; i++) {
                                const cell = row.cells[i.toString()];
                                if (cell && cell.value !== undefined) {
                                    if (cell.type === 'date') {
                                        try {
                                            const date = new Date(cell.value);
                                            rowData.push(date.toLocaleDateString('ru-RU'));
                                        } catch {
                                            rowData.push(cell.value);
                                        }
                                    } else {
                                        rowData.push(cell.value.toString());
                                    }
                                } else {
                                    rowData.push('');
                                }
                            }
                            matrix.push(rowData);
                        }
                    });
                }

                // Создаем HTML таблицу для предпросмотра
                let tableHtml = '<table class="preview-table">';
                matrix.forEach((row, rowIndex) => {
                    tableHtml += '<tr>';
                    row.forEach(cell => {
                        tableHtml += rowIndex === 0 ? 
                            `<th>${cell}</th>` : 
                            `<td>${cell}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</table>';

                previewContainer.innerHTML = tableHtml;
            } else {
                previewContainer.innerHTML = `<div class="preview-text">${block.content.text || ''}</div>`;
            }

            // Показываем кнопку вставки и привязываем обработчик
            insertButton.style.display = 'block';
            insertButton.onclick = () => insertBlock(blockId);

            hideLoading();
        } catch (error) {
            console.error('Ошибка при предпросмотре блока:', error);
            hideLoading();
            showNotification('error', 'Ошибка при загрузке предпросмотра: ' + error.message);
        }
    }

    async function insertBlock(blockId) {
        try {
            showLoading();
            const response = await fetch(`/api/search/block/${blockId}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            const block = data.block;
            console.log('Полученный блок:', block);

            if (block.type === 'table') {
                // Создаем матрицу для данных
                const matrix = [];
                
                // Добавляем заголовки
                if (block.content && block.content.headers) {
                    const headerRow = block.content.headers.map(h => h.value);
                    matrix.push(headerRow);
                }
                
                // Добавляем строки с данными
                if (block.content && block.content.rows) {
                    block.content.rows.forEach(row => {
                        if (row.cells) {
                            const rowData = [];
                            for (let i = 0; i < block.content.headers.length; i++) {
                                const cell = row.cells[i.toString()];
                                if (cell && cell.value !== undefined) {
                                    if (cell.type === 'date') {
                                        try {
                                            const date = new Date(cell.value);
                                            rowData.push(date.toLocaleDateString('ru-RU'));
                                        } catch {
                                            rowData.push(cell.value);
                                        }
                                    } else {
                                        rowData.push(cell.value.toString());
                                    }
                                } else {
                                    rowData.push('');
                                }
                            }
                            matrix.push(rowData);
                        }
                    });
                }

                console.log('Подготовленная матрица:', matrix);

                // Преобразуем матрицу в текст
                const textContent = matrix
                    .map(row => row.join('\t'))
                    .join('\n');

                console.log('Текст для вставки:', textContent);

                // Вставляем данные
                Office.context.document.setSelectedDataAsync(
                    textContent,
                    {
                        coercionType: Office.CoercionType.Text
                    },
                    function (result) {
                        if (result.status === Office.AsyncResultStatus.Failed) {
                            console.error('Ошибка вставки:', result.error);
                            showNotification('error', 'Ошибка при вставке блока: ' + result.error.message);
                        } else {
                            console.log('Блок успешно вставлен');
                            showNotification('success', 'Блок успешно вставлен');
                        }
                        hideLoading();
                    }
                );

            } else if (block.type === 'text') {
                const textContent = block.content?.text || '';
                
                Office.context.document.setSelectedDataAsync(
                    textContent,
                    {
                        coercionType: Office.CoercionType.Text
                    },
                    function (result) {
                        if (result.status === Office.AsyncResultStatus.Failed) {
                            console.error('Ошибка вставки:', result.error);
                            showNotification('error', 'Ошибка при вставке блока: ' + result.error.message);
                        } else {
                            console.log('Блок успешно вставлен');
                            showNotification('success', 'Блок успешно вставлен');
                        }
                        hideLoading();
                    }
                );
            }

        } catch (error) {
            console.error('Ошибка при вставке блока:', error);
            hideLoading();
            showNotification('error', 'Ошибка при вставке блока: ' + error.message);
        }
    }

    function showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
        state.isLoading = true;
    }

    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        state.isLoading = false;
    }

    function showNotification(type, message) {
        if (!message) return;

        const container = document.getElementById('notification-area');
        if (!container) {
            console.error('Notification container not found');
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? '✓' :
                    type === 'error' ? '✕' :
                    type === 'warning' ? '⚠' :
                    type === 'info' ? 'ℹ' : '';
        
        notification.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        `;

        // Удаляем предыдущие уведомления того же типа
        container.querySelectorAll(`.notification.${type}`).forEach(note => note.remove());
        container.appendChild(notification);

        // Автоматическое скрытие уведомления
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    function formatDate(date) {
        if (!date) return '';
        
        try {
            return new Date(date).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    }

    function clearResults() {
        clearBlocks();
        const filesContainer = document.getElementById('files-container');
        if (filesContainer) {
            filesContainer.innerHTML = '';
        }
        state.selectedFileId = null;
        state.selectedBlockId = null;
        state.previousTags = [];
    }

    function clearBlocks() {
        const blocksContainer = document.getElementById('blocks-container');
        if (blocksContainer) {
            blocksContainer.innerHTML = '';
        }
        state.selectedBlockId = null;
    }

    // Делаем функции доступными глобально
    window.handleSearch = handleSearch;
    window.performSearch = performSearch;
    window.showNotification = showNotification;
    window.initializeApp = initializeApp;
    window.insertBlock = insertBlock;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.previewBlock = previewBlock;

    // Обработка ошибок сети
    window.addEventListener('offline', () => {
        showNotification('error', 'Отсутствует подключение к интернету');
    });

    window.addEventListener('online', () => {
        showNotification('success', 'Подключение к интернету восстановлено');
    });

    // Обработка ошибок Office.js
    Office.onError = function(error) {
        console.error('Office Error:', error);
        showNotification('error', `Ошибка Office.js: ${error.message}`);
    };

    // Инициализация Office.js
    Office.onReady((info) => {
        if (info.host === Office.HostType.PowerPoint) {
            console.log("Office.js готов");
            initializeApp();
        } else {
            console.error("This add-in only works in PowerPoint");
        }
    }).catch(error => {
        console.error("Error initializing Office.js:", error);
    });

    // Добавляем обработчик ошибок для необработанных исключений
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Глобальная ошибка:', {
            message,
            source,
            lineno,
            colno,
            error
        });
        showNotification('error', 'Произошла непредвиденная ошибка');
        return false;
    };

    // Добавляем обработчик для необработанных промисов
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Необработанная ошибка промиса:', event.reason);
        showNotification('error', 'Произошла ошибка при асинхронной операции');
    });

})();








