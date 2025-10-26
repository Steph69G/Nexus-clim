import { describe, it, expect } from 'vitest';
import { getRoleColor, getRoleBadgeClass } from '../roleColors';

describe('roleColors', () => {
  describe('getRoleColor', () => {
    it('should return correct color for each role', () => {
      expect(getRoleColor('admin')).toBe('red');
      expect(getRoleColor('sal')).toBe('orange');
      expect(getRoleColor('st')).toBe('blue');
      expect(getRoleColor('client')).toBe('green');
      expect(getRoleColor('manager')).toBe('purple');
    });

    it('should return default color for unknown role', () => {
      const result = getRoleColor('unknown' as any);
      expect(result).toBe('gray');
    });
  });

  describe('getRoleBadgeClass', () => {
    it('should return Tailwind classes for role badges', () => {
      const result = getRoleBadgeClass('admin');
      expect(result).toContain('bg-');
      expect(result).toContain('text-');
    });

    it('should handle all valid roles', () => {
      ['admin', 'sal', 'st', 'client', 'manager'].forEach((role) => {
        const result = getRoleBadgeClass(role as any);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });
});
