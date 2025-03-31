// tests/utils/testHelpers.js

const createTestData = (overrides = {}) => ({
    fileName: 'test.xlsx',
    documentType: 'excel',
    companyName: 'Test Company',
    globalTags: ['test', '2023'],
    blocks: [{
      type: 'table',
      source: 'excel',
      content: {
        headers: [{ value: 'Test', level: 1 }],
        rows: [{
          rowNumber: 1,
          cells: new Map([['Test', { value: 'Value', type: 'text' }]])
        }]
      },
      tags: ['test']
    }],
    metadata: {
      format: 'yearly',
      statistics: {
        rowCount: 1,
        columnCount: 1,
        processedAt: new Date(),
        fileSize: 1024
      }
    },
    status: 'completed',
    ...overrides
  });
  
  module.exports = {
    createTestData
  };
  
  
  