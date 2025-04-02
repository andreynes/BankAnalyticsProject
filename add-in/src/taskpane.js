(function () {
    // Состояние приложения
    let state = {
        selectedFileId: null,
        currentTags: [],
        previousTags: [],
        selectedBlockId: null,
        isLoading: false
    };


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


    // Инициализация Office.js
    Office.onReady((info) => {
        if (info.host === Office.HostType.PowerPoint) {
            console.log("Office.js is ready");
            initializeApp();
        } else {
            console.error("This add-in only works in PowerPoint");
        }
    }).catch(error => {
        console.error("Error initializing Office.js:", error);
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
            const tagsString = tagInput.value.trim();
            
            if (!tagsString) {
                showNotification('error', 'Введите теги для поиска');
                return;
            }


            // Разделяем строку на массив тегов и очищаем их
            const tags = tagsString.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);


            if (tags.length === 0) {
                showNotification('error', 'Введите корректные теги для поиска');
                return;
            }


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
                            ${block.content?.text ?
                                `${block.content.text.substring(0, 100)}${block.content.text.length > 100 ? '...' : ''}` :
                                'Текст отсутствует'}
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
        if (!blockId) {
            showNotification('error', 'ID блока не указан');
            return;
        }
    
    
        try {
            await checkOfficeSupport();
            showNotification('info', 'Подготовка блока для вставки...');
            showLoading();
    
    
            console.log('\n=== Запрос блока для вставки ===');
            console.log('ID блока:', blockId);
    
    
            const response = await fetch(`http://localhost:3000/api/search/block/${blockId}`);
            if (!response.ok) {
                throw new Error('Ошибка получения блока');
            }
            
            const data = await response.json();
            console.log('\n📥 Полученные данные с сервера:', JSON.stringify(data, null, 2));
        
            if (!data.success || !data.block) {
                throw new Error('Неверный формат данных блока');
            }
    
            const block = data.block;
    
            if (block.type === 'table') {
                // Проверяем, что content является массивом (матрицей)
                if (!Array.isArray(block.content)) {
                    throw new Error('Некорректный формат данных таблицы');
                }

                console.log('\n📊 Подготовка таблицы для вставки', JSON.stringify(block.content, null, 2));
    
                 // Вставляем таблицу
                 await new Promise((resolve, reject) => {
                     Office.context.document.setSelectedDataAsync(
                        block.content,
                        {
                            coercionType: Office.CoercionType.Matrix
                        },
                        (result) => {
                            if (result.status === Office.AsyncResultStatus.Succeeded) {
                                console.log('✅ Таблица успешно вставлена');
                                resolve();
                            } else {
                                console.error('❌ Ошибка вставки таблицы:', result.error);
                                reject(new Error(result.error.message));
                            }
                        }
                    );
             });

            showNotification('success', 'Таблица успешно вставлена');
        } else if (block.type === 'text') {
            // Вставка текста
            await new Promise((resolve, reject) => {
                Office.context.document.setSelectedDataAsync(
                    block.content,
                    {
                        coercionType: Office.CoercionType.Text
                    },
                    (result) => {
                        if (result.status === Office.AsyncResultStatus.Succeeded) {
                            resolve();
                        } else {
                            reject(new Error(result.error.message));
                        }
                    }
                );
            });


            showNotification('success', 'Текст успешно вставлен');
        }


    } catch (error) {
        console.error('❌ Ошибка вставки блока:', error);
        showNotification('error', `Ошибка вставки блока: ${error.message}`);
    } finally {
        hideLoading();
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


    // Экспорт необходимых функций в глобальную область
    window.insertBlock = insertBlock;


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












