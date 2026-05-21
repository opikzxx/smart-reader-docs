import * as XLSX from 'xlsx';
import type { Document } from './documents/types';

const SEPARATOR = ';';

/**
 * Escapes a CSV field value for semicolon-delimited format.
 */
export function escapeCsvField(field: string): string {
  if (
    field.includes(SEPARATOR) ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r')
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatAmount(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return value.toFixed(2);
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return timestamp;
  }
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getFileName(ext: string): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const hh = String(today.getHours()).padStart(2, '0');
  const min = String(today.getMinutes()).padStart(2, '0');
  return `smart-doc-export-${yyyy}${mm}${dd}-${hh}${min}.${ext}`;
}

function buildRows(documents: Document[]) {
  return documents.map((doc, index) => ({
    No: index + 1,
    'File Name': doc.file_name,
    'Vendor Name': doc.vendor_name ?? '-',
    'Document Date': doc.date ?? '-',
    'Total Amount': doc.total ?? 0,
    Currency: doc.currency ?? '-',
    Status: formatStatus(doc.status),
    'Items Count': doc.items?.length ?? 0,
    'Uploaded At': formatTimestamp(doc.created_at),
  }));
}

/**
 * Generates a semicolon-delimited CSV and triggers download.
 */
export function generateCsvContent(documents: Document[]): string {
  const sepHint = `sep=${SEPARATOR}`;

  const header = [
    'No',
    'File Name',
    'Vendor Name',
    'Document Date',
    'Total Amount',
    'Currency',
    'Status',
    'Items Count',
    'Uploaded At',
  ].join(SEPARATOR);

  const rows = documents.map((doc, index) => {
    return [
      String(index + 1),
      escapeCsvField(doc.file_name),
      escapeCsvField(doc.vendor_name ?? '-'),
      doc.date ?? '-',
      formatAmount(doc.total),
      doc.currency ?? '-',
      formatStatus(doc.status),
      String(doc.items?.length ?? 0),
      formatTimestamp(doc.created_at),
    ].join(SEPARATOR);
  });

  return [sepHint, header, ...rows].join('\n');
}

export function generateCsv(documents: Document[]): void {
  const csvContent = generateCsvContent(documents);
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = getFileName('csv');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an XLSX file with proper column widths and formatting, then triggers download.
 */
export function generateXlsx(documents: Document[]): void {
  const rows = buildRows(documents);

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 4 },   // No
    { wch: 35 },  // File Name
    { wch: 25 },  // Vendor Name
    { wch: 14 },  // Document Date
    { wch: 15 },  // Total Amount
    { wch: 10 },  // Currency
    { wch: 12 },  // Status
    { wch: 12 },  // Items Count
    { wch: 18 },  // Uploaded At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');

  // Generate buffer and download
  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = getFileName('xlsx');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
