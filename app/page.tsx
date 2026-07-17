import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proof — Turn self-doubt into evidence",
  description:
    "A personal experiment system that turns one goal into one tiny experiment, learns from what happens, and adapts with you.",
};

const loopSteps = [
  {
    number: "01",
    title: "Observe",
    body: "Start with what actually happens—not the story you tell yourself about it.",
    detail: "Context · triggers · friction",
  },
  {
    number: "02",
    title: "Hypothesize",
    body: "Proof turns your reflection into a testable explanation, held lightly.",
    detail: "Belief · pattern · confidence",
  },
  {
    number: "03",
    title: "Experiment",
    body: "Get one tiny action designed to teach you something—not ten tips to remember.",
    detail: "One action · one day · low stakes",
  },
  {
    number: "04",
    title: "Reflect",
    body: "Share what happened in your own words. Success and failure both become evidence.",
    detail: "Outcome · obstacle · surprise",
  },
  {
    number: "05",
    title: "Update",
    body: "Your next experiment changes with the evidence. The system gets more useful every loop.",
    detail: "New belief · better next step",
  },
];

const beliefs = [
  { label: "I lack discipline", value: "18%", change: "↓ 54%" },
  { label: "The first step is unclear", value: "82%", change: "↑ 31%" },
  { label: "Notifications break momentum", value: "71%", change: "New" },
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Proof home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Proof</span>
        </a>
        <div className="nav-links">
          <a href="#problem">Why Proof</a>
          <a href="#loop">The loop</a>
          <a href="#principles">Principles</a>
        </div>
        <a className="button button-small" href="/experiment">Run an experiment</a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Personal growth, grounded in evidence</div>
          <h1>Stop trying to fix yourself.<br /><em>Start learning yourself.</em></h1>
          <p className="hero-lede">
            Proof turns one thing you want to change into a series of tiny,
            personalized experiments—then adapts to what real life teaches you.
          </p>
          <div className="hero-actions">
            <a className="button" href="/experiment">Run the live prototype <span aria-hidden="true">→</span></a>
            <a className="text-link" href="#loop">See how the loop works <span aria-hidden="true">↓</span></a>
          </div>
          <div className="trust-line">
            <span className="trust-faces" aria-hidden="true"><i>K</i><i>M</i><i>A</i></span>
            <span>Built for thoughtful people who are tired of generic advice.</span>
          </div>
        </div>

        <div className="hero-product" aria-label="Proof experiment preview">
          <div className="product-topline">
            <div><span className="live-dot" /> Experiment in progress</div>
            <span>Day 3 of 5</span>
          </div>
          <div className="goal-label">Your focus</div>
          <h2>“I want to stop putting off deep work.”</h2>
          <div className="hypothesis-card">
            <div className="card-kicker"><span>✦</span> Current hypothesis</div>
            <p>You’re not avoiding the work. You’re avoiding the ambiguity of where to begin.</p>
            <div className="confidence"><span><i style={{ width: "72%" }} /></span>72% confidence</div>
          </div>
          <div className="experiment-card">
            <div>
              <span className="experiment-number">EXPERIMENT 03</span>
              <h3>Make the first step visible.</h3>
              <p>Before opening Slack, write the smallest physical action that would move your project forward.</p>
            </div>
            <div className="experiment-time"><strong>2</strong><span>MIN</span></div>
          </div>
          <div className="product-footer">
            <span>One action. That’s the whole point.</span>
            <span aria-hidden="true">•••</span>
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Product principles">
        <div className="shell signal-inner">
          <span>ONE GOAL</span><i>→</i><span>ONE HYPOTHESIS</span><i>→</i><span>ONE EXPERIMENT</span><i>→</i><span>BETTER EVIDENCE</span>
        </div>
      </section>

      <section className="problem shell section" id="problem">
        <div className="section-label">01 / THE PROBLEM</div>
        <div className="problem-grid">
          <div>
            <h2>More advice isn’t<br />the answer.</h2>
            <p className="section-lede">You already know what you “should” do. The hard part is discovering what actually works for you.</p>
          </div>
          <div className="old-way">
            <div className="old-way-head"><span>The old way</span><span>More input, same pattern</span></div>
            <div className="noise-cloud" aria-label="Common unhelpful advice">
              <span>Wake up at 5am</span><span>Try harder</span><span>30-day challenge</span>
              <span>Build a perfect routine</span><span>Stay motivated</span><span>Track everything</span>
            </div>
            <div className="friction-line"><span>↑ advice</span><span>↑ pressure</span><span className="muted">→ behavior</span></div>
          </div>
        </div>
        <div className="problem-cards">
          <article><span className="card-icon">×</span><h3>Generic by default</h3><p>Most advice is optimized for an average person who doesn’t exist.</p></article>
          <article><span className="card-icon">∞</span><h3>Built for consumption</h3><p>More content feels productive, but rarely changes what happens tomorrow.</p></article>
          <article><span className="card-icon">!</span><h3>Failure becomes identity</h3><p>When the plan fails, you blame your discipline instead of questioning the plan.</p></article>
        </div>
      </section>

      <section className="loop-section section" id="loop">
        <div className="shell">
          <div className="section-label light">02 / THE SELF-CORRECTING LOOP</div>
          <div className="loop-intro">
            <h2>A coach that changes<br />its mind.</h2>
            <p>Proof doesn’t hand you a plan and disappear. It observes, learns, and redesigns the next step based on the evidence you create together.</p>
          </div>
          <div className="loop-track">
            {loopSteps.map((step, index) => (
              <article className="loop-step" key={step.title}>
                <div className="step-number">{step.number}</div>
                <div className="step-orbit"><span>{index === 0 ? "◎" : index === 1 ? "◇" : index === 2 ? "↗" : index === 3 ? "◌" : "↻"}</span></div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <div className="step-detail">{step.detail}</div>
              </article>
            ))}
          </div>
          <div className="loop-return"><span>Reality updates the model</span><i /></div>
        </div>
      </section>

      <section className="evidence shell section">
        <div className="evidence-copy">
          <div className="section-label">03 / WHAT GETS BETTER</div>
          <h2>Your beliefs become<br />less certain.<br /><em>Your actions become<br />more useful.</em></h2>
          <p>Proof remembers patterns, not transcripts. Over time, it builds a living model of what helps you move—and what gets in the way.</p>
          <ul>
            <li><span>✓</span> Every belief is treated as a hypothesis</li>
            <li><span>✓</span> Every “failure” creates useful evidence</li>
            <li><span>✓</span> Every next step reflects what changed</li>
          </ul>
        </div>
        <div className="belief-panel">
          <div className="panel-head"><div><span className="live-dot" /> Understanding</div><span>Updated today</span></div>
          <div className="belief-title">What Proof is learning about you</div>
          {beliefs.map((belief) => (
            <div className="belief-row" key={belief.label}>
              <div><span>{belief.label}</span><div className="belief-bar"><i style={{ width: belief.value }} /></div></div>
              <strong>{belief.value}</strong>
              <small className={belief.change === "New" ? "new" : ""}>{belief.change}</small>
            </div>
          ))}
          <div className="panel-insight"><span>✦</span><p><strong>Emerging insight</strong>You move quickly once the first physical action is unambiguous.</p></div>
        </div>
      </section>

      <section className="principles section" id="principles">
        <div className="shell principles-inner">
          <div className="section-label">04 / BUILT DIFFERENTLY</div>
          <h2>Less self-improvement.<br /><em>More self-discovery.</em></h2>
          <div className="principle-grid">
            <article><strong>01</strong><h3>Evidence over motivation.</h3><p>You don’t need to feel ready. You need a small enough experiment to begin.</p></article>
            <article><strong>02</strong><h3>Learning over streaks.</h3><p>A broken streak feels like failure. A failed experiment still makes you smarter.</p></article>
            <article><strong>03</strong><h3>One thing at a time.</h3><p>Real change needs attention. Proof will never bury you under a list of advice.</p></article>
            <article><strong>04</strong><h3>Curiosity over criticism.</h3><p>“Why didn’t that work?” is a more useful question than “What’s wrong with me?”</p></article>
          </div>
        </div>
      </section>

      <section className="quote shell">
        <div className="quote-mark">“</div>
        <blockquote>Life is a series of experiments,<br />not a series of decisions.</blockquote>
        <p>That means you don’t need the perfect plan. You only need the next honest test.</p>
      </section>

      <section className="final-cta" id="demo">
        <div className="cta-orbit orbit-one" /><div className="cta-orbit orbit-two" />
        <div className="shell cta-inner">
          <div className="eyebrow light"><span /> Built for the Loop Engineering Hackathon</div>
          <h2>One goal. One experiment.<br /><em>One smarter next step.</em></h2>
          <p>See how Proof turns a real behavior challenge into a self-correcting loop—and changes its hypothesis when the evidence changes.</p>
          <div className="demo-actions">
            <a className="demo-primary" href="/experiment">Run an experiment <span aria-hidden="true">↗</span></a>
            <a className="demo-secondary" href="#loop">Walk through the loop <span aria-hidden="true">↓</span></a>
          </div>
          <small>Hackathon prototype · July 2026 · San Francisco</small>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand" href="#top"><span className="brand-mark">P</span><span>Proof</span></a>
        <p>Personal growth, grounded in evidence.</p>
        <div><a href="#loop">How it works</a><a href="#principles">Principles</a><span>© 2026 Proof</span></div>
      </footer>
    </main>
  );
}
