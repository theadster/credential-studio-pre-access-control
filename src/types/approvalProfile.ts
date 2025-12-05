import { z } from 'zod';

/**
 * Rule operators supported by the approval profile system
 */
export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'in_list'
  | 'not_in_list'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'is_true'
  | 'is_false'
  | 'is_empty'
  | 'is_not_empty';

/**
 * A single rule that evaluates an attendee field against expected values
 */
export interface Rule {
  field: string;             // Field path (e.g., "firstName", "customFieldValues.vipStatus")
  operator: RuleOperator;
  value: any;                // Comparison value(s)
}

/**
 * A group of rules combined with AND or OR logic
 */
export interface RuleGroup {
  logic: 'AND' | 'OR';
  conditions: (Rule | RuleGroup)[];
}

/**
 * Approval profile as returned by the API
 * 
 * Note: The `rules` field is stored as a JSON string in the database,
 * but the API layer parses it and returns it as a RuleGroup object
 * for consistent typing across the application.
 */
export interface ApprovalProfile {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
  $sequence: number;
  name: string;              // Unique name
  description: string | null;
  version: number;           // Increments on each save
  rules: RuleGroup;          // Parsed RuleGroup object (API normalizes this)
  isDeleted: boolean;        // Soft delete flag
}

// Zod Schemas for validation

/**
 * Schema for RuleOperator
 */
export const RuleOperatorSchema = z.enum([
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
  'is_not_empty',
]);

/**
 * Schema for Rule
 */
export const RuleSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: RuleOperatorSchema,
  value: z.any(),
}) as z.ZodType<Rule>;

/**
 * Schema for RuleGroup (recursive)
 */
export const RuleGroupSchema: z.ZodType<RuleGroup> = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']),
    conditions: z.array(
      z.union([RuleSchema, RuleGroupSchema])
    ).min(1, 'At least one condition is required'),
  })
);

/**
 * Schema for creating a new approval profile
 */
export const CreateApprovalProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().nullable().optional(),
  rules: RuleGroupSchema,
});

/**
 * Schema for updating an existing approval profile
 */
export const UpdateApprovalProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().nullable().optional(),
  rules: RuleGroupSchema.optional(),
});

/**
 * Type for creating a new approval profile
 */
export type CreateApprovalProfileInput = z.infer<typeof CreateApprovalProfileSchema>;

/**
 * Type for updating an existing approval profile
 */
export type UpdateApprovalProfileInput = z.infer<typeof UpdateApprovalProfileSchema>;
