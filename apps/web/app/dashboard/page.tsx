"use client";

import { useEffect, useState } from "react";
import {
  selectRows,
  DEMO_COMPANY_ID,
  type Training,
  type Sop,
  type Trainee,
  type QuizAttempt,
} from "../../lib/butterbase";

type Row = {
  attempt: QuizAttempt;
  trainee: Trainee;
  training: Training;
  sop: Sop;
};

export default function DashboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Pull everything for the demo tenant.
        const [sops, trainees, attempts] = await Promise.all([
          selectRows<Sop>("sops", { filters: { company_id: `eq.${DEMO_COMPANY_ID}` } }),
          selectRows<Trainee>("trainees", { filters: { company_id: `eq.${DEMO_COMPANY_ID}` } }),
          selectRows<QuizAttempt>("quiz_attempts", { order: "started_at.desc", limit: 200 }),
        ]);
        if (cancelled) return;

        const sopIds = sops.map((s) => s.id);
        const trainings = sopIds.length
          ? await selectRows<Training>("trainings", {
              filters: { sop_id: `in.(${sopIds.join(",")})` },
              order: "created_at.desc",
              limit: 200,
            })
          : [];
        if (cancelled) return;
        setTrainings(trainings);

        const sopById = new Map(sops.map((s) => [s.id, s]));
        const trainingById = new Map(trainings.map((t) => [t.id, t]));
        const traineeById = new Map(trainees.map((t) => [t.id, t]));

        const joined: Row[] = attempts.flatMap((a) => {
          const training = trainingById.get(a.training_id);
          const trainee = traineeById.get(a.trainee_id);
          if (!training || !trainee) return [];
          const sop = sopById.get(training.sop_id);
          if (!sop) return [];
          return [{ attempt: a, trainee, training, sop }];
        });

        setRows(joined);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) return <main><p style={{ color: "#842029" }}>Error: {error}</p></main>;

  return (
    <main>
      <h1>Manager dashboard</h1>
      <p className="muted">Acme AI · {trainings.length} training{trainings.length === 1 ? "" : "s"} created · {rows.length} attempt{rows.length === 1 ? "" : "s"}</p>

      <h2 style={{ marginTop: "2rem" }}>Trainings</h2>
      {trainings.length === 0 ? (
        <p className="muted">No trainings yet. <a href="/onboarding">Create training →</a></p>
      ) : (
        <div>
          {trainings.map((t) => (
            <div key={t.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <a href={`/training?id=${t.id}`}><strong>Training {t.id.slice(0, 8)}</strong></a>
                <p className="muted" style={{ marginBottom: 0 }}>Created {new Date(t.created_at).toLocaleString()}</p>
              </div>
              <span className={`badge badge-${t.status}`}>{t.status}</span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: "2rem" }}>Quiz attempts</h2>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No attempts yet. Trainees who finish a quiz will show up here.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "#fafafa", textAlign: "left" }}>
              <th style={{ padding: "0.6rem 0.75rem" }}>Trainee</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Training</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>Score</th>
              <th style={{ padding: "0.6rem 0.75rem" }}>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.attempt.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <strong>{r.trainee.name}</strong>
                  <div className="muted">{r.trainee.email}</div>
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <a href={`/training?id=${r.training.id}`}>{r.sop.title}</a>
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  {r.attempt.score === null ? "—" : `${Math.round(r.attempt.score * 100)}%`}
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }} className="muted">
                  {new Date(r.attempt.started_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
