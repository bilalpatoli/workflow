"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { insertRow, DEMO_COMPANY_ID, type Sop, type Training } from "../../lib/butterbase";
import { simulatePipeline } from "../../lib/mockPipeline";
import { uploadFile } from "../../lib/storage";

type SourceType = "text" | "loom" | "file";

const ACCEPTED_TYPES = ".pdf,.md,.txt,.doc,.docx";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [sourceText, setSourceText] = useState("");
  const [loomUrl, setLoomUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setUploadProgress(null);

    try {
      let resolvedSourceText: string | null = null;
      let resolvedSourceUrl: string | null = null;

      if (sourceType === "text") {
        resolvedSourceText = sourceText;
      } else if (sourceType === "loom") {
        resolvedSourceUrl = loomUrl;
      } else if (sourceType === "file") {
        if (!file) throw new Error("Pick a file to upload first.");
        setUploadProgress(`Uploading ${file.name}…`);
        const uploaded = await uploadFile(file);
        // Save the objectId — pipeline consumers can mint a download URL with it.
        resolvedSourceUrl = `butterbase-object:${uploaded.objectId}`;
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
            body: JSON.stringify({ training_id: training.id, sop_id: sop.id }),
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
      setUploadProgress(null);
    }
  }

  return (
    <main>
      <h1>Create training</h1>
      <p className="muted">Paste text, drop a Loom URL, or upload a doc. We&apos;ll generate a training video, quiz, and checklist.</p>

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
          <option value="file">Upload doc (.pdf, .md, .txt, .docx)</option>
        </select>

        {sourceType === "text" && (
          <>
            <label>SOP content</label>
            <textarea
              required
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={"# Goal\nHire a BDR…\n\n## Steps\n1. …"}
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
            <label>Document</label>
            <input
              required
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="muted" style={{ marginTop: "-0.5rem" }}>
                {file.name} · {Math.round(file.size / 1024)} KB
              </p>
            )}
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Max 10 MB. Accepted: PDF, Markdown, plain text, Word.
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
