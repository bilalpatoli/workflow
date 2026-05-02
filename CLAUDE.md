# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AI-generated SOP training videos with quizzes, checklists, and manager dashboards. A user uploads an SOP (markdown), and the system produces: a narrated training video, multiple-choice quiz, and action checklist.

## Commands

```bash
# Install (npm workspaces)
npm install

# Run individual apps
npm run dev:web     # Next.js portal at localhost:3000
npm run dev:api     # API pipeline (tsx watch)

# Inside each workspace
npm run build --workspace=web
npm run lint --workspace=web
npm run build --workspace=api
```

Copy `.env.example` to `.env` and fill in keys before running.

## Architecture

The system has three concerns, each owned by a different person:

**`apps/api/`** — Video generation pipeline (Person A)
- `routes/generate.ts` — Main orchestrator: `SOP → plan → script → scenes → video + voiceover → stitched MP4`
- `routes/seedance.ts` — Seedance API wrapper for AI video generation per scene
- `routes/tts.ts` — ElevenLabs TTS wrapper for voiceover synthesis
- `lib/ffmpeg.ts` — ffmpeg stitching: concat scene clips and mux audio into final MP4

**`apps/web/`** — Next.js 14 portal on Butterbase (Person B)
- `app/upload/` — SOP upload entry point
- `app/training/[id]/` — Trainee view: watch video, take quiz, complete checklist
- `app/dashboard/` — Manager dashboard
- `lib/butterbase.ts` — Butterbase client (URL + API key from env)

**`agents/` + `prompts/`** — Z.AI prompt agents (Person C)
- All agents take structured inputs and return structured outputs; all currently stub (`throw new Error("not implemented")`)
- Pipeline order: `planner` → `scriptWriter` → `sceneDirector` → video generation; `quizGenerator` + `checklist` + `qaRubric` run in parallel off the SOP/script; `retraining` consumes quiz/checklist results
- `prompts/` holds the raw markdown prompt templates that back each agent

## External services

| Service | Purpose | Env var |
|---------|---------|---------|
| Seedance | AI video generation | `SEEDANCE_API_KEY` |
| ElevenLabs | Text-to-speech | `ELEVENLABS_API_KEY` |
| Z.AI | Agent inference | `ZAI_API_KEY` |
| Butterbase | Web portal hosting | `BUTTERBASE_URL`, `BUTTERBASE_API_KEY` |

## Demo input

`demo/bdr-hiring-sop.md` is the reference SOP used for testing the pipeline end-to-end. Recordings go in `demo/recordings/`.
