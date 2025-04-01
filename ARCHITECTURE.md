# ARCHITECTURE.md

<!-- AUTO-GENERATED-CONTENT:START -->
## Структура проекта

```
backend/
├── ARCHITECTURE.md
├── BankAnalyticsProject.git/
│   ├── HEAD
│   ├── config
│   ├── description
│   ├── hooks/
│   │   ├── applypatch-msg.sample
│   │   ├── commit-msg.sample
│   │   ├── fsmonitor-watchman.sample
│   │   ├── post-update.sample
│   │   ├── pre-applypatch.sample
│   │   ├── pre-commit.sample
│   │   ├── pre-merge-commit.sample
│   │   ├── pre-push.sample
│   │   ├── pre-rebase.sample
│   │   ├── pre-receive.sample
│   │   ├── prepare-commit-msg.sample
│   │   ├── push-to-checkout.sample
│   │   └── update.sample
│   ├── info/
│   │   └── exclude
│   ├── objects/
│   │   ├── info/
│   │   └── pack/
│   │       ├── pack-5700c80f740f20665a3973a00289446e76f45547.idx
│   │       └── pack-5700c80f740f20665a3973a00289446e76f45547.pack
│   ├── packed-refs
│   └── refs/
│       ├── heads/
│       └── tags/
├── add-in/
│   ├── manifest.xml
│   └── src/
│       ├── taskpane.css
│       ├── taskpane.html
│       └── taskpane.js
├── config/
│   └── db.js
├── docs/
│   └── architecture.md
├── gitignore
├── models/
│   ├── Data.js
│   └── index.js
├── node_modules/
│   └── ...
├── optimal-tagging-strategy.txt
├── package-lock.json
├── package.json
├── routes/
│   ├── search.js
│   └── upload.js
├── sample.xlsx
├── server.js
├── test-autoTagger.js
├── test-sanitize.js
├── test-tagAssigner.js
├── test.txt
├── tests/
│   ├── APIDataProcessor.test.js
│   ├── autoTagger.test.js
│   ├── baseDataProcessor.test.js
│   ├── data.model.test.js
│   ├── database.test.js
│   ├── edge-cases.test.js
│   ├── excelFormatHandler.test.js
│   ├── excelParser.test.js
│   ├── excelProcessor.test.js
│   ├── excelReader.test.js
│   ├── integration/
│   │   ├── fileProcessing.test.js
│   │   ├── fullProcessing.test.js
│   │   └── upload.integration.test.js
│   ├── setup.js
│   ├── tagAssigner.test.js
│   ├── test-files/
│   │   ├── api-test-data.json
│   │   ├── empty.xlsx
│   │   ├── sample.xlsx
│   │   └── test.txt
│   ├── testDataCreation.js
│   ├── upload.test.js
│   ├── utils/
│   │   ├── createTestFiles.js
│   │   └── testHelpers.js
│   └── wordProcessor.test.js
├── updateArchitecture.py
├── uploads/
├── utils/
│   ├── APIDataProcessor.js
│   ├── autoTagger.js
│   ├── baseDataProcessor.js
│   ├── excelFormatHandler.js
│   ├── excelParser.js
│   ├── excelProcessor.js
│   ├── excelReader.js
│   ├── tagAssigner.js
│   └── wordProcessor.js
├── ~$Газпром2.xlsx
├── Газпром.xlsx
└── Газпром2.xlsx
```

### Папка: .
Содержимые файлы:
- ARCHITECTURE.md
- gitignore
- optimal-tagging-strategy.txt
- package-lock.json
- package.json
- sample.xlsx
- server.js
- test-autoTagger.js
- test-sanitize.js
- test-tagAssigner.js
- test.txt
- updateArchitecture.py
- ~$Газпром2.xlsx
- Газпром.xlsx
- Газпром2.xlsx

**Детали по файлам:**
- **Файл**: test-tagAssigner.js (язык: js)
  - File_imports: **test-tagAssigner.js**
    - *Импорты:* ./utils/tagAssigner
- **Файл**: updateArchitecture.py (язык: python)
  - File_comment: **updateArchitecture.py**
    - *Описание:* !/usr/bin/env python3 -*- coding: utf-8 -*-
  - Def: **parse_args**
  - Def: **extract_imports_from_file**
    - *Описание:* Извлекает строки импортов/подключений из переданных строк файла для указанного языка. Фильтрует только те импорты, которые, по эвристике, относятся к файлам проекта.
  - Def: **generate_directory_tree**
    - *Описание:* Рекурсивно генерирует строковое представление структуры папок в виде дерева, аналогичного выводу команды tree. Если директория указана в IGNORED_DIRS, то ее содержимое не раскрывается, а отображается как "└── ..." в дереве.
  - Def: **_tree**
  - Def: **parse_python_file**
    - *Описание:* Парсит Python-файл: ищет классы и функции, для классов дополнительно извлекает поля (присваивания) и методы, а также пытается вычленить docstring или блок комментариев. Также собирает строки импортов и комментарии уровня файла.
  - Def: **parse_js_file**
    - *Описание:* Парсит JS-файл: ищет объявления классов (с методами и полями) и функций. Для накопления комментариев учитываются как однострочные (//) так и многострочные (/* … */). Также собираются импорты.
  - Def: **parse_html_file**
    - *Описание:* Для HTML-файлов парсинг сводится к извлечению внешних подключений – тегов <script src="..."> и <link href="...">, которые являются ссылками на файлы проекта.
  - Def: **main**
  - Def: **update_architecture_md**
    - *Описание:* Обновляет файл ARCHITECTURE.md, вставляя сгенерированный контент между маркерами. Если маркеры отсутствуют, они добавляются в конец файла.
  - File_imports: **updateArchitecture.py**
    - *Импорты:* re
- **Файл**: test-sanitize.js (язык: js)
  - Function: **sanitize**
- **Файл**: server.js (язык: js)
  - File_imports: **server.js**
    - *Импорты:* ./routes/search, ./config/db, ./routes/upload
- **Файл**: test-autoTagger.js (язык: js)
  - File_imports: **test-autoTagger.js**
    - *Импорты:* ./utils/autoTagger

### Папка: BankAnalyticsProject.git
Содержимые файлы:
- HEAD
- config
- description
- packed-refs

### Папка: BankAnalyticsProject.git/hooks
Содержимые файлы:
- applypatch-msg.sample
- commit-msg.sample
- fsmonitor-watchman.sample
- post-update.sample
- pre-applypatch.sample
- pre-commit.sample
- pre-merge-commit.sample
- pre-push.sample
- pre-rebase.sample
- pre-receive.sample
- prepare-commit-msg.sample
- push-to-checkout.sample
- update.sample

### Папка: BankAnalyticsProject.git/info
Содержимые файлы:
- exclude

### Папка: BankAnalyticsProject.git/objects
*(Нет файлов)*

### Папка: BankAnalyticsProject.git/objects/info
*(Нет файлов)*

### Папка: BankAnalyticsProject.git/objects/pack
Содержимые файлы:
- pack-5700c80f740f20665a3973a00289446e76f45547.idx
- pack-5700c80f740f20665a3973a00289446e76f45547.pack

### Папка: BankAnalyticsProject.git/refs
*(Нет файлов)*

### Папка: BankAnalyticsProject.git/refs/heads
*(Нет файлов)*

### Папка: BankAnalyticsProject.git/refs/tags
*(Нет файлов)*

### Папка: add-in
Содержимые файлы:
- manifest.xml

### Папка: add-in/src
Содержимые файлы:
- taskpane.css
- taskpane.html
- taskpane.js

**Детали по файлам:**
- **Файл**: taskpane.js (язык: js)
  - Function: **showRevenueYear**
    - *Описание:* SVG иконки Функция для получения данных из API Инициализация обработчиков событий Показываем все показатели
  - Function: **showRevenueTable**
  - Function: **showNetProfitTable**
  - Function: **showCompanyIndicators**
  - Function: **showResult**
  - Function: **copyWithFeedback**
  - Function: **showFeedback**
  - Function: **copyTableHtml**
  - Function: **formatNumber**
  - Function: **copyChart**
  - Function: **setupTableEventHandlers**
    - *Описание:* Здесь можно добавить логику для создания и копирования графика
  - Function: **setupCompanyTableEventHandlers**
- **Файл**: taskpane.html (язык: html)
  - Html: **taskpane.html**
    - *Описание:* HTML файл
    - *Импорты:* taskpane.js, taskpane.css

### Папка: config
Содержимые файлы:
- db.js

### Папка: docs
Содержимые файлы:
- architecture.md

### Папка: models
Содержимые файлы:
- Data.js
- index.js

**Детали по файлам:**
- **Файл**: Data.js (язык: js)
  - Function: **determineDateFormat**
    - *Описание:* Схема для структуры заголовков (многоуровневые заголовки) Схема для значений в ячейках Схема для блока данных (таблица или текст) Для текстового блока Для табличного блока Для API блока Основная схема документа Функция определения формата даты

### Папка: routes
Содержимые файлы:
- search.js
- upload.js

**Детали по файлам:**
- **Файл**: upload.js (язык: js)
  - File_imports: **upload.js**
    - *Импорты:* ../utils/excelProcessor
- **Файл**: search.js (язык: js)
  - File_imports: **search.js**
    - *Импорты:* ../models/Data

### Папка: tests
Содержимые файлы:
- APIDataProcessor.test.js
- autoTagger.test.js
- baseDataProcessor.test.js
- data.model.test.js
- database.test.js
- edge-cases.test.js
- excelFormatHandler.test.js
- excelParser.test.js
- excelProcessor.test.js
- excelReader.test.js
- setup.js
- tagAssigner.test.js
- testDataCreation.js
- upload.test.js
- wordProcessor.test.js

**Детали по файлам:**
- **Файл**: data.model.test.js (язык: js)
  - File_imports: **data.model.test.js**
    - *Импорты:* ../models, ./testDataCreation, ../config/db
- **Файл**: excelReader.test.js (язык: js)
  - File_imports: **excelReader.test.js**
    - *Импорты:* ../utils/excelReader
- **Файл**: testDataCreation.js (язык: js)
  - File_imports: **testDataCreation.js**
    - *Импорты:* ../models
- **Файл**: database.test.js (язык: js)
  - File_imports: **database.test.js**
    - *Импорты:* ../models, ./setup, ../config/db
- **Файл**: excelFormatHandler.test.js (язык: js)
  - File_imports: **excelFormatHandler.test.js**
    - *Импорты:* ../utils/excelFormatHandler
- **Файл**: excelProcessor.test.js (язык: js)
  - Function: **createTestExcelFile**
    - *Описание:* tests/excelProcessor.test.js Создаем тестовый Excel файл Удаляем тестовый файл Вспомогательная функция для создания тестового Excel файла
  - Function: **createMultiLevelTestFile**
    - *Описание:* Вспомогательная функция для создания Excel файла с многоуровневыми заголовками
  - File_imports: **excelProcessor.test.js**
    - *Импорты:* ../utils/excelProcessor
- **Файл**: tagAssigner.test.js (язык: js)
  - File_imports: **tagAssigner.test.js**
    - *Импорты:* ../utils/autoTagger
- **Файл**: baseDataProcessor.test.js (язык: js)
  - File_imports: **baseDataProcessor.test.js**
    - *Импорты:* ../utils/baseDataProcessor
- **Файл**: edge-cases.test.js (язык: js)
  - File_imports: **edge-cases.test.js**
    - *Импорты:* ../utils/excelProcessor
- **Файл**: APIDataProcessor.test.js (язык: js)
  - File_imports: **APIDataProcessor.test.js**
    - *Импорты:* ../utils/apiDataProcessor
- **Файл**: setup.js (язык: js)
  - File_imports: **setup.js**
    - *Импорты:* ../config/db
- **Файл**: autoTagger.test.js (язык: js)
  - Class: **AutoTagger**
    - *Поля:* value
    - *Метод:* constructor
    - *Метод:* analyzeTags
    - *Метод:* analyzeDataContent
    - *Метод:* looksLikeDate
    - *Метод:* looksLikeMoney
    - *Метод:* looksLikePercentage
- **Файл**: upload.test.js (язык: js)
  - File_imports: **upload.test.js**
    - *Импорты:* ../config/db, ../server, ../models
- **Файл**: excelParser.test.js (язык: js)
  - File_imports: **excelParser.test.js**
    - *Импорты:* ../utils/excelParser
- **Файл**: wordProcessor.test.js (язык: js)
  - File_imports: **wordProcessor.test.js**
    - *Импорты:* ../utils/wordProcessor

### Папка: tests/integration
Содержимые файлы:
- fileProcessing.test.js
- fullProcessing.test.js
- upload.integration.test.js

**Детали по файлам:**
- **Файл**: fullProcessing.test.js (язык: js)
  - File_imports: **fullProcessing.test.js**
    - *Импорты:* ../../utils/excelProcessor
- **Файл**: upload.integration.test.js (язык: js)
  - File_imports: **upload.integration.test.js**
    - *Импорты:* ../../config/db, ../utils/createTestFiles, ../../server
- **Файл**: fileProcessing.test.js (язык: js)
  - File_imports: **fileProcessing.test.js**
    - *Импорты:* ../../utils/excelProcessor

### Папка: tests/test-files
Содержимые файлы:
- api-test-data.json
- empty.xlsx
- sample.xlsx
- test.txt

### Папка: tests/utils
Содержимые файлы:
- createTestFiles.js
- testHelpers.js

**Детали по файлам:**
- **Файл**: createTestFiles.js (язык: js)
  - Function: **createTextFile**
    - *Описание:* tests/utils/createTestFiles.js * Создание тестового Excel файла * @param {string} filePath - Путь для сохранения файла * @param {Object} options - Опции для создания файла * @returns {Promise<void>} Настройка базовых параметров Создание основного листа Добавление метаданных Настройка форматирования Форматирование заголовков Форматирование чисел Форматирование дат Добавление объединенных ячеек если указано Установка ширины столбцов Добавление основного листа Создание дополнительных листов для больших файлов Создаем множество листов для увеличения размера файла Добавление листа с мультизаголовками если указано Создание директории если не существует Сохранение файла * Создание тестового текстового файла * @param {string} filePath - Путь для сохранения файла * @param {string} content - Содержимое файла
  - Function: **createLargeFile**
    - *Описание:* * Создание большого тестового файла * @param {string} filePath - Путь для сохранения файла * @param {number} sizeInMB - Размер файла в мегабайтах

### Папка: uploads
*(Нет файлов)*

### Папка: utils
Содержимые файлы:
- APIDataProcessor.js
- autoTagger.js
- baseDataProcessor.js
- excelFormatHandler.js
- excelParser.js
- excelProcessor.js
- excelReader.js
- tagAssigner.js
- wordProcessor.js

**Детали по файлам:**
- **Файл**: wordProcessor.js (язык: js)
  - Class: **WordProcessor**
    - *Описание:* utils/wordProcessor.js
    - *Метод:* constructor
    - *Метод:* transformDocument
    - *Метод:* getHeadingLevel
    - *Метод:* determineTextSize
    - *Метод:* determineAlignment
    - *Метод:* extractTablesFromHtml
    - *Метод:* extractRowsFromTableHtml
    - *Метод:* extractCellsFromRowHtml
    - *Метод:* extractTableHeaders
    - *Метод:* extractTableRows
    - *Метод:* extractMergedCells
    - *Метод:* extractTags
  - File_imports: **wordProcessor.js**
    - *Импорты:* ./baseDataProcessor
- **Файл**: excelProcessor.js (язык: js)
  - Class: **ExcelProcessor**
    - *Описание:* utils/excelProcessor.js
    - *Поля:* value
    - *Метод:* constructor
    - *Метод:* processHeaders
    - *Метод:* processValue
    - *Метод:* processRows
    - *Метод:* determineDateFormat
    - *Метод:* determineNumericPrecision
    - *Метод:* extractMetadata
    - *Метод:* processFormula
    - *Метод:* isEmptyRow
    - *Метод:* hasFormulas
    - *Метод:* getRowTypes
    - *Метод:* analyzeColumnTypes
    - *Метод:* generateTags
    - *Метод:* getDominantType
    - *Метод:* countEmptyRows
    - *Метод:* calculateDataCoverage
    - *Метод:* analyzeTypeDistribution
  - File_imports: **excelProcessor.js**
    - *Импорты:* ./excelParser
- **Файл**: autoTagger.js (язык: js)
  - Class: **AutoTagger**
    - *Метод:* constructor
    - *Метод:* analyzeTags
    - *Метод:* looksLikeDate
    - *Метод:* looksLikeMoney
    - *Метод:* looksLikeOrganization
    - *Метод:* analyzeDataContent
- **Файл**: excelFormatHandler.js (язык: js)
  - Class: **ExcelFormatHandler**
    - *Поля:* value
- **Файл**: excelReader.js (язык: js)
  - Class: **ExcelReader**
    - *Метод:* constructor
    - *Метод:* load
    - *Метод:* getSheetNames
    - *Метод:* readSheet
    - *Метод:* analyzeContent
    - *Метод:* cleanup
- **Файл**: excelParser.js (язык: js)
  - Function: **sanitize**
    - *Описание:* * Улучшенная функция sanitize * @param {*} cell - Значение ячейки для очистки * @param {ExcelParser} parser - Экземпляр парсера * @returns {string|number|Date} - Очищенное значение
  - Class: **ExcelParser**
    - *Описание:* Базовая проверка на null/undefined Если это дата Если это число Проверка на Excel serial date Преобразование в строку и базовая очистка Проверка на формулы Проверка на HTML Проверка на число в строковом формате Ограничение длины строки и безопасная обработка
    - *Метод:* constructor
    - *Метод:* parse
    - *Метод:* processWorksheet
    - *Метод:* determineColumnTypes
    - *Метод:* determineCellType
    - *Метод:* isDateColumn
    - *Метод:* isNumericColumn
    - *Метод:* isPercentageColumn
    - *Метод:* isCurrencyColumn
    - *Метод:* excelDateToJSDate
    - *Метод:* createEmptyResult
    - *Метод:* isValidDate
    - *Метод:* safeParseNumber
    - *Метод:* handleSpecialCharacters
    - *Метод:* validateCellValue
- **Файл**: APIDataProcessor.js (язык: js)
  - Class: **APIDataProcessor**
    - *Описание:* utils/apiDataProcessor.js
    - *Метод:* constructor
    - *Метод:* determineCellType
    - *Метод:* isNumeric
    - *Метод:* extractValueMetadata
    - *Метод:* generateValueTags
    - *Метод:* extractTagsFromArray
    - *Метод:* extractTagsFromObject
    - *Метод:* extractTagsFromText
    - *Метод:* determineDateFormat
    - *Метод:* determineNumericPrecision
    - *Метод:* extractCurrencySymbol
    - *Метод:* extractNumericValue
    - *Метод:* createEmptyBlock
    - *Метод:* getValueByPath
    - *Метод:* flattenObject
  - File_imports: **APIDataProcessor.js**
    - *Импорты:* ./baseDataProcessor
- **Файл**: baseDataProcessor.js (язык: js)
  - Class: **BaseDataProcessor**
    - *Описание:* utils/baseDataProcessor.js
    - *Поля:* parent
    - *Метод:* constructor
    - *Метод:* validateData
    - *Метод:* validateSchema
    - *Метод:* generateBlockId
    - *Метод:* determineCellType
    - *Метод:* analyzeHeaderStructure
    - *Метод:* determineHeaderLevel
    - *Метод:* buildHeaderHierarchy
    - *Метод:* createDataBlock
    - *Метод:* formatValue
    - *Метод:* cleanup
- **Файл**: tagAssigner.js (язык: js)
  - Class: **TagAssigner**
    - *Поля:* normalized
    - *Метод:* constructor
    - *Метод:* assignTags
    - *Метод:* parseNumeric
  - File_imports: **tagAssigner.js**
    - *Импорты:* ./autoTagger

<!-- AUTO-GENERATED-CONTENT:END -->

# Архитектура проекта

## База данных
- Используется MongoDB Atlas
- База данных: bankanalytics
- Подключение через mongoose
- URI хранится в переменных окружения (.env)

## Структура проекта
- /backend - серверная часть
  - /docs - документация
  - /models - модели данных
  - /tests - автотесты
  - server.js - основной файл сервера
  - .env - переменные окружения

## Модель данных (Data)
### Основные поля:
- fileName: имя загруженного Excel файла
- uploadDate: дата загрузки файла
- data: массив данных из Excel
  - row: данные строки (Map)
  - rowNumber: номер строки
- tags: массив тегов для поиска
- metadata: информация о файле
  - sheetName: имя листа
  - totalRows: количество строк
  - totalColumns: количество столбцов
  - processedAt: время обработки
  - fileSize: размер файла
- status: статус обработки ('processed', 'failed', 'pending')
- lastModified: дата последнего изменения

### Индексы:
- tags: для быстрого поиска по тегам
- uploadDate: для сортировки по дате
- metadata.sheetName: для поиска по имени листа