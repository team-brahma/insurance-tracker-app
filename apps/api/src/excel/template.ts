import * as XLSX from 'xlsx';

const HEADERS = [
  'INSURED NAME',
  'MOBILE NUMBER',
  'ASSOCIATE NAME',
  'OUTSOURCE AGENT NAME',
  'OUTSOURCE AGENT MOBILE',
  'POLICY TYPE',
  'VEHICLE NUMBER',
  'POLICY NUMBER',
  'END DATE',
  'PREMIUM PRICE',
  'REFERENCE NOTE',
];

const EXAMPLE_ROW = [
  'MOHAN TEX',
  '9750931356',
  'DEEPESH JAIN',
  'SURESH AGENT',
  '9842100000',
  'FIRE',
  '',
  '4095/404493204/00/000',
  '19/08/2026',
  '15000',
  'Sample reference note',
];

const COL_WIDTHS = [30, 18, 25, 25, 28, 18, 18, 28, 14, 16, 30];

export function generateTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, EXAMPLE_ROW]);
  ws['!cols'] = COL_WIDTHS.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function generateReportExcel(
  rowStatuses: {
    rowNumber: number;
    clientName: string | null;
    mobileNumber: string | null;
    associate: string | null;
    agentName?: string | null;
    agentPhone?: string | null;
    policyTypeName: string;
    vehicleNumber: string | null;
    policyNumber: string | null;
    endDate: string;
    premiumPrice: number | null;
    referenceNote: string | null;
    status: string;
    reason: string | null;
  }[],
): Buffer {
  const headers = [
    'Row Number',
    'Insured Name',
    'Mobile Number',
    'Associate Name',
    'Outsource Agent Name',
    'Outsource Agent Mobile',
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
    row.clientName ?? '',
    row.mobileNumber ?? '',
    row.associate ?? '',
    row.agentName ?? '',
    row.agentPhone ?? '',
    row.policyTypeName,
    row.vehicleNumber ?? '',
    row.policyNumber ?? '',
    row.endDate,
    row.premiumPrice ?? '',
    row.referenceNote ?? '',
    row.status,
    row.reason ?? '',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const widths = [12, 25, 18, 25, 22, 22, 16, 18, 22, 14, 16, 25, 15, 65];
  ws['!cols'] = widths.map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Import Report');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
