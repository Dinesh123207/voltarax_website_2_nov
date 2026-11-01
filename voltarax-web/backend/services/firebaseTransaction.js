// Keep the server value cached while a conditional RTDB transaction runs.
// Without an active value listener, the SDK may first call an updater with null
// even when the remote record exists; returning undefined then aborts locally.
async function transact(ref, update) {
  let listener, timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Realtime data unavailable')), 10000);
      listener = () => { clearTimeout(timer); resolve(); };
      ref.on('value', listener, reject);
    });
    return await ref.transaction(update, undefined, false);
  } finally {
    clearTimeout(timer);
    if (listener) ref.off('value', listener);
  }
}
module.exports = { transact };
