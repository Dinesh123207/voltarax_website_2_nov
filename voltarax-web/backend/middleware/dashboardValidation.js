const { validate, z, id } = require('./validate');
const limit = z.coerce.number().int().min(1).max(1000).optional();
function dashboardValidation(method, path) {
  const queries = {
    '/panels': { row: z.string().regex(/^(all|[A-Za-z0-9_-]{1,20})$/).optional() },
    '/alerts': { resolved: z.enum(['true', 'false']).optional(), limit },
    '/relay': { device_id: id.optional() },
    '/relay/history': { limit, device_id: id.optional() },
    '/carbon/monthly': { months: z.coerce.number().int().min(1).max(120).optional() },
    '/work-orders': { status: z.enum(['all', 'open', 'in_progress', 'closed']).optional() },
  };
  const schema = { query: z.object(method === 'get' ? queries[path] || {} : {}).strict() };
  if (path.includes(':id')) schema.params = z.object({ id }).strict();
  if (['patch', 'put'].includes(method) && path === '/work-orders/:id') schema.body = z.object({ status: z.enum(['open', 'in_progress', 'closed']).optional() }).strict();
  return validate(schema);
}
module.exports = { dashboardValidation };
