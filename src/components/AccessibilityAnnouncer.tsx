import React from 'react';

interface AccessibilityAnnouncerProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

/**
 * Screen reader announcement component using ARIA live regions
 * Announces messages to screen readers without visual display
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
