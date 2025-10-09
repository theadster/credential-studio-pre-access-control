import { describe, it, expect } from 'vitest';
import { validatePermissions } from '../validatePermissions';

describe('validatePermissions', () => {
  describe('valid permission structures', () => {
    it('should accept valid "all" permission as boolean', () => {
      const result = validatePermissions({ all: true });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid object with boolean CRUD permissions', () => {
      const result = validatePermissions({
        attendees: { read: true, create: false, update: true, delete: false }
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid array of permission strings', () => {
      const result = validatePermissions({
        users: ['read', 'update']
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept multiple valid permission keys', () => {
      const result = validatePermissions({
        roles: { read: true, create: true },
        users: { read: true },
        attendees: ['read', 'create', 'update'],
        logs: { read: true }
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept empty permissions object', () => {
      const result = validatePermissions({});
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept all allowed permission keys', () => {
      const result = validatePermissions({
        roles: { read: true },
        users: { read: true },
        attendees: { read: true },
        logs: { read: true },
        all: false
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('invalid permission structures - type validation', () => {
    it('should reject null permissions', () => {
      const result = validatePermissions(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permissions must be a valid JSON object');
    });

    it('should reject undefined permissions', () => {
      const result = validatePermissions(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permissions must be a valid JSON object');
    });

    it('should reject array as permissions', () => {
      const result = validatePermissions([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permissions must be a valid JSON object');
    });

    it('should reject string as permissions', () => {
      const result = validatePermissions('permissions');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permissions must be a valid JSON object');
    });

    it('should reject number as permissions', () => {
      const result = validatePermissions(123);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permissions must be a valid JSON object');
    });

    it('should reject boolean as permissions', () => {
      const result = validatePermissions(true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Permissions must be a valid JSON object');
    });
  });

  describe('invalid permission keys', () => {
    it('should reject unknown permission key', () => {
      const result = validatePermissions({
        invalidKey: { read: true }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid permission keys detected');
      expect(result.details?.message).toContain('Unknown permission keys: invalidKey');
      expect(result.details?.message).toContain('Allowed keys are: roles, users, attendees, logs, all');
      expect(result.details?.unknownKeys).toEqual(['invalidKey']);
    });

    it('should reject multiple unknown permission keys', () => {
      const result = validatePermissions({
        invalid1: { read: true },
        invalid2: { read: true },
        attendees: { read: true }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid permission keys detected');
      expect(result.details?.unknownKeys).toEqual(['invalid1', 'invalid2']);
      expect(result.details?.message).toContain('invalid1, invalid2');
    });

    it('should reject typo in permission key', () => {
      const result = validatePermissions({
        atendees: { read: true } // typo: missing 't'
      });
      expect(result.valid).toBe(false);
      expect(result.details?.unknownKeys).toEqual(['atendees']);
    });
  });

  describe('invalid "all" permission value', () => {
    it('should reject "all" permission as string', () => {
      const result = validatePermissions({
        all: 'yes'
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid permission value type');
      expect(result.details?.message).toContain("Permission 'all' must be a boolean, got string");
      expect(result.details?.key).toBe('all');
    });

    it('should reject "all" permission as number', () => {
      const result = validatePermissions({
        all: 1
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'all' must be a boolean, got number");
      expect(result.details?.key).toBe('all');
    });

    it('should reject "all" permission as object', () => {
      const result = validatePermissions({
        all: { read: true }
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'all' must be a boolean, got object");
      expect(result.details?.key).toBe('all');
    });

    it('should reject "all" permission as array', () => {
      const result = validatePermissions({
        all: ['read']
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'all' must be a boolean, got object");
      expect(result.details?.key).toBe('all');
    });
  });

  describe('invalid object permission values', () => {
    it('should reject null as permission value', () => {
      const result = validatePermissions({
        attendees: null
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid permission value type');
      expect(result.details?.message).toContain("Permission 'attendees' must be an object or array, got object");
      expect(result.details?.key).toBe('attendees');
    });

    it('should reject string as permission value', () => {
      const result = validatePermissions({
        users: 'read'
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'users' must be an object or array, got string");
      expect(result.details?.key).toBe('users');
    });

    it('should reject number as permission value', () => {
      const result = validatePermissions({
        roles: 123
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'roles' must be an object or array, got number");
      expect(result.details?.key).toBe('roles');
    });

    it('should reject boolean as permission value for non-all keys', () => {
      const result = validatePermissions({
        attendees: true
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'attendees' must be an object or array, got boolean");
      expect(result.details?.key).toBe('attendees');
    });
  });

  describe('invalid nested permission values', () => {
    it('should reject non-boolean value in permission object', () => {
      const result = validatePermissions({
        attendees: { read: 'yes' }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid permission value type');
      expect(result.details?.message).toContain("Permission 'attendees.read' must be a boolean, got string");
      expect(result.details?.key).toBe('attendees.read');
    });

    it('should reject number in permission object', () => {
      const result = validatePermissions({
        users: { create: 1 }
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'users.create' must be a boolean, got number");
      expect(result.details?.key).toBe('users.create');
    });

    it('should reject null in permission object', () => {
      const result = validatePermissions({
        roles: { update: null }
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'roles.update' must be a boolean, got object");
      expect(result.details?.key).toBe('roles.update');
    });

    it('should reject object in permission object', () => {
      const result = validatePermissions({
        logs: { delete: { nested: true } }
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'logs.delete' must be a boolean, got object");
      expect(result.details?.key).toBe('logs.delete');
    });

    it('should reject array in permission object', () => {
      const result = validatePermissions({
        attendees: { read: ['value'] }
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'attendees.read' must be a boolean, got object");
      expect(result.details?.key).toBe('attendees.read');
    });
  });

  describe('invalid array permission values', () => {
    it('should reject non-string element in permission array', () => {
      const result = validatePermissions({
        users: ['read', 123]
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid permission value type');
      expect(result.details?.message).toContain("Permission 'users[1]' must be a string, got number");
      expect(result.details?.key).toBe('users[1]');
    });

    it('should reject boolean in permission array', () => {
      const result = validatePermissions({
        attendees: [true, 'read']
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'attendees[0]' must be a string, got boolean");
      expect(result.details?.key).toBe('attendees[0]');
    });

    it('should reject null in permission array', () => {
      const result = validatePermissions({
        roles: ['read', null]
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'roles[1]' must be a string, got object");
      expect(result.details?.key).toBe('roles[1]');
    });

    it('should reject object in permission array', () => {
      const result = validatePermissions({
        logs: ['read', { nested: true }]
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'logs[1]' must be a string, got object");
      expect(result.details?.key).toBe('logs[1]');
    });

    it('should reject array in permission array', () => {
      const result = validatePermissions({
        users: ['read', ['nested']]
      });
      expect(result.valid).toBe(false);
      expect(result.details?.message).toContain("Permission 'users[1]' must be a string, got object");
      expect(result.details?.key).toBe('users[1]');
    });
  });

  describe('edge cases', () => {
    it('should handle mixed valid and invalid keys (invalid takes precedence)', () => {
      const result = validatePermissions({
        attendees: { read: true },
        invalidKey: { read: true }
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid permission keys detected');
    });

    it('should validate first invalid value type encountered', () => {
      const result = validatePermissions({
        attendees: { read: 'invalid', create: 123 }
      });
      expect(result.valid).toBe(false);
      expect(result.details?.key).toBe('attendees.read');
    });

    it('should handle empty object permission value', () => {
      const result = validatePermissions({
        users: {}
      });
      expect(result.valid).toBe(true);
    });

    it('should handle empty array permission value', () => {
      const result = validatePermissions({
        roles: []
      });
      expect(result.valid).toBe(true);
    });

    it('should handle complex valid structure', () => {
      const result = validatePermissions({
        all: false,
        roles: { read: true, create: false, update: true, delete: false },
        users: ['read', 'update'],
        attendees: { read: true },
        logs: []
      });
      expect(result.valid).toBe(true);
    });
  });
});
