/**
 * Tests for useUserFormValidation hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUserFormValidation } from '../useUserFormValidation';
import type { UserFormData, User, AppwriteAuthUser } from '../../types';

describe('useUserFormValidation', () => {
  const mockFormData: UserFormData = {
    email: 'test@example.com',
    name: 'Test User',
    roleId: 'role-123',
    password: '',
    authUserId: 'auth-123',
    addToTeam: false,
  };

  const mockUser: User = {
    id: 'user-123',
    userId: 'auth-123',
    email: 'test@example.com',
    name: 'Test User',
    role: {
      id: 'role-123',
      name: 'Admin',
      permissions: {},
    },
    isInvited: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockAuthUser: AppwriteAuthUser = {
    $id: 'auth-123',
    email: 'test@example.com',
    name: 'Test User',
    $createdAt: '2024-01-01T00:00:00Z',
    emailVerification: true,
    phoneVerification: false,
    isLinked: false,
  };

  describe('Link Mode Validation', () => {
    it('should pass validation with valid data', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const validationResult = result.current.validate(
        mockFormData,
        'link',
        null,
        mockAuthUser
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should fail when no auth user is selected', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const validationResult = result.current.validate(
        mockFormData,
        'link',
        null,
        null
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0]).toEqual({
        field: 'authUser',
        message: 'Please select a user to link',
      });
    });

    it('should fail when no role is selected', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithoutRole = { ...mockFormData, roleId: undefined };

      const validationResult = result.current.validate(
        formDataWithoutRole,
        'link',
        null,
        mockAuthUser
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0]).toEqual({
        field: 'roleId',
        message: 'Please select a role for this user',
      });
    });

    it('should fail with multiple errors', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithoutRole = { ...mockFormData, roleId: undefined };

      const validationResult = result.current.validate(
        formDataWithoutRole,
        'link',
        null,
        null // No auth user
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(2);
      expect(validationResult.errors[0].field).toBe('authUser');
      expect(validationResult.errors[1].field).toBe('roleId');
    });
  });

  describe('Edit Mode Validation', () => {
    it('should pass validation with valid data', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const validationResult = result.current.validate(
        mockFormData,
        'edit',
        mockUser
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    it('should fail when name is missing', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithoutName = { ...mockFormData, name: '' };

      const validationResult = result.current.validate(
        formDataWithoutName,
        'edit',
        mockUser
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContainEqual({
        field: 'name',
        message: 'Name is required',
      });
    });

    it('should fail when role is missing', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithoutRole = { ...mockFormData, roleId: undefined };

      const validationResult = result.current.validate(
        formDataWithoutRole,
        'edit',
        mockUser
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContainEqual({
        field: 'roleId',
        message: 'Please select a role for this user',
      });
    });

    it('should fail with multiple errors when both name and role are missing', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithoutNameAndRole = {
        ...mockFormData,
        name: '',
        roleId: undefined,
      };

      const validationResult = result.current.validate(
        formDataWithoutNameAndRole,
        'edit',
        mockUser
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThanOrEqual(2);
      
      const errorFields = validationResult.errors.map(e => e.field);
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('roleId');
      expect(errorFields).toContain('general');
    });

    it('should show general error when all required fields are missing', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const emptyFormData = {
        ...mockFormData,
        name: '',
        roleId: undefined,
      };

      const validationResult = result.current.validate(
        emptyFormData,
        'edit',
        mockUser
      );

      expect(validationResult.isValid).toBe(false);
      
      const generalError = validationResult.errors.find(e => e.field === 'general');
      expect(generalError).toBeDefined();
      expect(generalError?.message).toBe('Please fill in all required fields');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined user in edit mode', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const validationResult = result.current.validate(
        mockFormData,
        'edit',
        undefined
      );

      expect(validationResult.isValid).toBe(true);
    });

    it('should handle null user in edit mode', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const validationResult = result.current.validate(
        mockFormData,
        'edit',
        null
      );

      expect(validationResult.isValid).toBe(true);
    });

    it('should handle empty string roleId', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithEmptyRole = { ...mockFormData, roleId: '' as any };

      const validationResult = result.current.validate(
        formDataWithEmptyRole,
        'edit',
        mockUser
      );

      // Empty string should be treated as missing
      expect(validationResult.isValid).toBe(false);
    });

    it('should handle whitespace-only name', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithWhitespaceName = { ...mockFormData, name: '   ' };

      const validationResult = result.current.validate(
        formDataWithWhitespaceName,
        'edit',
        mockUser
      );

      // Whitespace-only should be treated as valid (trimming is not done in validation)
      expect(validationResult.isValid).toBe(true);
    });
  });

  describe('Validation Result Structure', () => {
    it('should return correct structure for valid data', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const validationResult = result.current.validate(
        mockFormData,
        'edit',
        mockUser
      );

      expect(validationResult).toHaveProperty('isValid');
      expect(validationResult).toHaveProperty('errors');
      expect(typeof validationResult.isValid).toBe('boolean');
      expect(Array.isArray(validationResult.errors)).toBe(true);
    });

    it('should return errors with correct structure', () => {
      const { result } = renderHook(() => useUserFormValidation());

      const formDataWithoutName = { ...mockFormData, name: '' };

      const validationResult = result.current.validate(
        formDataWithoutName,
        'edit',
        mockUser
      );

      validationResult.errors.forEach(error => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
      });
    });
  });
});
