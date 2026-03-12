import { json, methodNotAllowed, options, readJson } from "../_utils/http.js";
import { readCollection, writeCollection } from "../_utils/store.js";
import { verifyToken } from "../_utils/token.js";

const DEFAULT_SECRET = "change-this-secret-in-cloudflare";
const STORAGE_KEY = "students";
const DEFAULT_STUDENTS = [
  { id: 1, name: "Aarav Sharma", class_name: "Class 6", roll_no: 14 },
  { id: 2, name: "Anaya Verma", class_name: "Class 8", roll_no: 5 },
  { id: 3, name: "Kabir Singh", class_name: "Class 10", roll_no: 22 },
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

  const students = await readCollection(env, STORAGE_KEY, DEFAULT_STUDENTS);
  return json(request, env, {
    items: students,
    count: students.length,
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
  if (!body || typeof body.name !== "string" || typeof body.class_name !== "string") {
    return json(
      request,
      env,
      { error: "Request body must include string fields: name and class_name." },
      400
    );
  }

  const students = await readCollection(env, STORAGE_KEY, DEFAULT_STUDENTS);
  const nextId = students.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const rollNo = Number.isFinite(Number(body.roll_no)) ? Number(body.roll_no) : 0;

  const student = {
    id: nextId,
    name: body.name.trim(),
    class_name: body.class_name.trim(),
    roll_no: rollNo,
  };

  const updated = [...students, student];
  const persisted = await writeCollection(env, STORAGE_KEY, updated);

  return json(
    request,
    env,
    {
      message: persisted
        ? "Student created and persisted in KV."
        : "Student created in response, but KV is not configured (non-persistent mode).",
      student,
    },
    201
  );
}

export async function onRequest(context) {
  return methodNotAllowed(context.request, context.env, ["OPTIONS", "GET", "POST"]);
}
