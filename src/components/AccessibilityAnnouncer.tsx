import React from 'react';

interface AccessibilityAnnouncerProps {
  /** The message to announce to screen readers */
  message: string;
  
  /**
   * The politeness level for the announcement
   * 
   * **'polite' (default)** - For non-urgent updates:
   * - Status changes (e.g., "Item added to cart")
   * - Form validation feedback (e.g., "Email is required")
   * - Progress updates (e.g., "Loading complete")
   * - Success messages (e.g., "Changes saved")
   * - Informational messages that can wait for the user to finish their current task
   * 
   * **'assertive'** - For urgent alerts or time-sensitive warnings:
   * - Error messages requiring immediate attention (e.g., "Connection lost")
   * - Critical warnings (e.g., "Session expiring in 1 minute")
   * - Time-sensitive notifications (e.g., "Payment failed")
   * - Security alerts (e.g., "Unauthorized access detected")
   * - Messages that should interrupt the user's current activity
   * 
   * @default 'polite'
   */
  politeness?: 'polite' | 'assertive';
}

/**
 * Screen reader announcement component using ARIA live regions
 * 
 * Announces messages to screen readers without visual display.
 * Uses ARIA live regions to communicate dynamic content changes to assistive technologies.
 * 
 * @example
 * ```tsx
 * // Non-urgent status update
 * <AccessibilityAnnouncer 
 *   message="Form submitted successfully" 
 *   politeness="polite" 
 * />
 * 
 * // Urgent error requiring immediate attention
 * <AccessibilityAnnouncer 
 *   message="Error: Payment failed. Please try again." 
 *   politeness="assertive" 
 * />
 * ```
 */
export function AccessibilityAnnouncer({ 
  message, 
  politeness = 'polite' 
}: AccessibilityAnnouncerProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="sr-only"
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
