export function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format((cents || 0) / 100);
}

export function formatDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateInput(d = new Date()) {
  const date = typeof d === 'string' ? new Date(d) : d;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const CATEGORIES = ['TRAVEL', 'MEALS', 'SOFTWARE', 'OFFICE', 'OTHER'];
export const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
export const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
