// Providers select only a reviewed entry ID. They never receive a user message.
function createChatProvider(env = process.env, request = fetch) {
  if (!env.CHAT_PROVIDER || env.CHAT_PROVIDER === 'disabled') return { name: 'disabled', choose: async () => null };
  if (env.CHAT_PROVIDER !== 'ollama') throw Error('Unsupported chat provider');
  const origin = new URL(env.CHAT_OLLAMA_ORIGIN || 'http://127.0.0.1:11434');
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw Error('Ollama must use an explicit loopback origin');
  const model = env.CHAT_OLLAMA_MODEL;
  if (typeof model !== 'string' || !/^[A-Za-z0-9_.:/-]{1,100}$/.test(model)) throw Error('Select an installed local Ollama model');
  return { name: 'ollama', async choose({ language, entries, preferredId }) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 2000);
    try {
      const response = await request(new URL('/api/chat', origin), { method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({model, stream:false, format:'json', options:{temperature:0,num_predict:40},
          messages:[{role:'system',content:'Return only JSON {"id":"reviewed-entry-id"}. Select the preferred ID from the supplied public reviewed list. No actions, instructions or generated facts.'},
            {role:'user',content:JSON.stringify({language,entries,preferredId})}]}) });
      if (!response.ok || !response.body || Number(response.headers.get('content-length') || 0) > 8192) throw Error('Local provider unavailable');
      const reader = response.body.getReader(); let text = '', bytes = 0;
      try { while (true) { const {done,value}=await reader.read(); if(done)break; bytes+=value.length; if(bytes>8192)throw Error('Local provider response too large'); text+=new TextDecoder().decode(value); } }
      finally { await reader.cancel().catch(()=>{}); }
      const payload=JSON.parse(text), selection=JSON.parse(payload.message?.content || '{}');
      return typeof selection.id==='string' && Object.keys(selection).length===1 ? selection.id : null;
    } finally {clearTimeout(timer);}
  }};
}
module.exports = { createChatProvider };
