import { useRef, useState, type DragEvent } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Eye,
  Database,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShellPage from '@components/layout/AppShellPage.js';
import Button from '@components/ui/Button.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import {
  usePreviewFileMutation,
  useUploadFileMutation,
  bulkImportService,
} from '@features/bulkImport/index.js';
import type { BulkImportResult, ImportPhase } from '@features/bulkImport/types/index.js';
import { cn } from '@utils/Cn.js';

export default function BulkImportPage() {
  const [phase, setPhase] = useState<ImportPhase>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<BulkImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<BulkImportResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewMutation = usePreviewFileMutation();
  const uploadMutation = useUploadFileMutation();

  // ─── Template download ─────────────────────────────────────────────────────
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

  // ─── Step 1: File picked → run preview (dry-run) ──────────────────────────
  function handleFileSelected(file: File | undefined) {
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select a .xlsx or .xls file');
      return;
    }

    setSelectedFile(file);
    setPhase('previewing');
    setPreviewResult(null);
    setCommitResult(null);
    setErrorDetails([]);

    previewMutation.mutate(file, {
      onSuccess: (response) => {
        if (response.success && response.data) {
          setPreviewResult(response.data);
          setPhase('preview');
        } else if (response.error) {
          setErrorDetails(response.error.details ?? [response.error.message]);
          setPhase('error');
          toast.error(response.error.message);
        }
      },
      onError: (err) => {
        const axiosError = err as {
          response?: { data?: { error?: { details?: string[]; message?: string } } };
          message?: string;
        };
        const serverError = axiosError.response?.data?.error;
        setErrorDetails(
          serverError?.details ?? [serverError?.message ?? axiosError.message ?? 'Preview failed'],
        );
        setPhase('error');
      },
    });
  }

  // ─── Step 2: User confirms → run actual import ────────────────────────────
  function handleConfirmImport() {
    if (!selectedFile) return;

    setPhase('confirming');

    uploadMutation.mutate(selectedFile, {
      onSuccess: (response) => {
        if (response.success && response.data) {
          setCommitResult(response.data);
          setPhase('committed');
          if (response.data.failedCount > 0) {
            toast.warning(
              `Import completed with ${String(response.data.failedCount)} row(s) failed`,
            );
          } else {
            toast.success(
              `Successfully imported ${String(response.data.successCount)} polic${response.data.successCount === 1 ? 'y' : 'ies'}`,
            );
          }
        } else if (response.error) {
          setErrorDetails(response.error.details ?? [response.error.message]);
          setPhase('error');
          toast.error(response.error.message);
        }
      },
      onError: (err) => {
        const axiosError = err as {
          response?: { data?: { error?: { details?: string[]; message?: string } } };
          message?: string;
        };
        const serverError = axiosError.response?.data?.error;
        setErrorDetails(
          serverError?.details ?? [serverError?.message ?? axiosError.message ?? 'Import failed'],
        );
        setPhase('error');
      },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function resetToUpload() {
    setPhase('upload');
    setSelectedFile(null);
    setPreviewResult(null);
    setCommitResult(null);
    setErrorDetails([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFileSelected(e.dataTransfer.files[0]);
  }

  function downloadReport(result: BulkImportResult, label: string) {
    const toastId = toast.loading('Generating Excel report...');
    bulkImportService
      .exportReport(result.rowStatuses)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded', { id: toastId });
      })
      .catch(() => toast.error('Failed to generate report', { id: toastId }));
  }

  // ─── Render ────────────────────────────────────────────────────────────────
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
        {/* Download Template (mobile-only) */}
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

        {/* ── Phase: upload ── */}
        {phase === 'upload' && (
          <>
            <input
              ref={fileInputRef}
              id="bulk-import-file-input"
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
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
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

            {/* How-it-works hint */}
            <div className="rounded-xl border border-line/40 bg-surface/50 px-5 py-4 space-y-2">
              <p className="text-xs font-bold text-ink uppercase tracking-wide">How it works</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-ink-faint leading-relaxed">
                <li>Select your Excel file — a preview runs instantly (nothing is saved yet)</li>
                <li>Review the results: see which rows will succeed, skip, or fail</li>
                <li>Fix any issues in your file and re-upload, or confirm to commit to the database</li>
              </ol>
            </div>
          </>
        )}

        {/* ── Phase: previewing (dry-run in-flight) ── */}
        {phase === 'previewing' && (
          <SurfaceCard className="p-8 text-center border border-line">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate/10 dark:bg-slate/20 mx-auto mb-4">
              <Eye size={28} className="text-slate" strokeWidth={1.5} />
            </div>
            <Loader2 size={24} className="mx-auto animate-spin text-slate mb-3" />
            <p className="text-sm font-bold text-ink">Analysing your file…</p>
            <p className="text-xs text-ink-faint mt-1">
              Validating all rows — nothing is saved to the database yet.
            </p>
          </SurfaceCard>
        )}

        {/* ── Phase: preview (dry-run results) ── */}
        {phase === 'preview' && previewResult && (
          <PreviewResultCard
            result={previewResult}
            fileName={selectedFile?.name ?? 'file'}
            onConfirm={handleConfirmImport}
            onCancel={resetToUpload}
            onDownloadReport={() => downloadReport(previewResult, 'preview_report')}
          />
        )}

        {/* ── Phase: confirming (real import in-flight) ── */}
        {phase === 'confirming' && (
          <SurfaceCard className="p-8 text-center border border-line">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate/10 dark:bg-slate/20 mx-auto mb-4">
              <Database size={28} className="text-slate" strokeWidth={1.5} />
            </div>
            <Loader2 size={24} className="mx-auto animate-spin text-slate mb-3" />
            <p className="text-sm font-bold text-ink">Saving to database…</p>
            <p className="text-xs text-ink-faint mt-1">
              Creating client and policy records. Please wait.
            </p>
          </SurfaceCard>
        )}

        {/* ── Phase: committed (final results) ── */}
        {phase === 'committed' && commitResult && (
          <CommittedResultCard
            result={commitResult}
            onDownloadReport={() => downloadReport(commitResult, 'import_report')}
            onImportAnother={resetToUpload}
          />
        )}

        {/* ── Phase: error ── */}
        {phase === 'error' && (
          <SurfaceCard className="p-8 border border-red-edge/20 bg-red-bg/10">
            <div className="flex flex-col items-center text-center">
              <XCircle size={36} className="text-red-500 mb-4" strokeWidth={1.5} />
              <p className="text-sm font-bold text-ink">Upload Failed</p>
              <p className="text-xs text-ink-faint mt-1 mb-4">
                There was a problem reading the file. Fix the issues below and try again.
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
              <Button variant="outline" size="sm" onClick={resetToUpload} leftIcon={<RotateCcw size={13} />}>
                Try Again
              </Button>
            </div>
          </SurfaceCard>
        )}
      </div>
    </AppShellPage>
  );
}

// ─── Preview result card ───────────────────────────────────────────────────────

function PreviewResultCard({
  result,
  fileName,
  onConfirm,
  onCancel,
  onDownloadReport,
}: {
  result: BulkImportResult;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  onDownloadReport: () => void;
}) {
  const hasFailures = result.failedCount > 0;
  const allFailed = result.successCount === 0 && result.duplicateCount === 0;

  return (
    <SurfaceCard
      className={cn(
        'p-8 border',
        hasFailures
          ? 'border-amber-edge/20 bg-amber-bg/5 dark:bg-amber-bg/10'
          : 'border-slate/20 bg-surface/80',
      )}
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl mb-3',
            hasFailures ? 'bg-amber-500/10' : 'bg-slate/10 dark:bg-slate/20',
          )}
        >
          <Eye
            size={28}
            className={hasFailures ? 'text-amber-500' : 'text-slate'}
            strokeWidth={1.5}
          />
        </div>
        <p className="text-sm font-bold text-ink">Preview Results</p>
        <p className="text-xs text-ink-faint mt-1 max-w-xs">
          {hasFailures
            ? 'Some rows have issues. You can fix them and re-upload, or confirm to import only the valid rows.'
            : 'All rows look good! Confirm to save them to the database.'}
        </p>
        <p className="text-[10px] text-ink-faint mt-2 font-mono opacity-60 truncate max-w-full">
          {fileName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Rows" value={result.totalRows} tone="neutral" />
        <StatCard label="Will Succeed" value={result.successCount} tone="green" />
        <StatCard label="Will Skip" value={result.duplicateCount} tone="amber" />
        <StatCard label="Will Fail" value={result.failedCount} tone={hasFailures ? 'red' : 'neutral'} />
      </div>
      <p className="text-[10px] text-ink-faint text-center font-bold uppercase tracking-wide mb-6">
        Clients: {result.createdClients} to create · {result.matchedClients} to match
      </p>

      {/* Failure list */}
      {hasFailures && (
        <div className="border-t border-line/40 pt-5 mb-6">
          <h4 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" />
            Rows with issues ({result.failedCount})
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {result.rowStatuses
              .filter((r) => r.status === 'FAILED')
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
                      Row {err.rowNumber}: {err.clientName || 'Unknown'}{' '}
                      {err.policyNumber ? `(Policy: ${err.policyNumber})` : ''}
                    </p>
                    <p className="text-[11px] text-ink-faint mt-0.5 leading-normal">{err.reason}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Confirm button — disabled if everything fails */}
        {!allFailed && (
          <Button
            id="bulk-import-confirm-btn"
            variant="primary"
            size="sm"
            className="w-full sm:flex-1 font-bold shadow-sm"
            onClick={onConfirm}
            leftIcon={<ShieldCheck size={14} />}
          >
            {hasFailures
              ? `Confirm & Import ${String(result.successCount)} valid row${result.successCount === 1 ? '' : 's'}`
              : 'Confirm & Import All'}
          </Button>
        )}
        <Button
          id="bulk-import-report-btn"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto font-bold"
          onClick={onDownloadReport}
          leftIcon={<Download size={13} />}
        >
          Download Report
        </Button>
        <Button
          id="bulk-import-cancel-btn"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto font-bold"
          onClick={onCancel}
          leftIcon={<RotateCcw size={13} />}
        >
          {allFailed ? 'Fix & Re-upload' : 'Cancel & Re-upload'}
        </Button>
      </div>
    </SurfaceCard>
  );
}

// ─── Committed result card ─────────────────────────────────────────────────────

function CommittedResultCard({
  result,
  onDownloadReport,
  onImportAnother,
}: {
  result: BulkImportResult;
  onDownloadReport: () => void;
  onImportAnother: () => void;
}) {
  const hasFailures = result.failedCount > 0;

  return (
    <SurfaceCard
      className={cn(
        'p-8 border',
        hasFailures
          ? 'border-amber-edge/20 bg-amber-bg/5 dark:bg-amber-bg/10'
          : 'border-green-edge/20 bg-green-bg/5 dark:bg-green-bg/10',
      )}
    >
      <div className="flex flex-col items-center text-center mb-6">
        {hasFailures ? (
          <AlertTriangle size={36} className="text-amber-500 mb-3" strokeWidth={1.5} />
        ) : (
          <CheckCircle2 size={36} className="text-green-500 mb-3" strokeWidth={1.5} />
        )}
        <p className="text-sm font-bold text-ink">
          {hasFailures ? 'Import Completed with Failures' : 'Import Completed Successfully'}
        </p>
        <p className="text-xs text-ink-faint mt-1">
          {hasFailures
            ? 'The valid rows were saved. Download the report to review failures.'
            : 'All records have been saved to the database.'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Rows" value={result.totalRows} tone="neutral" />
        <StatCard label="Created" value={result.successCount} tone="green" />
        <StatCard label="Skipped" value={result.duplicateCount} tone="amber" />
        <StatCard label="Failed" value={result.failedCount} tone={hasFailures ? 'red' : 'neutral'} />
      </div>
      <p className="text-[10px] text-ink-faint text-center font-bold uppercase tracking-wide mb-6">
        Clients: {result.createdClients} created · {result.matchedClients} matched
      </p>

      {hasFailures && (
        <div className="border-t border-line/40 pt-5 mb-6">
          <h4 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" />
            Failed Rows ({result.failedCount})
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {result.rowStatuses
              .filter((r) => r.status === 'FAILED')
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
                      Row {err.rowNumber}: {err.clientName || 'Unknown'}{' '}
                      {err.policyNumber ? `(Policy: ${err.policyNumber})` : ''}
                    </p>
                    <p className="text-[11px] text-ink-faint mt-0.5 leading-normal">{err.reason}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          id="bulk-import-download-report-btn"
          variant="primary"
          size="sm"
          className="w-full sm:w-auto font-bold shadow-sm"
          onClick={onDownloadReport}
          leftIcon={<Download size={14} />}
        >
          Download Import Report
        </Button>
        <Button
          id="bulk-import-another-btn"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto font-bold"
          onClick={onImportAnother}
          leftIcon={<RotateCcw size={13} />}
        >
          Import Another File
        </Button>
      </div>
    </SurfaceCard>
  );
}

// ─── Shared stat card ──────────────────────────────────────────────────────────

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
