"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptWriter = scriptWriter;
const openai_1 = __importDefault(require("openai"));
async function scriptWriter(plan) {
    const zai = new openai_1.default({
        apiKey: process.env.ZAI_API_KEY,
        baseURL: 'https://api.z.ai/api/paas/v4',
    });
    const res = await zai.chat.completions.create({
        model: 'glm-4.5',
        messages: [
            {
                role: 'system',
                content: `You are a voiceover scriptwriter for workplace training videos.

You will receive a list of training scenes, each with a title and a rough voiceover draft.
Rewrite each voiceover into polished, conversational narration a real person would speak aloud.

Return ONLY valid JSON — no markdown, no explanation:
{
  "scenes": [
    { "id": "s1", "voiceover": "refined narration string" }
  ]
}

Rules:
- 3–5 natural spoken sentences per scene. No bullet points, no headers.
- Conversational and direct — written for audio, not reading.
- Use "you" to address the trainee. Keep it warm and clear.
- Preserve all factual content from the original draft.
- Do not add new facts not present in the original.`,
            },
            {
                role: 'user',
                content: `Rewrite these scene voiceovers:\n${JSON.stringify(plan.scenes.map(s => ({ id: s.id, title: s.title, voiceover: s.voiceover })), null, 2)}`,
            },
        ],
        response_format: { type: 'json_object' },
    });
    const content = res.choices[0].message.content;
    if (!content)
        throw new Error('ScriptWriter: empty response from Z.AI');
    const result = JSON.parse(content);
    return {
        ...plan,
        scenes: plan.scenes.map(scene => {
            const match = result.scenes.find(s => s.id === scene.id);
            return match ? { ...scene, voiceover: match.voiceover } : scene;
        }),
    };
}
