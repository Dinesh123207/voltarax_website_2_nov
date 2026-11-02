const { keyOf } = require('./mapBoundaries');
const { periodStartsIST, energyStats } = require('./energy');
function createStateMap({ readBoundaries, readDevices, readHistory, env = process.env, now = Date.now }) {
  return async () => {
    const boundary = await readBoundaries(), site = env.SOLAR_SITE_ID || 'solar_site';
    const assignment = typeof env.MAP_SITE_STATE === 'string' && env.MAP_SITE_STATE.trim().length <= 120 ? env.MAP_SITE_STATE.trim() : '';
    const assignedKey = assignment ? keyOf(assignment) : null;
    const states = boundary.available ? boundary.states : assignment ? [{name:assignment,key:assignedKey}] : [];
    const end = Math.floor(now()/1000), start = periodStartsIST(new Date(end*1000)).day;
    const results = await Promise.allSettled([readDevices(), readHistory(site,start-900,end)]);
    const devices = results[0].status === 'fulfilled' ? results[0].value : null;
    // The query overreads one item: never call a truncated list an exact count.
    const count = Array.isArray(devices) && devices.length <= 200 ? devices.filter(row=>row.site_id === site).length : null;
    const rows = results[1].status === 'fulfilled' ? results[1].value : null;
    const energy = Array.isArray(rows) ? energyStats(rows,start,end) : {kwh:null,coveredSeconds:0,periodSeconds:end-start};
    const synthetic = Array.isArray(rows) && rows.some(row=>row.simulated === true);
    return { dataQuality:'Calculated', scope:'configured-authorized-site-only', site_id:site, boundaryAvailable:boundary.available,
      assignmentMatched:!!assignedKey && states.some(state=>state.key === assignedKey) && boundary.available,
      stateAssignment:assignment || null, period:{start,end,timeZone:'Asia/Kolkata'},
      states:states.map(state=>{
        const assigned = state.key === assignedKey;
        const registered_devices = assigned ? count : null, recorded_kwh = assigned ? energy.kwh : null;
        return {...state, site_count:assigned ? 1 : null, registered_devices, recorded_kwh,
          covered_seconds:assigned && recorded_kwh !== null ? energy.coveredSeconds : null,
          period_seconds:energy.periodSeconds, simulated:assigned && synthetic,
          dataQuality:'Calculated', quality:{site_count:assigned?'Calculated':'Unavailable', registered_devices:registered_devices === null?'Unavailable':'Calculated', recorded_kwh:recorded_kwh === null?'Unavailable':synthetic?'Estimated':'Calculated',covered_seconds:assigned && recorded_kwh !== null?'Calculated':'Unavailable'}};
      }),
      reason:'Only the authorized configured site is included. Other states and missing observations are unavailable; missing periods are not extrapolated.' };
  };
}
function createDefaultStateMap(readBoundaries, env = process.env) {
  return createStateMap({readBoundaries,env,
    readDevices:async()=>Object.values((await require('../config/firebase').db.ref('devices').orderByKey().limitToLast(201).get()).val() || {}),
    readHistory:(site,start,end)=>require('../models/SolarTelemetry').find({site_id:site,ts:{$gte:start,$lte:end}}).sort({ts:1}).lean(),
  });
}
module.exports = { createStateMap, createDefaultStateMap };
