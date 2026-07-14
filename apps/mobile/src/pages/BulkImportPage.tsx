import { useRef, useState, type DragEvent } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShellPage from '@components/layout/AppShellPage.js';
import Button from '@components/ui/Button.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import { useUploadFileMutation, bulkImportService } from '@features/bulkImport/index.js';
import type { BulkImportResult } from '@features/bulkImport/types/index.js';
import { cn } from '@utils/Cn.js';

type PageState = 'idle' | 'uploading' | 'success' | 'error';

export default function BulkImportPage() {
  const [pageState, setPageState] = useState<PageState>('idle');
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadFileMutation();

  function handleDownloadTemplate() {
    const toastId = toast.loading('Downloading template...');
    bulkImportService
      .downloadTemplate()
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import-template.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Template downloaded successfully', { id: toastId });
      })
      .catch(() => {
        toast.error('Failed to download template', { id: toastId });
      });
  }

  function handleFileSelected(file: File | undefined) {
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select a .xlsx or .xls file');
      return;
    }

    setPageState('uploading');
    setImportResult(null);
    setErrorDetails([]);

    uploadMutation.mutate(file, {
      onSuccess: (response) => {
        if (response.success && response.data) {
          setImportResult(response.data);
          setPageState('success');
          if (response.data.failedCount > 0) {
            toast.warning(`Import completed with ${String(response.data.failedCount)} failures`);
          } else {
            toast.success(`Successfully imported ${String(response.data.successCount)} policies`);
          }
        } else if (response.error) {
          setErrorDetails(response.error.details ?? [response.error.message]);
          setPageState('error');
          toast.error(response.error.message);
        }
      },
      onError: (err) => {
        const axiosError = err as {
          response?: { data?: { error?: { details?: string[]; message?: string } } };
          message?: string;
        };
        const serverError = axiosError.response?.data?.error;
        if (serverError?.details) {
          setErrorDetails(serverError.details);
        } else {
          setErrorDetails([serverError?.message ?? axiosError.message ?? 'Upload failed']);
        }
        setPageState('error');
      },
    });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelected(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function resetUpload() {
    setPageState('idle');
    setImportResult(null);
    setErrorDetails([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function downloadImportReport(result: BulkImportResult) {
    const toastId = toast.loading('Generating Excel report...');
    bulkImportService
      .exportReport(result.rowStatuses)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded successfully', { id: toastId });
      })
      .catch(() => {
        toast.error('Failed to generate Excel report', { id: toastId });
      });
  }

  return (
    <AppShellPage
      icon={Upload}
      title="Bulk Import"
      subtitle="Import multiple clients and insurance policies at once using an Excel spreadsheet."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5 font-bold shadow-sm"
          onClick={handleDownloadTemplate}
          leftIcon={<Download size={15} />}
        >
          Download Template
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Download Template (mobile) */}
        <div className="md:hidden">
          <Button
            variant="primary"
            size="md"
            className="w-full font-bold"
            onClick={handleDownloadTemplate}
            leftIcon={<Download size={15} />}
          >
            Download Excel Template
          </Button>
        </div>

        {/* Upload Zone */}
        {pageState === 'idle' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                handleFileSelected(e.target.files?.[0]);
              }}
            />

            <div
              role="button"
              tabIndex={0}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => {
                fileInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all text-center select-none focus:outline-none focus:ring-2 focus:ring-slate/30',
                dragOver
                  ? 'border-slate bg-slate/5 dark:bg-slate/10 shadow-lg'
                  : 'border-line-strong/30 hover:border-slate/50 hover:bg-paper/40',
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate/10 dark:bg-slate/20">
                <FileSpreadsheet size={32} className="text-slate" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">Click to upload or drag and drop</p>
                <p className="text-xs text-ink-faint mt-1">.xlsx or .xls files only</p>
              </div>
              <Button variant="primary" size="sm" leftIcon={<Upload size={14} />}>
                Select File
              </Button>
            </div>
          </>
        )}

        {/* Uploading State */}
        {pageState === 'uploading' && (
          <SurfaceCard className="p-8 text-center border border-line">
            <Loader2 size={36} className="mx-auto animate-spin text-slate mb-4" />
            <p className="text-sm font-bold text-ink">Importing your data...</p>
            <p className="text-xs text-ink-faint mt-1">
              Processing rows and creating records. This may take a moment.
            </p>
          </SurfaceCard>
        )}

        {/* Success / Partial Success State */}
        {pageState === 'success' && importResult && (
          <SurfaceCard
            className={cn(
              'p-8 border',
              importResult.failedCount > 0
                ? 'border-amber-edge/20 bg-amber-bg/5 dark:bg-amber-bg/10'
                : 'border-green-edge/20 bg-green-bg/5 dark:bg-green-bg/10',
            )}
          >
            {importResult.failedCount > 0 ? (
              <AlertTriangle size={36} className="mx-auto text-amber-500 mb-4" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 size={36} className="mx-auto text-green-500 mb-4" strokeWidth={1.5} />
            )}
            <p className="text-sm font-bold text-ink text-center">
              {importResult.failedCount > 0
                ? 'Import Completed with Failures'
                : 'Import Completed Successfully'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <StatCard label="Total Rows" value={importResult.totalRows} tone="neutral" />
              <StatCard label="Created" value={importResult.successCount} tone="green" />
              <StatCard label="Skipped" value={importResult.duplicateCount} tone="amber" />
              <StatCard
                label="Failed"
                value={importResult.failedCount}
                tone={importResult.failedCount > 0 ? 'red' : 'neutral'}
              />
            </div>
            <p className="text-[10px] text-ink-faint text-center mt-3.5 font-bold uppercase tracking-wide">
              Clients: {importResult.createdClients} created, {importResult.matchedClients} matched
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto font-bold flex items-center gap-1.5 shadow-sm"
                onClick={() => {
                  downloadImportReport(importResult);
                }}
                leftIcon={<Download size={14} />}
              >
                Download Import Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto font-bold"
                onClick={resetUpload}
              >
                Import Another File
              </Button>
            </div>

            {importResult.failedCount > 0 && (
              <div className="mt-6 border-t border-line/40 pt-6">
                <h4 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Failed Rows Details ({importResult.failedCount})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {importResult.rowStatuses
                    .filter((row) => row.status === 'FAILED')
                    .map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 rounded-xl border border-red-edge/10 bg-red-bg/5 dark:bg-red-bg/10 p-3 text-left"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                          <XCircle size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-ink">
                            Row {err.rowNumber}: {err.clientName || 'Unknown Client'}{' '}
                            {err.policyNumber ? `(Policy: ${err.policyNumber})` : ''}
                          </p>
                          <p className="text-[11px] text-ink-faint mt-0.5 leading-normal">
                            {err.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </SurfaceCard>
        )}

        {/* Error State */}
        {pageState === 'error' && (
          <SurfaceCard className="p-8 border border-red-edge/20 bg-red-bg/10">
            <div className="flex flex-col items-center text-center">
              {errorDetails.length > 0 ? (
                <AlertTriangle size={36} className="text-amber-500 mb-4" strokeWidth={1.5} />
              ) : (
                <XCircle size={36} className="text-red-500 mb-4" strokeWidth={1.5} />
              )}
              <p className="text-sm font-bold text-ink">Import Failed</p>
              <p className="text-xs text-ink-faint mt-1 mb-4">
                No data was imported. Fix the errors below and try again.
              </p>
            </div>

            {errorDetails.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-1.5 mt-2">
                {errorDetails.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-red-bg/30 dark:bg-red-bg/10 p-2.5 text-left"
                  >
                    <XCircle size={12} className="mt-0.5 shrink-0 text-red-500" />
                    <span className="text-[11px] font-semibold text-red-fg leading-tight">
                      {err}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center mt-6">
              <Button variant="outline" size="sm" onClick={resetUpload}>
                Try Again
              </Button>
            </div>
          </SurfaceCard>
        )}
      </div>
    </AppShellPage>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'green' | 'amber' | 'red';
}) {
  const valueClass = {
    neutral: 'text-ink',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  }[tone];

  return (
    <div className="rounded-xl border border-line/40 bg-surface/60 p-4 text-center">
      <p className={cn('text-2xl font-black leading-none', valueClass)}>{value}</p>
      <p className="text-[10px] font-bold text-ink-faint mt-1.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}
