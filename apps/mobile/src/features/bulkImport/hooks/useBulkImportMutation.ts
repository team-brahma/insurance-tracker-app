import { useMutation } from '@tanstack/react-query';
import { bulkImportService } from '../services/BulkImportService.js';

export const bulkImportKeys = {
  all: ['bulkImport'] as const,
};

export function useUploadFileMutation() {
  return useMutation({
    mutationFn: (file: File) => bulkImportService.uploadFile(file),
  });
}
