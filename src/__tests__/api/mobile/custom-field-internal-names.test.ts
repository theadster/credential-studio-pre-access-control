/**
 * Tests for Custom Field Internal Name Mapping
 * 
 * Verifies that mobile API endpoints correctly provide customFieldValuesByInternalName
 * for approval profile rule evaluation.
 */

import { describe, it, expect } from 'vitest';
import {
  mapCustomFieldValuesByInternalName,
  buildCustomFieldMaps,
  createAllCustomFieldMappings,
  CustomFieldDefinition,
} from '@/lib/customFieldMapping';
import { evaluateRule } from '@/lib/ruleEngine';
import type { Rule } from '@/types/approvalProfile';

describe('Custom Field Internal Name Mapping', () => {
  describe('Data Structure Verification', () => {
    it('should map field IDs to internal names correctly', () => {
      // Define custom field definitions
      const customFields: CustomFieldDefinition[] = [
        { $id: 'field-vip', fieldName: 'VIP Room', internalFieldName: 'vip_room' },
        { $id: 'field-dept', fieldName: 'Department', internalFieldName: 'department' },
        { $id: 'field-level', fieldName: 'Access Level', internalFieldName: 'access_level' },
      ];

      // Attendee custom field values (stored with field IDs)
      const customFieldValues = {
        'field-vip': 'Gold',
        'field-dept': 'Engineering',
        'field-level': 'Premium',
      };

      // Build mapping using exported function
      const [, customFieldInternalMap] = buildCustomFieldMaps(customFields);

      // Map values using exported function
      const customFieldValuesByInternalName = mapCustomFieldValuesByInternalName(
        customFieldValues,
        customFieldInternalMap,
      );

      // Verify mapping
      expect(customFieldValuesByInternalName).toEqual({
        'vip_room': 'Gold',
        'department': 'Engineering',
        'access_level': 'Premium',
      });
    });

    it('should handle missing internal names gracefully', () => {
      const customFields: CustomFieldDefinition[] = [
        { $id: 'field-vip', fieldName: 'VIP Room', internalFieldName: 'vip_room' },
        { $id: 'field-unknown', fieldName: 'Unknown Field' }, // Missing internalFieldName
      ];

      const customFieldValues = {
        'field-vip': 'Gold',
        'field-unknown': 'Some Value',
      };

      // Build mapping using exported function
      const [, customFieldInternalMap] = buildCustomFieldMaps(customFields);

      // Map values using exported function
      const customFieldValuesByInternalName = mapCustomFieldValuesByInternalName(
        customFieldValues,
        customFieldInternalMap,
      );

      // Should use field ID as fallback for missing internal name
      expect(customFieldValuesByInternalName['vip_room']).toBe('Gold');
      expect(customFieldValuesByInternalName['field-unknown']).toBe('Some Value');
    });

    it('should handle empty custom field values', () => {
      const customFieldValues = {};
      const customFieldInternalMap = new Map<string, string>();

      // Map values using exported function
      const customFieldValuesByInternalName = mapCustomFieldValuesByInternalName(
        customFieldValues,
        customFieldInternalMap,
      );

      expect(customFieldValuesByInternalName).toEqual({});
    });
  });

  describe('Approval Profile Rule Compatibility', () => {
    it('should provide correct field paths for approval profile rules', () => {
      // Simulate approval profile rule
      const rule: Rule = {
        field: 'customFieldValues.vip_room', // Uses internal name
        operator: 'equals',
        value: 'Gold',
      };

      // Simulate cached attendee data (as mobile app would have it)
      const cachedAttendee = {
        id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: null,
        customFieldValues: {
          'vip_room': 'Gold', // Internal name as key
          'department': 'Engineering',
        },
        accessEnabled: true,
        validFrom: null,
        validUntil: null,
      };

      // Evaluate rule using actual rule engine
      const ruleResult = evaluateRule(rule, cachedAttendee);

      // Rule evaluation should pass
      expect(ruleResult).toBe(true);
    });

    it('should support multiple custom field rules', () => {
      const rules: Rule[] = [
        { field: 'customFieldValues.vip_room', operator: 'equals', value: 'Gold' },
        { field: 'customFieldValues.department', operator: 'equals', value: 'Engineering' },
        { field: 'customFieldValues.access_level', operator: 'equals', value: 'Premium' },
      ];

      const cachedAttendee = {
        id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345',
        photoUrl: null,
        customFieldValues: {
          'vip_room': 'Gold',
          'department': 'Engineering',
          'access_level': 'Premium',
        },
        accessEnabled: true,
        validFrom: null,
        validUntil: null,
      };

      // Evaluate all rules using actual rule engine
      const results = rules.map(rule => evaluateRule(rule, cachedAttendee));

      // All rules should pass
      expect(results).toEqual([true, true, true]);
    });
  });

  describe('Three Mapping Formats', () => {
    it('should provide all three custom field mapping formats', () => {
      const customFields: CustomFieldDefinition[] = [
        { $id: 'field-vip', fieldName: 'VIP Room', internalFieldName: 'vip_room' },
      ];

      const rawCustomFieldValues = {
        'field-vip': 'Gold',
      };

      // Build all three mappings using exported function
      const [customFieldMap, customFieldInternalMap] = buildCustomFieldMaps(customFields);

      // Create all mappings using exported function
      const mappings = createAllCustomFieldMappings(
        rawCustomFieldValues,
        customFieldMap,
        customFieldInternalMap,
      );

      // Verify all three formats
      expect(mappings.customFieldValues).toEqual({ 'field-vip': 'Gold' }); // Field IDs
      expect(mappings.customFieldValuesByName).toEqual({ 'VIP Room': 'Gold' }); // Display names
      expect(mappings.customFieldValuesByInternalName).toEqual({ 'vip_room': 'Gold' }); // Internal names
    });

    it('should maintain consistency across all three formats', () => {
      const customFields: CustomFieldDefinition[] = [
        { $id: 'field-1', fieldName: 'First Name', internalFieldName: 'first_name' },
        { $id: 'field-2', fieldName: 'Last Name', internalFieldName: 'last_name' },
        { $id: 'field-3', fieldName: 'Company', internalFieldName: 'company' },
      ];

      const rawCustomFieldValues = {
        'field-1': 'John',
        'field-2': 'Doe',
        'field-3': 'Acme Corp',
      };

      // Build all three mappings using exported function
      const [customFieldMap, customFieldInternalMap] = buildCustomFieldMaps(customFields);

      // Create all mappings using exported function
      const mappings = createAllCustomFieldMappings(
        rawCustomFieldValues,
        customFieldMap,
        customFieldInternalMap,
      );

      // All three should have the same values, just different keys
      expect(Object.values(rawCustomFieldValues).sort()).toEqual(['Acme Corp', 'Doe', 'John']);
      expect(Object.values(mappings.customFieldValuesByName).sort()).toEqual(['Acme Corp', 'Doe', 'John']);
      expect(Object.values(mappings.customFieldValuesByInternalName).sort()).toEqual(['Acme Corp', 'Doe', 'John']);
    });
  });
});
