export async function readCollection(env, key, fallback) {
  if (!env.ERP_DATA_KV || typeof env.ERP_DATA_KV.get !== "function") {
    return fallback;
  }

  try {
    const raw = await env.ERP_DATA_KV.get(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export async function writeCollection(env, key, value) {
  if (!env.ERP_DATA_KV || typeof env.ERP_DATA_KV.put !== "function") {
    return false;
  }

  await env.ERP_DATA_KV.put(key, JSON.stringify(value));
  return true;
}
