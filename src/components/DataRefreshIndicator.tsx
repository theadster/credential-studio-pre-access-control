/**
 * DataRefreshIndicator Component
 *
 * Shows data sync status with a calm, trust-building design.
 * For real-time apps, we trust the system and don't show "stale" states.
 * 
 * Design principles (based on multi-model UX consensus):
 * - Hide indicator on initial load - page skeletons already show loading state
 * - Always show "Synced" when connected - trust the real-time system
 * - Don't distinguish between "fresh" and "stale" - that creates anxiety
 * - Only show problems when there ARE problems (connection issues)
 * - Progressive disclosure via tooltip for users who want timing details
 * - Follows patterns from Figma, Google Docs, Slack, Notion
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DataRefreshIndicatorProps } from '@/types/connectionHealth';

/**
 * Formats a timestamp as a friendly relative time for tooltip display.
 * Only shown on hover - not constantly visible to reduce anxiety.
 */
function formatRelativeTime(lastUpdatedAt: Date | null): string {
  if (lastUpdatedAt === null) {
    return 'Not yet loaded';
  }

  const now = Date.now();
  const lastUpdateTime = lastUpdatedAt.getTime();
  const diffMs = now - lastUpdateTime;

  // Handle future timestamps
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) {
    return 'Just now';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  return 'Over a day ago';
}

/**
 * DataRefreshIndicator displays sync status with trust-building simplicity:
 * - Hidden on initial load (page skeletons already indicate loading)
 * - Shows "Synced" with checkmark when data has loaded (regardless of age)
 * - Shows "Syncing..." when manually refreshing after initial load
 * - Tooltip provides timing details for users who want them
 * - Manual refresh button available but de-emphasized
 *
 * @example
 * ```tsx
 * <DataRefreshIndicator
 *   freshnessState={dataFreshness.state}
 *   isRefreshing={dataFreshness.isRefreshing}
 *   onRefresh={dataFreshness.refresh}
 *   relativeTime={dataFreshness.getRelativeTime()}
 * />
 * ```
 */
function DataRefreshIndicatorComponent({
  freshnessState,
  isRefreshing,
  onRefresh,
  relativeTime: _relativeTime, // Keep for backwards compatibility but use internal state
  className,
}: DataRefreshIndicatorProps) {
  const { lastUpdatedAt } = freshnessState;
  // Note: We intentionally ignore isStale - in a real-time app, we trust the system
  
  // Track highlight animation state
  const [showHighlight, setShowHighlight] = useState(false);
  const [wasRefreshing, setWasRefreshing] = useState(false);
  // Track if we've ever had data (to distinguish initial load from subsequent refreshes)
  const [hasHadData, setHasHadData] = useState(false);
  
  // Trigger re-render on interval to keep relative time fresh in tooltip
  const [, setTick] = useState(0);
  
  // Computed values based on current time
  const relativeTime = formatRelativeTime(lastUpdatedAt);

  // Track when we first receive data
  useEffect(() => {
    if (lastUpdatedAt !== null && !hasHadData) {
      setHasHadData(true);
    }
  }, [lastUpdatedAt, hasHadData]);

  // Update on interval to keep relative time fresh
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTick(t => t + 1);
    }, 5000); // Update every 5 seconds for responsive feel

    return () => clearInterval(intervalId);
  }, []);

  // Trigger highlight animation when refresh completes
  useEffect(() => {
    if (wasRefreshing && !isRefreshing) {
      setShowHighlight(true);
      const timer = setTimeout(() => {
        setShowHighlight(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    setWasRefreshing(isRefreshing);
  }, [isRefreshing, wasRefreshing]);

  const handleRefresh = useCallback(() => {
    if (!isRefreshing) {
      onRefresh();
    }
  }, [isRefreshing, onRefresh]);

  // Hide indicator entirely on initial load - page skeletons already show loading state
  // This avoids redundant "Loading..." text and creates a cleaner UI
  if (lastUpdatedAt === null && !hasHadData) {
    return null;
  }

  // Simple state machine - no "stale" state, just trust the real-time system
  const getDisplayState = () => {
    // Only show "Syncing..." for manual refreshes after initial load
    if (isRefreshing && hasHadData) {
      return {
        text: 'Syncing...',
        icon: null,
        showButton: false,
      };
    }
    
    // Connected and has data - always show "Synced" (trust the real-time system)
    return {
      text: 'Synced',
      icon: <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
      showButton: true,
    };
  };

  const displayState = getDisplayState();

  // Tooltip provides timing details for users who want them
  const getTooltipContent = () => {
    return (
      <div className="space-y-1">
        <p className="font-medium">Real-time sync active</p>
        <p className="text-xs text-muted-foreground">Last update: {relativeTime}</p>
        <p className="text-xs text-muted-foreground">
          Updates appear automatically.
        </p>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-1.5 transition-all duration-300',
          showHighlight && 'bg-emerald-100 dark:bg-emerald-900/30 rounded-md px-2 py-1',
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={`Data ${displayState.text}`}
      >
        {/* Status indicator - minimal by default, details in tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="text-sm font-medium text-muted-foreground transition-all duration-300 flex items-center gap-1.5 cursor-default"
            >
              {displayState.icon}
              {displayState.text}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>

        {/* Refresh button - de-emphasized, available for manual refresh if needed */}
        {displayState.showButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-6 w-6 p-0 hover:bg-muted"
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground',
                    isRefreshing && 'animate-spin'
                  )}
                  aria-hidden="true"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Manual refresh (rarely needed)
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Memoize to prevent unnecessary re-renders
export const DataRefreshIndicator = memo(DataRefreshIndicatorComponent);

export default DataRefreshIndicator;
