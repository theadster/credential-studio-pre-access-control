/**
 * Rule Engine for Mobile Access Control
 * 
 * This module provides functions to evaluate approval profile rules against attendee data.
 * It supports various operators, AND/OR logic, nested rule groups, and dot-notation field paths.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { Rule, RuleGroup, RuleOperator } from '@/types/approvalProfile';

/**
 * Cached attendee data structure for rule evaluation
 */
export interface CachedAttendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  photoUrl: string | null;
  photoLocalPath?: string | null;
  customFieldValues: Record<string, any>;
  accessEnabled: boolean;
  validFrom: string | null;
  validUntil: string | null;
  lastSynced?: string;
  [key: string]: any; // Allow additional fields
}

/**
 * Extracts a field value from an attendee object using dot-notation path
 * 
 * @param attendee - The attendee object to extract from
 * @param fieldPath - Dot-notation path (e.g., "firstName", "customFieldValues.vipStatus")
 * @returns The field value, or null if not found
 * 
 * Requirements: 11.4 (null field handling)
 */
export function getFieldValue(attendee: CachedAttendee, fieldPath: string): any {
  const parts = fieldPath.split('.');
  let value: any = attendee;
  
  for (const part of parts) {
    if (value === null || value === undefined) return null;
    value = value[part];
  }
  
  return value;
}

/**
 * Evaluates a single rule against an attendee
 * 
 * @param rule - The rule to evaluate
 * @param attendee - The attendee to evaluate against
 * @returns true if the rule passes, false otherwise
 * 
 * Requirements: 11.4 (null handling), 11.5 (UTC dates), 11.6 (case-insensitive)
 */
export function evaluateRule(rule: Rule, attendee: CachedAttendee): boolean {
  const value = getFieldValue(attendee, rule.field);
  
  switch (rule.operator) {
    case 'equals':
      return value === rule.value;
      
    case 'not_equals':
      return value !== rule.value;
      
    case 'in_list':
      // Requirement 11.4: null/undefined fails equality checks
      if (value === null || value === undefined) return false;
      // Requirement 11.6: case-insensitive string matching
      return (rule.value as any[]).some(v => 
        String(v).toLowerCase() === String(value).toLowerCase()
      );
      
    case 'not_in_list':
      // Requirement 11.4: null/undefined passes not-in-list checks
      if (value === null || value === undefined) return true;
      // Requirement 11.6: case-insensitive string matching
      return !(rule.value as any[]).some(v => 
        String(v).toLowerCase() === String(value).toLowerCase()
      );
      
    case 'greater_than':
      // Requirement 11.4: null/undefined fails comparison
      if (value === null || value === undefined) return false;
      return value > rule.value;
      
    case 'less_than':
      // Requirement 11.4: null/undefined fails comparison
      if (value === null || value === undefined) return false;
      return value < rule.value;
      
    case 'between':
      // Requirement 11.4: null/undefined fails comparison
      if (value === null || value === undefined) return false;
      const [min, max] = rule.value as [any, any];
      return value >= min && value <= max;
      
    case 'is_true':
      return value === true;
      
    case 'is_false':
      return value === false;
      
    case 'is_empty':
      // Requirement 11.4: null/undefined passes is_empty checks
      return value === null || value === undefined || value === '';
      
    case 'is_not_empty':
      // Requirement 11.4: null/undefined fails is_not_empty checks
      return value !== null && value !== undefined && value !== '';
      
    default:
      return false;
  }
}

/**
 * Evaluates a rule group (with nested groups) against an attendee
 * 
 * @param group - The rule group to evaluate
 * @param attendee - The attendee to evaluate against
 * @returns true if the group passes, false otherwise
 * 
 * Requirements: 11.1 (AND logic), 11.2 (OR logic), 11.3 (nested evaluation)
 */
export function evaluateRuleGroup(group: RuleGroup, attendee: CachedAttendee): boolean {
  // Requirement 11.3: Evaluate inner groups first before outer logic
  const results = group.conditions.map(condition => {
    if ('logic' in condition) {
      // Nested group - evaluate recursively
      return evaluateRuleGroup(condition as RuleGroup, attendee);
    }
    // Single rule
    return evaluateRule(condition as Rule, attendee);
  });
  
  if (group.logic === 'AND') {
    // Requirement 11.1: AND logic requires all conditions to pass
    return results.every(r => r);
  }
  
  // Requirement 11.2: OR logic requires at least one condition to pass
  return results.some(r => r);
}
