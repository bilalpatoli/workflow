import OpenAI from 'openai';

export interface TraineeResults {
  quizResults: { questionId: string; correct: boolean }[];
  checklistResults: { itemId: string; completed: boolean }[];
}

export interface RetrainingPlan {
  gaps: string[];
  followUpModules: { title: string; description: string }[];
}

export async function retraining(results: TraineeResults): Promise<RetrainingPlan> {
  const zai = new OpenAI({
    apiKey: process.env.ZAI_API_KEY,
    baseURL: 'https://api.z.ai/api/paas/v4',
  });

  const incorrectCount = results.quizResults.filter(r => !r.correct).length;
  const incompleteCount = results.checklistResults.filter(r => !r.completed).length;

  const res = await zai.chat.completions.create({
    model: 'glm-4.5',
    messages: [
      {
        role: 'system',
        content: `You are a training gap analyst. Given a trainee's quiz and checklist results, identify knowledge gaps and propose targeted follow-up training modules.

Return ONLY valid JSON — no markdown, no explanation:
{
  "gaps": ["gap description 1", "gap description 2"],
  "followUpModules": [
    { "title": "module title", "description": "what this module covers and why it addresses the gap" }
  ]
}

Rules:
- List only genuine gaps — skip areas where the trainee performed well.
- 1–4 gaps maximum. Be specific about what knowledge is missing.
- 1 follow-up module per gap. Keep descriptions concise and actionable.
- If there are no gaps (all correct, all complete), return empty arrays.`,
      },
      {
        role: 'user',
        content: `Trainee results:\n- Quiz: ${results.quizResults.filter(r => r.correct).length}/${results.quizResults.length} correct (${incorrectCount} missed)\n- Checklist: ${results.checklistResults.filter(r => r.completed).length}/${results.checklistResults.length} completed (${incompleteCount} skipped)\n\nDetailed results:\n${JSON.stringify(results, null, 2)}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = res.choices[0].message.content;
  if (!content) throw new Error('Retraining: empty response from Z.AI');
  return JSON.parse(content) as RetrainingPlan;
}
