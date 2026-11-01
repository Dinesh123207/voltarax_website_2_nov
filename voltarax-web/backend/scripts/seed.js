require('dotenv').config();
require('../config/firebase');
const User = require('../models/User');
const { Post } = require('../models/Content');

async function seed() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding.');
    process.exit(1);
  }

  const exists = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });
  if (!exists) {
    await User.create({
      name: 'Voltarax Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      company: 'Voltarax Private Limited',
    });
    console.log('✅ Firebase admin user created:', process.env.ADMIN_EMAIL);
  } else {
    console.log('✅ Admin exists:', exists.email);
  }

  const posts = [{
    title: 'Introducing VoltVision AI',
    slug: 'introducing-voltvision-ai',
    excerpt: 'An AI platform for bio-coated solar panels: monitoring, forecasting and smarter energy use.',
    content: 'Replace this placeholder with your own announcement.',
    category: 'product',
    tags: ['VoltVision', 'AI', 'BioSolar'],
    published: true,
    publishedAt: new Date().toISOString(),
  }];

  for (const post of posts) {
    const existsPost = await Post.findOne({ slug: post.slug });
    if (!existsPost) {
      await Post.create(post);
      console.log('✅ Post created:', post.title);
    }
  }
  console.log('\n✅ Firebase seed complete!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
