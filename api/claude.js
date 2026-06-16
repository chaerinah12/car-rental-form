// /api/claude.js
// Vercel serverless function. Proxies the frontend's zone-classification
// request to the real Anthropic API, keeping the API key on the server.
//
// Setup:
// 1. Put this file at api/claude.js in your project (same repo as index.html).
// 2. In the Vercel dashboard: Project -> Settings -> Environment Variables,
//    add ANTHROPIC_API_KEY = sk-ant-... (from console.anthropic.com -> API Keys).
// 3. Redeploy. The frontend's fetch("/api/claude") will then reach this file.
//
// Security note: this endpoint has no login/auth, so anyone who finds the
// URL could call it directly (not just through your site). To limit damage,
// the model and max_tokens are fixed here on the server and NOT taken from
// the request body, so a stranger can't make it expensive. Still worth
// setting a monthly spend cap on your Anthropic account as a backstop.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'messages'" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set in Vercel environment variables");
    return res.status(500).json({ error: "Server is missing its API key" });
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // fixed here, ignores whatever the client sends
        max_tokens: 500,                    // fixed here, ignores whatever the client sends
        messages,
      }),
    });

    const data = await anthropicRes.json();
    return res.status(anthropicRes.status).json(data);
  } catch (err) {
    console.error("Claude proxy error:", err);
    return res.status(500).json({ error: "Failed to reach Claude" });
  }
}
