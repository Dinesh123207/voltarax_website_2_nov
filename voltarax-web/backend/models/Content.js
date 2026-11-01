const { makeModel } = require('../services/firebaseModel');
module.exports = {
  Contact: makeModel('content/contacts'),
  Subscriber: makeModel('content/subscribers'),
  DemoRequest: makeModel('content/demo_requests'),
  Post: makeModel('content/posts'),
  SiteStat: makeModel('content/site_stats', { idField: '_id', timestamps: true }),
};
