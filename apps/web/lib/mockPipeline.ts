import { selectOne, updateRow, type Sop } from "./butterbase";

// Demo fallback that simulates Kyle's video pipeline client-side.
// Kicks a training row through pending → generating → ready over ~20 seconds.
//
// While Kyle's full video pipeline isn't reachable, the quiz and checklist
// are still generated against the real SOP text via the
// `generate-quiz-and-checklist` Butterbase function (which calls Z.AI).
// The video falls back to a stock sample MP4.
//
// Wire NEXT_PUBLIC_PIPELINE_URL to disable this and use the real pipeline.

const SAMPLE_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const apiUrl =
  process.env.NEXT_PUBLIC_BUTTERBASE_API_URL ?? process.env.BUTTERBASE_API_URL;

const PLACEHOLDER_QUIZ = [
  {
    id: "q1",
    question: "We couldn't generate quiz questions from this source yet — what happened?",
    options: [
      "The source was a Loom or file upload, so the quiz generator skipped it for now.",
      "The system is broken.",
      "The trainee skipped a step.",
      "The manager hasn't reviewed it.",
    ],
    correctIndex: 0,
    rationale: "Quiz generation runs against the SOP text. File and Loom sources need the full pipeline to extract content first.",
  },
];

const PLACEHOLDER_CHECKLIST = [
  { id: "c1", text: "Watch the full training video" },
  { id: "c2", text: "Apply the steps to your next task" },
  { id: "c3", text: "Ask your manager for one piece of feedback" },
];

async function generateQuizAndChecklist(sopText: string): Promise<{
  quiz: typeof PLACEHOLDER_QUIZ;
  checklist: typeof PLACEHOLDER_CHECKLIST;
}> {
  if (!apiUrl) throw new Error("Butterbase API URL not configured");
  const res = await fetch(`${apiUrl}/fn/generate-quiz-and-checklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sop: sopText }),
  });
  if (!res.ok) {
    throw new Error(`generate-quiz-and-checklist ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export function simulatePipeline(trainingId: string, sopId: string) {
  // Step 1: pending → generating after a beat so the loading UI has time to show.
  setTimeout(() => {
    updateRow("trainings", trainingId, { status: "generating" }).catch((e) => {
      console.error("Mock pipeline (generating) failed:", e);
    });
  }, 4000);

  // Step 2: generating → ready. Kick off Z.AI generation in parallel with a
  // delay so the spinner has presence even when Z.AI returns fast.
  (async () => {
    const generationStarted = Date.now();
    const minDuration = 12000;

    let quiz = PLACEHOLDER_QUIZ;
    let checklist = PLACEHOLDER_CHECKLIST;
    try {
      const sop = await selectOne<Sop>("sops", { id: `eq.${sopId}` });
      if (sop?.source_text) {
        const result = await generateQuizAndChecklist(sop.source_text);
        if (result.quiz?.length) quiz = result.quiz;
        if (result.checklist?.length) checklist = result.checklist;
      }
    } catch (e) {
      console.error("Mock pipeline (Z.AI generation) failed, using placeholders:", e);
    }

    const elapsed = Date.now() - generationStarted;
    if (elapsed < minDuration) {
      await new Promise((r) => setTimeout(r, minDuration - elapsed));
    }

    try {
      await updateRow("trainings", trainingId, {
        status: "ready",
        video_url: SAMPLE_VIDEO_URL,
        duration_seconds: 60,
        quiz_json: quiz,
        checklist_json: checklist,
      });
    } catch (e) {
      console.error("Mock pipeline (ready) failed:", e);
    }
  })();
}
