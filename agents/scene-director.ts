import OpenAI from 'openai';
import type { Scene } from './planner';

export interface SceneWithPrompt extends Scene {
  visualPrompt: string;
}

export async function sceneDirector(scenes: Scene[]): Promise<SceneWithPrompt[]> {
  const zai = new OpenAI({
    apiKey: process.env.ZAI_API_KEY,
    baseURL: 'https://api.z.ai/api/paas/v4',
  });

  const res = await zai.chat.completions.create({
    model: 'glm-4.5',
    messages: [
      {
        role: 'system',
        content: `You are a video director creating prompts for Seedance AI video generation.

For each training scene, write a visual prompt describing what the camera sees.

Return ONLY valid JSON — no markdown, no explanation:
{
  "scenes": [
    { "id": "s1", "visualPrompt": "string" }
  ]
}

Rules for visual prompts:
- Describe motion and action, not static images.
- Professional office or workplace environment.
- No text overlays, no subtitles, no captions in the prompt.
- 1–2 sentences. Lead with the subject and their action.
- Cinematic, warm lighting. Shallow depth of field.`,
      },
      {
        role: 'user',
        content: `Write visual prompts for these scenes:\n${JSON.stringify(
          scenes.map(s => ({ id: s.id, title: s.title, voiceover: s.voiceover })),
          null,
          2
        )}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = res.choices[0].message.content;
  if (!content) throw new Error('SceneDirector: empty response from Z.AI');

  const result = JSON.parse(content) as { scenes: { id: string; visualPrompt: string }[] };

  return scenes.map(scene => {
    const match = result.scenes.find(s => s.id === scene.id);
    return {
      ...scene,
      visualPrompt:
        match?.visualPrompt ??
        `Professional office worker demonstrating ${scene.title}, cinematic warm lighting.`,
    };
  });
}
