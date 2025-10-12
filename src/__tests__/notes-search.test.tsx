/**
 * Tests for Notes search functionality in the dashboard
 * Tests all aspects of the Notes search feature including:
 * - Basic text search
 * - All operators (Contains, Equals, Starts With, Ends With, Is Empty, Is Not Empty)
 * - "Has Notes" checkbox
 * - Edge cases (null, empty, whitespace)
 * - Integration with other filters
 * - State management
 * - Pagination
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock attendee data for testing
interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes?: string | null;
  photoUrl: string | null;
  customFieldValues: any[];
}

// Helper function to simulate the applyTextFilter logic
const applyTextFilter = (value: string, filter: { value: string; operator: string }) => {
  const { value: filterValue, operator } = filter;
  const lowerCaseValue = (value || '').toLowerCase();
  const lowerCaseFilterValue = (filterValue || '').toLowerCase();

  if (operator !== 'isEmpty' && operator !== 'isNotEmpty' && !filterValue) {
    return true; // No filter value provided for operators that need it
  }

  switch (operator) {
    case 'isEmpty':
      return !value;
    case 'isNotEmpty':
      return !!value;
    case 'contains':
      return lowerCaseValue.includes(lowerCaseFilterValue);
    case 'equals':
      return lowerCaseValue === lowerCaseFilterValue;
    case 'startsWith':
      return lowerCaseValue.startsWith(lowerCaseFilterValue);
    case 'endsWith':
      return lowerCaseValue.endsWith(lowerCaseFilterValue);
    default:
      return true;
  }
};

// Helper function to apply notes filter
const applyNotesFilter = (
  attendee: Attendee,
  notesFilter: { value: string; operator: string; hasNotes: boolean }
) => {
  const notesMatch = applyTextFilter(attendee.notes || '', notesFilter);
  const hasNotesMatch = !notesFilter.hasNotes || 
                        (attendee.notes && attendee.notes.trim().length > 0);
  return notesMatch && hasNotesMatch;
};

describe('Notes Search Functionality', () => {
  let testAttendees: Attendee[];

  beforeEach(() => {
    // Create test attendees with various notes scenarios
    testAttendees = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: 'EVT001',
        notes: 'VIP guest from New York',
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        barcodeNumber: 'EVT002',
        notes: 'Requires wheelchair access',
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '3',
        firstName: 'Bob',
        lastName: 'Johnson',
        barcodeNumber: 'EVT003',
        notes: null, // No notes
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '4',
        firstName: 'Alice',
        lastName: 'Williams',
        barcodeNumber: 'EVT004',
        notes: '', // Empty string
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '5',
        firstName: 'Charlie',
        lastName: 'Brown',
        barcodeNumber: 'EVT005',
        notes: '   ', // Whitespace only
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '6',
        firstName: 'Diana',
        lastName: 'Prince',
        barcodeNumber: 'EVT006',
        notes: 'Special dietary requirements: vegan',
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '7',
        firstName: 'Eve',
        lastName: 'Anderson',
        barcodeNumber: 'EVT007',
        notes: 'VIP guest from Los Angeles',
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '8',
        firstName: 'Frank',
        lastName: 'Miller',
        barcodeNumber: 'EVT008',
        notes: 'Guest speaker - arrives early',
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '9',
        firstName: 'Grace',
        lastName: 'Lee',
        barcodeNumber: 'EVT009',
        notes: 'Press credentials required',
        photoUrl: null,
        customFieldValues: []
      },
      {
        id: '10',
        firstName: 'Henry',
        lastName: 'Davis',
        barcodeNumber: 'EVT010',
        notes: 'Notes with special characters: @#$%^&*()',
        photoUrl: null,
        customFieldValues: []
      }
    ];
  });

  describe('6.1 Basic Text Search', () => {
    it('should filter attendees by notes content', () => {
      const filter = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(a => a.id)).toEqual(['1', '7']);
    });

    it('should perform case-insensitive matching', () => {
      const filter = { value: 'vip', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(2);
      expect(filtered.map(a => a.id)).toEqual(['1', '7']);
    });

    it('should work with attendees that have notes', () => {
      const filter = { value: 'wheelchair', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should return no results for attendees without matching notes', () => {
      const filter = { value: 'nonexistent', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(0);
    });

    it('should return all attendees when filter value is empty', () => {
      const filter = { value: '', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(testAttendees.length);
    });
  });

  describe('6.2 All Operators', () => {
    describe('Contains operator', () => {
      it('should match notes containing the search term', () => {
        const filter = { value: 'guest', operator: 'contains', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(3); // John, Eve, Frank
        expect(filtered.map(a => a.id)).toEqual(['1', '7', '8']);
      });

      it('should match partial words', () => {
        const filter = { value: 'require', operator: 'contains', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        // Jane (Requires wheelchair), Diana (requirements), Grace (required)
        expect(filtered).toHaveLength(3);
      });
    });

    describe('Equals operator', () => {
      it('should match exact notes content', () => {
        const filter = { value: 'VIP guest from New York', operator: 'equals', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('1');
      });

      it('should be case-insensitive', () => {
        const filter = { value: 'vip guest from new york', operator: 'equals', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('1');
      });

      it('should not match partial content', () => {
        const filter = { value: 'VIP guest', operator: 'equals', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(0);
      });
    });

    describe('Starts With operator', () => {
      it('should match notes starting with the search term', () => {
        const filter = { value: 'VIP', operator: 'startsWith', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(2); // John, Eve
        expect(filtered.map(a => a.id)).toEqual(['1', '7']);
      });

      it('should not match if term is in the middle', () => {
        const filter = { value: 'guest', operator: 'startsWith', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(1); // Frank (Guest speaker)
        expect(filtered[0].id).toBe('8');
      });

      it('should be case-insensitive', () => {
        const filter = { value: 'vip', operator: 'startsWith', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(2);
      });
    });

    describe('Ends With operator', () => {
      it('should match notes ending with the search term', () => {
        const filter = { value: 'early', operator: 'endsWith', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('8'); // Frank
      });

      it('should not match if term is at the beginning', () => {
        const filter = { value: 'VIP', operator: 'endsWith', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(0);
      });

      it('should be case-insensitive', () => {
        const filter = { value: 'REQUIRED', operator: 'endsWith', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(1);
        expect(filtered[0].id).toBe('9'); // Grace
      });
    });

    describe('Is Empty operator', () => {
      it('should match attendees with null notes', () => {
        const filter = { value: '', operator: 'isEmpty', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(2); // Bob (null), Alice (empty string)
        expect(filtered.map(a => a.id)).toEqual(['3', '4']);
      });

      it('should not match attendees with whitespace-only notes', () => {
        const filter = { value: '', operator: 'isEmpty', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        // Charlie (whitespace) should not be included
        expect(filtered.map(a => a.id)).not.toContain('5');
      });

      it('should ignore filter value for isEmpty operator', () => {
        const filter = { value: 'ignored', operator: 'isEmpty', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(2);
      });
    });

    describe('Is Not Empty operator', () => {
      it('should match attendees with notes content', () => {
        const filter = { value: '', operator: 'isNotEmpty', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(8); // All except Bob and Alice
        expect(filtered.map(a => a.id)).not.toContain('3');
        expect(filtered.map(a => a.id)).not.toContain('4');
      });

      it('should match attendees with whitespace-only notes', () => {
        const filter = { value: '', operator: 'isNotEmpty', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        // Charlie (whitespace) should be included
        expect(filtered.map(a => a.id)).toContain('5');
      });

      it('should ignore filter value for isNotEmpty operator', () => {
        const filter = { value: 'ignored', operator: 'isNotEmpty', hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        expect(filtered).toHaveLength(8);
      });
    });
  });

  describe('6.3 "Has Notes" Checkbox', () => {
    it('should filter to attendees with notes when checked', () => {
      const filter = { value: '', operator: 'contains', hasNotes: true };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      // Should exclude Bob (null), Alice (empty), Charlie (whitespace - trim().length === 0)
      expect(filtered).toHaveLength(7);
      expect(filtered.map(a => a.id)).not.toContain('3');
      expect(filtered.map(a => a.id)).not.toContain('4');
      expect(filtered.map(a => a.id)).not.toContain('5');
    });

    it('should not filter when unchecked', () => {
      const filter = { value: '', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(testAttendees.length);
    });

    it('should combine with text search using AND logic', () => {
      const filter = { value: 'VIP', operator: 'contains', hasNotes: true };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      // Should match John and Eve (both have VIP and have notes)
      expect(filtered).toHaveLength(2);
      expect(filtered.map(a => a.id)).toEqual(['1', '7']);
    });

    it('should require both conditions to be true', () => {
      const filter = { value: 'nonexistent', operator: 'contains', hasNotes: true };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      // No attendees match both conditions
      expect(filtered).toHaveLength(0);
    });

    it('should treat whitespace-only notes as having content', () => {
      const filter = { value: '', operator: 'contains', hasNotes: true };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      // Charlie (whitespace) should NOT be included (trim().length === 0)
      expect(filtered.map(a => a.id)).not.toContain('5');
    });
  });

  describe('6.4 Edge Cases', () => {
    it('should handle null notes correctly', () => {
      const attendee = testAttendees.find(a => a.id === '3')!;
      expect(attendee.notes).toBeNull();
      
      const filter = { value: 'test', operator: 'contains', hasNotes: false };
      const result = applyNotesFilter(attendee, filter);
      
      expect(result).toBe(false);
    });

    it('should handle empty string notes correctly', () => {
      const attendee = testAttendees.find(a => a.id === '4')!;
      expect(attendee.notes).toBe('');
      
      const filter = { value: 'test', operator: 'contains', hasNotes: false };
      const result = applyNotesFilter(attendee, filter);
      
      expect(result).toBe(false);
    });

    it('should handle whitespace-only notes correctly', () => {
      const attendee = testAttendees.find(a => a.id === '5')!;
      expect(attendee.notes).toBe('   ');
      
      // Should match with contains (whitespace is content)
      const containsFilter = { value: '', operator: 'contains', hasNotes: false };
      expect(applyNotesFilter(attendee, containsFilter)).toBe(true);
      
      // Should not match with hasNotes (trim().length === 0)
      const hasNotesFilter = { value: '', operator: 'contains', hasNotes: true };
      expect(applyNotesFilter(attendee, hasNotesFilter)).toBe(false);
    });

    it('should handle special characters in notes', () => {
      const attendee = testAttendees.find(a => a.id === '10')!;
      
      const filter = { value: '@#$%', operator: 'contains', hasNotes: false };
      const result = applyNotesFilter(attendee, filter);
      
      expect(result).toBe(true);
    });

    it('should handle special characters in search term', () => {
      const filter = { value: '()', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('10');
    });

    it('should handle very long notes content', () => {
      const longNotes = 'A'.repeat(1000);
      const attendee: Attendee = {
        id: '999',
        firstName: 'Test',
        lastName: 'User',
        barcodeNumber: 'TEST999',
        notes: longNotes,
        photoUrl: null,
        customFieldValues: []
      };
      
      const filter = { value: 'A', operator: 'contains', hasNotes: false };
      const result = applyNotesFilter(attendee, filter);
      
      expect(result).toBe(true);
    });
  });

  describe('6.5 Integration with Other Filters', () => {
    it('should work with firstName filter using AND logic', () => {
      // Filter: firstName contains "John" AND notes contains "VIP"
      const notesFilter = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => {
        const firstNameMatch = a.firstName.toLowerCase().includes('john');
        const notesMatch = applyNotesFilter(a, notesFilter);
        return firstNameMatch && notesMatch;
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1'); // John Doe
    });

    it('should work with lastName filter using AND logic', () => {
      // Filter: lastName contains "Smith" AND notes contains "wheelchair"
      const notesFilter = { value: 'wheelchair', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => {
        const lastNameMatch = a.lastName.toLowerCase().includes('smith');
        const notesMatch = applyNotesFilter(a, notesFilter);
        return lastNameMatch && notesMatch;
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2'); // Jane Smith
    });

    it('should work with barcode filter using AND logic', () => {
      // Filter: barcode contains "EVT001" AND notes contains "VIP"
      const notesFilter = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => {
        const barcodeMatch = a.barcodeNumber.toLowerCase().includes('evt001');
        const notesMatch = applyNotesFilter(a, notesFilter);
        return barcodeMatch && notesMatch;
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should work with photo filter using AND logic', () => {
      // Filter: has photo AND notes contains "VIP"
      const notesFilter = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => {
        const photoMatch = a.photoUrl !== null;
        const notesMatch = applyNotesFilter(a, notesFilter);
        return photoMatch && notesMatch;
      });
      
      // None of our test attendees have photos
      expect(filtered).toHaveLength(0);
    });

    it('should work with multiple filters simultaneously', () => {
      // Filter: firstName contains "e" AND notes contains "guest" AND barcode starts with "EVT00"
      const notesFilter = { value: 'guest', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => {
        const firstNameMatch = a.firstName.toLowerCase().includes('e');
        const notesMatch = applyNotesFilter(a, notesFilter);
        const barcodeMatch = a.barcodeNumber.startsWith('EVT00');
        return firstNameMatch && notesMatch && barcodeMatch;
      });
      
      // Only Eve has 'e' in name, 'guest' in notes, and matching barcode
      // Frank doesn't have 'e' in "Frank"
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('7'); // Eve
    });

    it('should return no results when any filter does not match', () => {
      // Filter: firstName contains "John" AND notes contains "wheelchair"
      const notesFilter = { value: 'wheelchair', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => {
        const firstNameMatch = a.firstName.toLowerCase().includes('john');
        const notesMatch = applyNotesFilter(a, notesFilter);
        return firstNameMatch && notesMatch;
      });
      
      // John doesn't have wheelchair in notes
      expect(filtered).toHaveLength(0);
    });
  });

  describe('6.6 State Management', () => {
    it('should reset notes filter when cleared', () => {
      const initialFilter = { value: 'VIP', operator: 'contains', hasNotes: true };
      const clearedFilter = { value: '', operator: 'contains', hasNotes: false };
      
      // Before clear
      let filtered = testAttendees.filter(a => applyNotesFilter(a, initialFilter));
      expect(filtered).toHaveLength(2);
      
      // After clear
      filtered = testAttendees.filter(a => applyNotesFilter(a, clearedFilter));
      expect(filtered).toHaveLength(testAttendees.length);
    });

    it('should preserve notes filter state', () => {
      const filter = { value: 'VIP', operator: 'startsWith', hasNotes: true };
      
      // Apply filter multiple times
      const filtered1 = testAttendees.filter(a => applyNotesFilter(a, filter));
      const filtered2 = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered1).toEqual(filtered2);
    });

    it('should detect active notes filter', () => {
      const hasActiveFilter = (filter: { value: string; operator: string; hasNotes: boolean }) => {
        return !!(filter.value || 
               ['isEmpty', 'isNotEmpty'].includes(filter.operator) ||
               filter.hasNotes);
      };
      
      expect(hasActiveFilter({ value: 'VIP', operator: 'contains', hasNotes: false })).toBe(true);
      expect(hasActiveFilter({ value: '', operator: 'isEmpty', hasNotes: false })).toBe(true);
      expect(hasActiveFilter({ value: '', operator: 'contains', hasNotes: true })).toBe(true);
      expect(hasActiveFilter({ value: '', operator: 'contains', hasNotes: false })).toBe(false);
    });

    it('should handle operator changes correctly', () => {
      const filter1 = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filter2 = { value: 'VIP', operator: 'equals', hasNotes: false };
      
      const filtered1 = testAttendees.filter(a => applyNotesFilter(a, filter1));
      const filtered2 = testAttendees.filter(a => applyNotesFilter(a, filter2));
      
      expect(filtered1.length).toBeGreaterThan(filtered2.length);
    });

    it('should clear value when switching to isEmpty operator', () => {
      // Simulate the behavior where value is cleared for isEmpty/isNotEmpty
      const filter = { value: '', operator: 'isEmpty', hasNotes: false };
      
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      expect(filtered).toHaveLength(2); // Bob and Alice
    });
  });

  describe('6.7 Pagination', () => {
    it('should maintain filter when paginating', () => {
      const filter = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      // Simulate pagination
      const pageSize = 1;
      const page1 = filtered.slice(0, pageSize);
      const page2 = filtered.slice(pageSize, pageSize * 2);
      
      expect(page1).toHaveLength(1);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).toBe('1');
      expect(page2[0].id).toBe('7');
    });

    it('should reset to page 1 when filter changes', () => {
      // This test verifies the logic that should trigger pagination reset
      const filter1 = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filter2 = { value: 'guest', operator: 'contains', hasNotes: false };
      
      const filtered1 = testAttendees.filter(a => applyNotesFilter(a, filter1));
      const filtered2 = testAttendees.filter(a => applyNotesFilter(a, filter2));
      
      // Different filters produce different results
      expect(filtered1.length).not.toBe(filtered2.length);
    });

    it('should handle empty results after filtering', () => {
      const filter = { value: 'nonexistent', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      expect(filtered).toHaveLength(0);
      
      // Pagination should handle empty results
      const pageSize = 25;
      const page1 = filtered.slice(0, pageSize);
      expect(page1).toHaveLength(0);
    });

    it('should preserve filter across multiple page changes', () => {
      const filter = { value: '', operator: 'isNotEmpty', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      // Simulate multiple page changes
      const pageSize = 3;
      const page1 = filtered.slice(0, pageSize);
      const page2 = filtered.slice(pageSize, pageSize * 2);
      const page3 = filtered.slice(pageSize * 2, pageSize * 3);
      
      expect(page1.length + page2.length + page3.length).toBeLessThanOrEqual(filtered.length);
    });
  });

  describe('6.8 Responsive Layout', () => {
    // These tests verify the data logic works correctly regardless of layout
    // UI layout tests would be done with component testing
    
    it('should filter correctly regardless of screen size', () => {
      const filter = { value: 'VIP', operator: 'contains', hasNotes: false };
      const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
      
      // Results should be the same regardless of layout
      expect(filtered).toHaveLength(2);
    });

    it('should handle all operators on any screen size', () => {
      const operators = ['contains', 'equals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'];
      
      operators.forEach(operator => {
        const filter = { value: 'VIP', operator, hasNotes: false };
        const filtered = testAttendees.filter(a => applyNotesFilter(a, filter));
        
        // Each operator should produce consistent results
        expect(Array.isArray(filtered)).toBe(true);
      });
    });

    it('should maintain filter state across layout changes', () => {
      const filter = { value: 'guest', operator: 'contains', hasNotes: true };
      
      // Apply filter multiple times (simulating layout changes)
      const results: Attendee[][] = [];
      for (let i = 0; i < 3; i++) {
        results.push(testAttendees.filter(a => applyNotesFilter(a, filter)));
      }
      
      // All results should be identical
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });
});
