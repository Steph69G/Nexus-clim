export const UI_THRESHOLDS = {
  emergencies: {
    warning: 1,
    danger: 5,
  },
  overdueInvoices: {
    warning: 1,
    moderate: 7,
    danger: 30,
  },
  lowStock: {
    warning: 1,
    danger: 5,
  },
  pendingOffers: {
    info: 1,
    warning: 10,
  },
  quotesToApprove: {
    info: 1,
    warning: 5,
  },
} as const;

export type ChipTone = 'success' | 'info' | 'warning' | 'danger';

export function getEmergencyTone(count: number): ChipTone {
  if (count === 0) return 'success';
  if (count >= UI_THRESHOLDS.emergencies.danger) return 'danger';
  if (count >= UI_THRESHOLDS.emergencies.warning) return 'warning';
  return 'danger';
}

export function getOverdueTone(count: number, oldestDays?: number): ChipTone {
  if (count === 0) return 'success';
  if (oldestDays && oldestDays >= UI_THRESHOLDS.overdueInvoices.danger) return 'danger';
  if (oldestDays && oldestDays >= UI_THRESHOLDS.overdueInvoices.moderate) return 'warning';
  return 'warning';
}

export function getLowStockTone(count: number): ChipTone {
  if (count === 0) return 'success';
  if (count >= UI_THRESHOLDS.lowStock.danger) return 'danger';
  return 'warning';
}

export function getPendingOffersTone(count: number): ChipTone {
  if (count === 0) return 'success';
  if (count >= UI_THRESHOLDS.pendingOffers.warning) return 'warning';
  return 'info';
}

export function getQuotesToApproveTone(count: number): ChipTone {
  if (count === 0) return 'success';
  if (count >= UI_THRESHOLDS.quotesToApprove.warning) return 'warning';
  return 'info';
}
