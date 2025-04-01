(function () {
    // Состояние приложения
    let state = {
        selectedFileId: null,
        currentTags: [],
        previousTags: [], // Для отслеживания уточнения поиска
        selectedBlockId: null,
        isLoading: false
    };

    // Инициализация Office.js
    Office.onReady((info) => {
        if (info.host === Office.HostType.PowerPoint) {
            console.log("Office.js is ready");
            initializeApp();
        }
    });

    function initializeApp() {
        console.log("Initializing app");
        
        // Привязка обработчиков событий
        document.getElementById('search-button').onclick = performSearch;
        document.getElementById('tag-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Начальное состояние
        clearResults();
    }

    async function performSearch() {
        try {
            const tagInput = document.getElementById('tag-input');
            const tagsString = tagInput.value.trim().toLowerCase();
            
            if (!tag) {
                showNotification('error', 'Введите теги для поиска');
                return;
            }

            showLoading();
            clearResults();

            console.log('Отправка запроса с тегом:',  tag);

            const response = await fetch('http://localhost:3000/api/search', {
                method: 'POST'
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tag })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Получены результаты:', data);

            if (data.success) {
                if (data.results.length === 0) 
                    showNotification('info', 'Документы с указанным тегом не найдены');
                }
                displayFiles(data.results);
            } else {
                throw new Error(data.error || 'Ошибка при поиске');
            }

        } catch (error) {
            console.error('Search error:', error);
            showNotification('error', `Ошибка поиска: ${error.message}`);
            clearResults();
        } finally {
            hideLoading();
        }
    }

    function displayFiles(files) {
        const container = document.getElementById('files-container');
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
                // Снимаем выделение со всех файлов
                document.querySelectorAll('.file-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Выделяем выбранный файл
                fileElement.classList.add('selected');
                state.selectedFileId = file._id;
                
                // Загружаем блоки для выбранного файла
                loadFileBlocks(file._id);
            });

            container.appendChild(fileElement);
        });
    }
    async function loadFileBlocks(fileId) {
        try {
            showLoading();
            console.log('Загрузка блоков для файла:', fileId, 'с тегами:', state.currentTags);

            const response = await fetch(
                `http://localhost:3000/api/search/blocks/${fileId}?tags=${encodeURIComponent(state.currentTags.join(','))}`
            );

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
                const dimensions = block.dimensions || { rows: 0, columns: 0 };
                const isOversized = dimensions.rows > 6 || dimensions.columns > 6;

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
                                превышает допустимый (6x6).<br>
                                Добавьте дополнительные теги в строку поиска выше, 
                                чтобы уточнить данные.
                            </div>
                        ` : `
                            <div class="table-preview">
                                <span>Таблица готова к вставке</span>
                                <button class="primary-button" onclick="insertBlock('${block.id}')">
                                    Вставить в слайд
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
                            ${block.content.text.substring(0, 100)}${block.content.text.length > 100 ? '...' : ''}
                        </div>
                        <button class="primary-button" onclick="insertBlock('${block.id}')">
                            Вставить в слайд
                        </button>
                    </div>`;
            }

            blockElement.innerHTML = blockContent;
            container.appendChild(blockElement);
        });
    }

    async function insertBlock(blockId) {
        try {
            showNotification('info', 'Подготовка блока для вставки...');
            showLoading();

            const response = await fetch(`http://localhost:3000/api/search/block/${blockId}`);
            if (!response.ok) {
                throw new Error('Ошибка получения блока');
            }
            
            const data = await response.json();
            console.log('Данные блока для вставки:', data);

            if (!data.success || !data.block) {
                throw new Error('Неверный формат данных блока');
            }

            const block = data.block;

            // Проверяем размер таблицы
            if (block.type === 'table') {
                const dimensions = block.dimensions || { 
                    rows: block.content.rows.length,
                    columns: block.content.headers.length 
                };

                if (dimensions.rows > 6 || dimensions.columns > 6) {
                    showNotification('warning', 
                        'Размер таблицы превышает допустимый (6x6). ' +
                        'Добавьте дополнительные теги для уточнения данных.'
                    );
                    return;
                }
            }
            
            await PowerPoint.run(async (context) => {
                const slide = context.presentation.getActiveSlide();
                
                if (block.type === 'table') {
                    await insertTableBlock(slide, block.content);
                } else {
                    await insertTextBlock(slide, block.content);
                }

                await context.sync();
                showNotification('success', 'Блок успешно вставлен в слайд');
            });

        } catch (error) {
            console.error('Error inserting block:', error);
            showNotification('error', `Ошибка вставки блока: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    async function insertTableBlock(slide, content) {
        if (!content || !content.headers || !content.rows) {
            throw new Error('Неверный формат данных таблицы');
        }

        const shape = slide.shapes.addTable(
            content.rows.length + 1, // +1 для заголовков
            content.headers.length,
            50, 50, 500, 300
        );

        // Вставляем заголовки
        content.headers.forEach((headerText, colIndex) => {
            const cell = shape.table.getCell(0, colIndex);
            cell.value = headerText;
        });

        // Вставляем данные
        content.rows.forEach((row, rowIndex) => {
            row.forEach((cellValue, colIndex) => {
                const cell = shape.table.getCell(rowIndex + 1, colIndex);
                cell.value = cellValue ? cellValue.toString() : '';
            });
        });
    }

    async function insertTextBlock(slide, content) {
        if (!content || !content.text) {
            throw new Error('Неверный формат текстового блока');
        }

        const shape = slide.shapes.addTextBox(content.text);
        shape.left = 50;
        shape.top = 50;
        shape.width = 400;
        shape.height = 200;
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

        const container = document.getElementById('notification-area');
        if (container) {
            // Удаляем предыдущие уведомления того же типа
            container.querySelectorAll(`.notification.${type}`).forEach(note => note.remove());
            container.appendChild(notification);
        }

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
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

    // Экспорт необходимых функций в глобальную область
    window.insertBlock = insertBlock;
})();




