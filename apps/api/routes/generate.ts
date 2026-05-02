import dotenv from 'dotenv';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mkdir, readFile, unlink } from 'fs/promises';
import { join, resolve } from 'path';

// .env lives at workspace root, two levels above apps/api/routes/
dotenv.config({ path: resolve(__dirname, '../../../.env') });
import { planner } from '../../../agents/planner';
import { sceneDirector } from '../../../agents/scene-director';
import { generateVideo } from './seedance';
import { stitch, getDuration } from '../lib/ffmpeg';

const app = new Hono();
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

    // 4. Scene director: scenes → visual prompts for Seedance
    console.log(`[${trainingId}] directing ${plan.scenes.length} scenes...`);
    const scenes = await sceneDirector(plan.scenes);

    // 5. Generate video clips in parallel (narration baked into Seedance prompt)
    console.log(`[${trainingId}] generating ${scenes.length} clips in parallel...`);
    const clips = await Promise.all(scenes.map(s => generateVideo(s.visualPrompt, 5, s.voiceover)));

    // 6. FFmpeg: concat clips (no separate audio track)
    console.log(`[${trainingId}] stitching...`);
    await mkdir(VIDEOS_DIR, { recursive: true });
    const outputPath = join(VIDEOS_DIR, `${trainingId}.mp4`);
    await stitch(clips, null, outputPath);
    const durationSeconds = await getDuration(outputPath);

    // 7. Cleanup temp files
    await Promise.all(clips.map(f => unlink(f).catch(() => {})));

    // 8. Update Butterbase with final results
    const videoUrl = `http://localhost:${PORT}/videos/${trainingId}.mp4`;
    await bb('PATCH', `trainings/${trainingId}`, {
      status: 'ready',
      video_url: videoUrl,
      duration_seconds: durationSeconds,
      quiz_json: plan.quiz,
      checklist_json: plan.checklist,
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
