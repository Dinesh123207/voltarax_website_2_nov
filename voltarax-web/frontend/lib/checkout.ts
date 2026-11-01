import type { Checkout } from './commerce';
type Callback = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type Options = Checkout & { name: string; description: string; handler: (value: Callback) => void; modal: { ondismiss: () => void } };
type Instance = { open: () => void; on: (event: string, callback: () => void) => void };
declare global { interface Window { Razorpay?: new (options: Options) => Instance } }
let loading: Promise<void> | null = null;
export async function checkoutConstructor() {
  if (window.Razorpay) return window.Razorpay;
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    const timer = setTimeout(() => { script.remove(); reject(Error('Test checkout took too long to load.')); }, 15000);
    script.onload = () => { clearTimeout(timer); window.Razorpay ? resolve() : reject(Error('Test checkout is unavailable.')); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(Error('Test checkout could not be loaded.')); };
    document.body.appendChild(script);
  }).catch(failure => { loading = null; throw failure; });
  await loading;
  if (!window.Razorpay) throw Error('Test checkout is unavailable.');
  return window.Razorpay;
}
