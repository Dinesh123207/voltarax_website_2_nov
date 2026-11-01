const { z } = require('zod');
const empty = z.object({}).strict();
const email = z.string().trim().toLowerCase().email().max(254);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
function validate({ body = empty, query = empty, params = empty } = {}) {
  return (req, res, next) => {
    for (const [part, schema] of Object.entries({ body, query, params })) {
      const result = schema.safeParse(req[part] || {});
      if (!result.success) return res.status(422).json({ success: false, message: 'Invalid request.', fields: [...new Set(result.error.issues.map(i => [part, ...i.path].join('.')))] });
      req[part] = result.data;
    }
    next();
  };
}
module.exports = { validate, z, empty, email, id };
