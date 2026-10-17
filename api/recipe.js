// Vercel serverless function: POST /api/recipe  { ingredients: ["Rice", "Canned beans", ...] }
// Set OPENAI_API_KEY in Vercel > Project > Settings > Environment Variables.
// Then set CONFIG.AI_ENDPOINT = "/api/recipe" in index.html.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { ingredients } = req.body || {};
  if (!Array.isArray(ingredients) || ingredients.length < 3 || ingredients.length > 5) {
    return res.status(400).json({ error: "Send 3 to 5 ingredients" });
  }
  const clean = ingredients.map(s => String(s).replace(/[^\w\s,'-]/g, "").slice(0, 30));

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You write simple, cheap recipes for families using food pantry items. " +
            "Use only the given ingredients plus water, salt, pepper, and oil. Max 6 short steps. " +
            'Reply ONLY with JSON: {"title":string,"time":string,"servings":number,"ingredients":string[],"steps":string[],"tip":string}',
        },
        { role: "user", content: `Ingredients: ${clean.join(", ")}` },
      ],
    }),
  });

  if (!r.ok) return res.status(502).json({ error: "Recipe service unavailable" });
  const data = await r.json();
  try {
    return res.status(200).json(JSON.parse(data.choices[0].message.content));
  } catch {
    return res.status(502).json({ error: "Could not read recipe" });
  }
}
