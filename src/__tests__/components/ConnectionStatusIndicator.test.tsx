/**
 * Unit Tests for ConnectionStatusIndicator Component
 *
 * Tests the visual rendering and behavior of the connection status indicator,
 * including color mapping, button visibility, and tooltip content.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 * @see .kiro/specs/data-refresh-monitoring/requirements.md (Requirements 6.1-6.7)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatusIndicator';
import type { ConnectionState, ConnectionStatus } from '@/types/connectionHealth';

/**
 * Creates a mock connection state for testing
 */
function createMockConnectionState(
  overrides: Partial<ConnectionState> = {}
): ConnectionState {
  return {
    status: 'connected',
    lastConnectedAt: new Date('2025-01-19T12:00:00.000Z'),
    lastDisconnectedAt: null,
    reconnectAttempt: 0,
    nextReconnectAt: null,
    error: null,
    ...overrides,
  };
}

describe('ConnectionStatusIndicator', () => {
  const mockOnReconnect = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
    mockOnReconnect.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const state = createMockConnectionState();
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const state = createMockConnectionState();
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
          className="custom-class"
        />
      );
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });
  });

  describe('status display', () => {
    it('shows connected status correctly', () => {
      const state = createMockConnectionState({ status: 'connected' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Connection status: Live'
      );
      // Verify "Live" text is displayed
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('shows connecting status correctly', () => {
      const state = createMockConnectionState({ status: 'connecting' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Connection status: Connecting...'
      );
      // Verify "Connecting..." text is displayed
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('shows disconnected status with text', () => {
      const state = createMockConnectionState({ status: 'disconnected' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('shows reconnecting status with attempt count', () => {
      const state = createMockConnectionState({
        status: 'reconnecting',
        reconnectAttempt: 3,
        nextReconnectAt: new Date(Date.now() + 5000),
      });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByText('Reconnecting (3/10)...')).toBeInTheDocument();
    });
  });

  describe('reconnect button visibility (Requirement 6.3)', () => {
    it('shows reconnect button when disconnected', () => {
      const state = createMockConnectionState({ status: 'disconnected' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
    });

    it('hides reconnect button when connected', () => {
      const state = createMockConnectionState({ status: 'connected' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.queryByRole('button', { name: /reconnect/i })).not.toBeInTheDocument();
    });

    it('hides reconnect button when connecting', () => {
      const state = createMockConnectionState({ status: 'connecting' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.queryByRole('button', { name: /reconnect/i })).not.toBeInTheDocument();
    });

    it('hides reconnect button when reconnecting', () => {
      const state = createMockConnectionState({
        status: 'reconnecting',
        reconnectAttempt: 1,
      });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.queryByRole('button', { name: /reconnect/i })).not.toBeInTheDocument();
    });

    it('calls onReconnect when button is clicked', () => {
      const state = createMockConnectionState({ status: 'disconnected' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /reconnect/i }));
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconnecting state display (Requirement 6.4)', () => {
    it('shows attempt count when reconnecting', () => {
      const state = createMockConnectionState({
        status: 'reconnecting',
        reconnectAttempt: 5,
        nextReconnectAt: new Date(Date.now() + 10000),
      });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByText('Reconnecting (5/10)...')).toBeInTheDocument();
    });

    it('shows next retry time when reconnecting', () => {
      const state = createMockConnectionState({
        status: 'reconnecting',
        reconnectAttempt: 2,
        nextReconnectAt: new Date(Date.now() + 5000),
      });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByText(/Retry in 5s/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      const state = createMockConnectionState();
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label');
    });

    it('reconnect button has aria-label', () => {
      const state = createMockConnectionState({ status: 'disconnected' });
      render(
        <ConnectionStatusIndicator
          connectionState={state}
          onReconnect={mockOnReconnect}
        />
      );
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Reconnect to server'
      );
    });
  });
});

/**
 * **Feature: data-refresh-monitoring, Property 15: Connection Status Indicator Color Mapping**
 * **Validates: Requirements 6.1**
 *
 * *For any* connection status value, the ConnectionStatusIndicator SHALL render
 * with the correct semantic color class: "connected" → emerald/green classes,
 * "connecting"/"reconnecting" → amber/yellow classes, "disconnected" → red/destructive classes.
 */
describe('Property 15: Connection Status Indicator Color Mapping', () => {
  const mockOnReconnect = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Color class patterns for each status
   */
  const statusColorPatterns: Record<ConnectionStatus, RegExp[]> = {
    connected: [/emerald/, /green/],
    connecting: [/amber/, /yellow/],
    reconnecting: [/amber/, /yellow/],
    disconnected: [/red/, /destructive/],
  };

  it('maps connected status to emerald/green colors', () => {
    const state = createMockConnectionState({ status: 'connected' });
    const { container } = render(
      <ConnectionStatusIndicator
        connectionState={state}
        onReconnect={mockOnReconnect}
      />
    );

    // Check that the dot has emerald color class
    const dot = container.querySelector('span.rounded-full');
    expect(dot).toBeTruthy();
    const dotClasses = dot?.className || '';
    expect(
      statusColorPatterns.connected.some((pattern) => pattern.test(dotClasses))
    ).toBe(true);
  });

  it('maps connecting status to amber/yellow colors', () => {
    const state = createMockConnectionState({ status: 'connecting' });
    const { container } = render(
      <ConnectionStatusIndicator
        connectionState={state}
        onReconnect={mockOnReconnect}
      />
    );

    const dot = container.querySelector('span.rounded-full');
    expect(dot).toBeTruthy();
    const dotClasses = dot?.className || '';
    expect(
      statusColorPatterns.connecting.some((pattern) => pattern.test(dotClasses))
    ).toBe(true);
  });

  it('maps reconnecting status to amber/yellow colors', () => {
    const state = createMockConnectionState({
      status: 'reconnecting',
      reconnectAttempt: 1,
    });
    const { container } = render(
      <ConnectionStatusIndicator
        connectionState={state}
        onReconnect={mockOnReconnect}
      />
    );

    const dot = container.querySelector('span.rounded-full');
    expect(dot).toBeTruthy();
    const dotClasses = dot?.className || '';
    expect(
      statusColorPatterns.reconnecting.some((pattern) => pattern.test(dotClasses))
    ).toBe(true);
  });

  it('maps disconnected status to red/destructive colors', () => {
    const state = createMockConnectionState({ status: 'disconnected' });
    const { container } = render(
      <ConnectionStatusIndicator
        connectionState={state}
        onReconnect={mockOnReconnect}
      />
    );

    const dot = container.querySelector('span.rounded-full');
    expect(dot).toBeTruthy();
    const dotClasses = dot?.className || '';
    expect(
      statusColorPatterns.disconnected.some((pattern) => pattern.test(dotClasses))
    ).toBe(true);
  });

  /**
   * Property-based test: For any valid connection status, the indicator
   * should render with the appropriate semantic color classes.
   */
  it('renders correct colors for any valid status (property test)', () => {
    const statuses: ConnectionStatus[] = ['connected', 'connecting', 'reconnecting', 'disconnected'];

    fc.assert(
      fc.property(
        fc.constantFrom(...statuses),
        fc.integer({ min: 0, max: 10 }), // reconnect attempt
        (status, attempt) => {
          const state = createMockConnectionState({
            status,
            reconnectAttempt: status === 'reconnecting' ? attempt : 0,
            nextReconnectAt: status === 'reconnecting' ? new Date(Date.now() + 5000) : null,
          });

          const { container, unmount } = render(
            <ConnectionStatusIndicator
              connectionState={state}
              onReconnect={mockOnReconnect}
            />
          );

          const dot = container.querySelector('span.rounded-full');
          expect(dot).toBeTruthy();
          const dotClasses = dot?.className || '';

          // Verify the correct color pattern is present
          const expectedPatterns = statusColorPatterns[status];
          const hasCorrectColor = expectedPatterns.some((pattern) =>
            pattern.test(dotClasses)
          );
          expect(hasCorrectColor).toBe(true);

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property-based test: Connected and disconnected should never share colors
   */
  it('connected and disconnected have distinct colors (property test)', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // true = connected, false = disconnected
        (isConnected) => {
          const status: ConnectionStatus = isConnected ? 'connected' : 'disconnected';
          const state = createMockConnectionState({ status });

          const { container, unmount } = render(
            <ConnectionStatusIndicator
              connectionState={state}
              onReconnect={mockOnReconnect}
            />
          );

          const dot = container.querySelector('span.rounded-full');
          const dotClasses = dot?.className || '';

          if (isConnected) {
            // Connected should have emerald, not red
            expect(/emerald/.test(dotClasses)).toBe(true);
            expect(/red/.test(dotClasses)).toBe(false);
          } else {
            // Disconnected should have red, not emerald
            expect(/red/.test(dotClasses)).toBe(true);
            expect(/emerald/.test(dotClasses)).toBe(false);
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
