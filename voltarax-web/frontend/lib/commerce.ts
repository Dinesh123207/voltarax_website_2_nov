export { api, ist } from './operations';
export { inr, rupeesToPaise } from './money';
export type Plan = { id: string; name: string; description: string; pricePaise: number | null; active: boolean; version: number };
export type Order = { id: string; userId: string; planId: string; requestKey: string; planSnapshot: { name: string; description: string; version: number; pricePaise: number }; amountPaise: number; status: string; gatewayOrderId: string | null; createdAt: string; paidAt: string | null; callbackVerifiedAt: string | null };
export type Refund = { id: string; amountPaise: number; note: string; status: string; gatewayRefundId: string | null };
export type OrderDetails = { order: Order; payment: { id: string; amountPaise: number; refundedPaise: number } | null; invoice: { id: string; sha256: string } | null; refunds: Refund[]; mode: string };
export type Checkout = { key: string; order_id: string; amount: number; currency: string };
