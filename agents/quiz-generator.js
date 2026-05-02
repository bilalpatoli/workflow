"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizGenerator = quizGenerator;
const openai_1 = __importDefault(require("openai"));
async function quizGenerator(sop, script) {
    const zai = new openai_1.default({
        apiKey: process.env.ZAI_API_KEY,
        baseURL: 'https://api.z.ai/api/paas/v4',
    });
    const res = await zai.chat.completions.create({
        model: 'glm-4.5',
        messages: [
            {
                role: 'system',
                content: `You are a training assessment designer. Generate multiple-choice quiz questions from an SOP and its narration script.

Return ONLY valid JSON — no markdown, no explanation:
{
  "quiz": [
    { "id": "q1", "question": "string", "options": ["A", "B", "C", "D"], "correctIndex": 0, "rationale": "why this answer is correct" }
  ]
}

Rules:
- 5–7 questions. Exactly 4 options each. One correct answer per question.
- At least 2 must be scenario-based ("A new employee is asked to... what should they do?").
- Test comprehension and application, not memorization of wording.
- Rationale must explain why the correct answer is right and why the others are not.
- IDs: q1, q2, q3...`,
            },
            {
                role: 'user',
                content: `SOP:\n${sop}\n\nNarration script:\n${script.scenes.map(s => `[${s.title}] ${s.voiceover}`).join('\n\n')}`,
            },
        ],
        response_format: { type: 'json_object' },
    });
    const content = res.choices[0].message.content;
    if (!content)
        throw new Error('QuizGenerator: empty response from Z.AI');
    return JSON.parse(content).quiz;
}
