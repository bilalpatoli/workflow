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

const VIDEO_DURATION_SECONDS = 10;

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

async function generateVideo(sopText: string): Promise<{ video_url: string; duration_seconds: number }> {
  if (!apiUrl) throw new Error("Butterbase API URL not configured");
  const res = await fetch(`${apiUrl}/fn/generate-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sop: sopText, duration: VIDEO_DURATION_SECONDS }),
  });
  if (!res.ok) {
    throw new Error(`generate-video ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export function simulatePipeline(trainingId: string, sopId: string) {
  // Linear flow so the prior race (setTimeout-driven "generating" overwrite
  // landing AFTER the "ready" update) can't recur: flip to generating right
  // away, then wait for both upstream calls, then flip to ready exactly once.
  (async () => {
    await updateRow("trainings", trainingId, { status: "generating" }).catch((e) => {
      console.error("Mock pipeline (generating) failed:", e);
    });

    const sop = await selectOne<Sop>("sops", { id: `eq.${sopId}` }).catch(() => null);
    const sopText = sop?.source_text ?? "";

    const quizPromise: Promise<{ quiz: typeof PLACEHOLDER_QUIZ; checklist: typeof PLACEHOLDER_CHECKLIST }> = sopText
      ? generateQuizAndChecklist(sopText).catch((e) => {
          console.error("Mock pipeline (quiz/checklist) failed, using placeholders:", e);
          return { quiz: PLACEHOLDER_QUIZ, checklist: PLACEHOLDER_CHECKLIST };
        })
      : Promise.resolve({ quiz: PLACEHOLDER_QUIZ, checklist: PLACEHOLDER_CHECKLIST });

    const videoPromise: Promise<{ video_url: string; duration_seconds: number }> = sopText
      ? generateVideo(sopText).catch((e) => {
          console.error("Mock pipeline (video) failed, falling back to sample MP4:", e);
          return { video_url: SAMPLE_VIDEO_URL, duration_seconds: 60 };
        })
      : Promise.resolve({ video_url: SAMPLE_VIDEO_URL, duration_seconds: 60 });

    const [{ quiz, checklist }, video] = await Promise.all([quizPromise, videoPromise]);

    try {
      await updateRow("trainings", trainingId, {
        status: "ready",
        video_url: video.video_url,
        duration_seconds: video.duration_seconds,
        quiz_json: quiz?.length ? quiz : PLACEHOLDER_QUIZ,
        checklist_json: checklist?.length ? checklist : PLACEHOLDER_CHECKLIST,
      });
    } catch (e) {
      console.error("Mock pipeline (ready) failed:", e);
    }
  })();
}
