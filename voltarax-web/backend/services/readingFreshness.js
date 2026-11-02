function readingFreshness(reading,{env=process.env,now=Date.now()/1000}={}){
  const maximumAge=Number(env.MAX_TELEMETRY_AGE_SECONDS||120);
  if(!Number.isFinite(maximumAge)||maximumAge<5||maximumAge>86400)throw Error('Invalid telemetry freshness policy');
  const ts=reading?.ts,valid=Number.isInteger(ts)&&ts>0&&Number.isFinite(new Date(ts*1000).getTime())&&Number.isFinite(new Date((ts+maximumAge)*1000).getTime());
  return {last_seen:valid?new Date(ts*1000).toISOString():null,valid_until:valid?new Date((ts+maximumAge)*1000).toISOString():null,
    fresh:valid&&now-ts>=-300&&now-ts<=maximumAge,max_age_seconds:maximumAge};
}
module.exports={readingFreshness};
