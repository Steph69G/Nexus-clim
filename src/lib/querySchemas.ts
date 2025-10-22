const STATUS = new Set(['pending', 'overdue', 'awaiting_approval', 'open', 'closed', 'draft', 'sent', 'paid']);
const DATE = new Set(['today', 'tomorrow', 'week', 'month']);
const SORT = new Set(['updated_desc', 'created_desc', 'date_asc', 'date_desc']);
const FILTER = new Set(['low', 'critical', 'all']);
const ACTION = new Set(['entry', 'move', 'adjust', 'new_quote', 'new_client']);

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
