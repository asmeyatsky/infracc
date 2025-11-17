/**
 * Debug script to identify differences between seed data and real CUR files
 * Run this in browser console after uploading a real CUR file to see what's different
 */

// Add this to browser console to debug real CUR file parsing
window.debugCurParsing = {
  // Check header format
  checkHeaders: (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('=== HEADER ANALYSIS ===');
    console.log('Total headers:', headers.length);
    console.log('First 20 headers:', headers.slice(0, 20));
    
    // Check for LineItem/ prefix
    const hasLineItemPrefix = headers.some(h => h.includes('LineItem/'));
    console.log('Has LineItem/ prefix:', hasLineItemPrefix);
    
    // Find key columns
    const findColumn = (patterns) => {
      for (const pattern of patterns) {
        const index = headers.findIndex(h => 
          h.toLowerCase().includes(pattern.toLowerCase())
        );
        if (index !== -1) {
          return { index, name: headers[index] };
        }
      }
      return null;
    };
    
    const productCode = findColumn(['productcode', 'product_code', 'service']);
    const resourceId = findColumn(['resourceid', 'resource_id', 'resource']);
    const cost = findColumn(['unblendedcost', 'cost', 'blendedcost']);
    const region = findColumn(['location', 'region', 'availabilityzone']);
    
    console.log('ProductCode column:', productCode);
    console.log('ResourceId column:', resourceId);
    console.log('Cost column:', cost);
    console.log('Region column:', region);
    
    // Check if columns are missing
    if (!productCode) {
      console.error('❌ ProductCode column NOT FOUND!');
      console.log('Available headers containing "product":', 
        headers.filter(h => h.toLowerCase().includes('product')));
    }
    if (!cost) {
      console.error('❌ Cost column NOT FOUND!');
      console.log('Available headers containing "cost":', 
        headers.filter(h => h.toLowerCase().includes('cost')));
    }
    
    return { headers, productCode, resourceId, cost, region, hasLineItemPrefix };
  },
  
  // Check first few data rows
  checkDataRows: (csvText) => {
    const lines = csvText.trim().split('\n');
    console.log('=== DATA ROW ANALYSIS ===');
    console.log('Total lines:', lines.length);
    
    // Check first 5 data rows
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Try simple split
      const simpleSplit = line.split(',').map(v => v.trim());
      console.log(`Row ${i} (simple split):`, {
        fieldCount: simpleSplit.length,
        firstFields: simpleSplit.slice(0, 5),
        hasQuotes: line.includes('"'),
        length: line.length
      });
      
      // Try proper CSV parsing (handling quotes)
      const properParse = parseCSVLine(line);
      console.log(`Row ${i} (proper parse):`, {
        fieldCount: properParse.length,
        firstFields: properParse.slice(0, 5)
      });
      
      if (simpleSplit.length !== properParse.length) {
        console.warn(`⚠️ Row ${i}: Field count mismatch! Simple: ${simpleSplit.length}, Proper: ${properParse.length}`);
      }
    }
  },
  
  // Check for BOM or encoding issues
  checkEncoding: (csvText) => {
    console.log('=== ENCODING ANALYSIS ===');
    const firstChar = csvText.charCodeAt(0);
    console.log('First character code:', firstChar);
    
    // Check for BOM (Byte Order Mark)
    if (firstChar === 0xFEFF) {
      console.warn('⚠️ File has UTF-8 BOM (Byte Order Mark) at start');
    } else {
      console.log('✓ No BOM detected');
    }
    
    // Check for non-ASCII characters
    const nonAsciiCount = Array.from(csvText.slice(0, 1000)).filter(c => c.charCodeAt(0) > 127).length;
    console.log('Non-ASCII characters in first 1000 chars:', nonAsciiCount);
  }
};

// Helper function to parse CSV line properly (handling quotes)
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
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current.trim());
  return values;
}

console.log('Debug utilities loaded. Use:');
console.log('  window.debugCurParsing.checkHeaders(csvText)');
console.log('  window.debugCurParsing.checkDataRows(csvText)');
console.log('  window.debugCurParsing.checkEncoding(csvText)');
