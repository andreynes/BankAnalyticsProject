// tests/utils/createTestFiles.js

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = require('docx');

/**
 * Создание тестового Excel файла
 * @param {string} filePath - Путь для сохранения файла
 */
function createExcelTestFile(filePath) {
  const workbook = xlsx.utils.book_new();
  
  // Создаем данные для листа
  const data = [
    ['Company Name', '2022', '2023'],
    ['Revenue', 1000000, 1200000],
    ['Profit', 300000, 350000],
    ['Margin', '30%', '29.2%']
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Financial Data');

  // Добавляем второй лист с другой структурой
  const data2 = [
    ['Department', 'Manager', 'Budget'],
    ['Sales', 'John Doe', 500000],
    ['Marketing', 'Jane Smith', 300000]
  ];

  const worksheet2 = xlsx.utils.aoa_to_sheet(data2);
  xlsx.utils.book_append_sheet(workbook, worksheet2, 'Departments');

  xlsx.writeFile(workbook, filePath);
}

/**
 * Создание большого тестового Excel файла
 * @param {string} filePath - Путь для сохранения файла
 */
function createLargeExcelFile(filePath) {
  const workbook = xlsx.utils.book_new();
  const data = [['Date', 'Product', 'Revenue', 'Units']];

  // Генерируем 200 строк данных
  for (let i = 1; i <= 200; i++) {
    data.push([
      `2023-${String(Math.floor(i/20) + 1).padStart(2, '0')}-01`,
      `Product ${i}`,
      Math.floor(Math.random() * 10000),
      Math.floor(Math.random() * 100)
    ]);
  }

  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sales Data');
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
          children: [
            new TextRun({
              text: "Financial Analysis Report 2023",
              bold: true,
              size: 32
            })
          ],
          heading: 'Heading1'
        }),
        new Paragraph({
          children: [
            new TextRun("This report contains financial analysis for fiscal year 2023.")
          ]
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
 * Создание всех тестовых файлов
 */
async function createTestFiles() {
  // Создаем директории
  const testDir = path.join(__dirname, '../test-files');
  const uploadsDir = path.join(__dirname, '../../uploads');

  [testDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  try {
    // Создаем тестовые файлы
    await Promise.all([
      createExcelTestFile(path.join(testDir, 'test.xlsx')),
      createExcelTestFile(path.join(testDir, 'upload-test.xlsx')),
      createLargeExcelFile(path.join(testDir, 'large-test.xlsx')),
      createWordTestFile(path.join(testDir, 'test.docx'))
    ]);

    console.log('Test files created successfully');
  } catch (error) {
    console.error('Error creating test files:', error);
    process.exit(1);
  }
}

// Запускаем создание файлов
createTestFiles();

module.exports = {
  createTestFiles,
  createExcelTestFile,
  createLargeExcelFile,
  createWordTestFile
};


