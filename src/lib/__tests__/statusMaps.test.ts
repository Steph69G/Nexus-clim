import { describe, it, expect } from 'vitest';
import { getMissionStatusLabel, getInvoiceStatusLabel } from '../statusMaps';

describe('statusMaps', () => {
  describe('getMissionStatusLabel', () => {
    it('should return correct label for valid status', () => {
      expect(getMissionStatusLabel('brouillon')).toBe('Brouillon');
      expect(getMissionStatusLabel('publiée')).toBe('Publiée');
      expect(getMissionStatusLabel('acceptée')).toBe('Acceptée');
      expect(getMissionStatusLabel('en_cours')).toBe('En cours');
      expect(getMissionStatusLabel('terminée')).toBe('Terminée');
    });

    it('should return default label for unknown status', () => {
      const result = getMissionStatusLabel('unknown_status' as any);
      expect(result).toBeDefined();
    });
  });

  describe('getInvoiceStatusLabel', () => {
    it('should return correct label for invoice statuses', () => {
      expect(getInvoiceStatusLabel('brouillon')).toBe('Brouillon');
      expect(getInvoiceStatusLabel('envoyée')).toBe('Envoyée');
      expect(getInvoiceStatusLabel('payée')).toBe('Payée');
    });
  });
});
