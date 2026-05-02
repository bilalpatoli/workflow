# Workflow

AI-generated SOP training videos with quizzes, checklists, and manager dashboards.

## Structure

```
workflow/
├── apps/
│   ├── web/        # Person B — Next.js portal on Butterbase
│   └── api/        # Person A — Video generation pipeline
├── agents/         # Person C — Z.AI prompt agents
├── prompts/        # Raw prompt templates (markdown)
└── demo/           # Demo SOP input + recordings
```

## Owners

- **Person A** — `apps/api/` video generation pipeline (Seedance, ElevenLabs, ffmpeg)
- **Person B** — `apps/web/` Next.js portal on Butterbase
- **Person C** — `agents/` and `prompts/` Z.AI prompt agents

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

See each app's README for details.
