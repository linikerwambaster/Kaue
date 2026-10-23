// Vercel Function: GET /api/status?id=<publicId>
module.exports = async function handler(req, res) {
  const env = process.env;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  const id = new URL(req.url, "https://localhost").searchParams.get("id") || "";

  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ status: "INVALID" }));
  }
  if (!env.GLADEPAY_API_KEY) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ status: "UNKNOWN" }));
  }

  try {
    const base = (env.GLADEPAY_BASE_URL || "https://app.gladepay.com.br/v1").replace(/\/$/, "");
    const resp = await fetch(base + "/deposito/status?txId=" + encodeURIComponent(id), {
      headers: { Authorization: "Bearer " + env.GLADEPAY_API_KEY, Accept: "application/json" },
    });
    const json = await resp.json().catch(() => ({}));
    if (resp.ok && json.status) {
      return res.end(JSON.stringify({ status: json.status }));
    }
  } catch (e) {
    console.error("GladePay status falha: " + e.message);
  }
  res.statusCode = 502;
  res.end(JSON.stringify({ status: "UNKNOWN" }));
};
