(function () {
    // Состояние приложения
    let state = {
        selectedFileId: null,
        currentTag: '',
        isLoading: false,
        selectedBlockId: null
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

        // Инициализация секции уточнения
        initializeRefinementSection();
    }

    async function performSearch() {
        try {
            const tagInput = document.getElementById('tag-input');
            const tag = tagInput.value.trim();
            
            if (!tag) {
                showNotification('error', 'Введите тег для поиска');
                return;
            }

            state.currentTag = tag;
            showLoading();
            clearBlocks();

            console.log('Поиск по тегу:', tag);

            const response = await fetch('http://localhost:3000/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tag })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Результаты поиска:', data);

            if (data.success) {
                displayFiles(data.results);
            } else {
                throw new Error(data.error || 'Ошибка при поиске');
            }

        } catch (error) {
            console.error('Search error:', error);
            showNotification('error', `Ошибка поиска: ${error.message}`);
            displayFiles([]);
        } finally {
            hideLoading();
        }
    }

    function displayFiles(files) {
        const container = document.getElementById('files-container');
        container.innerHTML = '';

        if (!files || files.length === 0) {
            container.innerHTML = '<div class="no-results">Файлы не найдены</div>';
            return;
        }

        const filesList = document.createElement('div');
        filesList.className = 'files-list';

        files.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file-item';
            
            fileElement.innerHTML = `
                <div class="file-header">
                    <h3>${file.fileName}</h3>
                    <span class="file-date">${formatDate(file.uploadDate)}</span>
                </div>
            `;
            
            fileElement.addEventListener('click', async () => {
                // Подсвечиваем выбранный файл
                document.querySelectorAll('.file-item').forEach(item => {
                    item.classList.remove('selected');
                });
                fileElement.classList.add('selected');
                state.selectedFileId = file._id;

                // Загружаем блоки с текущим тегом
                await loadFileBlocks(file._id, state.currentTag);
            });

            filesList.appendChild(fileElement);
        });

        container.appendChild(filesList);
    }

    async function loadFileBlocks(fileId, tag) {
        try {
            showLoading();

            console.log('Загрузка блоков для файла:', fileId, 'с тегом:', tag);

            const response = await fetch(
                `http://localhost:3000/api/search/blocks/${fileId}?tag=${encodeURIComponent(tag)}`
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
            displayBlocks([]);
        } finally {
            hideLoading();
        }
    }

    function displayBlocks(blocks) {
        const container = document.getElementById('blocks-container');
        const refinementSection = document.getElementById('refinement-section');
        container.innerHTML = '';
        refinementSection.style.display = 'none';

        if (!blocks || blocks.length === 0) {
            container.innerHTML = '<div class="no-results">Блоки с указанным тегом не найдены</div>';
            return;
        }

        blocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.className = 'block-item';
            
            if (block.type === 'table') {
                const dimensions = block.dimensions || { rows: 0, columns: 0 };
                blockElement.innerHTML = `
                    <div class="block-header">
                        <span class="block-type">Таблица</span>
                        <div class="block-dimensions">
                            Размер таблицы: ${dimensions.rows}x${dimensions.columns}
                        </div>
                    </div>
                    ${dimensions.rows > 6 || dimensions.columns > 6 ? `
                        <div class="oversized-warning">
                            Уточните запрос, размер таблицы слишком большой (максимум 6x6)
                        </div>
                    ` : `
                        <div class="block-actions">
                            <button class="insert-button" onclick="insertBlock('${block.id}')">
                                Вставить в слайд
                            </button>
                        </div>
                    `}
                `;

                if (dimensions.rows > 6 || dimensions.columns > 6) {
                    state.selectedBlockId = block.id;
                    refinementSection.style.display = 'block';
                }
            } else {
                blockElement.innerHTML = `
                    <div class="block-header">
                        <span class="block-type">Текст</span>
                    </div>
                    <div class="block-actions">
                        <button class="insert-button" onclick="insertBlock('${block.id}')">
                            Вставить в слайд
                        </button>
                    </div>
                `;
            }
            
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

        // Создаем таблицу
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
                cell.value = cellValue;
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

    function initializeRefinementSection() {
        const refinementButton = document.getElementById('refinement-search');
        const refinementInput = document.getElementById('refinement-tags');

        refinementButton.onclick = async () => {
            await performRefinementSearch();
        };

        refinementInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performRefinementSearch();
            }
        });
    }

    async function performRefinementSearch() {
        try {
            const refinementInput = document.getElementById('refinement-tags');
            const additionalTags = refinementInput.value.trim();

            if (!additionalTags) {
                showNotification('error', 'Введите теги для уточнения запроса');
                return;
            }

            if (!state.selectedBlockId) {
                showNotification('error', 'Блок для уточнения не выбран');
                return;
            }

            showLoading();

            const allTags = [
                state.currentTag,
                ...additionalTags.split(',').map(t => t.trim())
            ].filter(t => t);

            const response = await fetch(`http://localhost:3000/api/search/refine-block/${state.selectedBlockId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tags: allTags })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                if (data.block.isOversized) {
                    showNotification('warning', 'Таблица все еще слишком большая. Попробуйте уточнить запрос.');
                } else {
                    displayRefinedBlock(data.block);
                }
            } else {
                throw new Error(data.error || 'Ошибка уточнения запроса');
            }

        } catch (error) {
            console.error('Refinement error:', error);
            showNotification('error', `Ошибка уточнения: ${error.message}`);
        } finally {
            hideLoading();
        }
    }

    function displayRefinedBlock(block) {
        const container = document.getElementById('blocks-container');
        const refinementSection = document.getElementById('refinement-section');
        
        container.innerHTML = `
            <div class="block-item">
                <div class="block-header">
                    <span class="block-type">Таблица</span>
                    <div class="block-dimensions">
                        Размер таблицы: ${block.dimensions.rows}x${block.dimensions.columns}
                    </div>
                </div>
                <div class="block-actions">
                    <button class="insert-button" onclick="insertBlock('${block.id}')">
                        Вставить в слайд
                    </button>
                </div>
            </div>
        `;

        refinementSection.style.display = 'none';
        showNotification('success', 'Таблица успешно уточнена');
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
        container.appendChild(notification);

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

    function clearBlocks() {
        const container = document.getElementById('blocks-container');
        const refinementSection = document.getElementById('refinement-section');
        if (container) {
            container.innerHTML = '';
        }
        if (refinementSection) {
            refinementSection.style.display = 'none';
        }
        state.selectedBlockId = null;
    }

    // Экспорт необходимых функций в глобальную область
    window.insertBlock = insertBlock;
})();




