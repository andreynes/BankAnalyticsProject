# ARCHITECTURE.md

<!-- AUTO-GENERATED-CONTENT:START -->
## Структура проекта

```
backend/
├── docs/
│   └── architecture.md
├── models/
│   └── Data.js
├── node_modules/
│   └── ...
├── package-lock.json
├── package.json
├── routes/
│   └── upload.js
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
│   ├── testDataCreation.js
│   ├── upload.test.js
│   └── utils/
│       └── createTestFile.js
├── updateArchitecture.py
├── uploads/
│   └── 1742557020770-526458541.xlsx
├── utils/
│   ├── autoTagger.js
│   ├── excelFormatHandler.js
│   ├── excelParser.js
│   ├── excelProcessor.js
│   ├── excelReader.js
│   └── tagAssigner.js
├── Полипласт.xlsx
└── Полипласт2.xlsx
```

### Папка: .
Содержимые файлы:
- package-lock.json
- package.json
- server.js
- updateArchitecture.py
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
    - *Импорты:* ./routes/upload

### Папка: docs
Содержимые файлы:
- architecture.md

### Папка: models
Содержимые файлы:
- Data.js

### Папка: routes
Содержимые файлы:
- upload.js

**Детали по файлам:**
- **Файл**: upload.js (язык: js)
  - File_imports: **upload.js**
    - *Импорты:* ../models/Data, ../utils/tagAssigner, ../utils/excelProcessor

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
    - *Импорты:* ../models/Data
- **Файл**: excelReader.test.js (язык: js)
  - File_imports: **excelReader.test.js**
    - *Импорты:* ../utils/excelReader
- **Файл**: testDataCreation.js (язык: js)
  - File_imports: **testDataCreation.js**
    - *Импорты:* ../models/Data
- **Файл**: excelFormatHandler.test.js (язык: js)
  - File_imports: **excelFormatHandler.test.js**
    - *Импорты:* ../utils/excelFormatHandler
- **Файл**: excelProcessor.test.js (язык: js)
  - File_imports: **excelProcessor.test.js**
    - *Импорты:* ../utils/excelProcessor
- **Файл**: tagAssigner.test.js (язык: js)
  - File_imports: **tagAssigner.test.js**
    - *Импорты:* ../utils/tagAssigner
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
    - *Импорты:* ../server, ../models/Data
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
    - *Импорты:* ../../models/Data, ../../server
- **Файл**: fileProcessing.test.js (язык: js)
  - File_imports: **fileProcessing.test.js**
    - *Импорты:* ../../utils/excelProcessor

### Папка: tests/utils
Содержимые файлы:
- createTestFile.js

**Детали по файлам:**
- **Файл**: createTestFile.js (язык: js)
  - Function: **createTestExcelFile**

### Папка: uploads
Содержимые файлы:
- 1742557020770-526458541.xlsx

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
  - File_imports: **excelProcessor.js**
    - *Импорты:* ./excelReader, ./autoTagger
- **Файл**: autoTagger.js (язык: js)
  - Class: **AutoTagger**
    - *Поля:* value
    - *Метод:* constructor
    - *Метод:* analyzeTags
    - *Метод:* analyzeDataContent
    - *Метод:* looksLikeDate
    - *Метод:* looksLikeMoney
    - *Метод:* looksLikePercentage
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