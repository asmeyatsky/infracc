import { parseCSV, generateCSVTemplate } from './csvImport';

describe('CSV Import Utilities', () => {
  test('parseCSV should parse valid CSV correctly', () => {
    const csvText = `name,type,os,cpu,memory,storage,monthlyTraffic,dependencies
web-server-1,vm,linux,4,16,100,500,db-server
db-server,database,linux,8,64,1000,100,`;

    const workloads = parseCSV(csvText);

    expect(workloads).toHaveLength(2);
    expect(workloads[0].name).toBe('web-server-1');
    expect(workloads[0].type).toBe('vm');
    expect(workloads[0].cpu).toBe(4);
    expect(workloads[0].memory).toBe(16);
    expect(workloads[1].name).toBe('db-server');
    expect(workloads[1].type).toBe('database');
  });

  test('parseCSV should handle missing optional fields', () => {
    const csvText = `name,type
test-vm,vm`;

    const workloads = parseCSV(csvText);

    expect(workloads).toHaveLength(1);
    expect(workloads[0].name).toBe('test-vm');
    expect(workloads[0].type).toBe('vm');
    expect(workloads[0].cpu).toBe(0);
    expect(workloads[0].memory).toBe(0);
  });

  test('parseCSV should throw error for missing required fields', () => {
    const csvText = `os,cpu
linux,4`;

    expect(() => parseCSV(csvText)).toThrow();
  });

  test('generateCSVTemplate should return valid CSV string', () => {
    const template = generateCSVTemplate();

    expect(template).toContain('name,type,os,cpu,memory,storage,monthlyTraffic,dependencies');
    expect(template).toContain('web-server-1');
    expect(template).toContain('db-server');
  });
});
