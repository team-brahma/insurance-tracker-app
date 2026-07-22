import { useMutation } from '@tanstack/react-query';
import { bulkImportService } from '../services/BulkImportService.js';

export const bulkImportKeys = {
  all: ['bulkImport'] as const,
};

/** Calls POST /bulk/preview — dry-run, no DB writes. */
export function usePreviewFileMutation() {
  return useMutation({
    mutationFn: (file: File) => bulkImportService.previewFile(file),
  });
}

/** Calls POST /bulk/import — commits rows to the DB. */
export function useUploadFileMutation() {
  return useMutation({
    mutationFn: (file: File) => bulkImportService.uploadFile(file),
  });
}
