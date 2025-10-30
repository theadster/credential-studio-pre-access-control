/**
 * Tests for useUserFormState hook
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserFormState } from '../useUserFormState';
import type { User } from '../../types';

describe('useUserFormState', () => {
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

  describe('Initialization', () => {
    it('should initialize with empty form data in link mode', () => {
      const { result } = renderHook(() =>
        useUserFormState(null, 'link', true)
      );

      expect(result.current.formData).toEqual({
        email: '',
        name: '',
        roleId: undefined,
        password: '',
        authUserId: '',
        addToTeam: true, // Default true in link mode
      });
    });

    it('should initialize with empty form data in edit mode', () => {
      const { result } = renderHook(() =>
        useUserFormState(null, 'edit', true)
      );

      expect(result.current.formData).toEqual({
        email: '',
        name: '',
        roleId: undefined,
        password: '',
        authUserId: '',
        addToTeam: false, // Default false in edit mode
      });
    });

    it('should initialize with user data when user is provided', () => {
      const { result } = renderHook(() =>
        useUserFormState(mockUser, 'edit', true)
      );

      expect(result.current.formData).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        roleId: 'role-123',
        password: '',
        authUserId: '',
        addToTeam: false,
      });
    });

    it('should handle user with null name', () => {
      const userWithNullName = { ...mockUser, name: null };
      const { result } = renderHook(() =>
        useUserFormState(userWithNullName, 'edit', true)
      );

      expect(result.current.formData.name).toBe('');
    });

    it('should handle user with no role', () => {
      const userWithNoRole = { ...mockUser, role: null };
      const { result } = renderHook(() =>
        useUserFormState(userWithNoRole, 'edit', true)
      );

      expect(result.current.formData.roleId).toBeUndefined();
    });
  });

  describe('updateField', () => {
    it('should update a single field', () => {
      const { result } = renderHook(() =>
        useUserFormState(null, 'edit', true)
      );

      act(() => {
        result.current.updateField('name', 'John Doe');
      });

      expect(result.current.formData.name).toBe('John Doe');
      expect(result.current.formData.email).toBe(''); // Other fields unchanged
    });

    it('should update multiple fields independently', () => {
      const { result } = renderHook(() =>
        useUserFormState(null, 'edit', true)
      );

      act(() => {
        result.current.updateField('name', 'John Doe');
      });

      act(() => {
        result.current.updateField('email', 'john@example.com');
      });

      act(() => {
        result.current.updateField('roleId', 'role-456');
      });

      expect(result.current.formData).toEqual({
        email: 'john@example.com',
        name: 'John Doe',
        roleId: 'role-456',
        password: '',
        authUserId: '',
        addToTeam: false,
      });
    });

    it('should update boolean fields', () => {
      const { result } = renderHook(() =>
        useUserFormState(null, 'link', true)
      );

      act(() => {
        result.current.updateField('addToTeam', false);
      });

      expect(result.current.formData.addToTeam).toBe(false);
    });
  });

  describe('resetForm', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() =>
        useUserFormState(mockUser, 'edit', true)
      );

      // Modify form data
      act(() => {
        result.current.updateField('name', 'Modified Name');
        result.current.updateField('email', 'modified@example.com');
      });

      expect(result.current.formData.name).toBe('Modified Name');

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        roleId: 'role-123',
        password: '',
        authUserId: '',
        addToTeam: false,
      });
    });

    it('should reset to empty state when no user', () => {
      const { result } = renderHook(() =>
        useUserFormState(null, 'edit', true)
      );

      // Modify form data
      act(() => {
        result.current.updateField('name', 'Some Name');
        result.current.updateField('email', 'some@example.com');
      });

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData).toEqual({
        email: '',
        name: '',
        roleId: undefined,
        password: '',
        authUserId: '',
        addToTeam: false,
      });
    });
  });

  describe('Effect triggers', () => {
    it('should reset form when dialog opens', () => {
      const { result, rerender } = renderHook(
        ({ isOpen }) => useUserFormState(mockUser, 'edit', isOpen),
        { initialProps: { isOpen: false } }
      );

      // Modify form data while closed
      act(() => {
        result.current.updateField('name', 'Modified Name');
      });

      // Open dialog
      rerender({ isOpen: true });

      // Should reset to original user data
      expect(result.current.formData.name).toBe('Test User');
    });

    it('should reset form when user changes', () => {
      const { result, rerender } = renderHook(
        ({ user }) => useUserFormState(user, 'edit', true),
        { initialProps: { user: mockUser } }
      );

      expect(result.current.formData.name).toBe('Test User');

      // Change user
      const newUser = { ...mockUser, name: 'New User', email: 'new@example.com' };
      rerender({ user: newUser });

      expect(result.current.formData.name).toBe('New User');
      expect(result.current.formData.email).toBe('new@example.com');
    });

    it('should reset form when mode changes', () => {
      const { result, rerender } = renderHook(
        ({ mode }) => useUserFormState(null, mode, true),
        { initialProps: { mode: 'edit' as const } }
      );

      expect(result.current.formData.addToTeam).toBe(false);

      // Change to link mode
      rerender({ mode: 'link' as const });

      expect(result.current.formData.addToTeam).toBe(true);
    });
  });

  describe('setFormData', () => {
    it('should allow direct form data setting', () => {
      const { result } = renderHook(() =>
        useUserFormState(null, 'edit', true)
      );

      const newFormData = {
        email: 'direct@example.com',
        name: 'Direct User',
        roleId: 'role-789',
        password: 'password123',
        authUserId: 'auth-789',
        addToTeam: true,
      };

      act(() => {
        result.current.setFormData(newFormData);
      });

      expect(result.current.formData).toEqual(newFormData);
    });

    it('should allow bulk updates via setFormData', () => {
      const { result } = renderHook(() =>
        useUserFormState(mockUser, 'edit', true)
      );

      const updatedData = {
        ...result.current.formData,
        name: 'Test User Updated',
        email: 'updated@example.com',
      };

      act(() => {
        result.current.setFormData(updatedData);
      });

      expect(result.current.formData.name).toBe('Test User Updated');
      expect(result.current.formData.email).toBe('updated@example.com');
    });
  });
});
