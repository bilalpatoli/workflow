import Ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

if (ffmpegPath) Ffmpeg.setFfmpegPath(ffmpegPath);

export async function stitch(clips: string[], audio: string | null, out: string): Promise<void> {
  const concatList = join(tmpdir(), `concat_${Date.now()}.txt`);
  await writeFile(concatList, clips.map(c => `file '${c}'`).join('\n'));

  return new Promise((resolve, reject) => {
    let cmd = Ffmpeg()
      .input(concatList)
      .inputOptions(['-f', 'concat', '-safe', '0']);

    if (audio) cmd = cmd.input(audio);

    cmd.outputOptions([
        '-c:v', 'libx264',
        ...(audio ? ['-c:a', 'aac', '-shortest'] : ['-an']),
        '-movflags', '+faststart',
      ])
      .on('end', () => {
        unlink(concatList).catch(() => {});
        resolve();
      })
      .on('error', (err: Error) => {
        unlink(concatList).catch(() => {});
        reject(err);
      })
      .save(out);
  });
}

export function getDuration(filepath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    Ffmpeg.ffprobe(filepath, (err, data) => {
      if (err) reject(err);
      else resolve(Math.round(data.format.duration ?? 0));
    });
  });
}
