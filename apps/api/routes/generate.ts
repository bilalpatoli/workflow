import dotenv from 'dotenv';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { mkdir, readFile, unlink } from 'fs/promises';
import { join, resolve } from 'path';

// .env lives at workspace root, two levels above apps/api/routes/
dotenv.config({ path: resolve(__dirname, '../../../.env') });
import { planner } from '../../../agents/planner';
import { scriptWriter } from '../../../agents/script-writer';
import { sceneDirector } from '../../../agents/scene-director';
import { quizGenerator } from '../../../agents/quiz-generator';
import { checklist } from '../../../agents/checklist';
import { qaRubric } from '../../../agents/qa-rubric';
import { generateVideo } from './seedance';
import { stitch, getDuration } from '../lib/ffmpeg';

const app = new Hono();
app.use(cors());
const PORT = parseInt(process.env.API_PORT ?? '4000');
const VIDEOS_DIR = resolve(__dirname, '../../../demo/recordings');
const BB_URL = process.env.BUTTERBASE_API_URL!;
const BB_KEY = process.env.BUTTERBASE_SERVICE_KEY!;

async function bb<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BB_URL}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${BB_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`Butterbase ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

app.post('/api/generate-video', async c => {
  const { training_id, sop_id } = await c.req.json<{
    training_id: string;
    sop_id: string;
  }>();
  if (!training_id || !sop_id) {
    return c.json({ error: 'training_id and sop_id required' }, 400);
  }
  // Respond immediately — pipeline runs async and updates Butterbase when done
  runPipeline(training_id, sop_id).catch(console.error);
  return c.json({ ok: true }, 202);
});

// Serve generated videos
app.get('/videos/:filename', async c => {
  const filename = c.req.param('filename');
  if (filename.includes('..') || filename.includes('/')) return c.notFound();
  try {
    const data = await readFile(join(VIDEOS_DIR, filename));
    return new Response(data, { headers: { 'Content-Type': 'video/mp4' } });
  } catch {
    return c.notFound();
  }
});

async function runPipeline(trainingId: string, sopId: string) {
  try {
    // 1. Fetch SOP text from Butterbase
    const sop = await bb<{ source_text: string }>('GET', `sops/${sopId}`);

    // 2. Mark as generating
    await bb('PATCH', `trainings/${trainingId}`, { status: 'generating' });

    // 3. Planner: SOP → scenes + quiz + checklist
    console.log(`[${trainingId}] planning...`);
    const plan = await planner(sop.source_text);

    // 4. Script writer: refine voiceovers into polished narration
    console.log(`[${trainingId}] scripting...`);
    const script = await scriptWriter(plan);

    // 5. Run quiz, checklist, and QA rubric in parallel off SOP + script
    console.log(`[${trainingId}] generating quiz, checklist, rubric...`);
    const [quiz, checklistItems, rubric] = await Promise.all([
      quizGenerator(sop.source_text, script),
      checklist(sop.source_text),
      qaRubric(sop.source_text),
    ]);

    // 6. Scene director: scenes → visual prompts for Seedance
    console.log(`[${trainingId}] directing ${script.scenes.length} scenes...`);
    const scenes = await sceneDirector(script.scenes);

    // 7. Generate a single 10-second clip
    const [firstScene] = scenes;
    console.log(`[${trainingId}] generating 1 clip (10s)...`);
    const clips = [await generateVideo(firstScene.visualPrompt, 10, firstScene.voiceover)];

    // 8. FFmpeg: concat clips
    console.log(`[${trainingId}] stitching...`);
    await mkdir(VIDEOS_DIR, { recursive: true });
    const outputPath = join(VIDEOS_DIR, `${trainingId}.mp4`);
    await stitch(clips, null, outputPath);
    const durationSeconds = await getDuration(outputPath);

    // 9. Cleanup temp files
    await Promise.all(clips.map(f => unlink(f).catch(() => {})));

    // 10. Update Butterbase with final results

    const publicApiUrl = process.env.PUBLIC_API_URL ?? `http://localhost:${PORT}`;
    const videoUrl = `${publicApiUrl}/videos/${trainingId}.mp4`;
    await bb('PATCH', `trainings/${trainingId}`, {
      status: 'ready',
      video_url: videoUrl,
      duration_seconds: durationSeconds,
      quiz_json: quiz,
      checklist_json: checklistItems,
      rubric_json: rubric,
    });

    console.log(`[${trainingId}] done → ${videoUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${trainingId}] failed:`, message);
    await bb('PATCH', `trainings/${trainingId}`, { status: 'failed', error: message }).catch(
      () => {}
    );
  }
}

async function main() {
  await mkdir(VIDEOS_DIR, { recursive: true });
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`API server → http://localhost:${PORT}`);
  });
}

main().catch(console.error);
