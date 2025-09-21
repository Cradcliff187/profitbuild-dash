# CSV Parser Documentation

## Overview

The CSV parser utility (`src/utils/csvParser.ts`) provides comprehensive functionality for parsing and processing CSV files, with specialized support for QuickBooks transaction exports.

## Key Features

### 1. Robust Amount Parsing
- Handles various currency formats
- Processes negative amounts in parentheses format
- Removes currency symbols and commas automatically

### 2. QuickBooks Integration
- Skips QuickBooks-specific header rows automatically
- Maps QuickBooks transaction types to internal formats
- Supports account path-based categorization

### 3. Duplicate Detection
- Creates unique keys based on date, amount, and payee name
- Filters duplicate transactions automatically
- Provides detailed duplicate reporting

### 4. Payee Management
- Fuzzy matching for existing payees
- Automatic payee creation from transaction data
- Confidence scoring for payee matches

### 5. Smart Categorization
- Rule-based expense categorization
- Account path analysis
- User preference integration
- Database mapping support

## Main Functions

### `parseQuickBooksAmount(amount: string | number): number`
Parses monetary amounts from various string formats.

**Parameters:**
- `amount`: String or number representation of amount

**Returns:** Parsed number value

**Example:**
```typescript
parseQuickBooksAmount("$1,234.56")  // Returns: 1234.56
parseQuickBooksAmount("(500.00)")   // Returns: -500.00
```

### `parseQuickBooksCSV(file: File): Promise<QBParseResult>`
Parses QuickBooks CSV files with proper header handling.

**Parameters:**
- `file`: CSV file to parse

**Returns:** Promise with parsed data and errors

### `mapQuickBooksToExpenses(transactions: QBTransaction[], fileName: string): Promise<QBImportResult>`
Converts QuickBooks transactions to internal expense format.

**Parameters:**
- `transactions`: Array of QuickBooks transactions
- `fileName`: Source file name for reference

**Returns:** Comprehensive import result with statistics

## Error Handling

The parser includes robust error handling for:
- Invalid file formats
- Missing required fields
- Data type mismatches
- Database connection issues
- Payee creation failures

## Integration Points

### TransactionImportModal
The CSV parser integrates with the transaction import modal to provide:
- Real-time parsing progress
- Preview functionality
- Category adjustment interface
- Batch import processing

### Database Integration
Seamless integration with Supabase for:
- Payee lookup and creation
- Account mapping retrieval
- Expense record insertion
- Transaction deduplication

## Best Practices

1. **File Validation**: Always validate CSV structure before processing
2. **Error Reporting**: Provide detailed error information to users
3. **Progress Tracking**: Show progress for large file imports
4. **User Preferences**: Save and apply user categorization preferences
5. **Duplicate Prevention**: Always run duplicate detection before import

## Performance Considerations

- Large files are processed in chunks
- Database queries are batched for efficiency
- Fuzzy matching is optimized for speed
- Memory usage is monitored during processing

## Future Enhancements

- Support for additional accounting software formats
- Machine learning-based categorization
- Advanced duplicate detection algorithms
- Real-time collaboration features