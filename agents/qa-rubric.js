"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qaRubric = qaRubric;
const openai_1 = __importDefault(require("openai"));
async function qaRubric(sop) {
    const zai = new openai_1.default({
        apiKey: process.env.ZAI_API_KEY,
        baseURL: 'https://api.z.ai/api/paas/v4',
    });
    const res = await zai.chat.completions.create({
        model: 'glm-4.5',
        messages: [
            {
                role: 'system',
                content: `You are a training quality assessor. Define pass/fail criteria a manager uses to evaluate whether a trainee has successfully completed the training.

Return ONLY valid JSON — no markdown, no explanation:
{
  "rubric": [
    {
      "id": "r1",
      "criterion": "short name for this criterion",
      "passDescription": "what passing looks like",
      "failDescription": "what failing looks like"
    }
  ]
}

Rules:
- 4–6 criteria. Each must be observable and measurable.
- Cover the most critical competencies from the SOP.
- passDescription and failDescription must be specific and contrast clearly.
- IDs: r1, r2, r3...`,
            },
            {
                role: 'user',
                content: `Define pass/fail criteria for this SOP:\n\n${sop}`,
            },
        ],
        response_format: { type: 'json_object' },
    });
    const content = res.choices[0].message.content;
    if (!content)
        throw new Error('QARubric: empty response from Z.AI');
    return JSON.parse(content).rubric;
}
