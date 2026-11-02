const express = require('express');
const { createChatAssistant } = require('../services/chatAssistant');

const { validate, z } = require('../middleware/validate');
function createChatRouter(options) {
  const router=express.Router(),assistant=createChatAssistant(options);
  router.post('/', validate({body:z.object({message:z.string().trim().min(1).max(1000),language:z.enum(['en','hi']).optional()}).strict()}), async(req,res,next)=>{
    try{res.set('Cache-Control','no-store').json(await assistant.answer(req.body));}catch(error){next(error);}
  });
  return router;
}
module.exports=createChatRouter();
module.exports.createChatRouter=createChatRouter;
