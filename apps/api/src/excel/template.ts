import * as XLSX from 'xlsx';

const HEADERS = [
  'CLIENT NAME',
  'MOBILE NUMBER',
  'ASSOCIATE',
  'POLICY TYPE',
  'VEHICLE NUMBER',
  'POLICY NUMBER',
  'END DATE',
  'PREMIUM PRICE',
  'REFERENCE NOTE',
];

const EXAMPLE_ROW = [
  'Example Client Name',
  '9876543210',
  'Example Associate Name',
  'Motor',
  'TN34W3128',
  'POL123456789',
  '31/03/2026',
  '15000',
  'Sample reference note',
];

const COL_WIDTHS = [30, 18, 25, 18, 18, 28, 14, 16, 30];

export function generateTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, EXAMPLE_ROW]);
  ws['!cols'] = COL_WIDTHS.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function generateReportExcel(rowStatuses: any[]): Buffer {
  const headers = [
    'Row Number',
    'Client Name',
    'Mobile Number',
    'Associate',
    'Policy Type',
    'Vehicle Number',
    'Policy Number',
    'End Date',
    'Premium Price',
    'Reference Note',
    'Import Status',
    'Details / Error Reason',
  ];

  const rows = rowStatuses.map((row) => [
    row.rowNumber,
    row.clientName || '',
    row.mobileNumber || '',
    row.associate || '',
    row.policyTypeName || '',
    row.vehicleNumber || '',
    row.policyNumber || '',
    row.endDate || '',
    row.premiumPrice !== null ? row.premiumPrice : '',
    row.referenceNote || '',
    row.status,
    row.reason || '',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const widths = [12, 25, 18, 25, 16, 18, 22, 14, 16, 25, 15, 65];
  ws['!cols'] = widths.map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Import Report');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
