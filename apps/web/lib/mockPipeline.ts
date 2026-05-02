import { updateRow } from "./butterbase";

// Demo fallback that simulates Kyle's video pipeline client-side.
// Kicks a training row through pending → generating → ready over ~20 seconds.
// Wire NEXT_PUBLIC_PIPELINE_URL to disable this and use the real pipeline.

const SAMPLE_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const MOCK_QUIZ = [
  {
    id: "q1",
    question: "What is the first step in hiring a BDR?",
    options: [
      "Post on LinkedIn directly",
      "Open the req in ATS with title, level, and target start date",
      "Email candidates cold",
      "Schedule the panel",
    ],
    correctIndex: 1,
    rationale: "Step 1 of the SOP is to open a req in the ATS so sourcing and tracking are formal from day one.",
  },
  {
    id: "q2",
    question: "How long is the recruiter screen?",
    options: ["15 minutes", "30 minutes", "45 minutes", "60 minutes"],
    correctIndex: 1,
    rationale: "The SOP allocates 30 minutes for the recruiter screen.",
  },
  {
    id: "q3",
    question: "What does the hiring-manager interview focus on?",
    options: [
      "A timed coding test",
      "Role play and objection handling",
      "A personality assessment",
      "A background check",
    ],
    correctIndex: 1,
    rationale: "BDRs need real-time persuasion and resilience, so the interview centers on role play and objection handling.",
  },
  {
    id: "q4",
    question: "How many references should be checked?",
    options: [
      "1, any colleague",
      "2, prior managers preferred",
      "3, peers only",
      "5, mixed sources",
    ],
    correctIndex: 1,
    rationale: "Two references, with prior managers preferred.",
  },
];

const MOCK_CHECKLIST = [
  { id: "c1", text: "Open req in ATS with title, level, and target start date" },
  { id: "c2", text: "Source candidates via inbound + outbound LinkedIn outreach" },
  { id: "c3", text: "Conduct recruiter screen (30 min)" },
  { id: "c4", text: "Run hiring-manager interview (45 min) with role play" },
  { id: "c5", text: "Assemble panel with sales leader + cross-functional peer" },
  { id: "c6", text: "Complete 2 reference checks (prior managers preferred)" },
  { id: "c7", text: "Send offer and close" },
];

export function simulatePipeline(trainingId: string) {
  // Step 1: pending → generating
  setTimeout(() => {
    updateRow("trainings", trainingId, { status: "generating" }).catch((e) => {
      console.error("Mock pipeline (generating) failed:", e);
    });
  }, 5000);

  // Step 2: generating → ready with mock video + quiz + checklist
  setTimeout(() => {
    updateRow("trainings", trainingId, {
      status: "ready",
      video_url: SAMPLE_VIDEO_URL,
      duration_seconds: 60,
      quiz_json: MOCK_QUIZ,
      checklist_json: MOCK_CHECKLIST,
    }).catch((e) => {
      console.error("Mock pipeline (ready) failed:", e);
    });
  }, 20000);
}
