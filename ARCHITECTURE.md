# ARCHITECTURE.md

<!-- AUTO-GENERATED-CONTENT:START -->
## Структура проекта

```
backend/
├── ARCHITECTURE.md
├── SampleN2.xlsx
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
├── models/
│   └── Data.js
├── node_modules/
│   └── ...
├── package-lock.json
├── package.json
├── routes/
│   ├── search.js
│   └── upload.js
├── sample.xlsx
├── sampleN.xlsx
├── server.js
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
│   │   └── sample.xlsx
│   ├── testDataCreation.js
│   ├── upload.test.js
│   └── utils/
│       └── createTestFile.js
├── updateArchitecture.py
├── uploads/
│   ├── 1742837414706-sample3.xlsx
│   ├── 1742837615473-sample.xlsx
│   ├── 1742837618900-sample.xlsx
│   ├── 1742838422007-sample.xlsx
│   ├── 1742838425622-sample.xlsx
│   ├── 1742838652945-sample.xlsx
│   ├── 1742838655710-sample.xlsx
│   ├── 1742838797911-sample3.xlsx
│   ├── 1742839432550-sampleN.xlsx
│   ├── 1742887081229-sample.xlsx
│   ├── 1742887083137-sample.xlsx
│   └── 1742887582334-SampleN2.xlsx
├── utils/
│   ├── autoTagger.js
│   ├── excelFormatHandler.js
│   ├── excelParser.js
│   ├── excelProcessor.js
│   ├── excelReader.js
│   └── tagAssigner.js
├── Поли3.xlsx
├── Полипласт.xlsx
└── Полипласт2.xlsx
```

### Папка: .
Содержимые файлы:
- ARCHITECTURE.md
- SampleN2.xlsx
- package-lock.json
- package.json
- sample.xlsx
- sampleN.xlsx
- server.js
- updateArchitecture.py
- Поли3.xlsx
- Полипласт.xlsx
- Полипласт2.xlsx

**Детали по файлам:**
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
- **Файл**: server.js (язык: js)
  - File_imports: **server.js**
    - *Импорты:* ./config/db, ./routes/upload, ./routes/search

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
  - Function: **formatResults**
    - *Описание:* taskpane.js Пример запроса к backend API (укажите правильный URL)
  - Function: **showResult**
    - *Описание:* Здесь можно настроить форматирование полученных данных
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

### Папка: routes
Содержимые файлы:
- search.js
- upload.js

**Детали по файлам:**
- **Файл**: upload.js (язык: js)
  - File_imports: **upload.js**
    - *Импорты:* ../utils/excelProcessor, ../models/Data
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
    - *Импорты:* ../config/db, ../models/Data
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
    - *Импорты:* ../server, ../config/db
- **Файл**: excelParser.test.js (язык: js)
  - File_imports: **excelParser.test.js**
    - *Импорты:* ../utils/excelParser

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
    - *Импорты:* ../../config/db, ../../server
- **Файл**: fileProcessing.test.js (язык: js)
  - File_imports: **fileProcessing.test.js**
    - *Импорты:* ../../utils/excelProcessor

### Папка: tests/test-files
Содержимые файлы:
- sample.xlsx

### Папка: tests/utils
Содержимые файлы:
- createTestFile.js

**Детали по файлам:**
- **Файл**: createTestFile.js (язык: js)
  - Function: **createTestExcelFile**

### Папка: uploads
Содержимые файлы:
- 1742837414706-sample3.xlsx
- 1742837615473-sample.xlsx
- 1742837618900-sample.xlsx
- 1742838422007-sample.xlsx
- 1742838425622-sample.xlsx
- 1742838652945-sample.xlsx
- 1742838655710-sample.xlsx
- 1742838797911-sample3.xlsx
- 1742839432550-sampleN.xlsx
- 1742887081229-sample.xlsx
- 1742887083137-sample.xlsx
- 1742887582334-SampleN2.xlsx

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
    - *Поля:* rawData, label, label, cell, cell, cell, s, s, cell
- **Файл**: autoTagger.js (язык: js)
  - Class: **AutoTagger**
    - *Метод:* analyzeTags
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
  - Class: **ExcelParser**
  - File_imports: **excelParser.js**
    - *Импорты:* ./excelProcessor
- **Файл**: tagAssigner.js (язык: js)
  - Class: **TagAssigner**
    - *Поля:* normalized, normalized, normalized
    - *Метод:* constructor
    - *Метод:* assignTags
    - *Метод:* parseAmount
    - *Метод:* checkCategories
    - *Метод:* calculateStatistics
    - *Метод:* groupByCategories
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