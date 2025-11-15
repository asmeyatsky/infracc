# Testing AWS CUR File Upload

## Quick Test Guide

### Option 1: Use the Sample CUR File

1. **Start the application**:
   ```bash
   npm start
   ```

2. **Click the "Upload CUR" button** in the main menu (next to "Test Data Loaded")

3. **Select the sample file**: `sample-aws-cur.csv`

4. **Expected Results**:
   - You should see a success toast notification
   - The file should be processed and workloads imported
   - New workloads should appear in the Migration Flow view automatically (within 1 second)

### Option 2: Use Your Own AWS CUR File

If you have a real AWS Cost and Usage Report:

1. **Export from AWS**:
   - Go to AWS Cost Explorer
   - Navigate to Reports → Cost and Usage Reports
   - Export as CSV

2. **Upload via the button**:
   - Click "Upload CUR" in the main menu
   - Select your CUR CSV file(s) or ZIP archive containing multiple CUR files

### Option 3: Test with ZIP Archive

1. **Create a ZIP file** containing multiple CUR CSV files:
   ```bash
   zip test-cur-files.zip sample-aws-cur.csv [other-cur-files.csv]
   ```

2. **Upload the ZIP**:
   - Click "Upload CUR"
   - Select the ZIP file
   - All CSV files inside will be processed

## What Gets Imported

The parser extracts:
- **EC2 instances** → VM workloads with CPU/memory from instance types
- **RDS databases** → Database workloads
- **S3 buckets** → Storage workloads
- **EBS volumes** → Storage workloads
- **Lambda functions** → Function workloads
- **ElastiCache** → Database workloads
- **DynamoDB** → Database workloads
- **CloudFront** → Application workloads

## Expected Sample File Results

The `sample-aws-cur.csv` file contains:
- 2 EC2 instances (m5.large, t3.medium)
- 1 RDS database (PostgreSQL)
- 1 S3 bucket with data transfer
- 1 EBS volume
- 1 Lambda function
- 1 ElastiCache cluster
- 1 DynamoDB table
- 1 CloudFront distribution

**Total: ~9 workloads** should be imported.

## Troubleshooting

### If upload fails:
- Check browser console for errors
- Ensure CSV has required columns (ProductCode, ResourceId, UnblendedCost)
- Verify file is valid CSV format

### If workloads don't appear:
- Check Migration Flow view (workloads appear automatically within 1 second)
- Check browser console for any errors
- Verify workloads were saved to repository (check localStorage)

### If ZIP upload fails:
- Ensure `jszip` package is installed: `npm install jszip`
- Check that ZIP contains CSV files (not nested in subdirectories)

## Testing Multiple Files

You can upload multiple files at once:
1. Click "Upload CUR"
2. Select multiple CSV files (hold Ctrl/Cmd)
3. All files will be processed sequentially
4. Progress indicator shows current file being processed
