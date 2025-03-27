// tests/baseDataProcessor.test.js


const BaseDataProcessor = require('../utils/baseDataProcessor');
const { expect } = require('chai');


describe('BaseDataProcessor', () => {
  let processor;


  beforeEach(() => {
    processor = new BaseDataProcessor();
  });


  describe('validateData', () => {
    it('should return false for null data', () => {
      expect(processor.validateData(null)).to.be.false;
    });


    it('should return false for undefined data', () => {
      expect(processor.validateData(undefined)).to.be.false;
    });


    it('should return true for valid data', () => {
      expect(processor.validateData({ test: 'data' })).to.be.true;
    });
  });


  describe('determineCellType', () => {
    it('should identify numbers', () => {
      expect(processor.determineCellType(123)).to.equal('number');
      expect(processor.determineCellType('123.45')).to.equal('number');
    });


    it('should identify dates', () => {
      expect(processor.determineCellType('2024-01-15')).to.equal('date');
      expect(processor.determineCellType('15.01.2024')).to.equal('date');
    });


    it('should identify text', () => {
      expect(processor.determineCellType('some text')).to.equal('text');
    });


    it('should handle empty values', () => {
      expect(processor.determineCellType('')).to.equal('empty');
      expect(processor.determineCellType(null)).to.equal('empty');
    });
  });


  describe('analyzeHeaderStructure', () => {
    it('should handle empty headers', () => {
      const result = processor.analyzeHeaderStructure([]);
      expect(result.levels).to.equal(0);
      expect(result.headers).to.be.an('array').that.is.empty;
    });


    it('should analyze single level headers', () => {
      const headers = ['Header1', 'Header2', 'Header3'];
      const result = processor.analyzeHeaderStructure(headers);
      expect(result.levels).to.equal(1);
      expect(result.headers).to.have.lengthOf(3);
    });
  });


  describe('generateBlockId', () => {
    it('should generate unique IDs', () => {
      const id1 = processor.generateBlockId();
      const id2 = processor.generateBlockId();
      expect(id1).to.not.equal(id2);
    });


    it('should generate valid format', () => {
      const id = processor.generateBlockId();
      expect(id).to.match(/^block_\d+_[a-z0-9]+$/);
    });
  });
});



