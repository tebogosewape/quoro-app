// src/utils/currency.ts
export const money = (n: number) =>
    new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 0,
    }).format(n || 0);
