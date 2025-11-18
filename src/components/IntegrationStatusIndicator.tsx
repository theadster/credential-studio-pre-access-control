// IntegrationStatusIndicator Component
// Shared status indicator for integration tabs

interface IntegrationStatusIndicatorProps {
  isReady: boolean;
  statusMessage: string;
}

export function IntegrationStatusIndicator({ isReady, statusMessage }: IntegrationStatusIndicatorProps) {
  return (
    <div className="p-4 border rounded-lg" style={{
      backgroundColor: isReady ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
      borderColor: isReady ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
    }}>
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
