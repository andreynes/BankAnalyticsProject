// tests/APIDataProcessor.test.js

const APIDataProcessor = require('../utils/APIDataProcessor');
const { expect } = require('chai');

describe('APIDataProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new APIDataProcessor();
  });

  describe('process', () => {
    it('should process array data', async () => {
      const testData = [
        { id: 1, name: 'Item 1', value: 100 },
        { id: 2, name: 'Item 2', value: 200 }
      ];

      const result = await processor.process(testData, {
        source: 'test-api'
      });

      expect(result).to.have.property('documentType', 'api');
      expect(result.blocks).to.have.length(1);
      expect(result.blocks[0].type).to.equal('table');
      expect(result.blocks[0].content.headers).to.have.length(3);
      expect(result.blocks[0].content.rows).to.have.length(2);
    });

    it('should process object data', async () => {
      const testData = {
        summary: {
          total: 1000,
          year: 2023
        },
        items: [
          { id: 1, value: 100 },
          { id: 2, value: 200 }
        ]
      };

      const result = await processor.process(testData);
      expect(result.blocks.length).to.be.above(1);
      expect(result.globalTags).to.include('2023');
    });
  });

  describe('Array processing', () => {
    it('should create correct headers from array data', async () => {
      const testData = [
        { id: 1, name: 'Test', value: 100 }
      ];

      const block = await processor.processArrayData(testData);
      expect(block.content.headers).to.have.length(3);
      expect(block.content.headers.map(h => h.value))
        .to.deep.equal(['id', 'name', 'value']);
    });

    it('should handle empty arrays', async () => {
      const block = await processor.processArrayData([]);
      expect(block.content.headers).to.have.length(0);
      expect(block.content.rows).to.have.length(0);
    });
  });

  describe('Object processing', () => {
    it('should process nested objects', async () => {
      const testData = {
        level1: {
          level2: {
            value: 100
          }
        }
      };

      const result = await processor.process(testData);
      const flattenedData = processor.flattenObject(testData);
      expect(flattenedData['level1.level2.value']).to.equal(100);
    });

    it('should handle mixed data types', async () => {
      const testData = {
        text: 'Simple text',
        numbers: [1, 2, 3],
        object: { key: 'value' }
      };

      const blocks = await processor.processObjectData(testData);
      expect(blocks).to.have.length(3);
      expect(blocks.find(b => b.content.title === 'text')).to.exist;
      expect(blocks.find(b => b.content.title === 'numbers')).to.exist;
      expect(blocks.find(b => b.content.title === 'object')).to.exist;
    });
  });

  describe('Tag extraction', () => {
    it('should extract tags from text', () => {
      const text = 'Revenue in 2023 was 1000000';
      const tags = processor.extractTagsFromText(text);
      expect(tags).to.include('2023');
      expect(tags).to.include('revenue');
    });

    it('should extract tags from objects', () => {
      const obj = {
        revenue: 'Annual Revenue 2023',
        profit: 'Net Profit 2023',
        details: {
          quarter: 'Q4 Revenue'
        }
      };

      const tags = processor.extractTagsFromObject(obj);
      expect(tags).to.include('2023');
      expect(tags).to.include('revenue');
      expect(tags).to.include('profit');
    });
  });

  describe('Data type detection', () => {
    it('should identify different data types', () => {
      const testCases = [
        { value: 123, expected: 'number' },
        { value: '2023-01-15', expected: 'date' },
        { value: 'text', expected: 'text' },
        { value: null, expected: 'empty' }
      ];

      testCases.forEach(({ value, expected }) => {
        expect(processor.determineCellType(value)).to.equal(expected);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle invalid input data', async () => {
      try {
        await processor.process(null);
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.include('Processing error');
      }
    });

    it('should handle malformed objects', async () => {
      const malformedData = {
        circular: {}
      };
      malformedData.circular.self = malformedData;

      try {
        await processor.process(malformedData);
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.include('Processing error');
      }
    });
  });

  describe('Value extraction', () => {
    it('should extract values by path', () => {
      const testData = {
        level1: {
          level2: {
            value: 100
          }
        }
      };

      expect(processor.getValueByPath(testData, 'level1.level2.value')).to.equal(100);
      expect(processor.getValueByPath(testData, 'nonexistent.path')).to.be.undefined;
    });

    it('should handle arrays in paths', () => {
      const testData = {
        items: [
          { id: 1, value: 100 },
          { id: 2, value: 200 }
        ]
      };

      expect(processor.getValueByPath(testData, 'items.0.value')).to.equal(100);
    });
  });

  describe('Metadata handling', () => {
    it('should include source metadata', async () => {
      const result = await processor.process([{ test: 'data' }], {
        source: 'test-api',
        version: '1.0'
      });

      expect(result.metadata).to.have.property('source', 'test-api');
      expect(result.metadata).to.have.property('version', '1.0');
    });

    it('should include processing statistics', async () => {
      const result = await processor.process({ test: 'data' });
      
      expect(result.metadata).to.have.property('statistics');
      expect(result.metadata.statistics).to.have.property('totalSize');
      expect(result.metadata).to.have.property('requestDate');
    });
  });
});


