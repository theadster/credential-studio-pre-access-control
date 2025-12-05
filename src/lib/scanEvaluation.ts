/**
 * Scan Evaluation Module for Mobile Access Control
 * 
 * This module provides the core logic for evaluating badge scans against
 * access control rules, validity windows, and approval profiles.
 * 
 * Requirements: 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { CachedAttendee, evaluateRuleGroup } from './ruleEngine';
import { ApprovalProfile } from '@/types/approvalProfile';

/**
 * Result of a scan evaluation
 */
export interface EvaluationResult {
  approved: boolean;
  denialReason: string | null;
}

/**
 * Denial reasons in priority order
 * 
 * Requirement 8.5: Priority order is:
 * 1. accessEnabled (highest priority)
 * 2. validity dates
 * 3. profile rules (lowest priority)
 */
export const DENIAL_REASONS = {
  ACCESS_DISABLED: 'Access disabled',
  NOT_YET_VALID: 'Badge not yet valid',
  EXPIRED: 'Badge has expired',
  REQUIREMENTS_NOT_MET: 'Access requirements not met',
  NOT_FOUND: 'Badge not found',
} as const;

/**
 * Formats a date for display in denial messages
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Checks if the current time is within the validity window
 * 
 * @param validFrom - ISO datetime string or null
 * @param validUntil - ISO datetime string or null
 * @returns Object with isValid flag and denial reason if invalid
 * 
 * Requirements: 7.5, 8.2, 8.3
 */
export function checkValidityWindow(
  validFrom: string | null,
  validUntil: string | null
): { isValid: boolean; denialReason: string | null } {
  const now = new Date();
  
  // Requirement 8.2: Check if badge is not yet valid
  if (validFrom) {
    const from = new Date(validFrom);
    if (isNaN(from.getTime())) {
      return { isValid: false, denialReason: 'Invalid validFrom date' };
    }
    if (now < from) {
      return {
        isValid: false,
        denialReason: `${DENIAL_REASONS.NOT_YET_VALID} (valid from: ${formatDate(from)})`,
      };
    }
  }
  
  // Requirement 8.3: Check if badge has expired
  if (validUntil) {
    const until = new Date(validUntil);
    if (isNaN(until.getTime())) {
      return { isValid: false, denialReason: 'Invalid validUntil date' };
    }
    if (now > until) {
      return {
        isValid: false,
        denialReason: `${DENIAL_REASONS.EXPIRED} (expired: ${formatDate(until)})`,
      };
    }
  }
  
  return { isValid: true, denialReason: null };
}

/**
 * Evaluates a badge scan against access control rules
 * 
 * This is the main entry point for scan evaluation. It checks:
 * 1. Whether the attendee exists (barcode lookup)
 * 2. Whether access is enabled (highest priority)
 * 3. Whether the badge is within its validity window
 * 4. Whether the attendee passes the selected approval profile rules
 * 
 * @param barcode - The scanned barcode value
 * @param attendees - Map of barcode to attendee data
 * @param profile - Optional approval profile to evaluate (null = only validate access and dates)
 * @returns Evaluation result with approval status and denial reason
 * 
 * Requirements: 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.4
 */
export function evaluateScan(
  barcode: string,
  attendees: Map<string, CachedAttendee>,
  profile: ApprovalProfile | null
): EvaluationResult {
  // Requirement 7.3: Find attendee by barcode
  const attendee = attendees.get(barcode);
  
  if (!attendee) {
    return {
      approved: false,
      denialReason: DENIAL_REASONS.NOT_FOUND,
    };
  }
  
  // Requirement 8.1, 8.5: Check accessEnabled (highest priority)
  if (!attendee.accessEnabled) {
    return {
      approved: false,
      denialReason: DENIAL_REASONS.ACCESS_DISABLED,
    };
  }
  
  // Requirement 8.2, 8.3, 8.5: Check validity window (second priority)
  const validityCheck = checkValidityWindow(attendee.validFrom, attendee.validUntil);
  if (!validityCheck.isValid) {
    return {
      approved: false,
      denialReason: validityCheck.denialReason,
    };
  }
  
  // Requirement 9.4: If no profile selected, only validate access and dates
  if (!profile || !profile.rules) {
    return {
      approved: true,
      denialReason: null,
    };
  }
  
  // Requirement 7.4, 8.4, 8.5: Evaluate profile rules (lowest priority)
  const rulesPass = evaluateRuleGroup(profile.rules, attendee);
  
  if (!rulesPass) {
    return {
      approved: false,
      denialReason: DENIAL_REASONS.REQUIREMENTS_NOT_MET,
    };
  }
  
  // Requirement 7.4: All checks passed
  return {
    approved: true,
    denialReason: null,
  };
}