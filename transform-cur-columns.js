#!/usr/bin/env node

/**
 * Transform AWS CUR CSV files:
 * 1. Convert column names from slash/camelCase format to underscore format
 * 2. Add any missing required columns
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Required columns based on the user's documentation
const REQUIRED_COLUMNS = [
  'identity_line_item_id',
  'line_item_line_item_description',
  'line_item_line_item_type',
  'line_item_operation',
  'line_item_usage_amount',
  'line_item_usage_type',
  'pricing_term',
  'pricing_unit',
  'product_instance_type',
  'product_product_family',
  'product_region_code',
  'line_item_product_code'
];

/**
 * Convert camelCase to snake_case
 * Example: LineItemId -> line_item_id
 */
function camelToSnake(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert column name from slash/camelCase format to underscore format
 * Example: identity/LineItemId -> identity_line_item_id
 * Example: lineItem/UsageAmount -> line_item_usage_amount
 */
function convertColumnName(columnName) {
  if (!columnName || !columnName.includes('/')) {
    // Already in underscore format or no slash, return as-is
    return columnName;
  }
  
  const [prefix, ...rest] = columnName.split('/');
  const suffix = rest.join('/');
  
  // Convert prefix and suffix to snake_case
  const prefixSnake = camelToSnake(prefix);
  const suffixSnake = camelToSnake(suffix);
  
  return `${prefixSnake}_${suffixSnake}`;
}

/**
 * Parse CSV line handling quoted fields with commas
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current);
  
  return values;
}

/**
 * Format CSV value (add quotes if needed)
 */
function formatCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Transform a CSV file
 */
async function transformCSVFile(inputPath, outputPath) {
  console.log(`\nTransforming: ${path.basename(inputPath)}`);
  console.log(`Output: ${path.basename(outputPath)}`);
  
  const fileStream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const writeStream = fs.createWriteStream(outputPath);
  let lineNumber = 0;
  let originalHeaders = [];
  let transformedHeaders = [];
  let headerMap = new Map(); // original index -> transformed index
  let missingColumns = [];
  let columnIndexMap = new Map(); // transformed column name -> index
  
  for await (const line of rl) {
    lineNumber++;
    
    if (lineNumber === 1) {
      // Process header row
      originalHeaders = parseCSVLine(line);
      transformedHeaders = originalHeaders.map(convertColumnName);
      
      // Create index mapping
      transformedHeaders.forEach((col, idx) => {
        columnIndexMap.set(col.toLowerCase(), idx);
        headerMap.set(idx, idx); // Initially, same position
      });
      
      // Check for missing required columns
      missingColumns = REQUIRED_COLUMNS.filter(reqCol => {
        const found = Array.from(columnIndexMap.keys()).some(existing => 
          existing.includes(reqCol.toLowerCase().replace(/_/g, '')) ||
          reqCol.toLowerCase().includes(existing.replace(/_/g, ''))
        );
        return !found;
      });
      
      // Add missing columns
      let nextIndex = transformedHeaders.length;
      for (const missingCol of missingColumns) {
        transformedHeaders.push(missingCol);
        columnIndexMap.set(missingCol.toLowerCase(), nextIndex);
        nextIndex++;
      }
      
      // Write transformed header
      writeStream.write(transformedHeaders.map(formatCSVValue).join(',') + '\n');
      
      console.log(`  Original columns: ${originalHeaders.length}`);
      console.log(`  Transformed columns: ${transformedHeaders.length}`);
      if (missingColumns.length > 0) {
        console.log(`  Added missing columns: ${missingColumns.join(', ')}`);
      }
      
      continue;
    }
    
    // Process data rows
    const values = parseCSVLine(line);
    
    // Ensure we have enough values (pad with empty strings for missing columns)
    while (values.length < originalHeaders.length) {
      values.push('');
    }
    
    // Create output row with all transformed columns
    const outputRow = [];
    for (let i = 0; i < transformedHeaders.length; i++) {
      const colName = transformedHeaders[i];
      
      // Check if this is a missing column we added
      if (missingColumns.includes(colName)) {
        outputRow.push(''); // Empty value for missing columns
      } else {
        // Find original column index
        const originalIndex = originalHeaders.findIndex(orig => 
          convertColumnName(orig) === colName
        );
        
        if (originalIndex !== -1 && originalIndex < values.length) {
          outputRow.push(values[originalIndex]);
        } else {
          outputRow.push('');
        }
      }
    }
    
    writeStream.write(outputRow.map(formatCSVValue).join(',') + '\n');
    
    if (lineNumber % 100000 === 0) {
      console.log(`  Processed ${lineNumber.toLocaleString()} rows...`);
    }
  }
  
  writeStream.end();
  console.log(`  Completed: ${lineNumber.toLocaleString()} total rows`);
  
  return new Promise((resolve) => {
    writeStream.on('finish', () => resolve());
  });
}

/**
 * Main function
 */
async function main() {
  const baseDir = '/Users/allansmeyatsky/infracc/seed-data/20251001';
  const files = [
    'report-csv-monthly-02-copy.csv',
    'report-csv-monthly-03-copy.csv',
    'report-csv-monthly-04-copy.csv',
    'report-csv-monthly-05-copy.csv'
  ];
  
  console.log('Starting CSV column transformation...');
  console.log(`Processing ${files.length} files`);
  
  for (const file of files) {
    const inputPath = path.join(baseDir, file);
    const outputPath = path.join(baseDir, file.replace('-copy.csv', '-transformed.csv'));
    
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      continue;
    }
    
    try {
      await transformCSVFile(inputPath, outputPath);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log('\nTransformation complete!');
}

main().catch(console.error);
