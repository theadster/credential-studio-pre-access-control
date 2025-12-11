import { describe, expect, it } from 'vitest';

/**
 * Bulk Export PDF - Outdated Credential Detection Logic Tests
 * 
 * These tests verify the logic for determining if a credential is outdated
 * based on comparing credentialGeneratedAt with lastSignificantUpdate.
 * 
 * The logic is:
 * - If credentialGeneratedAt >= lastSignificantUpdate: CURRENT
 * - If credentialGeneratedAt < lastSignificantUpdate: OUTDATED
 * - If no credentialGeneratedAt: OUTDATED
 * - If no lastSignificantUpdate: CURRENT
 */

describe('Bulk Export PDF - Outdated Credential Detection Logic', () => {
  /**
   * Helper function that implements the outdated credential detection logic
   * This mirrors the logic in src/pages/api/attendees/bulk-export-pdf.ts
   */
  const isCredentialOutdated = (attendee: any): boolean => {
    // No generation timestamp means outdated
    if (!attendee.credentialGeneratedAt) return true;
    
    const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
    
    // If lastSignificantUpdate doesn't exist, credential is current
    // (no printable changes have been tracked)
    if (!attendee.lastSignificantUpdate) return false;
    
    const lastSignificantUpdate = new Date(attendee.lastSignificantUpdate);
    
    // Credential is outdated if it was generated before the last significant update
    return credentialGeneratedAt < lastSignificantUpdate;
  };

  describe('Requirement: Outdated credentials detection using lastSignificantUpdate', () => {
    it('should mark credential as outdated when credentialGeneratedAt < lastSignificantUpdate', () => {
      const attendee = {
        firstName: 'John',
        lastName: 'Doe',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z', // Generated on Jan 5
        lastSignificantUpdate: '2024-01-06T10:00:00.000Z', // Printable field updated on Jan 6
      };

      expect(isCredentialOutdated(attendee)).toBe(true);
    });

    it('should mark credential as current when credentialGeneratedAt >= lastSignificantUpdate', () => {
      const attendee = {
        firstName: 'Jane',
        lastName: 'Smith',
        credentialGeneratedAt: '2024-01-06T10:00:00.000Z', // Generated on Jan 6
        lastSignificantUpdate: '2024-01-05T10:00:00.000Z', // Printable field updated on Jan 5
      };

      expect(isCredentialOutdated(attendee)).toBe(false);
    });

    it('should mark credential as current when credentialGeneratedAt equals lastSignificantUpdate', () => {
      const attendee = {
        firstName: 'Bob',
        lastName: 'Johnson',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        lastSignificantUpdate: '2024-01-05T10:00:00.000Z',
      };

      expect(isCredentialOutdated(attendee)).toBe(false);
    });

    it('should mark credential as current when lastSignificantUpdate is missing (legacy record)', () => {
      const attendee = {
        firstName: 'Alice',
        lastName: 'Williams',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        lastSignificantUpdate: null,
      };

      expect(isCredentialOutdated(attendee)).toBe(false);
    });

    it('should mark credential as current when lastSignificantUpdate is undefined (legacy record)', () => {
      const attendee = {
        firstName: 'Charlie',
        lastName: 'Brown',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        // lastSignificantUpdate is undefined
      };

      expect(isCredentialOutdated(attendee)).toBe(false);
    });

    it('should mark credential as outdated when credentialGeneratedAt is missing', () => {
      const attendee = {
        firstName: 'Diana',
        lastName: 'Prince',
        credentialGeneratedAt: null,
        lastSignificantUpdate: '2024-01-05T10:00:00.000Z',
      };

      expect(isCredentialOutdated(attendee)).toBe(true);
    });

    it('should mark credential as outdated when credentialGeneratedAt is undefined', () => {
      const attendee = {
        firstName: 'Eve',
        lastName: 'Adams',
        // credentialGeneratedAt is undefined
        lastSignificantUpdate: '2024-01-05T10:00:00.000Z',
      };

      expect(isCredentialOutdated(attendee)).toBe(true);
    });

    it('should correctly handle multiple attendees with mixed statuses', () => {
      const attendees = [
        {
          name: 'Current User',
          credentialGeneratedAt: '2024-01-06T10:00:00.000Z',
          lastSignificantUpdate: '2024-01-05T10:00:00.000Z',
        },
        {
          name: 'Outdated User',
          credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
          lastSignificantUpdate: '2024-01-06T10:00:00.000Z',
        },
        {
          name: 'Legacy User',
          credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
          lastSignificantUpdate: null,
        },
        {
          name: 'Never Generated',
          credentialGeneratedAt: null,
          lastSignificantUpdate: '2024-01-05T10:00:00.000Z',
        },
      ];

      const outdatedAttendees = attendees.filter(a => isCredentialOutdated(a));

      expect(outdatedAttendees).toHaveLength(2);
      expect(outdatedAttendees.map(a => a.name)).toContain('Outdated User');
      expect(outdatedAttendees.map(a => a.name)).toContain('Never Generated');
      expect(outdatedAttendees.map(a => a.name)).not.toContain('Current User');
      expect(outdatedAttendees.map(a => a.name)).not.toContain('Legacy User');
    });

    it('should handle edge case: credential generated milliseconds before update', () => {
      const attendee = {
        firstName: 'Frank',
        lastName: 'Miller',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        lastSignificantUpdate: '2024-01-05T10:00:00.001Z', // 1ms later
      };

      expect(isCredentialOutdated(attendee)).toBe(true);
    });

    it('should handle edge case: credential generated milliseconds after update', () => {
      const attendee = {
        firstName: 'Grace',
        lastName: 'Hopper',
        credentialGeneratedAt: '2024-01-05T10:00:00.001Z', // 1ms later
        lastSignificantUpdate: '2024-01-05T10:00:00.000Z',
      };

      expect(isCredentialOutdated(attendee)).toBe(false);
    });
  });

  describe('Comparison with old logic (using updatedAt)', () => {
    /**
     * Old logic that compared credentialGeneratedAt with updatedAt
     * This is what was being used before the fix
     */
    const isCredentialOutdatedOldLogic = (attendee: any): boolean => {
      if (!attendee.credentialGeneratedAt) return true;
      
      const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
      
      // Guard: updatedAt must exist and be valid
      if (!attendee.updatedAt) return false;
      
      const recordUpdatedAt = new Date(attendee.updatedAt);
      
      // Guard: Check for Invalid Date
      if (isNaN(recordUpdatedAt.getTime())) return false;
      
      const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
      const isCredentialFromSameUpdate = timeDifference <= 5000;
      
      if (isCredentialFromSameUpdate) {
        return false;
      }
      return credentialGeneratedAt < recordUpdatedAt;
    };

    it('should differ from old logic: non-printable field update should not mark as outdated', () => {
      // Scenario: User updates email (non-printable field)
      // Old logic: Would mark as outdated because updatedAt changed
      // New logic: Should NOT mark as outdated because lastSignificantUpdate didn't change
      const attendee = {
        firstName: 'Henry',
        lastName: 'Ford',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        lastSignificantUpdate: '2024-01-05T10:00:00.000Z', // No printable changes
        updatedAt: '2024-01-06T10:00:00.000Z', // Record was updated (email changed)
      };

      // Old logic would mark as outdated
      expect(isCredentialOutdatedOldLogic(attendee)).toBe(true);
      
      // New logic correctly marks as current
      expect(isCredentialOutdated(attendee)).toBe(false);
    });

    it('should match old logic: printable field update should mark as outdated', () => {
      // Scenario: User updates firstName (printable field)
      // Both old and new logic should mark as outdated
      const attendee = {
        firstName: 'Iris',
        lastName: 'West',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        lastSignificantUpdate: '2024-01-06T10:00:00.000Z', // Printable field changed
        updatedAt: '2024-01-06T10:00:00.000Z',
      };

      // Both should mark as outdated
      expect(isCredentialOutdatedOldLogic(attendee)).toBe(true);
      expect(isCredentialOutdated(attendee)).toBe(true);
    });

    it('should handle missing updatedAt gracefully (old logic guard)', () => {
      // Scenario: updatedAt is missing/null (legacy record)
      // Old logic should not crash and should return false
      const attendee = {
        firstName: 'Jack',
        lastName: 'Ryan',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        updatedAt: null,
      };

      expect(isCredentialOutdatedOldLogic(attendee)).toBe(false);
    });

    it('should handle invalid updatedAt gracefully (old logic guard)', () => {
      // Scenario: updatedAt is invalid date string
      // Old logic should not crash and should return false
      const attendee = {
        firstName: 'Kate',
        lastName: 'Bishop',
        credentialGeneratedAt: '2024-01-05T10:00:00.000Z',
        updatedAt: 'invalid-date',
      };

      expect(isCredentialOutdatedOldLogic(attendee)).toBe(false);
    });
  });
});
