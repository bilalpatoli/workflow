export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="section-label">
          <span className="brand-bar" aria-hidden />
          <span className="eyebrow">The Autonomous Training Agent</span>
        </div>

        <h1 className="display-xl">
          Repeatable work, run by an AI manager.
        </h1>

        <p className="body-l">
          Drop in an SOP, a Loom, or a checklist. WorkFlow turns it into role-specific training, execution checklists, quizzes, and QA feedback — and retrains employees when they make mistakes.
        </p>

        <div className="hero-actions">
          <a href="/upload" className="button">Upload an SOP →</a>
          <a href="/dashboard" className="button button-secondary">Manager view</a>
        </div>
      </section>

      {/* Metrics */}
      <section className="metric-strip" aria-label="What changes">
        <div className="metric">
          <div className="metric-value">−63%</div>
          <div className="metric-label">Repeated mistakes after first QA cycle</div>
        </div>
        <div className="metric">
          <div className="metric-value">2.4×</div>
          <div className="metric-label">Faster employee ramp-up to full proficiency</div>
        </div>
        <div className="metric">
          <div className="metric-value">9 hrs</div>
          <div className="metric-label">Manager hours saved per role, per week</div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <div className="section-label">
          <span className="eyebrow">How it works</span>
        </div>
        <h2 className="display-l">From messy process to consistent execution.</h2>

        <div className="two-col">
          <div className="feature-card">
            <h3>Teach</h3>
            <p className="body-m">
              Drop in an SOP, a Loom, or a checklist. WorkFlow generates a role-specific video, scored quiz, and execution checklist from your actual process — in under two minutes.
            </p>
          </div>
          <div className="feature-card">
            <h3>Verify &amp; retrain</h3>
            <p className="body-m">
              Execution checklists and QA feedback catch missed steps. Employees get retrained automatically — without a manager in the loop. Managers step in only on real exceptions.
            </p>
          </div>
        </div>
      </section>

      {/* Product card */}
      <section style={{ marginTop: "2.5rem" }}>
        <div className="feature-card">
          <div className="section-label">
            <span className="eyebrow">Product</span>
          </div>
          <h2 className="display-m" style={{ marginBottom: "0.75rem" }}>
            An AI manager that learns your process — and runs the routine for you.
          </h2>
          <p className="body-m" style={{ marginBottom: "1.25rem" }}>
            Training, execution checks, quizzes, and QA all live in one place. Mistakes trigger targeted retraining, automatically.
          </p>
          <a href="/training?id=67c529b6-38a1-4e60-8e7f-46fd1f155075" className="button button-secondary">
            See a sample training →
          </a>
        </div>
      </section>

      {/* Closing */}
      <section className="closing">
        <h2>Hand the routine to WorkFlow.</h2>
        <p>Less oversight. Fewer mistakes. Faster ramp-up.</p>
        <a href="/upload" className="button">Upload an SOP →</a>
      </section>
    </main>
  );
}
