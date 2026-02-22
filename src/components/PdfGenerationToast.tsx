import React from "react";
import { X, FileText, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

export type PdfJobStatus = "generating" | "completed" | "failed" | "timeout";

export interface PdfGenerationToastProps {
  status: PdfJobStatus;
  attendeeCount: number;
  pdfUrl?: string;
  errorMessage?: string;
  onDismiss: () => void;
}

export function PdfGenerationToast({
  status,
  attendeeCount,
  pdfUrl,
  errorMessage,
  onDismiss,
}: PdfGenerationToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 min-w-48 max-w-xs rounded-lg border border-border bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">PDF Export</span>
        </div>
        {status !== "generating" && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-3">
        {status === "generating" && (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-foreground whitespace-nowrap">Generating PDF&hellip;</p>
              <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                {attendeeCount} attendee{attendeeCount === 1 ? "" : "s"} &mdash; you can keep working
              </p>
            </div>
          </div>
        )}

        {status === "completed" && (() => {
          const trimmedUrl = pdfUrl ? pdfUrl.trim() : '';
          const isSafeUrl = trimmedUrl && (trimmedUrl.toLowerCase().startsWith('https://') || trimmedUrl.toLowerCase().startsWith('http://'));
          if (isSafeUrl) {
            return (
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-foreground whitespace-nowrap">PDF ready &mdash; {attendeeCount} attendee{attendeeCount === 1 ? "" : "s"}</p>
                  <a
                    href={trimmedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-primary hover:underline whitespace-nowrap"
                  >
                    Open PDF <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-foreground whitespace-nowrap">PDF not available</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {attendeeCount} attendee{attendeeCount === 1 ? "" : "s"} processed but the download link is unavailable.
                </p>
              </div>
            </div>
          );
        })()}

        {status === "failed" && (
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground whitespace-nowrap">Export failed</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-48 break-words">
                {errorMessage || "PDF generation failed. Please try again."}
              </p>
            </div>
          </div>
        )}

        {status === "timeout" && (
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-foreground whitespace-nowrap">Export timed out</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-48">
                Taking longer than expected. Please try again.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
