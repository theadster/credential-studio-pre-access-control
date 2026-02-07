// IntegrationStatusIndicator Component
// Shared status indicator for integration tabs

interface IntegrationStatusIndicatorProps {
  isReady: boolean;
  statusMessage: string;
}

export function IntegrationStatusIndicator({ isReady, statusMessage }: IntegrationStatusIndicatorProps) {
  return (
    <div className={`p-4 border rounded-lg ${isReady ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <div>
          <p className={`text-sm font-medium ${isReady ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
            {isReady ? 'Ready' : 'Not Ready'}
          </p>
          <p className={`text-xs ${isReady ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {statusMessage}
          </p>
        </div>
      </div>
    </div>
  );
}
