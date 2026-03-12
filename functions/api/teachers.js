import { json, methodNotAllowed, options, readJson } from "../_utils/http.js";
import { readCollection, writeCollection } from "../_utils/store.js";
import { verifyToken } from "../_utils/token.js";

const DEFAULT_SECRET = "change-this-secret-in-cloudflare";
const STORAGE_KEY = "teachers";
const DEFAULT_TEACHERS = [
  { id: 1, name: "Neha Rao", subject: "Mathematics", email: "neha.rao@school.edu" },
  { id: 2, name: "Rohit Joshi", subject: "Science", email: "rohit.joshi@school.edu" },
  { id: 3, name: "Isha Nair", subject: "English", email: "isha.nair@school.edu" },
];

function extractBearerToken(request) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7).trim();
}

async function requireAuth(request, env) {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  return verifyToken(token, env.API_TOKEN_SECRET || DEFAULT_SECRET);
}

export async function onRequestOptions(context) {
  return options(context.request, context.env);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const payload = await requireAuth(request, env);
  if (!payload) {
    return json(request, env, { error: "Unauthorized. Use Bearer token from /api/login." }, 401);
  }

  const teachers = await readCollection(env, STORAGE_KEY, DEFAULT_TEACHERS);
  return json(request, env, {
    items: teachers,
    count: teachers.length,
    user: payload.sub,
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const payload = await requireAuth(request, env);
  if (!payload) {
    return json(request, env, { error: "Unauthorized. Use Bearer token from /api/login." }, 401);
  }

  const body = await readJson(request);
  if (!body || typeof body.name !== "string" || typeof body.subject !== "string") {
    return json(
      request,
      env,
      { error: "Request body must include string fields: name and subject." },
      400
    );
  }

  const teachers = await readCollection(env, STORAGE_KEY, DEFAULT_TEACHERS);
  const nextId = teachers.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

  const teacher = {
    id: nextId,
    name: body.name.trim(),
    subject: body.subject.trim(),
    email: typeof body.email === "string" ? body.email.trim() : "",
  };

  const updated = [...teachers, teacher];
  const persisted = await writeCollection(env, STORAGE_KEY, updated);

  return json(
    request,
    env,
    {
      message: persisted
        ? "Teacher created and persisted in KV."
        : "Teacher created in response, but KV is not configured (non-persistent mode).",
      teacher,
    },
    201
  );
}

export async function onRequest(context) {
  return methodNotAllowed(context.request, context.env, ["OPTIONS", "GET", "POST"]);
}
