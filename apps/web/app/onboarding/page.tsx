"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTAKE_STORAGE_KEY, type IntakeProfile } from "../../lib/intake";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [trainingGoal, setTrainingGoal] = useState("");
  const [experience, setExperience] = useState("new-hire");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const profile: IntakeProfile = { role, company, trainingGoal, experience };
    sessionStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(profile));
    router.push("/upload");
  }

  return (
    <main>
      <div className="section-label">
        <span className="brand-bar" aria-hidden />
        <span className="eyebrow">Step 1 of 2 · Get to know your position</span>
      </div>

      <h1 className="display-l" style={{ marginBottom: "0.5rem" }}>
        Tell us about the role.
      </h1>
      <p className="body-l" style={{ marginBottom: "2rem" }}>
        We&apos;ll use this to shape the training around your job — the language, the examples, and what &ldquo;done well&rdquo; looks like.
      </p>

      <form onSubmit={onSubmit} className="card">
        <label htmlFor="role">What were you hired for?</label>
        <input
          id="role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Business Development Representative"
        />

        <label htmlFor="company">Company</label>
        <input
          id="company"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Acme AI"
        />

        <label htmlFor="experience">How new is this to you?</label>
        <select
          id="experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
        >
          <option value="new-hire">Brand new — first week</option>
          <option value="ramping">Ramping up — a few weeks in</option>
          <option value="experienced">Experienced — just need a refresher</option>
        </select>

        <label htmlFor="goal">What training do you need help creating?</label>
        <textarea
          id="goal"
          required
          value={trainingGoal}
          onChange={(e) => setTrainingGoal(e.target.value)}
          placeholder="e.g. How to qualify an inbound lead and book a discovery call."
          style={{ minHeight: "6rem", fontFamily: "var(--font-inter)", fontSize: "1rem" }}
        />

        <button type="submit">Continue to upload →</button>
      </form>
    </main>
  );
}
