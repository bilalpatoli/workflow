"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  selectOne,
  insertRow,
  selectRows,
  DEMO_COMPANY_ID,
  type Training,
  type Sop,
  type Trainee,
  type QuizItem,
  type ChecklistItem,
} from "../../lib/butterbase";
import { INTAKE_STORAGE_KEY, TRAINEE_STORAGE_KEY, type IntakeProfile } from "../../lib/intake";

function StatusBadge({ status }: { status: Training["status"] }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

const GENERATING_WORDS = [
  "Planning",
  "Scripting",
  "Directing",
  "Generating",
  "Narrating",
  "Stitching",
];

function GeneratingState() {
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % GENERATING_WORDS.length);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card generating-card">
      <div className="spinner-ring" aria-hidden />
      <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
        <span key={wordIndex} className="cycling-word">
          {GENERATING_WORDS[wordIndex]}
        </span>{" "}
        your training…
      </h2>
      <p className="muted" style={{ maxWidth: "44ch", margin: "0 auto 0.5rem" }}>
        Flowing through your material to script the scenes, narrate them, and stitch it all into one short video. Usually 1–2 minutes.
      </p>
      <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
        This page will update on its own — no need to refresh.
      </p>
    </div>
  );
}

function TrainingViewer({ trainingId }: { trainingId: string }) {
  const [training, setTraining] = useState<Training | null>(null);
  const [sop, setSop] = useState<Sop | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [traineeName, setTraineeName] = useState("");
  const [traineeEmail, setTraineeEmail] = useState("");
  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<{ score: number } | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Hydrate trainee identity from the intake step. If we already created a
  // trainee row at upload time, reuse it so the manager dashboard shows a
  // single coherent identity per person.
  useEffect(() => {
    const savedId = sessionStorage.getItem(TRAINEE_STORAGE_KEY);
    if (savedId) setTraineeId(savedId);
    const rawIntake = sessionStorage.getItem(INTAKE_STORAGE_KEY);
    if (rawIntake) {
      try {
        const intake = JSON.parse(rawIntake) as IntakeProfile;
        if (intake.name) setTraineeName(intake.name);
        if (intake.email) setTraineeEmail(intake.email);
      } catch {
        // ignore malformed intake
      }
    }
  }, []);

  // Poll training row until ready
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const t = await selectOne<Training>("trainings", { id: `eq.${trainingId}` });
        if (cancelled) return;
        setTraining(t);
        if (t && !sop) {
          const s = await selectOne<Sop>("sops", { id: `eq.${t.sop_id}` });
          if (!cancelled) setSop(s);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    tick();
    const interval = setInterval(() => {
      if (training?.status === "ready" || training?.status === "failed") return;
      tick();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [trainingId, training?.status, sop]);

  async function startTrainee() {
    if (!traineeName || !traineeEmail) return;
    const t = await insertRow<Trainee>("trainees", {
      company_id: DEMO_COMPANY_ID,
      name: traineeName,
      email: traineeEmail,
    });
    setTraineeId(t.id);
  }

  async function submitQuiz() {
    if (!training || !traineeId || !training.quiz_json) return;
    const items = training.quiz_json;
    const answersList = items.map((q) => ({
      qId: q.id,
      selectedIndex: answers[q.id] ?? -1,
      correct: answers[q.id] === q.correctIndex,
    }));
    const correctCount = answersList.filter((a) => a.correct).length;
    const score = items.length === 0 ? 0 : correctCount / items.length;
    await insertRow("quiz_attempts", {
      training_id: training.id,
      trainee_id: traineeId,
      completed_at: new Date().toISOString(),
      score,
      answers_json: answersList,
    });
    setCompleted({ score });
  }

  async function toggleChecklistItem(itemId: string) {
    if (!training || !traineeId) return;
    const next = !checked[itemId];
    setChecked({ ...checked, [itemId]: next });
    if (next) {
      await insertRow("checklist_completions", {
        training_id: training.id,
        trainee_id: traineeId,
        item_id: itemId,
      });
    }
  }

  if (error) return <main><p style={{ color: "#842029" }}>Error: {error}</p></main>;
  if (!training) return <main><p>Loading training…</p></main>;
  if (!sop) return <main><p>Loading SOP…</p></main>;

  return (
    <main>
      <p className="muted">
        <a href="/dashboard">← Dashboard</a>
      </p>
      <h1>{sop.title}</h1>
      <p>
        <StatusBadge status={training.status} />
      </p>

      {(training.status === "pending" || training.status === "generating") && (
        <GeneratingState />
      )}

      {training.status === "failed" && (
        <div className="card">
          <h2>Generation failed</h2>
          <p>{training.error ?? "Unknown error"}</p>
        </div>
      )}

      {training.status === "ready" && (
        <>
          <div className="card">
            <h2>Watch</h2>
            {training.video_url ? (
              <video
                src={training.video_url}
                controls
                style={{ width: "100%", borderRadius: 6 }}
              />
            ) : (
              <p className="muted">No video URL on this row.</p>
            )}
          </div>

          {!traineeId ? (
            <div className="card">
              <h2>Who's training?</h2>
              <label>Name</label>
              <input value={traineeName} onChange={(e) => setTraineeName(e.target.value)} placeholder="Jane Doe" />
              <label>Email</label>
              <input type="email" value={traineeEmail} onChange={(e) => setTraineeEmail(e.target.value)} placeholder="jane@acme.ai" />
              <button onClick={startTrainee} disabled={!traineeName || !traineeEmail}>
                Start training
              </button>
            </div>
          ) : (
            <>
              {training.quiz_json && training.quiz_json.length > 0 && (
                <div className="card">
                  <h2>Quiz</h2>
                  {completed ? (
                    <p>Score: <strong>{Math.round(completed.score * 100)}%</strong></p>
                  ) : (
                    <>
                      {training.quiz_json.map((q: QuizItem) => (
                        <div key={q.id} style={{ marginBottom: "1rem" }}>
                          <p><strong>{q.question}</strong></p>
                          {q.options.map((opt, i) => (
                            <label key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 0, fontWeight: 400 }}>
                              <input
                                type="radio"
                                name={q.id}
                                checked={answers[q.id] === i}
                                onChange={() => setAnswers({ ...answers, [q.id]: i })}
                                style={{ width: "auto", margin: 0 }}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      ))}
                      <button onClick={submitQuiz} disabled={Object.keys(answers).length < (training.quiz_json?.length ?? 0)}>
                        Submit quiz
                      </button>
                    </>
                  )}
                </div>
              )}

              {training.checklist_json && training.checklist_json.length > 0 && (
                <div className="card">
                  <h2>Checklist</h2>
                  {training.checklist_json.map((item: ChecklistItem) => (
                    <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={!!checked[item.id]}
                        onChange={() => toggleChecklistItem(item.id)}
                        style={{ width: "auto", margin: 0 }}
                      />
                      {item.text}
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

function TrainingPageInner() {
  const params = useSearchParams();
  const id = params.get("id");
  if (!id) return <main><p>Missing <code>?id=</code> in URL.</p></main>;
  return <TrainingViewer trainingId={id} />;
}

export default function TrainingPage() {
  return (
    <Suspense fallback={<main><p>Loading…</p></main>}>
      <TrainingPageInner />
    </Suspense>
  );
}
