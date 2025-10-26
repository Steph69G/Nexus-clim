import { describe, it, expect } from 'vitest';
import { formatDate, formatDistanceToNow } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date correctly in fr-FR locale', () => {
      const date = '2025-01-15T10:30:00Z';
      const result = formatDate(date);
      expect(result).toMatch(/15\/01\/2025/);
    });

    it('should handle invalid dates gracefully', () => {
      const result = formatDate('invalid-date');
      expect(result).toBeDefined();
    });
  });

  describe('formatDistanceToNow', () => {
    it('should return relative time string', () => {
      const now = new Date();
      const result = formatDistanceToNow(now.toISOString());
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle dates in the past', () => {
      const past = new Date(Date.now() - 1000 * 60 * 5); // 5 minutes ago
      const result = formatDistanceToNow(past.toISOString());
      expect(result).toContain('il y a');
    });
  });
});
