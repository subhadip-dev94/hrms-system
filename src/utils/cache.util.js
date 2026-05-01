// Simple in-process TTL cache — no external dependencies.
// Used to avoid redundant DB hits for per-request navbar counts.
// Each entry expires independently; the store is bounded to 2000 keys.

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.exp) {
    store.delete(key);
    return undefined;
  }
  return entry.val;
}

function set(key, value, ttlSeconds = 30) {
  if (store.size >= 2000) {
    // Evict the oldest key when the store is full
    store.delete(store.keys().next().value);
  }
  store.set(key, { val: value, exp: Date.now() + ttlSeconds * 1000 });
}

// Delete all keys whose prefix matches `prefix`
function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

function del(key) {
  store.delete(key);
}

module.exports = { get, set, invalidate, del };
