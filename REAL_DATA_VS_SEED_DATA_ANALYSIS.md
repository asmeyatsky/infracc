# Real Data vs Seed Data Failure Analysis

## Problem
Seed data works but real AWS CUR files fail during parsing.

## Root Causes Identified

### 1. **CRITICAL: Naive CSV Parsing in Non-Streaming Parser**

**Location**: `src/utils/awsBomImport.js` line 78

**Problem**:
```javascript
const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
```

This naive parser **does NOT handle quoted fields with commas inside them**. Real AWS CUR files often contain quoted fields like:
```csv
"Some description, with comma",123.45,"Another field"
```

When split by comma, this becomes 4 fields instead of 3, causing column misalignment.

**Seed Data**: Likely doesn't have quoted fields with commas, so it works.

**Real Data**: AWS CUR files often have quoted fields with commas, breaking the parser.

**Solution**: Use proper CSV parsing (like `parseCSVLine` in streaming parser) for both streaming and non-streaming paths.

### 2. **Header Format Differences**

**Real AWS CUR Format**:
- Uses full format: `LineItem/ProductCode`, `LineItem/UnblendedCost`
- Headers are case-sensitive but parser does case-insensitive search (should work)

**Seed Data Format**:
- May use simplified headers: `ProductCode`, `UnblendedCost`

**Status**: This should work because the parser uses `.includes()` with case-insensitive matching, but worth verifying.

### 3. **BOM (Byte Order Mark) Issues**

**Problem**: Real files exported from AWS may have UTF-8 BOM at the start, which can break header parsing.

**Detection**: First character code `0xFEFF`

**Solution**: Strip BOM before parsing.

### 4. **Quoted Field Handling in Non-Streaming Parser**

**Current Code** (line 78):
```javascript
const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
```

**Issues**:
- Doesn't handle escaped quotes (`""`)
- Doesn't handle commas inside quoted fields
- Strips ALL quotes, even if they're part of the data

**Correct Approach** (from streaming parser):
```javascript
const parseCSVLine = (line) => {
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
};
```

## Recommended Fixes

### Fix 1: Use Proper CSV Parsing in Non-Streaming Parser

**File**: `src/utils/awsBomImport.js`

**Change line 78 from**:
```javascript
const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
```

**To**:
```javascript
// Use proper CSV line parsing that handles quoted fields
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

const values = parseCSVLine(line);
```

### Fix 2: Strip BOM from File Content

**File**: `src/utils/awsBomImport.js`

**Add at the start of `parseAwsCur` function**:
```javascript
export const parseAwsCur = (csvText) => {
  // Strip UTF-8 BOM if present
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.slice(1);
  }
  
  const lines = csvText.trim().split('\n');
  // ... rest of function
```

### Fix 3: Better Error Messages

**Add validation to show which columns are missing**:
```javascript
if (productCodeIdx === -1) {
  const availableHeaders = headers.filter(h => 
    h.toLowerCase().includes('product') || 
    h.toLowerCase().includes('service')
  );
  console.error('Available product-related headers:', availableHeaders);
  throw new Error(`Could not find ProductCode/Service column. Available headers: ${headers.slice(0, 10).join(', ')}...`);
}
```

## Testing Strategy

1. **Test with real CUR file that has quoted fields**:
   - Create test CSV with: `"Field, with comma",123.45`
   - Verify it parses correctly

2. **Test with BOM**:
   - Add BOM to test file
   - Verify it's stripped correctly

3. **Test with LineItem/ prefix**:
   - Use full AWS CUR format headers
   - Verify columns are found correctly

4. **Compare parsing results**:
   - Parse same file with streaming vs non-streaming parser
   - Results should match

## Debugging Tools

Use the debug script (`debug-cur-parsing.js`) in browser console:

```javascript
// After uploading a file, check headers
const file = /* your file */;
const reader = new FileReader();
reader.onload = (e) => {
  window.debugCurParsing.checkHeaders(e.target.result);
  window.debugCurParsing.checkDataRows(e.target.result);
  window.debugCurParsing.checkEncoding(e.target.result);
};
reader.readAsText(file);
```

## Expected Behavior After Fix

- Real AWS CUR files should parse correctly
- Quoted fields with commas should be handled properly
- BOM should be stripped automatically
- Column detection should work with both formats (LineItem/ prefix and simplified)
