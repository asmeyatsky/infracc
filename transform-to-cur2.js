#!/usr/bin/env node

/**
 * Transform AWS CUR CSV files to CUR 2.0 format:
 * Convert column names from slash/camelCase format to underscore format
 * Example: identity/LineItemId -> identity_line_item_id
 * Example: lineItem/ProductCode -> line_item_product_code
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
 * Example: resource_tags_user:kubernetes.io/cluster/name -> resource_tags_user_kubernetes_io_cluster_name
 */
function convertColumnName(columnName) {
  if (!columnName) {
    return columnName;
  }
  
  // Handle tag columns with colons and slashes (e.g., resource_tags_user:kubernetes.io/cluster/name)
  // Replace colons and slashes with underscores, then convert camelCase
  let converted = columnName
    .replace(/:/g, '_')  // Replace colons with underscores
    .replace(/\//g, '_')  // Replace slashes with underscores
    .replace(/\./g, '_'); // Replace dots with underscores
  
  // Convert any remaining camelCase to snake_case
  converted = camelToSnake(converted);
  
  // Clean up multiple consecutive underscores
  converted = converted.replace(/_+/g, '_');
  
  return converted;
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
 * Transform a CSV file to CUR 2.0 format
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
  
  for await (const line of rl) {
    lineNumber++;
    
    if (lineNumber === 1) {
      // Process header row
      originalHeaders = parseCSVLine(line);
      transformedHeaders = originalHeaders.map(convertColumnName);
      
      // Write transformed header
      writeStream.write(transformedHeaders.map(formatCSVValue).join(',') + '\n');
      
      console.log(`  Original columns: ${originalHeaders.length}`);
      console.log(`  Transformed columns: ${transformedHeaders.length}`);
      console.log(`  Sample transformation: "${originalHeaders[0]}" -> "${transformedHeaders[0]}"`);
      
      continue;
    }
    
    // Process data rows - just copy as-is (headers already transformed)
    const values = parseCSVLine(line);
    
    // Ensure we have enough values (pad with empty strings if needed)
    while (values.length < originalHeaders.length) {
      values.push('');
    }
    
    // Write row with same number of columns as transformed headers
    const outputRow = values.slice(0, transformedHeaders.length);
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
    { original: 'report-csv-monthly-02.csv', copy: 'report-csv-monthly-02-cur2.csv' },
    { original: 'report-csv-monthly-03.csv', copy: 'report-csv-monthly-03-cur2.csv' },
    { original: 'report-csv-monthly-04.csv', copy: 'report-csv-monthly-04-cur2.csv' },
    { original: 'report-csv-monthly-05.csv', copy: 'report-csv-monthly-05-cur2.csv' }
  ];
  
  console.log('Starting CSV transformation to CUR 2.0 format...');
  console.log(`Processing ${files.length} files`);
  
  for (const { original, copy } of files) {
    const inputPath = path.join(baseDir, original);
    const outputPath = path.join(baseDir, copy);
    
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: File not found: ${inputPath}`);
      continue;
    }
    
    try {
      await transformCSVFile(inputPath, outputPath);
    } catch (error) {
      console.error(`Error processing ${original}:`, error.message);
      console.error(error.stack);
    }
  }
  
  console.log('\nTransformation complete!');
}

main().catch(console.error);
