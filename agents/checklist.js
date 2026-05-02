"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checklist = checklist;
const openai_1 = __importDefault(require("openai"));
async function checklist(sop) {
    const zai = new openai_1.default({
        apiKey: process.env.ZAI_API_KEY,
        baseURL: 'https://api.z.ai/api/paas/v4',
    });
    const res = await zai.chat.completions.create({
        model: 'glm-4.5',
        messages: [
            {
                role: 'system',
                content: `You are a training designer. Extract an ordered action checklist from an SOP for a trainee to complete.

Return ONLY valid JSON — no markdown, no explanation:
{
  "checklist": [
    { "id": "c1", "text": "action item" }
  ]
}

Rules:
- 5–8 items. Ordered by when the trainee would do them.
- Start each item with an action verb (e.g. "Review", "Complete", "Submit").
- Concrete and specific — no vague items like "Understand the process".
- IDs: c1, c2, c3...`,
            },
            {
                role: 'user',
                content: `Extract the action checklist from this SOP:\n\n${sop}`,
            },
        ],
        response_format: { type: 'json_object' },
    });
    const content = res.choices[0].message.content;
    if (!content)
        throw new Error('Checklist: empty response from Z.AI');
    return JSON.parse(content).checklist;
}
