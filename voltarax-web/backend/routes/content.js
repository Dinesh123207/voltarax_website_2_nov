const express  = require('express');
const { validate, z, email } = require('../middleware/validate');
const short = z.string().trim().max(150).optional();
const optionalFields = { company: short, phone: z.string().trim().max(32).optional(), type: z.string().max(50).optional(), website: z.literal('').optional() };
const contactBody = z.object({ name: z.string().trim().min(2).max(100), email, subject: z.string().trim().min(1).max(200), message: z.string().trim().min(10).max(2000), ...optionalFields }).strict();
const demoBody = z.object({ name: z.string().trim().min(2).max(100), email, subject: z.string().max(200).optional(), message: z.string().max(2000).optional(), ...optionalFields }).strict();
const { Contact, Subscriber, DemoRequest, Post } = require('../models/Content');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/contact ─────────────────────────────────────────────────────────
router.post('/contact', validate({ body: contactBody }), async (req, res) => {

  try {
    const contact = await Contact.create({
      ...req.body,
      ip: req.ip,
    });
    res.status(201).json({ success: true, message: 'Your inquiry has been recorded for review.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/demo ────────────────────────────────────────────────────────────
router.post('/demo', validate({ body: demoBody }), async (req, res) => {

  try {
    await DemoRequest.create(req.body);
    res.status(201).json({ success: true, message: 'Your demo request has been recorded for review.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── POST /api/subscribe ───────────────────────────────────────────────────────
router.post('/subscribe', validate({ body: z.object({ email, source: z.string().max(50).optional(), website: z.literal('').optional() }).strict() }), async (req, res) => {

  try {
    const exists = await Subscriber.findOne({ email: req.body.email });
    if (exists) {
      if (!exists.isActive) await Subscriber.findOneAndUpdate({ _id: exists._id }, { isActive: true });
      return res.json({ success: true, message: 'Already subscribed!' });
    }
    await Subscriber.create({ email: req.body.email, source: req.body.source || 'landing', isActive: true });
    res.status(201).json({ success: true, message: 'Subscribed successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/posts ─────────────────────────────────────────────────────────────
router.get('/posts', validate({ query: z.object({ category: z.string().regex(/^[A-Za-z0-9_-]{1,50}$/).optional(), page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(10) }).strict() }), async (req, res) => {
  try {
    const { category, limit = 10, page = 1 } = req.query;
    const filter = { published: true };
    if (category) filter.category = category;

    const total = await Post.countDocuments(filter);
    const fullPosts = await Post.find(filter)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    // .select('-content') on the FirebaseQuery above is a no-op (see
    // services/firebaseModel.js — select/populate are only accepted for
    // Mongoose-style call-site compatibility, they don't actually project).
    // A list view returning every post's full body is wasted bandwidth, so
    // strip it here instead, explicitly.
    const posts = fullPosts.map(({ content, ...rest }) => rest);

    res.json({ success: true, total, page: Number(page), posts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/posts/:slug ──────────────────────────────────────────────────────
router.get('/posts/:slug', validate({ params: z.object({ slug: z.string().regex(/^[a-z0-9-]{1,150}$/) }).strict() }), async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { slug: req.params.slug, published: true },
      { $inc: { views: 1 } },
      { new: true },
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Admin: GET /api/admin/contacts ────────────────────────────────────────────
router.get('/admin/contacts', protect, requireAdmin, validate(), async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Admin: GET /api/admin/demos ───────────────────────────────────────────────
router.get('/admin/demos', protect, requireAdmin, validate(), async (req, res) => {
  try {
    const demos = await DemoRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, demos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Admin: GET /api/admin/stats ───────────────────────────────────────────────
router.get('/admin/stats', protect, requireAdmin, validate(), async (req, res) => {
  try {
    const [contacts, demos, subscribers, posts] = await Promise.all([
      Contact.countDocuments(),
      DemoRequest.countDocuments(),
      Subscriber.countDocuments({ isActive: true }),
      Post.countDocuments({ published: true }),
    ]);
    res.json({ success: true, stats: { contacts, demos, subscribers, posts } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
