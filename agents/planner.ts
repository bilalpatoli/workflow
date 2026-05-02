import OpenAI from 'openai';

export interface Scene {
  id: string;
  title: string;
  voiceover: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  rationale: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface TrainingPlan {
  scenes: Scene[];
  quiz: QuizQuestion[];
  checklist: ChecklistItem[];
}

export async function planner(sop: string): Promise<TrainingPlan> {
  const zai = new OpenAI({
    apiKey: process.env.ZAI_API_KEY,
    baseURL: 'https://api.z.ai/api/paas/v4',
  });

  const res = await zai.chat.completions.create({
    model: 'glm-4.5',
    messages: [
      {
        role: 'system',
        content: `You are a training content creator. Convert SOPs into structured training programs for new employees.

Return ONLY valid JSON with this exact structure — no markdown, no explanation:
{
  "scenes": [
    { "id": "s1", "title": "short title", "voiceover": "2-3 sentences of narration spoken aloud to the trainee" }
  ],
  "quiz": [
    { "id": "q1", "question": "string", "options": ["A", "B", "C", "D"], "correctIndex": 0, "rationale": "why this is correct" }
  ],
  "checklist": [
    { "id": "c1", "text": "action-oriented item the trainee checks off" }
  ]
}

Rules:
- 3–4 scenes. Voiceover is 2–3 spoken sentences — clear and direct.
- 5–7 quiz questions; at least 2 must be scenario-based. Exactly 4 options each.
- 5–8 checklist items. Start each with an action verb. No fluff.`,
      },
      {
        role: 'user',
        content: `Convert this SOP into a training program:\n\n${sop}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = res.choices[0].message.content;
  if (!content) throw new Error('Planner: empty response from Z.AI');
  return JSON.parse(content) as TrainingPlan;
}
