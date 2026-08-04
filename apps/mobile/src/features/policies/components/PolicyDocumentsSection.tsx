import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Calendar,
  Plus,
  X,
  FileCheck,
  ExternalLink,
  Search,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '@components/ui/Button.js';
import Input from '@components/ui/Input.js';
import Badge from '@components/ui/Badge.js';
import Dialog from '@components/ui/Dialog.js';
import AlertDialog from '@components/ui/AlertDialog.js';
import {
  useInfinitePolicyDocumentsQuery,
  useUploadPolicyDocumentsMutation,
  useDeletePolicyDocumentMutation,
} from '../hooks/usePolicyDocuments.js';
import type { PolicyDocument } from '@repo/types';

interface PolicyDocumentsSectionProps {
  policyId: string;
  defaultYear?: number;
}

interface BatchFileItem {
  id: string;
  file: File;
  year: string;
  error?: string | undefined;
}

export function PolicyDocumentsSection({ policyId, defaultYear }: PolicyDocumentsSectionProps) {
  const currentYear = new Date().getFullYear();
  const initialYear = defaultYear || currentYear;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query to optimize API request frequency
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePolicyDocumentsQuery(policyId, debouncedSearch, 10);

  const uploadMutation = useUploadPolicyDocumentsMutation();
  const deleteMutation = useDeletePolicyDocumentMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [docToDelete, setDocToDelete] = useState<PolicyDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Flatten paginated document pages
  const rawDocuments: PolicyDocument[] = data?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = data?.pages[0]?.meta.total ?? rawDocuments.length;

  // Extra instant client-side filter for maximum responsiveness while typing
  const searchLower = search.trim().toLowerCase();
  const documents = searchLower
    ? rawDocuments.filter(
      (doc) =>
        doc.year.toString().includes(searchLower) ||
        doc.fileName.toLowerCase().includes(searchLower),
    )
    : rawDocuments;

  // Infinite Scroll Trigger on Card Viewport
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !hasNextPage || isFetchingNextPage) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 60) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const validPdfs = filesArray.filter(
        (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
      );

      if (validPdfs.length < filesArray.length) {
        toast.warning('Only PDF files are allowed. Non-PDF files were ignored.');
      }

      if (validPdfs.length === 0) return;

      const newBatchItems: BatchFileItem[] = validPdfs.map((file, index) => {
        const calculatedYear = initialYear - (batchItems.length + index);
        const yearVal = calculatedYear >= 1990 ? String(calculatedYear) : String(initialYear);
        return {
          id: `${file.name}-${Date.now()}-${index}`,
          file,
          year: yearVal,
        };
      });

      setBatchItems((prev) => [...prev, ...newBatchItems]);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const updateItemYear = (id: string, yearVal: string) => {
    setBatchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, year: yearVal, error: undefined } : item)),
    );
  };

  const removeFileFromBatch = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadSubmit = async () => {
    if (batchItems.length === 0) {
      toast.error('Please select at least one policy PDF file.');
      return;
    }

    let hasValidationError = false;
    const validatedItems = batchItems.map((item) => {
      const yrNum = Number(item.year);
      if (!item.year || isNaN(yrNum) || yrNum < 1990 || yrNum > 2100) {
        hasValidationError = true;
        return { ...item, error: 'Required (e.g. 2025)' };
      }
      return { ...item, error: undefined };
    });


    if (hasValidationError) {
      setBatchItems(validatedItems);
      toast.error('Please specify a valid policy year for all selected files.');
      return;
    }

    try {
      setIsUploading(true);
      const processedDocs = await Promise.all(
        batchItems.map(async (item) => {
          const fileData = await fileToBase64(item.file);
          return {
            year: Number(item.year),
            fileName: item.file.name,
            fileData,
            fileSize: item.file.size,
            mimeType: item.file.type || 'application/pdf',
          };
        }),
      );

      await uploadMutation.mutateAsync({
        policyId,
        documents: processedDocs,
      });

      toast.success(`Successfully uploaded ${batchItems.length} policy document(s) across years`);
      setBatchItems([]);
      setIsModalOpen(false);
    } catch {
      // Global error handler in App.tsx automatically displays single error toast
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!docToDelete) return;
    try {
      await deleteMutation.mutateAsync({
        policyId,
        docId: docToDelete.id,
      });
      toast.success(`Deleted ${docToDelete.fileName}`);
      setDocToDelete(null);
    } catch {
      // Global error handler in App.tsx automatically displays single error toast
    }
  };

  return (
    <div className="space-y-4 bg-surface border border-line p-5 sm:p-6 lg:p-7 rounded-[20px] sm:rounded-[24px] shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left w-full">
      {/* Header: Title + Responsive Search & Upload Action */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/45 text-sky-600 dark:text-sky-400 border border-sky-200/40 shrink-0">
            <FileText size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-ink leading-none">Policy Documents (Yearly PDFs)</h3>
            <p className="text-[10px] text-ink-faint mt-1">
              Categorized by policy year ({totalCount} {totalCount === 1 ? 'file' : 'files'}, 10 per batch)
            </p>
          </div>
        </div>

        {/* Responsive header controls that adapt to sidebar expansion */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
          <div className="relative w-full sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Filter year or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8.5 w-full pl-7 pr-7 text-[11px] font-medium bg-paper/70 border border-line rounded-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-sky-500/50 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setBatchItems([]);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/10 active:scale-95 transition-all rounded-lg shrink-0 h-8.5 px-3.5 w-full sm:w-auto"
          >
            <Upload size={13} />
            <span>Upload PDFs</span>
          </Button>
        </div>
      </div>

      {/* Bounded Scroll Viewport with Infinite Scroll (max-h-[480px]) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="max-h-[480px] overflow-y-auto pr-1 space-y-3 custom-scrollbar rounded-xl"
      >
        {isLoading ? (
          <div className="py-8 text-center text-xs text-ink-faint flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-sky-500" />
            <span>Loading policy documents...</span>
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-xs text-rose-500">Failed to load policy documents.</div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-line rounded-2xl p-5 bg-paper/30">
            <FileText size={28} className="mx-auto text-ink-faint mb-2 opacity-40" />
            <p className="text-xs font-semibold text-ink-soft">
              {search ? `No documents matching "${search}"` : 'No policy documents uploaded yet'}
            </p>
            <p className="text-[11px] text-ink-faint mt-1 max-w-md mx-auto">
              {search
                ? 'Try filtering by a different year (e.g. 2025, 2026) or clear the search query.'
                : 'Upload policy PDFs for multiple years (2024, 2025, 2026...) in one step for instant access.'}
            </p>
            {search ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 text-xs font-bold px-3 py-1"
                onClick={() => setSearch('')}
              >
                Clear Filter
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3 text-xs font-bold px-3.5"
                onClick={() => {
                  setBatchItems([]);
                  setIsModalOpen(true);
                }}
              >
                <Plus size={14} className="mr-1" /> Add Documents
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Unified Responsive Grid (1 col on narrow content area, 2 cols on lg, 3 cols on xl) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-0.5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col justify-between gap-3 p-3.5 rounded-xl border border-line bg-paper/60 hover:bg-paper hover:border-sky-500/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-line/60">
                    <Badge tone="reminded" className="text-[11px] font-bold tracking-wide px-2.5 py-0.5">
                      <Calendar size={11} className="mr-1 inline text-sky-600 dark:text-sky-400" />
                      Year {doc.year}
                    </Badge>
                    <span className="text-[11px] font-semibold text-ink-faint">
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'PDF'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 min-w-0 my-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 border border-rose-200/40 shrink-0">
                      <FileCheck size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-bold text-ink truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </p>
                      <p className="text-[10px] text-ink-faint mt-0.5">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/60">
                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-ink-soft hover:text-sky-600 hover:border-sky-500/40 hover:bg-sky-50 dark:hover:bg-sky-950/45 transition-all"
                        title="View / Download PDF"
                      >
                        <ExternalLink size={13} />
                        <span>View PDF</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setDocToDelete(doc)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-ink-soft hover:text-rose-600 hover:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-950/45 transition-all"
                      title="Delete Document"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite Scroll Loading Indicator */}
            {isFetchingNextPage && (
              <div className="py-3 text-center text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading next 10 documents...</span>
              </div>
            )}

            {/* Load More fallback button */}
            {hasNextPage && !isFetchingNextPage && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => void fetchNextPage()}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline py-1"
                >
                  Load next 10 documents
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Multi-File Multi-Year Upload Modal Dialog */}
      <Dialog
        open={isModalOpen}
        onClose={() => {
          if (!isUploading) setIsModalOpen(false);
        }}
        title="Upload Multi-Year Policy PDFs"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-xs font-bold text-ink mb-1.5 block">
              Select PDF Documents for Different Years
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center p-5 border-2 border-dashed border-line-strong rounded-xl hover:bg-paper/50 transition-all cursor-pointer group"
            >
              <Upload size={24} className="text-sky-600 dark:text-sky-400 mb-1.5 group-hover:scale-110 transition-transform" />
              <p className="text-xs font-bold text-ink">Click to select PDF files</p>
              <p className="text-[11px] text-ink-faint mt-0.5">
                Select multiple policy PDF files at once
              </p>
            </button>
          </div>

          {batchItems.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-ink">
                  Selected Documents & Tagged Years ({batchItems.length})
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-sky-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Add more files
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {batchItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-line bg-paper flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileCheck size={16} className="text-rose-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-ink-faint mt-0.5">
                          {(item.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <div className="w-32">
                        <Input
                          type="number"
                          required
                          placeholder="Year (2025)"
                          value={item.year}
                          onChange={(e) => updateItemYear(item.id, e.target.value)}
                          error={item.error}
                          containerClassName="gap-0"
                          className="h-9 text-xs font-bold text-center"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFileFromBatch(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-faint hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/45 transition-colors"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isUploading}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              loading={isUploading}
              disabled={batchItems.length === 0 || isUploading}
              onClick={() => {
                void handleUploadSubmit();
              }}
            >
              Upload ({batchItems.length})
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        title="Delete Document"
        description={`Are you sure you want to delete "${docToDelete?.fileName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
