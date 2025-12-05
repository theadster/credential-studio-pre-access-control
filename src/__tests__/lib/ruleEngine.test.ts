/**
 * Property-Based Tests for Rule Engine
 * 
 * These tests use fast-check to verify universal properties across all valid inputs.
 * Each test runs a minimum of 100 iterations with randomly generated data.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluateRule, evaluateRuleGroup, getFieldValue, CachedAttendee } from '@/lib/ruleEngine';
import { Rule, RuleGroup } from '@/types/approvalProfile';

// ============================================================================
// Arbitraries (Generators for Property-Based Testing)
// ============================================================================

/**
 * Generates a random attendee object
 */
const attendeeArb = fc.record({
  id: fc.string(),
  firstName: fc.string(),
  lastName: fc.string(),
  barcodeNumber: fc.string(),
  photoUrl: fc.oneof(fc.constant(null), fc.webUrl()),
  customFieldValues: fc.dictionary(fc.string(), fc.anything()),
  accessEnabled: fc.boolean(),
  validFrom: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString())
  ),
  validUntil: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString())
  ),
}) as fc.Arbitrary<CachedAttendee>;

/**
 * Generates a random simple rule (not nested)
 * Ensures that list operators get array values
 */
const simpleRuleArb: fc.Arbitrary<Rule> = fc.oneof(
  // List operators - must have array values
  fc.record({
    field: fc.oneof(
      fc.constant('firstName'),
      fc.constant('lastName'),
      fc.constant('customFieldValues.vipStatus')
    ),
    operator: fc.constantFrom('in_list', 'not_in_list'),
    value: fc.array(fc.anything(), { minLength: 0, maxLength: 5 }),
  }),
  // Boolean operators - no value needed
  fc.record({
    field: fc.constant('accessEnabled'),
    operator: fc.constantFrom('is_true', 'is_false'),
    value: fc.constant(null),
  }),
  // Empty check operators - no value needed
  fc.record({
    field: fc.oneof(
      fc.constant('firstName'),
      fc.constant('lastName'),
      fc.constant('customFieldValues.vipStatus')
    ),
    operator: fc.constantFrom('is_empty', 'is_not_empty'),
    value: fc.constant(null),
  }),
  // Equality operators - any value
  fc.record({
    field: fc.oneof(
      fc.constant('firstName'),
      fc.constant('lastName'),
      fc.constant('accessEnabled'),
      fc.constant('customFieldValues.vipStatus')
    ),
    operator: fc.constantFrom('equals', 'not_equals'),
    value: fc.anything(),
  })
);

/**
 * Generates a rule group with only simple rules (no nesting)
 */
const simpleRuleGroupArb: fc.Arbitrary<RuleGroup> = fc.record({
  logic: fc.constantFrom('AND', 'OR'),
  conditions: fc.array(simpleRuleArb, { minLength: 1, maxLength: 5 }),
});

/**
 * Generates a nested rule group (up to 2 levels deep)
 */
const nestedRuleGroupArb: fc.Arbitrary<RuleGroup> = fc.letrec(tie => ({
  ruleGroup: fc.record({
    logic: fc.constantFrom('AND', 'OR'),
    conditions: fc.array(
      fc.oneof(
        simpleRuleArb,
        fc.record({
          logic: fc.constantFrom('AND', 'OR'),
          conditions: fc.array(simpleRuleArb, { minLength: 1, maxLength: 3 }),
        })
      ),
      { minLength: 1, maxLength: 3 }
    ),
  }),
})).ruleGroup as fc.Arbitrary<RuleGroup>;

// ============================================================================
// Property 12: AND logic evaluation
// **Feature: mobile-access-control, Property 12: AND logic evaluation**
// **Validates: Requirements 11.1**
// ============================================================================

describe('Property 12: AND logic evaluation', () => {
  it('should require all conditions to be true for AND logic', () => {
    fc.assert(
      fc.property(simpleRuleGroupArb, attendeeArb, (ruleGroup, attendee) => {
        // Only test AND logic groups
        if (ruleGroup.logic !== 'AND') return true;
        
        const result = evaluateRuleGroup(ruleGroup, attendee);
        const individualResults = ruleGroup.conditions.map(condition =>
          evaluateRule(condition as Rule, attendee)
        );
        
        // AND logic: result should be true only if ALL conditions are true
        const expectedResult = individualResults.every(r => r);
        
        return result === expectedResult;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 13: OR logic evaluation
// **Feature: mobile-access-control, Property 13: OR logic evaluation**
// **Validates: Requirements 11.2**
// ============================================================================

describe('Property 13: OR logic evaluation', () => {
  it('should require at least one condition to be true for OR logic', () => {
    fc.assert(
      fc.property(simpleRuleGroupArb, attendeeArb, (ruleGroup, attendee) => {
        // Only test OR logic groups
        if (ruleGroup.logic !== 'OR') return true;
        
        const result = evaluateRuleGroup(ruleGroup, attendee);
        const individualResults = ruleGroup.conditions.map(condition =>
          evaluateRule(condition as Rule, attendee)
        );
        
        // OR logic: result should be true if AT LEAST ONE condition is true
        const expectedResult = individualResults.some(r => r);
        
        return result === expectedResult;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 14: Nested rule evaluation order
// **Feature: mobile-access-control, Property 14: Nested rule evaluation order**
// **Validates: Requirements 11.3**
// ============================================================================

describe('Property 14: Nested rule evaluation order', () => {
  it('should evaluate inner groups before applying outer logic', () => {
    fc.assert(
      fc.property(nestedRuleGroupArb, attendeeArb, (ruleGroup, attendee) => {
        const result = evaluateRuleGroup(ruleGroup, attendee);
        
        // Manually evaluate: first evaluate all conditions (including nested groups)
        const conditionResults = ruleGroup.conditions.map(condition => {
          if ('logic' in condition) {
            // This is a nested group - evaluate it recursively
            return evaluateRuleGroup(condition as RuleGroup, attendee);
          }
          // This is a simple rule
          return evaluateRule(condition as Rule, attendee);
        });
        
        // Then apply the outer logic
        const expectedResult = ruleGroup.logic === 'AND'
          ? conditionResults.every(r => r)
          : conditionResults.some(r => r);
        
        return result === expectedResult;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 15: Null field handling
// **Feature: mobile-access-control, Property 15: Null field handling**
// **Validates: Requirements 11.4**
// ============================================================================

describe('Property 15: Null field handling', () => {
  it('should fail equality checks for null/undefined values', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const attendee: CachedAttendee = {
          id: '1',
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: '123',
          photoUrl: null,
          customFieldValues: { nullField: null, undefinedField: undefined },
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
        };
        
        // Test null field
        const nullRule: Rule = {
          field: 'customFieldValues.nullField',
          operator: 'equals',
          value: value,
        };
        const nullResult = evaluateRule(nullRule, attendee);
        
        // Test undefined field
        const undefinedRule: Rule = {
          field: 'customFieldValues.undefinedField',
          operator: 'equals',
          value: value,
        };
        const undefinedResult = evaluateRule(undefinedRule, attendee);
        
        // Test non-existent field (accessing a field that doesn't exist returns undefined)
        const nonExistentRule: Rule = {
          field: 'customFieldValues.nonExistent',
          operator: 'equals',
          value: value,
        };
        const nonExistentResult = evaluateRule(nonExistentRule, attendee);
        
        // In JavaScript:
        // - Accessing obj.nullField where nullField is explicitly set to null returns null
        // - Accessing obj.undefinedField where undefinedField is explicitly set to undefined returns undefined
        // - Accessing obj.nonExistent where nonExistent doesn't exist returns undefined
        
        // The equals operator does strict equality (===)
        // null === null -> true
        // undefined === undefined -> true
        // null === undefined -> false
        
        if (value === null) {
          // null field should match (null === null)
          // undefined field should NOT match (undefined === null)
          // non-existent field should NOT match (undefined === null)
          return nullResult === true && undefinedResult === false && nonExistentResult === false;
        }
        
        if (value === undefined) {
          // null field should NOT match (null === undefined)
          // undefined field should match (undefined === undefined)
          // non-existent field should match (undefined === undefined)
          return nullResult === false && undefinedResult === true && nonExistentResult === true;
        }
        
        // For any other value, none should match
        return nullResult === false && undefinedResult === false && nonExistentResult === false;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should pass is_empty checks for null/undefined values', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const attendee: CachedAttendee = {
          id: '1',
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: '123',
          photoUrl: null,
          customFieldValues: { 
            nullField: null, 
            undefinedField: undefined,
            emptyString: '',
          },
          accessEnabled: true,
          validFrom: null,
          validUntil: null,
        };
        
        // Test null field
        const nullRule: Rule = {
          field: 'customFieldValues.nullField',
          operator: 'is_empty',
          value: null,
        };
        const nullResult = evaluateRule(nullRule, attendee);
        
        // Test undefined field
        const undefinedRule: Rule = {
          field: 'customFieldValues.undefinedField',
          operator: 'is_empty',
          value: null,
        };
        const undefinedResult = evaluateRule(undefinedRule, attendee);
        
        // Test empty string
        const emptyStringRule: Rule = {
          field: 'customFieldValues.emptyString',
          operator: 'is_empty',
          value: null,
        };
        const emptyStringResult = evaluateRule(emptyStringRule, attendee);
        
        // Test non-existent field
        const nonExistentRule: Rule = {
          field: 'customFieldValues.nonExistent',
          operator: 'is_empty',
          value: null,
        };
        const nonExistentResult = evaluateRule(nonExistentRule, attendee);
        
        // All should pass is_empty checks
        return nullResult === true && 
               undefinedResult === true && 
               emptyStringResult === true &&
               nonExistentResult === true;
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 17: Case-insensitive list matching
// **Feature: mobile-access-control, Property 17: Case-insensitive list matching**
// **Validates: Requirements 11.6**
// ============================================================================

describe('Property 17: Case-insensitive list matching', () => {
  it('should perform case-insensitive matching for in_list operator', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (list, index) => {
          const selectedValue = list[index % list.length];
          const attendee: CachedAttendee = {
            id: '1',
            firstName: 'Test',
            lastName: 'User',
            barcodeNumber: '123',
            photoUrl: null,
            customFieldValues: { 
              testField: selectedValue.toUpperCase(), // Store in uppercase
            },
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          };
          
          const rule: Rule = {
            field: 'customFieldValues.testField',
            operator: 'in_list',
            value: list.map(v => v.toLowerCase()), // List in lowercase
          };
          
          const result = evaluateRule(rule, attendee);
          
          // Should match despite case difference
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should perform case-insensitive matching for not_in_list operator', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        fc.string(),
        (list, testValue) => {
          // Ensure testValue is NOT in the list (case-insensitive)
          const isInList = list.some(v => v.toLowerCase() === testValue.toLowerCase());
          if (isInList) return true; // Skip this test case
          
          const attendee: CachedAttendee = {
            id: '1',
            firstName: 'Test',
            lastName: 'User',
            barcodeNumber: '123',
            photoUrl: null,
            customFieldValues: { 
              testField: testValue.toUpperCase(),
            },
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          };
          
          const rule: Rule = {
            field: 'customFieldValues.testField',
            operator: 'not_in_list',
            value: list.map(v => v.toLowerCase()),
          };
          
          const result = evaluateRule(rule, attendee);
          
          // Should not match (return true for not_in_list)
          return result === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Unit Tests for Rule Engine Operators
// Tests each operator with various inputs and edge cases
// Requirements: 3.4, 11.4
// ============================================================================

describe('Unit Tests: Rule Engine Operators', () => {
  const createAttendee = (customFields: Record<string, any> = {}): CachedAttendee => ({
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    barcodeNumber: '123456',
    photoUrl: null,
    customFieldValues: customFields,
    accessEnabled: true,
    validFrom: null,
    validUntil: null,
  });

  describe('equals operator', () => {
    it('should match equal values', () => {
      const attendee = createAttendee({ status: 'VIP' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'equals', value: 'VIP' };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match different values', () => {
      const attendee = createAttendee({ status: 'VIP' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'equals', value: 'General' };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should handle null values', () => {
      const attendee = createAttendee({ status: null });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'equals', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should handle undefined values', () => {
      const attendee = createAttendee({ status: undefined });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'equals', value: undefined };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });
  });

  describe('not_equals operator', () => {
    it('should match different values', () => {
      const attendee = createAttendee({ status: 'VIP' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'not_equals', value: 'General' };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match equal values', () => {
      const attendee = createAttendee({ status: 'VIP' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'not_equals', value: 'VIP' };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('in_list operator', () => {
    it('should match when value is in list', () => {
      const attendee = createAttendee({ status: 'VIP' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'in_list', value: ['VIP', 'Staff', 'Press'] };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is not in list', () => {
      const attendee = createAttendee({ status: 'General' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'in_list', value: ['VIP', 'Staff', 'Press'] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const attendee = createAttendee({ status: 'vip' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'in_list', value: ['VIP', 'Staff'] };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should handle null values', () => {
      const attendee = createAttendee({ status: null });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'in_list', value: ['VIP', 'Staff'] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should handle empty list', () => {
      const attendee = createAttendee({ status: 'VIP' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'in_list', value: [] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('not_in_list operator', () => {
    it('should match when value is not in list', () => {
      const attendee = createAttendee({ status: 'General' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'not_in_list', value: ['VIP', 'Staff'] };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is in list', () => {
      const attendee = createAttendee({ status: 'VIP' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'not_in_list', value: ['VIP', 'Staff'] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should be case-insensitive', () => {
      const attendee = createAttendee({ status: 'vip' });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'not_in_list', value: ['VIP', 'Staff'] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should handle null values', () => {
      const attendee = createAttendee({ status: null });
      const rule: Rule = { field: 'customFieldValues.status', operator: 'not_in_list', value: ['VIP', 'Staff'] };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });
  });

  describe('greater_than operator', () => {
    it('should match when value is greater', () => {
      const attendee = createAttendee({ age: 30 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'greater_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is less', () => {
      const attendee = createAttendee({ age: 20 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'greater_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is equal', () => {
      const attendee = createAttendee({ age: 25 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'greater_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should handle null values', () => {
      const attendee = createAttendee({ age: null });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'greater_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('less_than operator', () => {
    it('should match when value is less', () => {
      const attendee = createAttendee({ age: 20 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'less_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is greater', () => {
      const attendee = createAttendee({ age: 30 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'less_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is equal', () => {
      const attendee = createAttendee({ age: 25 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'less_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should handle null values', () => {
      const attendee = createAttendee({ age: null });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'less_than', value: 25 };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('between operator', () => {
    it('should match when value is between min and max (inclusive)', () => {
      const attendee = createAttendee({ age: 25 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'between', value: [20, 30] };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should match when value equals min', () => {
      const attendee = createAttendee({ age: 20 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'between', value: [20, 30] };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should match when value equals max', () => {
      const attendee = createAttendee({ age: 30 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'between', value: [20, 30] };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is below min', () => {
      const attendee = createAttendee({ age: 15 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'between', value: [20, 30] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is above max', () => {
      const attendee = createAttendee({ age: 35 });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'between', value: [20, 30] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should handle null values', () => {
      const attendee = createAttendee({ age: null });
      const rule: Rule = { field: 'customFieldValues.age', operator: 'between', value: [20, 30] };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('is_true operator', () => {
    it('should match when value is true', () => {
      const attendee = createAttendee({ vip: true });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_true', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is false', () => {
      const attendee = createAttendee({ vip: false });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_true', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is null', () => {
      const attendee = createAttendee({ vip: null });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_true', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is truthy but not boolean true', () => {
      const attendee = createAttendee({ vip: 'yes' });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_true', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('is_false operator', () => {
    it('should match when value is false', () => {
      const attendee = createAttendee({ vip: false });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_false', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is true', () => {
      const attendee = createAttendee({ vip: true });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_false', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is null', () => {
      const attendee = createAttendee({ vip: null });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_false', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is falsy but not boolean false', () => {
      const attendee = createAttendee({ vip: 0 });
      const rule: Rule = { field: 'customFieldValues.vip', operator: 'is_false', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('is_empty operator', () => {
    it('should match when value is null', () => {
      const attendee = createAttendee({ notes: null });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should match when value is undefined', () => {
      const attendee = createAttendee({ notes: undefined });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should match when value is empty string', () => {
      const attendee = createAttendee({ notes: '' });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should not match when value is non-empty string', () => {
      const attendee = createAttendee({ notes: 'Some notes' });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is 0', () => {
      const attendee = createAttendee({ count: 0 });
      const rule: Rule = { field: 'customFieldValues.count', operator: 'is_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is false', () => {
      const attendee = createAttendee({ flag: false });
      const rule: Rule = { field: 'customFieldValues.flag', operator: 'is_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });
  });

  describe('is_not_empty operator', () => {
    it('should not match when value is null', () => {
      const attendee = createAttendee({ notes: null });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_not_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is undefined', () => {
      const attendee = createAttendee({ notes: undefined });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_not_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should not match when value is empty string', () => {
      const attendee = createAttendee({ notes: '' });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_not_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(false);
    });

    it('should match when value is non-empty string', () => {
      const attendee = createAttendee({ notes: 'Some notes' });
      const rule: Rule = { field: 'customFieldValues.notes', operator: 'is_not_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should match when value is 0', () => {
      const attendee = createAttendee({ count: 0 });
      const rule: Rule = { field: 'customFieldValues.count', operator: 'is_not_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });

    it('should match when value is false', () => {
      const attendee = createAttendee({ flag: false });
      const rule: Rule = { field: 'customFieldValues.flag', operator: 'is_not_empty', value: null };
      expect(evaluateRule(rule, attendee)).toBe(true);
    });
  });

  describe('getFieldValue function', () => {
    it('should extract top-level fields', () => {
      const attendee = createAttendee();
      expect(getFieldValue(attendee, 'firstName')).toBe('John');
      expect(getFieldValue(attendee, 'lastName')).toBe('Doe');
    });

    it('should extract nested fields using dot notation', () => {
      const attendee = createAttendee({ status: 'VIP', company: 'Acme Corp' });
      expect(getFieldValue(attendee, 'customFieldValues.status')).toBe('VIP');
      expect(getFieldValue(attendee, 'customFieldValues.company')).toBe('Acme Corp');
    });

    it('should return undefined for non-existent top-level fields', () => {
      const attendee = createAttendee();
      expect(getFieldValue(attendee, 'nonExistent')).toBeUndefined();
    });

    it('should return undefined for non-existent nested fields', () => {
      const attendee = createAttendee();
      expect(getFieldValue(attendee, 'customFieldValues.nonExistent')).toBeUndefined();
    });

    it('should handle null intermediate values', () => {
      const attendee = { ...createAttendee(), customFieldValues: null as any };
      expect(getFieldValue(attendee, 'customFieldValues.status')).toBeNull();
    });
  });

  describe('evaluateRuleGroup function', () => {
    it('should evaluate AND groups correctly', () => {
      const attendee = createAttendee({ status: 'VIP', age: 30 });
      const group: RuleGroup = {
        logic: 'AND',
        conditions: [
          { field: 'customFieldValues.status', operator: 'equals', value: 'VIP' },
          { field: 'customFieldValues.age', operator: 'greater_than', value: 25 },
        ],
      };
      expect(evaluateRuleGroup(group, attendee)).toBe(true);
    });

    it('should fail AND groups when one condition fails', () => {
      const attendee = createAttendee({ status: 'VIP', age: 20 });
      const group: RuleGroup = {
        logic: 'AND',
        conditions: [
          { field: 'customFieldValues.status', operator: 'equals', value: 'VIP' },
          { field: 'customFieldValues.age', operator: 'greater_than', value: 25 },
        ],
      };
      expect(evaluateRuleGroup(group, attendee)).toBe(false);
    });

    it('should evaluate OR groups correctly', () => {
      const attendee = createAttendee({ status: 'General', age: 30 });
      const group: RuleGroup = {
        logic: 'OR',
        conditions: [
          { field: 'customFieldValues.status', operator: 'equals', value: 'VIP' },
          { field: 'customFieldValues.age', operator: 'greater_than', value: 25 },
        ],
      };
      expect(evaluateRuleGroup(group, attendee)).toBe(true);
    });

    it('should fail OR groups when all conditions fail', () => {
      const attendee = createAttendee({ status: 'General', age: 20 });
      const group: RuleGroup = {
        logic: 'OR',
        conditions: [
          { field: 'customFieldValues.status', operator: 'equals', value: 'VIP' },
          { field: 'customFieldValues.age', operator: 'greater_than', value: 25 },
        ],
      };
      expect(evaluateRuleGroup(group, attendee)).toBe(false);
    });

    it('should handle nested groups', () => {
      const attendee = createAttendee({ status: 'VIP', age: 30, company: 'Acme' });
      const group: RuleGroup = {
        logic: 'AND',
        conditions: [
          {
            logic: 'OR',
            conditions: [
              { field: 'customFieldValues.status', operator: 'equals', value: 'VIP' },
              { field: 'customFieldValues.status', operator: 'equals', value: 'Staff' },
            ],
          },
          { field: 'customFieldValues.age', operator: 'greater_than', value: 25 },
        ],
      };
      expect(evaluateRuleGroup(group, attendee)).toBe(true);
    });
  });
});
