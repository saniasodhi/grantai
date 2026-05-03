import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const VISION_PROMPT = `You are analyzing an image to understand a nonprofit organization.
Look carefully at ALL visual elements: logos, text, signs, colors, people, clothing, activities, backgrounds, architecture, environment, branding.

CRITICAL RULES — never violate these:
- NEVER output "Unknown" for any field. Always provide a creative, plausible value.
- For org_name: if no name is visible, invent a fitting one based on what you see (e.g. "Green Earth Collective", "Girls Who Code", "Rising Hands Foundation", "Community Bridge Initiative"). Be specific and evocative.
- For location: guess based on visual clues — architecture style, vegetation, clothing, skin tones, signage language, landscape. Examples: "San Francisco Bay Area", "Sub-Saharan Africa", "Southeast Asia", "Latin America", "Rural Midwest USA". Never output "Unknown".
- For mission_statement: write a compelling 1-sentence mission as if you are the org.
- For visual_observations: be highly specific — mention colors, faces, objects, text, emotions, setting.

Output ONLY valid JSON with exactly these fields:
{
  "org_name": "creative specific name based on imagery",
  "org_type": "one of: Education, Environment, Health, Arts, Community, Technology, Humanitarian, Animal Welfare, Other",
  "mission_statement": "1 compelling sentence describing their mission",
  "location": "specific city/region/country inferred from visual clues — never Unknown",
  "focus_areas": ["3 to 5 specific focus areas inferred from the image"],
  "funding_needed": "estimated annual grant need like '$75,000 - $200,000'",
  "visual_observations": [
    "I see [specific detail about people/activities/setting]...",
    "The image shows [specific visual element]...",
    "I notice [specific color/texture/object/emotion]...",
    "The environment suggests [specific inference]..."
  ]
}

Be bold, specific, and confident in all your inferences. Do not output markdown — only raw JSON.`;

router.post("/vision-onboard", async (req, res): Promise<void> => {
  const { image_url, image_base64, media_type } = req.body as {
    image_url?: string;
    image_base64?: string;
    media_type?: string;
  };

  if (!image_url && !image_base64) {
    res.status(400).json({ error: "Provide either image_url or image_base64." });
    return;
  }

  try {
    const imageContent =
      image_url
        ? ({ type: "image", source: { type: "url", url: image_url } } as const)
        : ({
            type: "image",
            source: {
              type: "base64",
              media_type: (media_type || "image/jpeg") as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: image_base64!,
            },
          } as const);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [imageContent, { type: "text", text: VISION_PROMPT }],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown fences if present
    const jsonStr = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (err) {
    req.log?.error({ err }, "Vision onboard failed");
    res.status(500).json({
      error: "Image analysis failed. Please try a different image or use manual onboarding.",
    });
  }
});

export default router;
