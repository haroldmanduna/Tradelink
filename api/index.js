// Vercel serverless entrypoint. All /api/* requests are rewritten here
// (see vercel.json) and handled by the shared Express app. The app is imported
// without starting a listener — Vercel invokes it as a request handler.
// Migrations/seeding are NOT run here (the Supabase schema is provisioned once,
// out of band); this keeps cold starts fast and idempotent.
module.exports = require('../backend/src/app');
