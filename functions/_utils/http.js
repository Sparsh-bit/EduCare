function resolveOrigin(request, env) {
  const configured = env.CORS_ORIGIN;
  if (configured && configured !== "*") {
    return configured;
  }
  return request.headers.get("Origin") || "*";
}

export function corsHeaders(request, env) {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(request, env),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function options(request, env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  });
}

export function json(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}

export function methodNotAllowed(request, env, allowedMethods) {
  return new Response(
    JSON.stringify({
      error: "Method not allowed",
      allowed: allowedMethods,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Allow: allowedMethods.join(", "),
        ...corsHeaders(request, env),
      },
    }
  );
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
