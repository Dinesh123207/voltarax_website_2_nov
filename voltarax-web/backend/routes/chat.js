const express = require('express');
const { match } = require('../data/publicKnowledge');

const router = express.Router();
const CHIPS = ['What is VoltVision?', 'How does the coating work?', 'What can the AI do?'];

// Local-only. No external API call, matching the on-site widget's 3-question assistant.
router.post('/', (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ success: false, message: 'message is required.' });
  const hit = match(message);
  res.json({
    success: true,
    reply: hit?.a || 'This assistant answers three questions — please choose one of the suggestions.',
    source: 'local-faq',
    chips: CHIPS,
  });
});

module.exports = router;
