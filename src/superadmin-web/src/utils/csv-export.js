/**
 * Simple client-side CSV export utility
 * Converts an array of objects to a downloadable CSV file
 */

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(rows, filename = 'export.csv') {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) =>
      headers.map((h) => escapeCsv(row[h])).join(',')
    ),
  ];

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
