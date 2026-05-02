import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const BYTEPLUS_BASE = 'https://api.byteplus.com/seedance/v1';
const IMAROUTER_BASE = 'https://api.imarouter.com/v1';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 48; // 4 minutes

async function downloadClip(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download clip: ${res.status}`);
  const path = join(tmpdir(), `clip_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

async function generateWithByteplus(prompt: string, duration: number): Promise<string> {
  const res = await fetch(`${BYTEPLUS_BASE}/videos/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SEEDANCE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'seedance-2.0',
      prompt,
      duration,
      aspect_ratio: '16:9',
      resolution: '720p',
    }),
  });
  if (!res.ok) throw new Error(`BytePlus ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { id?: string; task_id?: string };
  const taskId = data.id ?? data.task_id;
  if (!taskId) throw new Error('BytePlus: no task ID in response');

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const poll = await fetch(`${BYTEPLUS_BASE}/videos/${taskId}`, {
      headers: { Authorization: `Bearer ${process.env.SEEDANCE_API_KEY}` },
    });
    const status = (await poll.json()) as {
      status: string;
      output?: { video_url?: string };
    };
    if (status.status === 'completed' && status.output?.video_url) {
      return downloadClip(status.output.video_url);
    }
    if (status.status === 'failed') throw new Error(`BytePlus task ${taskId} failed`);
  }
  throw new Error('BytePlus: polling timeout');
}

async function generateWithImaRouter(prompt: string, duration: number): Promise<string> {
  const res = await fetch(`${IMAROUTER_BASE}/videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.IMAROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'seedance-2.0',
      prompt,
      duration,
      aspect_ratio: '16:9',
      size: '720P',
    }),
  });
  if (!res.ok) throw new Error(`ImaRouter ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { id?: string; task_id?: string };
  const taskId = data.id ?? data.task_id;
  if (!taskId) throw new Error('ImaRouter: no task ID in response');

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const poll = await fetch(`${IMAROUTER_BASE}/videos/${taskId}`, {
      headers: { Authorization: `Bearer ${process.env.IMAROUTER_API_KEY}` },
    });
    const status = (await poll.json()) as { status: string; url?: string };
    if (status.status === 'succeeded' && status.url) {
      return downloadClip(status.url);
    }
    if (status.status === 'failed') throw new Error(`ImaRouter task ${taskId} failed`);
  }
  throw new Error('ImaRouter: polling timeout');
}

export async function generateVideo(prompt: string, duration = 5, narration?: string): Promise<string> {
  if (narration) prompt = `${prompt} Narrator says: "${narration}"`;

  try {
    return await generateWithByteplus(prompt, duration);
  } catch (err) {
    console.warn('[seedance] BytePlus failed, falling back to ImaRouter:', (err as Error).message);
    return await generateWithImaRouter(prompt, duration);
  }
}
