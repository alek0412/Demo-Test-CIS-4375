/**
 * HTTP API entry: try route modules in order until one handles the request.
 */
const handlers = [
  require('./adminAuth'),
  require('./customerAuth'),
  require('./upcomingEventsRoutes'),
  require('./popularTimesRoutes'),
  require('./membershipSpecialsRoutes'),
  require('./dbDump'),
];

async function handleApi(req, res, ctx) {
  for (const fn of handlers) {
    const handled = await fn(req, res, ctx);
    if (handled) return true;
  }
  return false;
}

module.exports = { handleApi };
