"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoachResponse } from "../../lib/coach";

type Step = "goal" | "context" | "plan" | "checkin" | "update";

const stepOrder: Step[] = ["goal", "context", "plan", "checkin", "update"];

export default function ExperimentClient() {
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [reflection, setReflection] = useState("");
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<CoachResponse | null>(null);
  const [update, setUpdate] = useState<CoachResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentIndex = stepOrder.indexOf(step);
  const activeResult = update ?? plan;

  function providerLabel(result: CoachResponse) {
    return result.sponsorStack?.verified ? "Pomerium → Akash → Zero" : result.provider === "zero" ? "✦ Powered by Zero" : "Proof local loop";
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("proof-experiment");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.goal) setGoal(data.goal);
      if (data.context) setContext(data.context);
      if (data.plan) setPlan(data.plan);
    } catch {
      window.localStorage.removeItem("proof-experiment");
    }
  }, []);

  useEffect(() => {
    if (!goal) return;
    window.localStorage.setItem("proof-experiment", JSON.stringify({ goal, context, plan }));
  }, [goal, context, plan]);

  const progress = useMemo(() => `${Math.max(8, (currentIndex / 4) * 100)}%`, [currentIndex]);

  async function callCoach(stage: "plan" | "reflect") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage,
          goal,
          context,
          experiment: plan?.experiment.instruction,
          reflection,
          completed,
        }),
      });
      if (!response.ok) throw new Error("The loop could not run.");
      const data = (await response.json()) as CoachResponse;
      if (stage === "plan") {
        setPlan(data);
        setStep("plan");
      } else {
        setUpdate(data);
        setStep("update");
      }
    } catch {
      setError("Something interrupted the loop. Your answers are still here—try once more.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("goal");
    setGoal("");
    setContext("");
    setReflection("");
    setCompleted(null);
    setPlan(null);
    setUpdate(null);
    window.localStorage.removeItem("proof-experiment");
  }

  return (
    <main className="experiment-app">
      <header className="experiment-nav">
        <a className="brand" href="/" aria-label="Proof landing page"><span className="brand-mark">P</span><span>Proof</span></a>
        <div className="experiment-status"><span /> Live experiment</div>
        <button type="button" className="quiet-button" onClick={reset}>Start over</button>
      </header>

      <div className="experiment-progress" aria-label={`Step ${currentIndex + 1} of 5`}><i style={{ width: progress }} /></div>

      <section className="experiment-shell">
        <aside className="experiment-rail">
          <div className="rail-label">THE LOOP</div>
          {["Observe", "Hypothesize", "Experiment", "Reflect", "Update"].map((label, index) => (
            <div className={`rail-step ${index === currentIndex ? "active" : ""} ${index < currentIndex ? "done" : ""}`} key={label}>
              <span>{index < currentIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>{label}
            </div>
          ))}
          <div className="rail-note"><strong>One thing at a time.</strong><p>Proof narrows the loop on purpose. More advice would create less evidence.</p></div>
        </aside>

        <div className="experiment-stage" aria-live="polite">
          {step === "goal" && (
            <div className="stage-card opening-stage">
              <div className="stage-kicker">OBSERVE · 01</div>
              <h1>What’s one thing you want to <em>understand</em> about yourself?</h1>
              <p>Not your whole life. Not a perfect outcome. Choose one behavior that keeps repeating.</p>
              <label className="big-input">
                <span>I want to…</span>
                <textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="stop scrolling before bed" rows={2} autoFocus />
              </label>
              <div className="starter-row">
                {['stop putting off deep work', 'move my body more often', 'sleep without my phone'].map((starter) => (
                  <button type="button" key={starter} onClick={() => setGoal(starter)}>{starter}</button>
                ))}
              </div>
              <button className="continue-button" type="button" disabled={goal.trim().length < 5} onClick={() => setStep("context")}>Continue <span>→</span></button>
            </div>
          )}

          {step === "context" && (
            <div className="stage-card">
              <button type="button" className="back-link" onClick={() => setStep("goal")}>← Back</button>
              <div className="stage-kicker">OBSERVE · 02</div>
              <h1>Take me to the <em>moment</em> it happens.</h1>
              <p>When, where, and what usually happens right before? A rough answer is more useful than a polished one.</p>
              <label className="reflection-input">
                <span>Your observation</span>
                <textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="It usually happens after dinner when I sit on the couch. I tell myself it will only be five minutes…" rows={6} autoFocus />
                <small>{context.length} characters · your words stay on this device</small>
              </label>
              {error && <div className="experiment-error">{error}</div>}
              <button className="continue-button" type="button" disabled={context.trim().length < 12 || loading} onClick={() => callCoach("plan")}>{loading ? "Forming a hypothesis…" : "Find the smallest experiment"} <span>→</span></button>
            </div>
          )}

          {step === "plan" && plan && (
            <div className="stage-card result-stage">
              <div className="result-topline"><div className="stage-kicker">HYPOTHESIS · 03</div><span className={`provider-badge ${plan.sponsorStack?.verified ? "sponsor-stack" : plan.provider}`}>{providerLabel(plan)}</span></div>
              <h1>Here’s what might be <em>actually happening.</em></h1>
              <div className="result-hypothesis"><span>◇</span><div><small>WORKING HYPOTHESIS</small><p>{plan.hypothesis}</p><div className="result-confidence"><i><b style={{ width: `${plan.confidence}%` }} /></i>{plan.confidence}% confidence</div></div></div>
              <div className="result-experiment">
                <div className="experiment-heading"><span>EXPERIMENT 01</span><strong>{plan.experiment.duration}</strong></div>
                <h2>{plan.experiment.title}</h2>
                <p>{plan.experiment.instruction}</p>
                <div className="why-line"><strong>Why this?</strong>{plan.experiment.reason}</div>
              </div>
              <div className="result-actions">
                <button className="continue-button" type="button" onClick={() => setStep("checkin")}>I’ve tried it—check in <span>→</span></button>
                <button className="secondary-button" type="button" onClick={() => setStep("context")}>Adjust my observation</button>
              </div>
            </div>
          )}

          {step === "checkin" && plan && (
            <div className="stage-card">
              <button type="button" className="back-link" onClick={() => setStep("plan")}>← Back</button>
              <div className="stage-kicker">REFLECT · 04</div>
              <h1>What happened in <em>real life?</em></h1>
              <p>There is no failed check-in. The agent needs what happened, not what was supposed to happen.</p>
              <div className="binary-question">
                <span>Did you try the experiment?</span>
                <div><button className={completed === true ? "selected" : ""} type="button" onClick={() => setCompleted(true)}>Yes, I tried it</button><button className={completed === false ? "selected" : ""} type="button" onClick={() => setCompleted(false)}>Not this time</button></div>
              </div>
              <label className="reflection-input compact">
                <span>Tell Proof what surprised you</span>
                <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="I remembered once I saw my phone, but then…" rows={5} />
              </label>
              {error && <div className="experiment-error">{error}</div>}
              <button className="continue-button" type="button" disabled={completed === null || reflection.trim().length < 8 || loading} onClick={() => callCoach("reflect")}>{loading ? "Updating the model…" : "Update what Proof believes"} <span>↻</span></button>
            </div>
          )}

          {step === "update" && update && plan && (
            <div className="stage-card result-stage update-stage">
              <div className="result-topline"><div className="stage-kicker">UPDATE · 05</div><span className={`provider-badge ${update.sponsorStack?.verified ? "sponsor-stack" : update.provider}`}>{providerLabel(update)}</span></div>
              <h1>The plan changed.<br /><em>You didn’t fail.</em></h1>
              <div className="learning-banner"><span>✦</span><div><small>WHAT THE LOOP LEARNED</small><p>{update.insight}</p></div></div>
              <div className="belief-shift">
                <div><small>BEFORE</small><p>{plan.hypothesis}</p><strong>{plan.confidence}%</strong></div>
                <span>→</span>
                <div><small>AFTER</small><p>{update.hypothesis}</p><strong>{update.confidence}%</strong></div>
              </div>
              <div className="result-experiment next">
                <div className="experiment-heading"><span>NEXT EXPERIMENT</span><strong>{update.experiment.duration}</strong></div>
                <h2>{update.experiment.title}</h2>
                <p>{update.experiment.instruction}</p>
              </div>
              <div className="loop-complete"><span>✓</span><div><strong>One complete self-correcting loop</strong><p>Observation changed the hypothesis. The hypothesis changed the next action.</p></div></div>
              <button className="continue-button" type="button" onClick={reset}>Start another experiment <span>↻</span></button>
            </div>
          )}
        </div>

        <aside className="evidence-dock">
          <div className="dock-label">EVIDENCE LOG</div>
          <div className="dock-goal"><small>GOAL</small><p>{goal || "Waiting for one honest goal…"}</p></div>
          <div className={`dock-item ${context ? "filled" : ""}`}><span>{context ? "✓" : "01"}</span><div><strong>Observation</strong><small>{context ? "Captured" : "Not yet"}</small></div></div>
          <div className={`dock-item ${plan ? "filled" : ""}`}><span>{plan ? "✓" : "02"}</span><div><strong>Hypothesis</strong><small>{plan ? `${plan.confidence}% confidence` : "Waiting"}</small></div></div>
          <div className={`dock-item ${plan ? "filled" : ""}`}><span>{plan ? "✓" : "03"}</span><div><strong>Experiment</strong><small>{plan ? plan.experiment.duration : "Waiting"}</small></div></div>
          <div className={`dock-item ${reflection ? "filled" : ""}`}><span>{reflection ? "✓" : "04"}</span><div><strong>Reflection</strong><small>{reflection ? "Captured" : "Waiting"}</small></div></div>
          <div className={`dock-item ${update ? "filled" : ""}`}><span>{update ? "✓" : "05"}</span><div><strong>Updated model</strong><small>{update ? "Loop complete" : "Waiting"}</small></div></div>
          {activeResult && <div className="dock-confidence"><small>CURRENT CONFIDENCE</small><strong>{activeResult.confidence}%</strong><i><b style={{ width: `${activeResult.confidence}%` }} /></i></div>}
        </aside>
      </section>
    </main>
  );
}
