export type DataActivity = Readonly<{loading:boolean;error:boolean;empty:boolean}>;
export const EMPTY_ACTIVITY:DataActivity=Object.freeze({loading:false,error:false,empty:false});
export function emptyPayload(value:unknown):boolean {
  if(value==null)return true;
  if(Array.isArray(value))return value.length===0;
  if(typeof value!=='object')return false;
  const record=value as Record<string,unknown>;
  const lists=Object.entries(record).filter(([key,item])=>key!=='quality'&&Array.isArray(item));
  if(lists.length)return lists.every(([,item])=>(item as unknown[]).length===0);
  const metrics=['current_power_kw','daily_generation_kwh','estimated_current_power_kw','today_kwh','power_mw','voltage_v'].filter(key=>key in record);
  if(metrics.length)return metrics.every(key=>record[key]==null);
  const values=Object.entries(record).filter(([key])=>!['quality','dataQuality','success','source'].includes(key)).map(([,item])=>item);
  return !values.length||values.every(item=>item==null);
}
export function createActivityStore(){
  const listeners=new Set<()=>void>(),routes=new Map<string,{pending:number;results:Map<string,'ok'|'empty'|'error'>;snapshot:DataActivity}>();
  const getRoute=(scope:string)=>{let route=routes.get(scope);if(!route){route={pending:0,results:new Map(),snapshot:EMPTY_ACTIVITY};routes.set(scope,route);if(routes.size>50)routes.delete(routes.keys().next().value!);}return route;};
  const publish=(route:ReturnType<typeof getRoute>)=>{const values=Array.from(route.results.values());route.snapshot=Object.freeze({loading:route.pending>0&&!values.length,error:values.includes('error'),empty:values.includes('empty')});listeners.forEach(listener=>listener());};
  return {subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},get:(scope:string)=>routes.get(scope)?.snapshot||EMPTY_ACTIVITY,
    begin(scope:string,key:string){const route=getRoute(scope);route.pending++;publish(route);let finished=false;
      return {finish(error=false){if(finished)return;finished=true;route.pending--;route.results.set(key,error?'error':'ok');publish(route);},
        payload(value:unknown){route.results.set(key,(value as {success?:boolean})?.success===false?'error':emptyPayload(value)?'empty':'ok');publish(route);}};
    }};
}
export const dataActivity=createActivityStore();
export function createDataFetch(request:typeof globalThis.fetch,scope:()=>string,store=dataActivity):typeof globalThis.fetch {
  return async(input,init)=>{
    const method=init?.method||(typeof input==='object'&&'method' in input?input.method:'GET');
    const url=new URL(typeof input==='object'&&'url' in input?input.url:String(input),'http://local.invalid');
    const screen=scope();
    if(method.toUpperCase()!=='GET'||!url.pathname.startsWith('/api/')||url.pathname==='/api/ready'||url.pathname==='/api/auth/me'&&!screen.endsWith('/dashboard/settings'))return request(input,init);
    const activity=store.begin(screen,url.pathname);
    try{
      const response=await request(input,init);activity.finish(!response.ok&&response.status!==404);
      if(response.status===404)activity.payload(null);
      if(response.ok){const decode=response.json.bind(response);response.json=async()=>{try{const value=await decode();activity.payload(value);return value;}catch(error){activity.payload({success:false});throw error;}};}
      return response;
    }catch(error){activity.finish(true);throw error;}
  };
}
// File-scoped alias at call sites, never a global window.fetch monkey patch.
export const dataFetch:typeof globalThis.fetch=(input,init)=>typeof window==='undefined'?globalThis.fetch(input,init):createDataFetch(globalThis.fetch.bind(globalThis),()=>window.location.pathname)(input,init);
