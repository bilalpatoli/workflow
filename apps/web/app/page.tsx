export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="section-label">
          <span className="brand-bar" aria-hidden />
          <span className="eyebrow">Your training portal</span>
        </div>

        <h1 className="display-xl">Get up to speed, your way.</h1>

        <p className="body-l">
          Watch a short video, take the quiz, and check off each step as you go. Every training is shaped to your role — train at your pace, replay it whenever you need.
        </p>

        <div className="hero-actions">
          <a href="/training?id=67c529b6-38a1-4e60-8e7f-46fd1f155075" className="button">
            Start your training →
          </a>
          <a href="/dashboard" className="button button-secondary">
            I&apos;m a manager →
          </a>
        </div>
      </section>

      {/* What you get */}
      <section className="metric-strip" aria-label="What you get">
        <div className="metric">
          <div className="metric-value">Under 5 min</div>
          <div className="metric-label">Most trainings done in one sitting</div>
        </div>
        <div className="metric">
          <div className="metric-value">Scored</div>
          <div className="metric-label">Every quiz answer comes with the reasoning</div>
        </div>
        <div className="metric">
          <div className="metric-value">Replay</div>
          <div className="metric-label">Come back anytime — your progress is saved</div>
        </div>
      </section>

      {/* How it works */}
      <section>
        <div className="section-label">
          <span className="eyebrow">How it works</span>
        </div>
        <h2 className="display-l">Three short steps. No meetings.</h2>

        <div className="two-col">
          <div className="feature-card">
            <h3>Watch &amp; answer</h3>
            <p className="body-m">
              A 60–90 second video walks you through the process. A few scored questions check you got the key points — with the reasoning explained, not just a green check.
            </p>
          </div>
          <div className="feature-card">
            <h3>Get coached when you slip</h3>
            <p className="body-m">
              Miss a step on the job? You&apos;ll get a focused refresher on just that part — not a meeting on Tuesday with your manager. Mistakes turn into practice, fast.
            </p>
          </div>
        </div>
      </section>

      {/* Sample training */}
      <section style={{ marginTop: "2.5rem" }}>
        <div className="feature-card">
          <div className="section-label">
            <span className="eyebrow">Try one now</span>
          </div>
          <h2 className="display-m" style={{ marginBottom: "0.75rem" }}>
            See what a training looks like.
          </h2>
          <p className="body-m" style={{ marginBottom: "1.25rem" }}>
            Take a sample BDR-hiring training end-to-end: watch the video, answer four questions, and check off the steps. Two minutes total.
          </p>
          <a href="/training?id=67c529b6-38a1-4e60-8e7f-46fd1f155075" className="button button-secondary">
            Open the sample training →
          </a>
        </div>
      </section>

      {/* Closing */}
      <section className="closing">
        <h2>Train when you have time.</h2>
        <p>Watch when it works for you. Replay when you need to. No more sitting through someone else&apos;s slides.</p>
        <a href="/training?id=67c529b6-38a1-4e60-8e7f-46fd1f155075" className="button">
          Start your training →
        </a>
      </section>
    </main>
  );
}
