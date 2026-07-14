export interface RowProcessStatus {
  rowNumber: number;
  clientName: string;
  mobileNumber: string | null;
  policyTypeName: string;
  vehicleNumber: string | null;
  policyNumber: string | null;
  endDate: string;
  premiumPrice: number | null;
  referenceNote: string | null;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
  reason: string | null;
}

export interface BulkImportResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  createdClients: number;
  matchedClients: number;
  createdPolicies: number;
  createdPolicyTypes: number;
  rowStatuses: RowProcessStatus[];
}

export interface BulkImportError {
  code: string;
  message: string;
  details?: string[];
}

export interface BulkImportResponse {
  success: boolean;
  data?: BulkImportResult;
  error?: BulkImportError;
}

export interface ImportState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  result: BulkImportResult | null;
  errorDetails: string[];
}
