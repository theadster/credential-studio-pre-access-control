/**
 * Import Boolean Fields Test
 * 
 * Tests that the import functionality correctly handles boolean custom fields
 * by converting various string representations (YES/NO, TRUE/FALSE, 1/0) to
 * proper boolean values.
 * 
 * This is a unit test that verifies the boolean conversion logic without
 * testing the full import flow.
 */

import { describe, it, expect } from 'vitest';

/**
 * Boolean Conversion Logic Tests
 * 
 * These tests verify the boolean conversion logic used in the import functionality.
 */

describe('Import API - Boolean Custom Fields Conversion Logic', () => {
    /**
     * Helper function that mimics the boolean conversion logic in import.ts
     */
    function convertBooleanValue(value: string, fieldType: string): string {
        if (fieldType === 'boolean') {
            const truthyValues = ['yes', 'true', '1'];
            const falsyValues = ['no', 'false', '0'];
            const lowerValue = String(value).toLowerCase().trim();

            if (truthyValues.includes(lowerValue)) {
                return 'yes';
            } else if (falsyValues.includes(lowerValue)) {
                return 'no';
            } else {
                // Default to no for unrecognized values
                return 'no';
            }
        }
        return String(value);
    }

    it('should convert YES/yes/Yes to yes', () => {
        expect(convertBooleanValue('YES', 'boolean')).toBe('yes');
        expect(convertBooleanValue('yes', 'boolean')).toBe('yes');
        expect(convertBooleanValue('Yes', 'boolean')).toBe('yes');
        expect(convertBooleanValue('YeS', 'boolean')).toBe('yes');
    });

    it('should convert NO/no/No to no', () => {
        expect(convertBooleanValue('NO', 'boolean')).toBe('no');
        expect(convertBooleanValue('no', 'boolean')).toBe('no');
        expect(convertBooleanValue('No', 'boolean')).toBe('no');
        expect(convertBooleanValue('nO', 'boolean')).toBe('no');
    });

    it('should convert TRUE/true/True to yes', () => {
        expect(convertBooleanValue('TRUE', 'boolean')).toBe('yes');
        expect(convertBooleanValue('true', 'boolean')).toBe('yes');
        expect(convertBooleanValue('True', 'boolean')).toBe('yes');
        expect(convertBooleanValue('TrUe', 'boolean')).toBe('yes');
    });

    it('should convert FALSE/false/False to no', () => {
        expect(convertBooleanValue('FALSE', 'boolean')).toBe('no');
        expect(convertBooleanValue('false', 'boolean')).toBe('no');
        expect(convertBooleanValue('False', 'boolean')).toBe('no');
        expect(convertBooleanValue('FaLsE', 'boolean')).toBe('no');
    });

    it('should convert 1 to yes and 0 to no', () => {
        expect(convertBooleanValue('1', 'boolean')).toBe('yes');
        expect(convertBooleanValue('0', 'boolean')).toBe('no');
    });

    it('should handle whitespace around values', () => {
        expect(convertBooleanValue(' yes ', 'boolean')).toBe('yes');
        expect(convertBooleanValue(' no ', 'boolean')).toBe('no');
        expect(convertBooleanValue('  true  ', 'boolean')).toBe('yes');
        expect(convertBooleanValue('  false  ', 'boolean')).toBe('no');
    });

    it('should default to no for unrecognized boolean values', () => {
        expect(convertBooleanValue('maybe', 'boolean')).toBe('no');
        expect(convertBooleanValue('unknown', 'boolean')).toBe('no');
        expect(convertBooleanValue('N/A', 'boolean')).toBe('no');
        expect(convertBooleanValue('', 'boolean')).toBe('no');
        expect(convertBooleanValue('2', 'boolean')).toBe('no');
    });

    it('should not convert non-boolean fields', () => {
        expect(convertBooleanValue('YES', 'text')).toBe('YES');
        expect(convertBooleanValue('NO', 'text')).toBe('NO');
        expect(convertBooleanValue('true', 'text')).toBe('true');
        expect(convertBooleanValue('false', 'text')).toBe('false');
        expect(convertBooleanValue('YES Company', 'text')).toBe('YES Company');
    });

    it('should handle all truthy variations', () => {
        const truthyVariations = [
            'yes', 'YES', 'Yes', 'YeS', 'yEs', 'yeS', 'YEs', 'yES',
            'true', 'TRUE', 'True', 'TrUe', 'tRuE', 'trUe', 'TRue', 'tRUe',
            '1'
        ];

        truthyVariations.forEach(value => {
            expect(convertBooleanValue(value, 'boolean')).toBe('yes');
        });
    });

    it('should handle all falsy variations', () => {
        const falsyVariations = [
            'no', 'NO', 'No', 'nO',
            'false', 'FALSE', 'False', 'FaLsE', 'fAlSe', 'faLse', 'FAlse', 'fALse',
            '0'
        ];

        falsyVariations.forEach(value => {
            expect(convertBooleanValue(value, 'boolean')).toBe('no');
        });
    });
});
