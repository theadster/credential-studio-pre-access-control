import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Users,
  Calendar,
  FileDown,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface PdfJob {
  $id: string;
  $createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  pdfUrl?: string;
  error?: string;
  attendeeCount: number;
  attendeeNames?: string; // JSON-serialized string[] of up to 10 names
  requestedBy: string;
  eventSettingsId: string;
}

interface ExportsTabProps {
  eventSettingsId?: string;
}

function StatusBadge({ status }: { status: PdfJob['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700 gap-1.5">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700 gap-1.5">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case 'processing':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700 gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 gap-1.5">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

const COLOR_MAP = {
  purple: {
    card: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:border-purple-800/50',
    icon: 'bg-purple-500/20 dark:bg-purple-400/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    label: 'text-purple-700 dark:text-purple-300',
    value: 'text-purple-900 dark:text-purple-100',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/50 dark:border-emerald-800/50',
    icon: 'bg-emerald-500/20 dark:bg-emerald-400/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    label: 'text-emerald-700 dark:text-emerald-300',
    value: 'text-emerald-900 dark:text-emerald-100',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 dark:border-amber-800/50',
    icon: 'bg-amber-500/20 dark:bg-amber-400/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    label: 'text-amber-700 dark:text-amber-300',
    value: 'text-amber-900 dark:text-amber-100',
  },
  red: {
    card: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:from-red-950/50 dark:to-red-900/50 dark:border-red-800/50',
    icon: 'bg-red-500/20 dark:bg-red-400/20',
    iconColor: 'text-red-600 dark:text-red-400',
    label: 'text-red-700 dark:text-red-300',
    value: 'text-red-900 dark:text-red-100',
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  colorKey,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorKey: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[colorKey];
  return (
    <Card className={`${c.card} hover:shadow-lg transition-all duration-300 hover:scale-105`}>
      <CardContent className="flex items-center p-4">
        <div className={`p-3 rounded-lg ${c.icon}`}>
          <Icon className={`h-8 w-8 ${c.iconColor}`} />
        </div>
        <div className="ml-4">
          <p className={`text-sm font-medium ${c.label}`}>{label}</p>
          <p className={`text-4xl font-bold ${c.value}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function parseNames(attendeeNames?: string): string[] {
  if (!attendeeNames) return [];
  try {
    const parsed = JSON.parse(attendeeNames);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => typeof item === 'string');
  } catch {
    return [];
  }
}

function AttendeeNamesList({ job }: { job: PdfJob }) {
  const names = parseNames(job.attendeeNames);
  const overflow = job.attendeeCount - names.length;

  if (names.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1 items-center">
      {names.map((name, i) => (
        <span
          key={i}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border"
        >
          {name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground italic">
          +{overflow} more
        </span>
      )}
    </div>
  );
}

function JobRow({
  job,
  onDeleted,
}: {
  job: PdfJob;
  onDeleted: (id: string) => void;
}) {
  const createdAt = new Date(job.$createdAt);
  const isActive = job.status === 'pending' || job.status === 'processing';
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/pdf-jobs/delete?jobId=${encodeURIComponent(job.$id)}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted(job.$id);
      } else {
        let msg = 'Failed to delete export';
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          // response wasn't JSON — use default message
        }
        console.error(`Delete export failed (${res.status}):`, msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Network error while deleting export';
      console.error('Delete export error:', err);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors ${
        isActive ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
      }`}
    >
      {/* Status icon */}
      <div
        className={`flex-shrink-0 mt-0.5 p-2.5 rounded-lg ${
          job.status === 'completed'
            ? 'bg-emerald-100 dark:bg-emerald-900/40'
            : job.status === 'failed'
            ? 'bg-red-100 dark:bg-red-900/40'
            : job.status === 'processing'
            ? 'bg-blue-100 dark:bg-blue-900/40'
            : 'bg-amber-100 dark:bg-amber-900/40'
        }`}
      >
        {job.status === 'completed'  && <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        {job.status === 'failed'     && <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />}
        {job.status === 'processing' && <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />}
        {job.status === 'pending'    && <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">PDF Export</span>
          <StatusBadge status={job.status} />
        </div>
        <div className="flex items-center gap-4 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {job.attendeeCount} attendee{job.attendeeCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(createdAt, 'MMM d, yyyy')} at {format(createdAt, 'h:mm a')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </span>
        </div>
        <AttendeeNamesList job={job} />
        {job.status === 'failed' && job.error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 truncate max-w-md" title={job.error}>
            {job.error}
          </p>
        )}
        {isActive && (
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            {job.status === 'processing' ? 'Generating PDF — this may take a minute...' : 'Queued, starting soon...'}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
        {job.status === 'completed' && job.pdfUrl && (
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600"
            onClick={() => {
              const url = (job.pdfUrl ?? '').trim();
              const normalized = url.toLowerCase();
              if (!normalized.startsWith('https://') && !normalized.startsWith('http://')) return;
              const w = window.open(url, '_blank', 'noopener,noreferrer');
              if (w) w.opener = null;
            }}
          >
            <Download className="h-4 w-4" />
            Download
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Button>
        )}
        {job.status === 'failed' && (
          <Badge variant="outline" className="text-red-600 border-red-200 dark:text-red-400 dark:border-red-800">
            Export failed
          </Badge>
        )}
        {isActive && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            In progress
          </div>
        )}

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={deleting}
              aria-label="Delete export"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
            <AlertDialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
              <AlertDialogTitle className="text-xl font-bold text-destructive">
                Delete Export
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this export record. The PDF link will no longer be accessible from here.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function ExportsTab({ eventSettingsId }: ExportsTabProps) {
  const [jobs, setJobs] = useState<PdfJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (eventSettingsId) params.set('eventSettingsId', eventSettingsId);

      const res = await fetch(`/api/pdf-jobs/list?${params}`);
      if (!res.ok) throw new Error('Failed to load exports');

      const data = await res.json();
      setJobs(data.jobs ?? []);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventSettingsId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Auto-refresh every 5s while any job is in-progress
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'pending' || j.status === 'processing');
    if (!hasActive) return;
    const interval = setInterval(() => fetchJobs(true), 5000);
    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  const handleDeleted = useCallback((id: string) => {
    setJobs(prev => prev.filter(j => j.$id !== id));
    setTotal(prev => Math.max(0, prev - 1));
  }, []);

  const stats = {
    total: total ?? jobs.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    pending: jobs.filter(j => j.status === 'pending' || j.status === 'processing').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading exports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchJobs()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Exports" value={stats.total} icon={FileText} colorKey="purple" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} colorKey="emerald" />
        <StatCard label="In Progress" value={stats.pending} icon={Clock} colorKey="amber" />
        <StatCard label="Failed" value={stats.failed} icon={XCircle} colorKey="red" />
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileDown className="h-5 w-5 text-primary" />
                Export History
              </CardTitle>
              <CardDescription className="mt-0.5">
                {total} export{total !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchJobs(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">No exports yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF exports you generate will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map(job => (
                <JobRow key={job.$id} job={job} onDeleted={handleDeleted} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
