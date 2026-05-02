"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const promises_1 = require("fs/promises");
const path_1 = require("path");
// .env lives at workspace root, two levels above apps/api/routes/
dotenv_1.default.config({ path: (0, path_1.resolve)(__dirname, '../../../.env') });
const planner_1 = require("../../../agents/planner");
const script_writer_1 = require("../../../agents/script-writer");
const scene_director_1 = require("../../../agents/scene-director");
const quiz_generator_1 = require("../../../agents/quiz-generator");
const checklist_1 = require("../../../agents/checklist");
const qa_rubric_1 = require("../../../agents/qa-rubric");
const seedance_1 = require("./seedance");
const ffmpeg_1 = require("../lib/ffmpeg");
const app = new hono_1.Hono();
const PORT = parseInt(process.env.API_PORT ?? '4000');
const VIDEOS_DIR = (0, path_1.resolve)(__dirname, '../../../demo/recordings');
const BB_URL = process.env.BUTTERBASE_API_URL;
const BB_KEY = process.env.BUTTERBASE_SERVICE_KEY;
async function bb(method, path, body) {
    const res = await fetch(`${BB_URL}/${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${BB_KEY}`,
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok)
        throw new Error(`Butterbase ${method} ${path}: ${res.status} ${await res.text()}`);
    return res.json();
}
app.post('/api/generate-video', async (c) => {
    const { training_id, sop_id } = await c.req.json();
    if (!training_id || !sop_id) {
        return c.json({ error: 'training_id and sop_id required' }, 400);
    }
    // Respond immediately — pipeline runs async and updates Butterbase when done
    runPipeline(training_id, sop_id).catch(console.error);
    return c.json({ ok: true }, 202);
});
// Serve generated videos
app.get('/videos/:filename', async (c) => {
    const filename = c.req.param('filename');
    if (filename.includes('..') || filename.includes('/'))
        return c.notFound();
    try {
        const data = await (0, promises_1.readFile)((0, path_1.join)(VIDEOS_DIR, filename));
        return new Response(data, { headers: { 'Content-Type': 'video/mp4' } });
    }
    catch {
        return c.notFound();
    }
});
async function runPipeline(trainingId, sopId) {
    try {
        // 1. Fetch SOP text from Butterbase
        const sop = await bb('GET', `sops/${sopId}`);
        // 2. Mark as generating
        await bb('PATCH', `trainings/${trainingId}`, { status: 'generating' });
        // 3. Planner: SOP → scenes + quiz + checklist
        console.log(`[${trainingId}] planning...`);
        const plan = await (0, planner_1.planner)(sop.source_text);
        // 4. Script writer: refine voiceovers into polished narration
        console.log(`[${trainingId}] scripting...`);
        const script = await (0, script_writer_1.scriptWriter)(plan);
        // 5. Run quiz, checklist, and QA rubric in parallel off SOP + script
        console.log(`[${trainingId}] generating quiz, checklist, rubric...`);
        const [quiz, checklistItems, rubric] = await Promise.all([
            (0, quiz_generator_1.quizGenerator)(sop.source_text, script),
            (0, checklist_1.checklist)(sop.source_text),
            (0, qa_rubric_1.qaRubric)(sop.source_text),
        ]);
        // 6. Scene director: scenes → visual prompts for Seedance
        console.log(`[${trainingId}] directing ${script.scenes.length} scenes...`);
        const scenes = await (0, scene_director_1.sceneDirector)(script.scenes);
        // 7. Generate video clips in parallel (narration baked into Seedance prompt)
        console.log(`[${trainingId}] generating ${scenes.length} clips in parallel...`);
        const clips = await Promise.all(scenes.map(s => (0, seedance_1.generateVideo)(s.visualPrompt, 5, s.voiceover)));
        // 8. FFmpeg: concat clips
        console.log(`[${trainingId}] stitching...`);
        await (0, promises_1.mkdir)(VIDEOS_DIR, { recursive: true });
        const outputPath = (0, path_1.join)(VIDEOS_DIR, `${trainingId}.mp4`);
        await (0, ffmpeg_1.stitch)(clips, null, outputPath);
        const durationSeconds = await (0, ffmpeg_1.getDuration)(outputPath);
        // 9. Cleanup temp files
        await Promise.all(clips.map(f => (0, promises_1.unlink)(f).catch(() => { })));
        // 10. Update Butterbase with final results
        const videoUrl = `http://localhost:${PORT}/videos/${trainingId}.mp4`;
        await bb('PATCH', `trainings/${trainingId}`, {
            status: 'ready',
            video_url: videoUrl,
            duration_seconds: durationSeconds,
            quiz_json: quiz,
            checklist_json: checklistItems,
            rubric_json: rubric,
        });
        console.log(`[${trainingId}] done → ${videoUrl}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${trainingId}] failed:`, message);
        await bb('PATCH', `trainings/${trainingId}`, { status: 'failed', error: message }).catch(() => { });
    }
}
async function main() {
    await (0, promises_1.mkdir)(VIDEOS_DIR, { recursive: true });
    (0, node_server_1.serve)({ fetch: app.fetch, port: PORT }, () => {
        console.log(`API server → http://localhost:${PORT}`);
    });
}
main().catch(console.error);
