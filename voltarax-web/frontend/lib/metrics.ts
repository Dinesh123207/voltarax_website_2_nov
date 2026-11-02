export const metricColors={production:'#fbbf24',savings:'#86efac',consumption:'#cbd5e1',grid:'#d1d5db',background:'#102017'};
export function indianNumber(value:unknown,maximumFractionDigits=3){return typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat('en-IN',{maximumFractionDigits}).format(value):'Unavailable';}
export function indianRupees(value:unknown){return typeof value==='number'&&Number.isFinite(value)?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value):'Unavailable';}
