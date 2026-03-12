import { json, methodNotAllowed, options, readJson } from "../_utils/http.js";
import { createToken } from "../_utils/token.js";

const DEFAULT_USER = "admin";
const DEFAULT_PASSWORD = "admin123";
const DEFAULT_SECRET = "change-this-secret-in-cloudflare";
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export async function onRequestOptions(context) {
  return options(context.request, context.env);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await readJson(request);

  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return json(
      request,
      env,
      { error: "Request body must include username and password." },
      400
    );
  }

  const validUsername = env.ERP_ADMIN_USER || DEFAULT_USER;
  const validPassword = env.ERP_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  if (body.username !== validUsername || body.password !== validPassword) {
    return json(request, env, { error: "Invalid credentials." }, 401);
  }

  const tokenSecret = env.API_TOKEN_SECRET || DEFAULT_SECRET;
  const token = await createToken(
    {
      sub: body.username,
      role: "admin",
    },
    tokenSecret,
    TOKEN_TTL_SECONDS
  );

  return json(request, env, {
    token,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
    user: {
      username: body.username,
      role: "admin",
    },
  });
}

export async function onRequest(context) {
  return methodNotAllowed(context.request, context.env, ["OPTIONS", "POST"]);
}
