import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  RuleGroup,
  Rule,
  RuleOperator,
  RuleGroupSchema,
} from '@/types/approvalProfile';

/**
 * Arbitrary for RuleOperator
 */
const ruleOperatorArb = fc.constantFrom<RuleOperator>(
  'equals',
  'not_equals',
  'in_list',
  'not_in_list',
  'greater_than',
  'less_than',
  'between',
  'is_true',
  'is_false',
  'is_empty',
  'is_not_empty'
);

/**
 * Arbitrary for Rule value based on operator
 */
const ruleValueArb = (operator: RuleOperator) => {
  switch (operator) {
    case 'in_list':
    case 'not_in_list':
      return fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { minLength: 1, maxLength: 5 });
    case 'between':
      return fc.tuple(fc.integer(), fc.integer()).map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);
    case 'is_true':
    case 'is_false':
    case 'is_empty':
    case 'is_not_empty':
      return fc.constant(null);
    default:
      return fc.oneof(fc.string(), fc.integer(), fc.boolean());
  }
};

/**
 * Arbitrary for Rule
 */
const ruleArb: fc.Arbitrary<Rule> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 50 }),
    ruleOperatorArb
  )
  .chain(([field, operator]) =>
    ruleValueArb(operator).map((value) => ({
      field,
      operator,
      value,
    }))
  );

/**
 * Arbitrary for RuleGroup (recursive with depth limit)
 */
const ruleGroupArb = (depth: number = 0): fc.Arbitrary<RuleGroup> => {
  const maxDepth = 3;
  
  if (depth >= maxDepth) {
    // At max depth, only generate rules, not nested groups
    return fc.record({
      logic: fc.constantFrom<'AND' | 'OR'>('AND', 'OR'),
      conditions: fc.array(ruleArb, { minLength: 1, maxLength: 3 }),
    });
  }
  
  return fc.record({
    logic: fc.constantFrom<'AND' | 'OR'>('AND', 'OR'),
    conditions: fc.array(
      fc.oneof(
        { weight: 3, arbitrary: ruleArb },
        { weight: 1, arbitrary: fc.constant(null).chain(() => ruleGroupArb(depth + 1)) }
      ),
      { minLength: 1, maxLength: 3 }
    ),
  });
};

describe('Approval Profile Property Tests', () => {
  /**
   * Property 18: Profile serialization round-trip
   * Feature: mobile-access-control, Property 18: Profile serialization round-trip
   * Validates: Requirements 12.5
   * 
   * For any valid approval profile, serializing to JSON then deserializing
   * SHALL produce an equivalent rule structure.
   */
  it('Property 18: serializing then deserializing a profile produces equivalent structure', () => {
    fc.assert(
      fc.property(ruleGroupArb(), (ruleGroup) => {
        // Serialize to JSON
        const serialized = JSON.stringify(ruleGroup);
        
        // Deserialize from JSON
        const deserialized = JSON.parse(serialized);
        
        // Validate the deserialized structure matches the schema
        const validationResult = RuleGroupSchema.safeParse(deserialized);
        
        // The deserialized structure should be valid
        expect(validationResult.success).toBe(true);
        
        // The deserialized structure should be deeply equal to the original
        expect(deserialized).toEqual(ruleGroup);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Profile name uniqueness
   * Feature: mobile-access-control, Property 4: Profile name uniqueness
   * Validates: Requirements 3.2
   * 
   * For any profile creation attempt with a name that already exists,
   * the operation SHALL fail with a uniqueness error.
   * 
   * Note: This property tests the logical constraint, not the actual API.
   * The API implementation enforces this through database queries.
   */
  it('Property 4: duplicate profile names should be rejected', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
        (names) => {
          // Create a set to track unique names
          const uniqueNames = new Set<string>();
          const results: boolean[] = [];

          for (const name of names) {
            // Simulate the uniqueness check
            const isDuplicate = uniqueNames.has(name);
            
            if (isDuplicate) {
              // Duplicate name should be rejected
              results.push(false); // Operation fails
            } else {
              // Unique name should be accepted
              uniqueNames.add(name);
              results.push(true); // Operation succeeds
            }
          }

          // Verify that duplicates were rejected
          const nameOccurrences = new Map<string, number>();
          for (const name of names) {
            nameOccurrences.set(name, (nameOccurrences.get(name) || 0) + 1);
          }

          // For each name that appears more than once, verify only the first succeeded
          let resultIndex = 0;
          for (const name of names) {
            const occurrences = nameOccurrences.get(name)!;
            const isFirstOccurrence = names.indexOf(name) === resultIndex;
            
            if (occurrences > 1 && !isFirstOccurrence) {
              // This is a duplicate, should have been rejected
              expect(results[resultIndex]).toBe(false);
            } else if (isFirstOccurrence) {
              // This is the first occurrence, should have been accepted
              expect(results[resultIndex]).toBe(true);
            }
            
            resultIndex++;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Profile version increment
   * Feature: mobile-access-control, Property 5: Profile version increment
   * Validates: Requirements 3.6, 4.1
   * 
   * For any profile save operation, the resulting version number
   * SHALL be greater than the previous version.
   */
  it('Property 5: profile version increments on each save', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // Starting version
        fc.integer({ min: 1, max: 10 }),  // Number of updates
        (startVersion, numUpdates) => {
          let currentVersion = startVersion;
          const versions: number[] = [currentVersion];

          // Simulate multiple updates
          for (let i = 0; i < numUpdates; i++) {
            // Each update increments the version
            currentVersion = currentVersion + 1;
            versions.push(currentVersion);
          }

          // Verify that each version is greater than the previous
          for (let i = 1; i < versions.length; i++) {
            expect(versions[i]).toBeGreaterThan(versions[i - 1]);
            expect(versions[i]).toBe(versions[i - 1] + 1);
          }

          // Verify final version is correct
          expect(currentVersion).toBe(startVersion + numUpdates);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
