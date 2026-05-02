"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { insertRow, DEMO_COMPANY_ID, type Sop, type Trainee, type Training } from "../../lib/butterbase";
import { simulatePipeline } from "../../lib/mockPipeline";
import { uploadFile } from "../../lib/storage";
import { INTAKE_STORAGE_KEY, TRAINEE_STORAGE_KEY, type IntakeProfile } from "../../lib/intake";

type SourceType = "file" | "text" | "loom";

const ACCEPTED_TYPES =
  ".pdf,.md,.txt,.doc,.docx,.rtf,.html,.json,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a";

function prependIntakeContext(body: string, intake: IntakeProfile): string {
  const header = [
    "# Trainee context",
    `- Role: ${intake.role}`,
    `- Company: ${intake.company}`,
    `- Experience level: ${intake.experience}`,
    `- Training goal: ${intake.trainingGoal}`,
    "",
    "---",
    "",
  ].join("\n");
  return header + body;
}

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("file");
  const [sourceText, setSourceText] = useState("");
  const [loomUrl, setLoomUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intake, setIntake] = useState<IntakeProfile | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(INTAKE_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as IntakeProfile;
      setIntake(parsed);
      if (parsed.trainingGoal && !title) setTitle(parsed.trainingGoal);
    } catch {
      // ignore malformed intake
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setUploadProgress(null);

    try {
      let resolvedSourceText: string | null = null;
      let resolvedSourceUrl: string | null = null;

      if (sourceType === "text") {
        resolvedSourceText = intake ? prependIntakeContext(sourceText, intake) : sourceText;
      } else if (sourceType === "loom") {
        resolvedSourceUrl = loomUrl;
      } else if (sourceType === "file") {
        if (files.length === 0) throw new Error("Pick at least one file to upload first.");
        const objectIds: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setUploadProgress(`Uploading ${f.name} (${i + 1}/${files.length})…`);
          const uploaded = await uploadFile(f);
          objectIds.push(uploaded.objectId);
        }
        // One id → single-object reference; many → comma-joined list. Pipeline
        // consumers can mint download URLs from each id.
        resolvedSourceUrl =
          objectIds.length === 1
            ? `butterbase-object:${objectIds[0]}`
            : `butterbase-objects:${objectIds.join(",")}`;
        setUploadProgress(null);
      }

      // 1. Insert SOP row
      const sop = await insertRow<Sop>("sops", {
        company_id: DEMO_COMPANY_ID,
        title,
        source_type: sourceType,
        source_text: resolvedSourceText,
        source_url: resolvedSourceUrl,
      });

      // 2. Upsert the trainee from intake so the manager dashboard knows who
      //    created this training. We persist the trainee_id to sessionStorage
      //    so the training viewer can skip re-asking name/email later.
      let creatorTraineeId: string | null = null;
      if (intake?.name && intake?.email) {
        const trainee = await insertRow<Trainee>("trainees", {
          company_id: DEMO_COMPANY_ID,
          name: intake.name,
          email: intake.email,
          role: intake.role || null,
          company_name: intake.company || null,
        });
        creatorTraineeId = trainee.id;
        sessionStorage.setItem(TRAINEE_STORAGE_KEY, trainee.id);
      }

      // 3. Insert pending training row, linked back to the creator
      const training = await insertRow<Training>("trainings", {
        sop_id: sop.id,
        status: "pending",
        creator_trainee_id: creatorTraineeId,
      });

      // 3. Try to call Kyle's real pipeline first; if unavailable,
      //    fall back to the client-side mock pipeline so the demo still flows.
      const kylesApiUrl = process.env.NEXT_PUBLIC_PIPELINE_URL;
      let realPipelineCalled = false;
      if (kylesApiUrl) {
        try {
          const res = await fetch(`${kylesApiUrl}/api/generate-video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ training_id: training.id, sop_id: sop.id }),
          });
          if (res.ok) realPipelineCalled = true;
        } catch {
          // network error → fall through to mock
        }
      }
      if (!realPipelineCalled) {
        simulatePipeline(training.id, sop.id);
      }

      // 4. Redirect to the viewer
      router.push(`/training?id=${training.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <main>
      <div className="section-label">
        <span className="brand-bar" aria-hidden />
        <span className="eyebrow">Step 2 of 2 · Add the source material</span>
      </div>
      <h1>Create training</h1>
      <p className="muted">Upload files or a folder from your computer — docs, slides, recordings, screenshots. Or paste text or drop a Loom link. We&apos;ll turn it into a training video, quiz, and checklist.</p>

      {intake && (
        <div className="card" style={{ background: "var(--ink-50)", marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: "0.4rem" }}>Training for</div>
              <div style={{ fontWeight: 600 }}>{intake.role} · {intake.company}</div>
              {intake.trainingGoal && (
                <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: "0.9rem" }}>{intake.trainingGoal}</p>
              )}
            </div>
            <a href="/onboarding" className="button button-secondary" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
              Edit
            </a>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="card">
        <label>Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hire a BDR for an AI Company"
        />

        <label>How do you want to share it?</label>
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)}>
          <option value="file">Upload from my computer</option>
          <option value="text">Paste text</option>
          <option value="loom">Loom URL</option>
        </select>

        {sourceType === "text" && (
          <>
            <label>Training material</label>
            <textarea
              required
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={"Paste anything that explains the work — notes, a transcript, a checklist, or a step-by-step doc."}
              style={{ fontFamily: "var(--font-inter)", fontSize: "1rem" }}
            />
          </>
        )}

        {sourceType === "loom" && (
          <>
            <label>Loom URL</label>
            <input
              required
              type="url"
              value={loomUrl}
              onChange={(e) => setLoomUrl(e.target.value)}
              placeholder="https://www.loom.com/share/…"
            />
          </>
        )}

        {sourceType === "file" && (
          <>
            <label>Pick files</label>
            <input
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />

            <label style={{ marginTop: "0.75rem" }}>…or pick a whole folder</label>
            <input
              type="file"
              multiple
              // @ts-expect-error — webkitdirectory is non-standard but widely supported
              webkitdirectory=""
              directory=""
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />

            {files.length > 0 && (
              <ul className="muted" style={{ margin: "0 0 1rem 1.1rem", fontSize: "0.9rem" }}>
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    {f.webkitRelativePath || f.name} · {Math.round(f.size / 1024)} KB
                  </li>
                ))}
              </ul>
            )}

            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Docs, slides, recordings, screenshots — anything that explains the work. Multiple files welcome. 10 MB per file.
            </p>
          </>
        )}

        {uploadProgress && (
          <p style={{ color: "#084298", background: "#cfe2ff", padding: "0.5rem 0.75rem", borderRadius: 6 }}>
            {uploadProgress}
          </p>
        )}

        {error && (
          <p style={{ color: "#842029", background: "#f8d7da", padding: "0.5rem 0.75rem", borderRadius: 6 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Generating…" : "Generate training"}
        </button>
      </form>
    </main>
  );
}
