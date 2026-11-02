const express = require('express');
const {protect,requireSite} = require('../middleware/auth');
const {validate} = require('../middleware/validate');
function createMapRouter({readBoundaries = require('../services/mapBoundaries').createBoundaryReader(), readStates = require('../services/stateMap').createDefaultStateMap(readBoundaries)} = {}) {
  const router=express.Router();
  router.use(protect, requireSite);
  router.get('/boundaries',validate(),async(req,res,next)=>{try {const {states,...body}=await readBoundaries(); res.json(body);} catch(error){next(error);}});
  router.get('/states',validate(),async(req,res,next)=>{try {res.json(await readStates());} catch(error){next(error);}});
  return router;
}
module.exports = {createMapRouter};
