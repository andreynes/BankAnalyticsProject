# ARCHITECTURE.md

<!-- AUTO-GENERATED-CONTENT:START -->
## Структура проекта

```
backend/
├── ARCHITECTURE.md
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
│   └── Data.js
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
├── tests/
│   ├── autoTagger.test.js
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
│   ├── tagAssigner.test.js
│   ├── test-files/
│   │   ├── large-test.xlsx
│   │   └── sample.xlsx
│   ├── testDataCreation.js
│   ├── upload.test.js
│   └── utils/
│       └── createTestFile.js
├── updateArchitecture.py
├── uploads/
│   ├── 1742977335596-sample.xlsx
│   ├── 1742986079696-sample.xlsx
│   ├── 1742986081255-sample.xlsx
│   ├── 1742986801266-sample.xlsx
│   ├── 1742986803649-sample.xlsx
│   ├── 1742987054529-sample.xlsx
│   ├── 1742987056317-sample.xlsx
│   ├── 1742987239327-sample.xlsx
│   ├── 1742987241056-sample.xlsx
│   ├── 1742987740008-sample.xlsx
│   ├── 1742987741681-sample.xlsx
│   ├── 1742987911007-sample.xlsx
│   ├── 1742987913595-sample.xlsx
│   ├── 1742988182339-sample.xlsx
│   ├── 1742988184715-sample.xlsx
│   ├── 1742988370955-sample.xlsx
│   ├── 1742988372901-sample.xlsx
│   ├── 1742988523740-sample.xlsx
│   ├── 1742988525698-sample.xlsx
│   ├── 1742988744063-sample.xlsx
│   ├── 1742988746200-sample.xlsx
│   ├── 1742988996713-sample.xlsx
│   ├── 1742988998317-sample.xlsx
│   ├── 1742989127563-sample.xlsx
│   ├── 1742989130348-sample.xlsx
│   ├── 1742989399275-sample.xlsx
│   ├── 1742989400885-sample.xlsx
│   ├── 1742990930017-upload-api-test.xlsx
│   ├── 1742990930113-large-test.xlsx
│   ├── 1742991386580-upload-test.xlsx
│   ├── 1742991387553-upload-api-test.xlsx
│   ├── 1742991387603-large-test.xlsx
│   ├── 1742993691108-upload-test.xlsx
│   ├── 1742993691858-upload-api-test.xlsx
│   ├── 1742993691913-large-test.xlsx
│   ├── 1742994571140-upload-test.xlsx
│   ├── 1742994573091-upload-api-test.xlsx
│   ├── 1742995382675-upload-test.xlsx
│   ├── 1742995384565-upload-api-test.xlsx
│   ├── 1742995648921-upload-test.xlsx
│   ├── 1742995650554-upload-api-test.xlsx
│   ├── 1742999582223-upload-test.xlsx
│   ├── 1742999584410-upload-api-test.xlsx
│   ├── 1743002562939-upload-test.xlsx
│   ├── 1743002564606-upload-api-test.xlsx
│   ├── 1743002941176-upload-test.xlsx
│   ├── 1743002943182-upload-api-test.xlsx
│   ├── 1743004364241-upload-test.xlsx
│   ├── 1743004366004-upload-api-test.xlsx
│   ├── 1743004551556-upload-test.xlsx
│   ├── 1743004553530-upload-api-test.xlsx
│   ├── 1743004674162-upload-test.xlsx
│   ├── 1743004676021-upload-api-test.xlsx
│   ├── 1743005478411-upload-test.xlsx
│   ├── 1743005479600-upload-api-test.xlsx
│   ├── 1743006020657-upload-test.xlsx
│   ├── 1743006528521-upload-test.xlsx
│   ├── 1743006530271-upload-api-test.xlsx
│   ├── 1743007131547-Газпром.xlsx
│   ├── 1743009960460-upload-test.xlsx
│   ├── 1743009963240-upload-api-test.xlsx
│   ├── 1743011915189-upload-test.xlsx
│   ├── 1743011918169-upload-api-test.xlsx
│   └── 1743060456351-Газпром.xlsx
├── utils/
│   ├── autoTagger.js
│   ├── excelFormatHandler.js
│   ├── excelParser.js
│   ├── excelProcessor.js
│   ├── excelReader.js
│   └── tagAssigner.js
└── Газпром.xlsx
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
- updateArchitecture.py
- Газпром.xlsx

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
    - *Импорты:* ./config/db, ./routes/search, ./routes/upload
- **Файл**: test-autoTagger.js (язык: js)
  - File_imports: **test-autoTagger.js**
    - *Импорты:* ./utils/autoTagger

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
    - *Описание:* ... (оставляем SVG-иконки без изменений) ... Функция для получения данных из API Определяем тип запроса по тегам
  - Function: **showRevenueTable**
  - Function: **showNetProfitTable**
    - *Описание:* Добавляем обработчики событий
  - Function: **showCompanyIndicators**
  - Function: **setupTableEventHandlers**
    - *Описание:* ... (оставляем вспомогательные функции без изменений: copyChart, showResult, copyWithFeedback, showFeedback, copyTableHtml, formatNumber) ...
  - Function: **setupCompanyTableEventHandlers**
- **Файл**: taskpane.html (язык: html)
  - Html: **taskpane.html**
    - *Описание:* HTML файл
    - *Импорты:* taskpane.css, taskpane.js

### Папка: config
Содержимые файлы:
- db.js

### Папка: docs
Содержимые файлы:
- architecture.md

### Папка: models
Содержимые файлы:
- Data.js

**Детали по файлам:**
- **Файл**: Data.js (язык: js)
  - Function: **determineDateFormat**
    - *Описание:* Функция определения формата даты

### Папка: routes
Содержимые файлы:
- search.js
- upload.js

**Детали по файлам:**
- **Файл**: upload.js (язык: js)
  - File_imports: **upload.js**
    - *Импорты:* ../config/db, ../models/Data, ../utils/excelProcessor
- **Файл**: search.js (язык: js)
  - File_imports: **search.js**
    - *Импорты:* ../models/Data

### Папка: tests
Содержимые файлы:
- autoTagger.test.js
- data.model.test.js
- database.test.js
- edge-cases.test.js
- excelFormatHandler.test.js
- excelParser.test.js
- excelProcessor.test.js
- excelReader.test.js
- tagAssigner.test.js
- testDataCreation.js
- upload.test.js

**Детали по файлам:**
- **Файл**: data.model.test.js (язык: js)
  - File_imports: **data.model.test.js**
    - *Импорты:* ../models/Data, ../config/db
- **Файл**: excelReader.test.js (язык: js)
  - File_imports: **excelReader.test.js**
    - *Импорты:* ../utils/excelReader
- **Файл**: testDataCreation.js (язык: js)
  - File_imports: **testDataCreation.js**
    - *Импорты:* ../models/Data
- **Файл**: database.test.js (язык: js)
  - File_imports: **database.test.js**
    - *Импорты:* ../config/db
- **Файл**: excelFormatHandler.test.js (язык: js)
  - File_imports: **excelFormatHandler.test.js**
    - *Импорты:* ../utils/excelFormatHandler
- **Файл**: excelProcessor.test.js (язык: js)
  - File_imports: **excelProcessor.test.js**
    - *Импорты:* ../utils/excelProcessor
- **Файл**: tagAssigner.test.js (язык: js)
  - File_imports: **tagAssigner.test.js**
    - *Импорты:* ../utils/autoTagger
- **Файл**: edge-cases.test.js (язык: js)
  - File_imports: **edge-cases.test.js**
    - *Импорты:* ../utils/excelProcessor
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
    - *Импорты:* ../config/db, ../server
- **Файл**: excelParser.test.js (язык: js)
  - File_imports: **excelParser.test.js**
    - *Импорты:* ../utils/excelProcessor

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
    - *Импорты:* ../../server, ../../config/db
- **Файл**: fileProcessing.test.js (язык: js)
  - File_imports: **fileProcessing.test.js**
    - *Импорты:* ../../utils/excelProcessor

### Папка: tests/test-files
Содержимые файлы:
- large-test.xlsx
- sample.xlsx

### Папка: tests/utils
Содержимые файлы:
- createTestFile.js

**Детали по файлам:**
- **Файл**: createTestFile.js (язык: js)
  - Function: **createTestExcelFile**

### Папка: uploads
Содержимые файлы:
- 1742977335596-sample.xlsx
- 1742986079696-sample.xlsx
- 1742986081255-sample.xlsx
- 1742986801266-sample.xlsx
- 1742986803649-sample.xlsx
- 1742987054529-sample.xlsx
- 1742987056317-sample.xlsx
- 1742987239327-sample.xlsx
- 1742987241056-sample.xlsx
- 1742987740008-sample.xlsx
- 1742987741681-sample.xlsx
- 1742987911007-sample.xlsx
- 1742987913595-sample.xlsx
- 1742988182339-sample.xlsx
- 1742988184715-sample.xlsx
- 1742988370955-sample.xlsx
- 1742988372901-sample.xlsx
- 1742988523740-sample.xlsx
- 1742988525698-sample.xlsx
- 1742988744063-sample.xlsx
- 1742988746200-sample.xlsx
- 1742988996713-sample.xlsx
- 1742988998317-sample.xlsx
- 1742989127563-sample.xlsx
- 1742989130348-sample.xlsx
- 1742989399275-sample.xlsx
- 1742989400885-sample.xlsx
- 1742990930017-upload-api-test.xlsx
- 1742990930113-large-test.xlsx
- 1742991386580-upload-test.xlsx
- 1742991387553-upload-api-test.xlsx
- 1742991387603-large-test.xlsx
- 1742993691108-upload-test.xlsx
- 1742993691858-upload-api-test.xlsx
- 1742993691913-large-test.xlsx
- 1742994571140-upload-test.xlsx
- 1742994573091-upload-api-test.xlsx
- 1742995382675-upload-test.xlsx
- 1742995384565-upload-api-test.xlsx
- 1742995648921-upload-test.xlsx
- 1742995650554-upload-api-test.xlsx
- 1742999582223-upload-test.xlsx
- 1742999584410-upload-api-test.xlsx
- 1743002562939-upload-test.xlsx
- 1743002564606-upload-api-test.xlsx
- 1743002941176-upload-test.xlsx
- 1743002943182-upload-api-test.xlsx
- 1743004364241-upload-test.xlsx
- 1743004366004-upload-api-test.xlsx
- 1743004551556-upload-test.xlsx
- 1743004553530-upload-api-test.xlsx
- 1743004674162-upload-test.xlsx
- 1743004676021-upload-api-test.xlsx
- 1743005478411-upload-test.xlsx
- 1743005479600-upload-api-test.xlsx
- 1743006020657-upload-test.xlsx
- 1743006528521-upload-test.xlsx
- 1743006530271-upload-api-test.xlsx
- 1743007131547-Газпром.xlsx
- 1743009960460-upload-test.xlsx
- 1743009963240-upload-api-test.xlsx
- 1743011915189-upload-test.xlsx
- 1743011918169-upload-api-test.xlsx
- 1743060456351-Газпром.xlsx

### Папка: utils
Содержимые файлы:
- autoTagger.js
- excelFormatHandler.js
- excelParser.js
- excelProcessor.js
- excelReader.js
- tagAssigner.js

**Детали по файлам:**
- **Файл**: excelProcessor.js (язык: js)
  - Class: **ExcelProcessor**
    - *Поля:* value
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
    - *Описание:* Улучшенная функция sanitize
  - Class: **ExcelParser**
    - *Описание:* Базовая проверка на null/undefined Если это число Преобразование в строку и базовая очистка Проверка на повторяющиеся символы Проверка на спецсимволы Проверка на число в строковом формате Ограничение длины строки
  - Class: **ExcelProcessor**
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