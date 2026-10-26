export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { ingredients } = req.body || {};
  if (!Array.isArray(ingredients) || ingredients.length < 3 || ingredients.length > 5) {
    return res.status(400).json({ error: "Send 3 to 5 ingredients" });
  }
  const clean = ingredients.map(s => String(s).replace(/[^\w\s,'-]/g, "").slice(0, 30));

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
      max_tokens: 800,
      system:
        "You write simple, cheap recipes for families using food pantry items. " +
        "Use only the given ingredients plus water, salt, pepper, and oil. Max 6 short steps. " +
        'Reply ONLY with JSON, no other text: {"title":string,"time":string,"servings":number,"ingredients":string[],"steps":string[],"tip":string}',
      messages: [{ role: "user", content: `Ingredients: ${clean.join(", ")}` }],
    }),
  });

  if (!r.ok) {
    console.log("Claude error:", r.status, await r.text());
    return res.status(502).json({ error: "Recipe service unavailable" });
  }
  const data = await r.json();
  try {
    const text = data.content[0].text.replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(text));
  } catch {
    console.log("Could not parse:", JSON.stringify(data));
    return res.status(502).json({ error: "Could not read recipe" });
  }
}
