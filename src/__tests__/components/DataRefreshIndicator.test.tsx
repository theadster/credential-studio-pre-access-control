/**
 * Unit Tests for DataRefreshIndicator Component
 *
 * Tests the visual rendering and behavior of the data refresh indicator,
 * including the calm, non-anxiety-inducing design with progressive disclosure.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 * @see .kiro/specs/data-refresh-monitoring/requirements.md (Requirements 7.1-7.7)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DataRefreshIndicator } from '@/components/DataRefreshIndicator';
import type { FreshnessState } from '@/types/connectionHealth';

/**
 * Creates a mock freshness state for testing
 */
function createMockFreshnessState(
  overrides: Partial<FreshnessState> = {}
): FreshnessState {
  return {
    lastUpdatedAt: new Date('2025-01-19T12:00:00.000Z'),
    isStale: false,
    staleDuration: null,
    ...overrides,
  };
}

describe('DataRefreshIndicator', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
    mockOnRefresh.mockClear();
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } finally {
      mockOnRefresh.mockClear();
    }
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
          className="custom-class"
        />
      );
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
  });

  describe('calm display states (Requirement 7.1)', () => {
    it('displays "Synced" for fresh data', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    it('displays "Synced" even for stale data (trusts real-time system)', () => {
      vi.setSystemTime(new Date('2025-01-19T12:02:00.000Z'));
      const state = createMockFreshnessState({ isStale: true, staleDuration: 5000 });
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="2 minutes ago"
        />
      );
      // Now shows "Synced" regardless of staleness - trusts real-time sync
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    it('renders nothing when data has never been fetched (hides on initial load)', () => {
      const state = createMockFreshnessState({ lastUpdatedAt: null, isStale: true });
      const { container } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="never"
        />
      );
      // Component returns null on initial load - page skeletons show loading state
      expect(container.firstChild).toBeNull();
    });

    it('displays "Syncing..." when refreshing after initial data load', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={true}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });
  });

  describe('soft visual styling (Requirement 7.2 - updated for calm UX)', () => {
    it('uses muted colors for stale data (not alarming amber)', () => {
      vi.setSystemTime(new Date('2025-01-19T12:00:35.000Z'));
      const state = createMockFreshnessState({ isStale: true, staleDuration: 5000 });
      const { container } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="35 seconds ago"
        />
      );

      // Check that the text uses muted colors, not alarming amber
      const textElement = container.querySelector('span.text-sm');
      expect(textElement).toBeTruthy();
      const textClasses = textElement?.className || '';
      expect(/muted-foreground/.test(textClasses)).toBe(true);
    });

    it('uses muted-foreground colors when data is fresh', () => {
      const state = createMockFreshnessState({ isStale: false });
      const { container } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="5 seconds ago"
        />
      );

      const textElement = container.querySelector('span.text-sm');
      expect(textElement).toBeTruthy();
      const textClasses = textElement?.className || '';
      expect(/muted-foreground/.test(textClasses)).toBe(true);
    });
  });

  describe('refresh button (Requirement 7.3)', () => {
    it('renders refresh button when data is loaded', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('calls onRefresh when button is clicked', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not show refresh button when refreshing (shows Syncing... instead)', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={true}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      // When refreshing, button is not shown (showButton: false in getDisplayState)
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('renders nothing when loading initial data (hidden on initial load)', () => {
      const state = createMockFreshnessState({ lastUpdatedAt: null });
      const { container } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="never"
        />
      );
      // Component returns null on initial load
      expect(container.firstChild).toBeNull();
    });
  });

  describe('refresh animation (Requirement 7.4)', () => {
    it('shows refresh icon without spinning when not refreshing', () => {
      const state = createMockFreshnessState();
      const { container } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );

      // Refresh button is shown with icon
      const icon = container.querySelector('svg.lucide-refresh-cw');
      expect(icon).toBeTruthy();
      const iconClasses = icon?.className.baseVal || icon?.getAttribute('class') || '';
      expect(/animate-spin/.test(iconClasses)).toBe(false);
    });

    it('shows Syncing... text when refreshing after initial load', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={true}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );

      // When refreshing after initial load, "Syncing..." is shown
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('highlight animation (Requirement 7.5)', () => {
    it('shows highlight animation when refresh completes', async () => {
      const state = createMockFreshnessState();
      const { container, rerender } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={true}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );

      // Transition from refreshing to not refreshing
      rerender(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );

      // Check for highlight class
      const statusDiv = container.querySelector('[role="status"]');
      expect(statusDiv).toBeTruthy();
      const statusClasses = statusDiv?.className || '';
      expect(/emerald/.test(statusClasses)).toBe(true);

      // Wait for highlight to fade
      act(() => {
        vi.advanceTimersByTime(350);
      });

      // Highlight should be gone
      const updatedClasses = statusDiv?.className || '';
      expect(/emerald/.test(updatedClasses)).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="5 seconds ago"
        />
      );
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label');
    });

    it('shows "Synced" in aria-label even when stale (trusts real-time)', () => {
      vi.setSystemTime(new Date('2025-01-19T12:00:35.000Z'));
      const state = createMockFreshnessState({ isStale: true });
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="35 seconds ago"
        />
      );
      const status = screen.getByRole('status');
      // Now shows "Synced" regardless of staleness
      expect(status.getAttribute('aria-label')).toContain('Synced');
    });

    it('refresh button has appropriate aria-label', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Refresh data');
    });

    it('hides refresh button when refreshing', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={true}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      // Button is not shown when refreshing
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('time update interval (fixes stuck timestamp bug)', () => {
    it('updates relative time display on interval', () => {
      const state = createMockFreshnessState();
      render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );
      
      // Initially shows "Synced"
      expect(screen.getByText('Synced')).toBeInTheDocument();
      
      // Advance time by 2 minutes and trigger interval
      act(() => {
        vi.setSystemTime(new Date('2025-01-19T12:02:00.000Z'));
        vi.advanceTimersByTime(5000); // Trigger interval (now 5 seconds)
      });
      
      // Should still show "Synced" (display doesn't change based on time alone)
      // The stale state is controlled by the parent, not internal timing
      expect(screen.getByText('Synced')).toBeInTheDocument();
    });
  });

  describe('progressive disclosure via tooltip', () => {
    it('shows checkmark icon when data is loaded', () => {
      const state = createMockFreshnessState({ isStale: false });
      const { container } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="just now"
        />
      );

      // Check for checkmark icon
      const checkIcon = container.querySelector('svg.lucide-check');
      expect(checkIcon).toBeTruthy();
    });

    it('shows checkmark icon even when stale (trusts real-time system)', () => {
      const state = createMockFreshnessState({ isStale: true, staleDuration: 5000 });
      const { container } = render(
        <DataRefreshIndicator
          freshnessState={state}
          isRefreshing={false}
          onRefresh={mockOnRefresh}
          relativeTime="2 minutes ago"
        />
      );

      // Now shows checkmark regardless of staleness - trusts real-time sync
      const checkIcon = container.querySelector('svg.lucide-check');
      expect(checkIcon).toBeTruthy();
    });
  });
});


/**
 * **Feature: data-refresh-monitoring, Property 17: Calm Visual Design**
 * **Validates: Requirements 7.2 (updated for non-anxiety-inducing UX)**
 *
 * The DataRefreshIndicator uses soft, muted colors for all states
 * to avoid causing user anxiety. No alarming amber/warning colors.
 * Now also ignores "stale" state entirely - trusts real-time sync.
 */
describe('Property 17: Calm Visual Design', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
    mockOnRefresh.mockClear();
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } finally {
      mockOnRefresh.mockClear();
    }
  });

  it('uses muted colors for all states (trusts real-time system)', () => {
    const state = createMockFreshnessState({ isStale: true, staleDuration: 10000 });
    const { container } = render(
      <DataRefreshIndicator
        freshnessState={state}
        isRefreshing={false}
        onRefresh={mockOnRefresh}
        relativeTime="40 seconds ago"
      />
    );

    const textElement = container.querySelector('span.text-sm');
    expect(textElement).toBeTruthy();
    const textClasses = textElement?.className || '';
    // Should use muted colors, not amber
    expect(/muted-foreground/.test(textClasses)).toBe(true);
  });

  it('uses muted-foreground colors when data is fresh', () => {
    const state = createMockFreshnessState({ isStale: false });
    const { container } = render(
      <DataRefreshIndicator
        freshnessState={state}
        isRefreshing={false}
        onRefresh={mockOnRefresh}
        relativeTime="5 seconds ago"
      />
    );

    const textElement = container.querySelector('span.text-sm');
    expect(textElement).toBeTruthy();
    const textClasses = textElement?.className || '';
    expect(/muted-foreground/.test(textClasses)).toBe(true);
  });

  it('both stale and fresh states show identical "Synced" display', () => {
    // Fresh state
    const freshState = createMockFreshnessState({ isStale: false });
    const { unmount: unmountFresh } = render(
      <DataRefreshIndicator
        freshnessState={freshState}
        isRefreshing={false}
        onRefresh={mockOnRefresh}
        relativeTime="5 seconds ago"
      />
    );

    expect(screen.getByText('Synced')).toBeInTheDocument();
    unmountFresh();

    // Stale state - should show same "Synced" text
    const staleState = createMockFreshnessState({ isStale: true, staleDuration: 5000 });
    render(
      <DataRefreshIndicator
        freshnessState={staleState}
        isRefreshing={false}
        onRefresh={mockOnRefresh}
        relativeTime="1 minute ago"
      />
    );

    // Both should show "Synced" - trusts real-time system
    expect(screen.getByText('Synced')).toBeInTheDocument();
  });
});
