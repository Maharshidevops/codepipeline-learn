// Number / currency / misc formatting helpers (the "{:,}".format equivalents).

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// Stripe amounts are in cents.
export function formatCurrencyFromCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}
