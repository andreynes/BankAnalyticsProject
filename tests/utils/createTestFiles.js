// tests/utils/createTestFiles.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Document, Packer, Paragraph, Table, TableRow, TableCell } = require('docx');

// Создаем директории
const testDir = path.join(__dirname, '../test-files');
const uploadsDir = path.join(__dirname, '../../uploads');

[testDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Создание базового тестового Excel файла
 * @param {string} filePath - Путь для сохранения файла
 */
function createTestExcelFile(filePath) {
  const workbook = xlsx.utils.book_new();
  
  const data = [
    ['Company Name', '2022', '2023'],
    ['Revenue', 1000000, 1200000],
    ['Profit', 300000, 350000],
    ['Margin', '30%', '29.2%'],
    ['', '', ''],  // Пустая строка
    ['Notes', 'Special chars: @#$%', 'Very long text '.repeat(20)]
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Financial Data');
  xlsx.writeFile(workbook, filePath);
}

/**
 * Создание сложного Excel файла
 * @param {string} filePath - Путь для сохранения файла
 */
function createComplexExcelFile(filePath) {
  const workbook = xlsx.utils.book_new();
  
  const data = [
    ['Financial Metrics', '', '', 'Operational Metrics', '', ''],
    ['Revenue', 'Costs', 'Profit', 'Employees', 'Offices', 'Projects'],
    ['Q1 2023', 1000000, 700000, 300000, 100, 5, 20],
    ['Q2 2023', 1100000, 750000, 350000, 110, 5, 22],
    ['Q3 2023', 1200000, 800000, 400000, 120, 6, 25],
    ['Q4 2023', 1300000, 850000, 450000, 130, 6, 28]
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Complex Data');
  xlsx.writeFile(workbook, filePath);
}

/**
 * Создание тестового Word файла
 * @param {string} filePath - Путь для сохранения файла
 */
async function createWordTestFile(filePath) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "Financial Analysis Report 2023",
          heading: 'Heading1'
        }),
        new Paragraph({
          text: "This report contains financial analysis for fiscal year 2023."
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Indicator")] }),
                new TableCell({ children: [new Paragraph("2022")] }),
                new TableCell({ children: [new Paragraph("2023")] })
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Revenue")] }),
                new TableCell({ children: [new Paragraph("1,000,000")] }),
                new TableCell({ children: [new Paragraph("1,200,000")] })
              ],
            })
          ],
        })
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}

/**
 * Создание пустых файлов для тестирования
 * @param {string} dir - Директория для сохранения файлов
 */
function createEmptyFiles(dir) {
  fs.writeFileSync(path.join(dir, 'empty.xlsx'), '');
  fs.writeFileSync(path.join(dir, 'empty.docx'), '');
}

/**
 * Создание всех тестовых файлов
 */
async function createAllTestFiles() {
  try {
    // Создаем основные тестовые файлы
    createTestExcelFile(path.join(testDir, 'test.xlsx'));
    createComplexExcelFile(path.join(testDir, 'complex-test.xlsx'));
    await createWordTestFile(path.join(testDir, 'test.docx'));
    createEmptyFiles(testDir);

    // Создаем копии для тестов загрузки
    createTestExcelFile(path.join(testDir, 'upload-test.xlsx'));
    createTestExcelFile(path.join(testDir, 'upload-api-test.xlsx'));

    console.log('Test files created successfully');
  } catch (error) {
    console.error('Error creating test files:', error);
    process.exit(1);
  }
}

// Запускаем создание файлов
createAllTestFiles();

module.exports = {
  createTestExcelFile,
  createComplexExcelFile,
  createWordTestFile,
  createEmptyFiles,
  createAllTestFiles
};


