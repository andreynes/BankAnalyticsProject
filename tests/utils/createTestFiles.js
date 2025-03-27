// tests/utils/createTestFiles.js


const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');


// Создаем необходимые директории
const testDir = path.join(__dirname, '../test-files');
const uploadsDir = path.join(__dirname, '../../uploads');


[testDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});


// Создаем тестовый Excel файл
function createTestExcelFile() {
  const workbook = xlsx.utils.book_new();
  
  // Создаем данные для листа
  const data = [
    ['Company Name', '2022', '2023'],
    ['Revenue', 1000000, 1200000],
    ['Profit', 300000, 350000],
    ['Employees', 100, 120]
  ];


  const worksheet = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Financial Data');


  // Сохраняем файлы
  xlsx.writeFile(workbook, path.join(testDir, 'test.xlsx'));
  xlsx.writeFile(workbook, path.join(testDir, 'upload-test.xlsx'));
  xlsx.writeFile(workbook, path.join(testDir, 'large-test.xlsx'));
}


// Создаем тестовый файл для API тестов
function createAPITestData() {
  const testData = {
    company: "Test Company",
    year: 2023,
    metrics: [
      { name: "Revenue", value: 1000000 },
      { name: "Profit", value: 300000 }
    ]
  };


  fs.writeFileSync(
    path.join(testDir, 'api-test-data.json'), 
    JSON.stringify(testData, null, 2)
  );
}


// Выполняем создание файлов
try {
  createTestExcelFile();
  createAPITestData();
  console.log('Test files created successfully');
} catch (error) {
  console.error('Error creating test files:', error);
  process.exit(1);
}



