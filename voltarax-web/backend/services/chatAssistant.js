const knowledge = require('../data/chatKnowledge.json');
const { createChatProvider } = require('./chatProvider');
const plain = value => String(value).replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,1800);
const forbidden = /ignore|override|system\s*prompt|instructions?|api\s*key|password|secret|execute|delete|run\s+(?:code|command)|subsid|price|cost|legal|law|specification|watt|voltage|wiring|सब्सिडी|कीमत|मूल्य|कानून|कानूनी|पासवर्ड|निर्देश|नज़रअंदाज़|वोल्ट|वाट|वायरिंग/iu;
function createChatAssistant({ provider, env = process.env, logger = {info(){}} } = {}) {
  // Invalid optional configuration falls back to reviewed answers, never a remote provider.
  if(!provider)try{provider=createChatProvider(env);}catch{provider={name:'disabled',choose:async()=>null};}
  const fallback=knowledge.entries.find(entry=>entry.id==='support-boundary');
  return { async answer({message,language}) {
    const locale=/[\u0900-\u097f]/u.test(message)?'hi':/[a-z]/i.test(message)?'en':language==='hi'?'hi':'en';
    const terms=message.toLocaleLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)||[];
    const matches=forbidden.test(message)?[]:knowledge.entries.filter(entry=>entry.id!==fallback.id && entry.terms.some(term=>terms.includes(term.toLocaleLowerCase())));
    let chosen=matches[0]||fallback, usedProvider='disabled';
    if(matches.length && provider.name!=='disabled')try{
      // The complete provider payload contains only public reviewed IDs/titles and language.
      // Free text, user identity, device/site/account data and history never cross this boundary.
      const selected=await provider.choose({language:locale,entries:matches.map(entry=>({id:entry.id,title:entry[locale].title})),preferredId:chosen.id});
      const valid=matches.find(entry=>entry.id===selected);if(valid){chosen=valid;usedProvider=provider.name;}
    }catch{} // Same reviewed answer on timeout, unavailable host or injected/invalid provider output.
    logger.info({event:'chat-answer',sourceId:chosen.id,provider:usedProvider},'Reviewed assistant response');
    return {success:true,reply:plain(chosen[locale].answer),language:locale,source:{id:chosen.id,title:plain(chosen[locale].title),reviewedAt:knowledge.reviewedAt},
      contact:{path:'/contact',label:locale==='hi'?'मानवीय सहायता के लिए संपर्क करें':'Contact a person for help'},provider:usedProvider};
  }};
}
module.exports={createChatAssistant};
