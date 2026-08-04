export interface RowProcessStatus {
  rowNumber: number;
  clientName: string;
  mobileNumber: string | null;
  referenceName?: string | null;
  associate: string | null;
  agentName?: string | null;
  agentPhone?: string | null;
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

/**
 * Page phases for the bulk import flow:
 *  upload    → user picks a file
 *  previewing → preview API call in-flight
 *  preview   → dry-run results shown; user decides to confirm or cancel
 *  confirming → actual import API call in-flight
 *  committed → final results shown
 *  error     → unrecoverable upload/parse error
 */
export type ImportPhase =
  | 'upload'
  | 'previewing'
  | 'preview'
  | 'confirming'
  | 'committed'
  | 'error';

export interface ImportState {
  phase: ImportPhase;
  previewResult: BulkImportResult | null;
  commitResult: BulkImportResult | null;
  errorDetails: string[];
}
