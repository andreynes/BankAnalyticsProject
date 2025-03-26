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
│   │   └── sample.xlsx
│   ├── testDataCreation.js
│   ├── upload.test.js
│   └── utils/
│       └── createTestFile.js
├── updateArchitecture.py
├── uploads/
│   └── 1742977335596-sample.xlsx
└── utils/
    ├── autoTagger.js
    ├── excelFormatHandler.js
    ├── excelParser.js
    ├── excelProcessor.js
    ├── excelReader.js
    └── tagAssigner.js
```

### Папка: .
Содержимые файлы:
- ARCHITECTURE.md
- optimal-tagging-strategy.txt
- package-lock.json
- package.json
- sample.xlsx
- server.js
- test-autoTagger.js
- test-sanitize.js
- test-tagAssigner.js
- updateArchitecture.py

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
  - Function: **onSearch**
    - *Описание:* SVG-иконки (копирование и зеленая галочка) в стиле Jay Copilot Новая иконка для графика (можно заменить на любую понравившуюся) Данные выручки по годам Данные чистой прибыли по годам
  - Function: **showRevenueYear**
    - *Описание:* Отображение выручки за конкретный год с кнопкой копирования (индивидуальный результат – plain text)
  - Function: **showRevenueTable**
    - *Описание:* Отображение таблицы с выручкой по всем годам (команда "полипласт выручка")
  - Function: **showNetProfitTable**
    - *Описание:* Обработчики для копирования отдельного числа Обработчик для копирования таблицы (HTML без колонки "Копировать") Обработчик для копирования графика Отображение таблицы с чистой прибылью по годам (команда "полипласт чистая прибыль")
  - Function: **showCompanyIndicators**
    - *Описание:* Отображение комбинированной таблицы с показателями (команда "полипласт")
  - Function: **copyChart**
    - *Описание:* Функция копирования графика. Создает canvas, рисует диаграмму и копирует изображение.
  - Function: **showResult**
    - *Описание:* Дополнительные показатели можно добавить по аналогии Создаем canvas для рисования графика Заливка фона белым цветом Параметры графика Отрисовка заголовка графика Отрисовка столбцов и подписей Столбец Подпись года Преобразование canvas в изображение (Blob) и копирование в буфер обмена Функция вывода HTML-контента в элемент с id "result"
  - Function: **copyWithFeedback**
    - *Описание:* Функция копирования с обратной связью (для текста или HTML)
  - Function: **showFeedback**
    - *Описание:* Функция отображения обратной связи, заменяет содержимое кнопки на галочку с текстом "Скопировано"
  - Function: **copyTableHtml**
    - *Описание:* Функция копирования HTML таблицы без колонки "Копировать"
  - Function: **formatNumber**
    - *Описание:* Функция форматирования числа (добавление пробелов-разделителей)
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
    - *Импорты:* ../../server, ../../config/db
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
- 1742977335596-sample.xlsx

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
  - Function: **sanitize**
    - *Описание:* Функция очистки ячейки (sanitize)
  - Class: **ExcelProcessor**
    - *Описание:* Если значение уже число, форматируем с двумя знаками после запятой Если все символы одинаковы (без учета регистра), вернуть пустую строку Если строка состоит только из специальных символов, например "!@#$%^&*()" Если строка выглядит как число, форматируем его
    - *Поля:* rawData, rawData
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