const ExcelJS = require('exceljs');

async function testFormatExport() {
  console.log('Testing Excel export with sample data...');
  
  const testData = [
    { id: 1, name: 'Test Item 1', date: '2024-01-15T10:30:00', quantity: 5, active: true },
    { id: 2, name: 'Test Item 2', date: '2024-01-16T14:45:00', quantity: 3, active: false },
    { id: 3, name: 'Test Item 3 with "quotes"', date: '2024-01-17T09:15:00', quantity: 10, active: true }
  ];
  
  // Test CSV export
  console.log('Creating Excel file...');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');
  
  // Add headers
  const headers = Object.keys(testData[0]);
  worksheet.addRow(headers);
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Add data rows
  testData.forEach(row => {
    const rowData = headers.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Handle dates
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value);
      }
      // Handle objects
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    });
    worksheet.addRow(rowData);
  });
  
  // Auto-fit columns
  worksheet.columns = headers.map(() => ({ width: 20 }));
  
  // Save to file
  await workbook.xlsx.writeFile('/tmp/test-export.xlsx');
  console.log('Excel file created at /tmp/test-export.xlsx');
  
  const fs = require('fs');
  const stats = fs.statSync('/tmp/test-export.xlsx');
  console.log(`File size: ${stats.size} bytes`);
  console.log('Test completed successfully!');
}

testFormatExport().catch(console.error);