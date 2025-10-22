const STATUS = new Set(['pending', 'overdue', 'awaiting_approval', 'open', 'closed', 'draft', 'sent', 'paid']);
const DATE = new Set(['today', 'tomorrow', 'week', 'month']);
const SORT = new Set(['updated_desc', 'created_desc', 'date_asc', 'date_desc']);
const FILTER = new Set(['low', 'critical', 'all']);
const ACTION = new Set(['entry', 'move', 'adjust', 'new_quote', 'new_client']);
const MISSION_STATUS = new Set(['draft', 'published', 'assigned', 'confirmed', 'en_route', 'arrived', 'in_progress', 'paused', 'done', 'validated', 'cancelled']);
const ROLE = new Set(['admin', 'sal', 'tech', 'st', 'client']);
const PRIORITY = new Set(['low', 'medium', 'high', 'critical']);
const OFFER_STATUS = new Set(['pending', 'accepted', 'rejected']);
const EMERGENCY_STATUS = new Set(['open', 'in_progress', 'closed']);

const INVOICE_STATUS_UI = new Set(['open', 'overdue', 'closed', 'draft', 'sent', 'paid']);
const INVOICE_FR2UI: Record<string, string> = {
  brouillon: 'draft',
  envoye: 'sent',
  'envoyé': 'sent',
  paye: 'paid',
  'payé': 'paid',
  en_retard: 'overdue',
  ouvert: 'open',
  cloture: 'closed',
  'clôturé': 'closed',
};

const QUOTE_STATUS_UI = new Set(['open', 'awaiting_approval', 'closed', 'draft', 'approved', 'rejected', 'converted']);
const QUOTE_FR2UI: Record<string, string> = {
  brouillon: 'draft',
  en_attente_validation: 'awaiting_approval',
  approuve: 'approved',
  'approuvé': 'approved',
  refuse: 'rejected',
  'refusé': 'rejected',
  converti: 'converted',
  ouvert: 'open',
  cloture: 'closed',
  'clôturé': 'closed',
};

export function normStatus(v?: string) {
  return v && STATUS.has(v) ? v : undefined;
}

export function normDate(v?: string) {
  return v && (DATE.has(v) || /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : undefined;
}

export function normSort(v?: string) {
  return v && SORT.has(v) ? v : 'updated_desc';
}

export function normFilter(v?: string) {
  return v && FILTER.has(v) ? v : undefined;
}

export function normAction(v?: string) {
  return v && ACTION.has(v) ? v : undefined;
}

export function normMissionStatus(v?: string) {
  return v && MISSION_STATUS.has(v) ? v : undefined;
}

export function normRole(v?: string) {
  return v && ROLE.has(v) ? v : undefined;
}

export function normPriority(v?: string) {
  return v && PRIORITY.has(v) ? v : undefined;
}

export function normOfferStatus(v?: string) {
  return v && OFFER_STATUS.has(v) ? v : undefined;
}

export function normEmergencyStatus(v?: string) {
  return v && EMERGENCY_STATUS.has(v) ? v : undefined;
}

export function normQ(v?: string) {
  return v && v.trim() ? v.trim() : undefined;
}

export function normInvoiceStatus(v?: string) {
  if (!v) return undefined;
  const k = v.toLowerCase();
  if (INVOICE_STATUS_UI.has(k)) return k;
  return INVOICE_FR2UI[k];
}

export function normQuoteStatus(v?: string) {
  if (!v) return undefined;
  const k = v.toLowerCase();
  if (QUOTE_STATUS_UI.has(k)) return k;
  return QUOTE_FR2UI[k];
}
