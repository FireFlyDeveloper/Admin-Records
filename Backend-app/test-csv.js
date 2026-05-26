// Simple test for CSV format
function testCSVExport(data) {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// Test data
const testData = [
  { id: 1, name: 'Test Item 1', date: '2024-01-15T10:30:00', quantity: 5, active: true },
  { id: 2, name: 'Test Item 2, with comma', date: '2024-01-16T14:45:00', quantity: 3, active: false },
  { id: 3, name: 'Test Item 3 with "quotes"', date: '2024-01-17T09:15:00', quantity: 10, active: true }
];

console.log('Testing CSV export:');
console.log('===================');
const csv = testCSVExport(testData);
console.log(csv);
console.log('\nCSV length:', csv.length, 'characters');

// Test empty data
console.log('\nTesting empty data:');
console.log(testCSVExport([]) || '(empty string)');