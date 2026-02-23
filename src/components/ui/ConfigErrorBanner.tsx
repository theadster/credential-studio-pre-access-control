import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ConfigErrorBannerProps {
  message?: string;
  title?: string;
}

/**
 * Shown when an API returns errorCode: 'CONFIG_ERROR', indicating a missing or
 * misconfigured Appwrite table/env var rather than a normal empty-data state.
 */
export function ConfigErrorBanner({
  title = 'Configuration Error',
  message = 'This feature is not configured correctly. Check your Appwrite table setup and environment variables.',
}: ConfigErrorBannerProps) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
