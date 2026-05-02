"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { insertRow, DEMO_COMPANY_ID, type Sop, type Training } from "../../lib/butterbase";
import { simulatePipeline } from "../../lib/mockPipeline";

type SourceType = "text" | "loom" | "file";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Insert SOP row
      const sop = await insertRow<Sop>("sops", {
        company_id: DEMO_COMPANY_ID,
        title,
        source_type: sourceType,
        source_text: sourceType === "text" ? sourceText : null,
        source_url: sourceType !== "text" ? sourceUrl : null,
      });

      // 2. Insert pending training row
      const training = await insertRow<Training>("trainings", {
        sop_id: sop.id,
        status: "pending",
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
            body: JSON.stringify({ trainingId: training.id, sopId: sop.id }),
          });
          if (res.ok) realPipelineCalled = true;
        } catch {
          // network error → fall through to mock
        }
      }
      if (!realPipelineCalled) {
        simulatePipeline(training.id);
      }

      // 4. Redirect to the viewer
      router.push(`/training?id=${training.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Upload an SOP</h1>
      <p className="muted">Paste text, drop a Loom URL, or upload a file. We'll generate a training video, quiz, and checklist.</p>

      <form onSubmit={onSubmit} className="card">
        <label>Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hire a BDR for an AI Company"
        />

        <label>Source</label>
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value as SourceType)}>
          <option value="text">Paste text</option>
          <option value="loom">Loom URL</option>
          <option value="file">File URL</option>
        </select>

        {sourceType === "text" ? (
          <>
            <label>SOP content</label>
            <textarea
              required
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={"# Goal\nHire a BDR…\n\n## Steps\n1. …"}
            />
          </>
        ) : (
          <>
            <label>{sourceType === "loom" ? "Loom URL" : "File URL"}</label>
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder={sourceType === "loom" ? "https://www.loom.com/share/…" : "https://…"}
            />
          </>
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
