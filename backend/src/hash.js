// Password hashing wrapper.
//
// Uses @node-rs/bcrypt (native, prebuilt binary) which runs on libuv's thread
// pool — so bcrypt work runs in parallel across CPU cores and never blocks the
// event loop. This keeps logins fast under concurrency (the pure-JS `bcryptjs`
// runs on the main thread and serialises everything).
//
// Hashes are fully interoperable with bcryptjs ($2a$/$2b$), so existing stored
// passwords keep working. If the native binary ever fails to load on a given
// platform, we transparently fall back to bcryptjs so auth never breaks.
let impl;
try {
  const rs = require('@node-rs/bcrypt');
  impl = {
    engine: '@node-rs/bcrypt',
    hash: (password, cost = 10) => rs.hash(String(password), cost),
    compare: (password, hash) => rs.verify(String(password), hash),
  };
} catch (err) {
  const js = require('bcryptjs');
  console.warn('hash: native @node-rs/bcrypt unavailable, falling back to bcryptjs —', err.message);
  impl = {
    engine: 'bcryptjs',
    hash: (password, cost = 10) => js.hash(String(password), cost),
    compare: (password, hash) => js.compare(String(password), hash),
  };
}

module.exports = impl;
