import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const IMAROUTER_BASE = 'https://api.imarouter.com/v1';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 72; // 6 minutes

async function downloadClip(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download clip: ${res.status}`);
  const path = join(tmpdir(), `clip_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

export async function generateVideo(prompt: string, duration = 5, narration?: string): Promise<string> {
  if (narration) prompt = `${prompt} Narrator says: "${narration}"`;

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
