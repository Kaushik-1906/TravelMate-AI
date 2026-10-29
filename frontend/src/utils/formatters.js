export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'AU$',
    CHF: 'CHF ',
  };
  const sym = symbols[currency?.toUpperCase()] || `${currency} `;
  return `${sym}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDateRange = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return '';
  const s = new Date(startDateStr);
  const e = new Date(endDateStr);
  const sFormatted = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const eFormatted = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${sFormatted} — ${eFormatted}`;
};

export const getDaysCount = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return 0;
  const s = new Date(startDateStr);
  const e = new Date(endDateStr);
  const diffTime = e - s;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};
