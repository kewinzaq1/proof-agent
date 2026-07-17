"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoachResponse } from "../../lib/coach";

type Profile = {
  email: string;
  displayName: string;
  lifeSeason: string;
  focusAreas: string[];
  lifeSnapshot: string;
  desiredShift: string;
  checkInRhythm: string;
};

type HistoryItem = {
  id: string;
  goal: string;
  hypothesis: string;
  confidence: number;
  insight: string | null;
  experimentTitle: string;
  updatedAt: string;
};

type LoopStep = "goal" | "context" | "plan" | "checkin" | "update";
const loopOrder: LoopStep[] = ["goal", "context", "plan", "checkin", "update"];
const focusOptions = ["work", "energy", "relationships", "sleep", "confidence", "health"];
const thinkingLines = {
  profile: [
    "Remembering where we left the plot…",
    "Gathering your previous plot twists…",
    "Putting the thread back on the needle…",
  ],
  plan: [
    "Thinking about you. In a normal, respectful way…",
    "Looking for the pattern hiding in plain sight…",
    "Asking your excuses to remain seated…",
    "Summoning all available willpower. Found three units…",
    "Turning vague feelings into suspiciously specific clues…",
  ],
  reflect: [
    "Checking what reality had to say…",
    "Letting the old theory down gently…",
    "Comparing your plan with life’s unauthorized rewrite…",
    "Promoting one surprise to useful evidence…",
    "Updating the story without blaming the protagonist…",
  ],
  save: [
    "Saving this chapter without making it your entire personality…",
    "Giving future-you some useful context…",
    "Folding this into the larger plot…",
  ],
};

export default function ExperimentClient({ user }: { user: { displayName: string; email: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [view, setView] = useState<"home" | "loop">("home");
  const [step, setStep] = useState<LoopStep>("goal");
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [reflection, setReflection] = useState("");
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<CoachResponse | null>(null);
  const [update, setUpdate] = useState<CoachResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadHome() {
    const [profileResponse, historyResponse] = await Promise.all([fetch("/api/profile"), fetch("/api/history")]);
    if (profileResponse.ok) setProfile(((await profileResponse.json()) as { profile: Profile | null }).profile);
    if (historyResponse.ok) setHistory(((await historyResponse.json()) as { history: HistoryItem[] }).history);
    setLoadingProfile(false);
  }

  useEffect(() => { void loadHome(); }, []);

  const currentIndex = loopOrder.indexOf(step);
  const activeResult = update ?? plan;
  const progress = useMemo(() => `${Math.max(8, (currentIndex / 4) * 100)}%`, [currentIndex]);

  function providerLabel(result: CoachResponse) {
    return result.sponsorStack?.verified ? "Pomerium → Akash → Zero" : result.provider === "zero" ? "✦ Powered by Zero" : "Proof local loop";
  }

  function beginCheckIn() {
    setView("loop");
    setStep("goal");
    setGoal("");
    setContext("");
    setReflection("");
    setCompleted(null);
    setPlan(null);
    setUpdate(null);
    setError("");
  }

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
          checkInId: plan?.checkInId,
          priorHypotheses: plan?.hypotheses,
          selectedHypothesisId: plan?.selectedHypothesisId,
          prediction: plan?.prediction,
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
        void loadHome();
      }
    } catch {
      setError("Something interrupted the loop. Your words are still here—try once more.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingProfile) return <LoadingScreen />;
  if (!profile) return <OnboardingWizard user={user} onComplete={setProfile} />;

  if (view === "home") {
    return (
      <main className="life-app">
        <AppHeader profile={profile} />
        <section className="home-shell">
          <div className="welcome-row">
            <div>
              <div className="stage-kicker">YOUR LIFE, IN MOTION</div>
              <h1>Good to see you, <em>{profile.displayName.split(" ")[0]}.</em></h1>
              <p>Proof remembers the thread. You only need to say what feels true today.</p>
            </div>
            <button className="continue-button home-checkin" type="button" onClick={beginCheckIn}>Start today’s check-in <span>→</span></button>
          </div>

          <div className="life-grid">
            <article className="today-card">
              <span className="card-label">CURRENT CHAPTER</span>
              <h2>{profile.lifeSeason}</h2>
              <p>{profile.lifeSnapshot}</p>
              <div className="focus-pills">{profile.focusAreas.map((area) => <span key={area}>{area}</span>)}</div>
            </article>
            <article className="direction-card">
              <span className="card-label">THE SHIFT YOU WANT</span>
              <blockquote>“{profile.desiredShift}”</blockquote>
              <small>{profile.checkInRhythm} check-ins · Proof will hold this direction lightly</small>
            </article>
          </div>

          <section className="timeline-section">
            <div className="timeline-heading"><div><span className="stage-kicker">WHAT PROOF IS LEARNING</span><h2>Your story is allowed to <em>change.</em></h2></div><span>{history.length} completed loops</span></div>
            {history.length === 0 ? (
              <div className="empty-history"><span>◎</span><div><h3>Your first thread starts here.</h3><p>After a check-in, Proof will remember the insight—not just the transcript—and use it next time.</p></div></div>
            ) : (
              <div className="history-list">
                {history.map((item, index) => (
                  <article className="history-card" key={item.id}>
                    <div className="history-index">{String(history.length - index).padStart(2, "0")}</div>
                    <div><small>{new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {item.goal}</small><h3>{item.insight || item.hypothesis}</h3><p>Next experiment: {item.experimentTitle}</p></div>
                    <strong>{item.confidence}%<small>confidence</small></strong>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="experiment-app">
      {loading && <ThinkingOverlay kind={step === "context" ? "plan" : "reflect"} />}
      <AppHeader profile={profile} onHome={() => setView("home")} />
      <div className="experiment-progress" aria-label={`Step ${currentIndex + 1} of 5`}><i style={{ width: progress }} /></div>
      <section className="experiment-shell">
        <aside className="experiment-rail">
          <div className="rail-label">TODAY’S LOOP</div>
          {["Notice", "Understand", "Try", "Reflect", "Learn"].map((label, index) => (
            <div className={`rail-step ${index === currentIndex ? "active" : ""} ${index < currentIndex ? "done" : ""}`} key={label}><span>{index < currentIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>{label}</div>
          ))}
          <div className="rail-note"><strong>Proof knows the backdrop.</strong><p>Your current chapter and earlier learning travel with this check-in.</p></div>
        </aside>

        <div className="experiment-stage" aria-live="polite">
          {step === "goal" && (
            <div className="stage-card opening-stage">
              <button type="button" className="back-link" onClick={() => setView("home")}>← Your story</button>
              <div className="stage-kicker">NOTICE · 01</div>
              <h1>What feels most <em>alive</em> in your life today?</h1>
              <p>This can be a pattern, a feeling, or a moment you keep returning to.</p>
              <label className="big-input"><span>Lately, I keep noticing…</span><textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="I have energy for everyone except myself" rows={2} autoFocus /></label>
              <div className="starter-row">{["work is taking over", "I feel disconnected", "my energy keeps dipping"].map((starter) => <button type="button" key={starter} onClick={() => setGoal(starter)}>{starter}</button>)}</div>
              <button className="continue-button" type="button" disabled={goal.trim().length < 5} onClick={() => setStep("context")}>Stay with this <span>→</span></button>
            </div>
          )}

          {step === "context" && (
            <div className="stage-card">
              <button type="button" className="back-link" onClick={() => setStep("goal")}>← Back</button>
              <div className="stage-kicker">UNDERSTAND · 02</div>
              <h1>What is life like <em>around</em> this?</h1>
              <p>What happened, what did you need, and what did you tell yourself? Rough and honest beats polished.</p>
              <label className="reflection-input"><span>Your reflection</span><textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="It happens near the end of the day. I notice that…" rows={7} autoFocus /><small>{context.length} characters · saved to your private Proof history</small></label>
              {error && <div className="experiment-error">{error}</div>}
              <button className="continue-button" type="button" disabled={context.trim().length < 12 || loading} onClick={() => callCoach("plan")}>{loading ? "Reading the thread…" : "Reflect this back to me"} <span>→</span></button>
            </div>
          )}

          {step === "plan" && plan && (
            <div className="stage-card result-stage">
              <div className="result-topline"><div className="stage-kicker">A WORKING THEORY · 03</div><span className={`provider-badge ${plan.sponsorStack?.verified ? "sponsor-stack" : plan.provider}`}>{providerLabel(plan)}</span></div>
              <h1>Three explanations.<br /><em>One honest test.</em></h1>
              <HypothesisArena result={plan} />
              <div className="prediction-card"><span>IF THIS IS RIGHT…</span><p>{plan.prediction}</p><small>{plan.selectionReason}</small></div>
              <div className="result-experiment"><div className="experiment-heading"><span>ONE SMALL WAY TO LEARN</span><strong>{plan.experiment.duration}</strong></div><h2>{plan.experiment.title}</h2><p>{plan.experiment.instruction}</p><div className="why-line"><strong>Why this?</strong>{plan.experiment.reason}</div></div>
              <SponsorTrace result={plan} />
              <div className="result-actions"><button className="continue-button" type="button" onClick={() => setStep("checkin")}>Come back to this experiment <span>→</span></button><button className="secondary-button" type="button" onClick={() => setStep("context")}>Add more context</button></div>
            </div>
          )}

          {step === "checkin" && plan && (
            <div className="stage-card">
              <button type="button" className="back-link" onClick={() => setStep("plan")}>← Back</button>
              <div className="stage-kicker">REFLECT · 04</div><h1>What did real life <em>teach you?</em></h1><p>Trying, forgetting, resisting, or changing your mind are all useful evidence.</p>
              <div className="binary-question"><span>Did the experiment enter your day?</span><div><button className={completed === true ? "selected" : ""} type="button" onClick={() => setCompleted(true)}>Yes, in some form</button><button className={completed === false ? "selected" : ""} type="button" onClick={() => setCompleted(false)}>Not this time</button></div></div>
              <label className="reflection-input compact"><span>What happened—and how did it feel?</span><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="I noticed that the difficult part wasn’t what I expected…" rows={6} /></label>
              {error && <div className="experiment-error">{error}</div>}
              <button className="continue-button" type="button" disabled={completed === null || reflection.trim().length < 8 || loading} onClick={() => callCoach("reflect")}>{loading ? "Updating your story…" : "Let the model change"} <span>↻</span></button>
            </div>
          )}

          {step === "update" && update && plan && (
            <div className="stage-card result-stage update-stage">
              <div className="result-topline"><div className="stage-kicker">LEARN · 05</div><span className={`provider-badge ${update.sponsorStack?.verified ? "sponsor-stack" : update.provider}`}>{providerLabel(update)}</span></div>
              <h1>Your story got a little <em>more honest.</em></h1>
              <div className="learning-banner"><span>✦</span><div><small>WHAT REALITY CHANGED</small><p>{update.insight}</p></div></div>
              <ConfidenceShift before={plan} after={update} />
              <div className="prediction-card updated"><span>NEW PREDICTION</span><p>{update.prediction}</p><small>{update.selectionReason}</small></div>
              <div className="result-experiment next"><div className="experiment-heading"><span>WHEN YOU’RE READY</span><strong>{update.experiment.duration}</strong></div><h2>{update.experiment.title}</h2><p>{update.experiment.instruction}</p></div>
              <SponsorTrace result={update} />
              <div className="loop-complete"><span>✓</span><div><strong>This learning is now part of your story.</strong><p>The next check-in will begin here—not from zero.</p></div></div>
              <button className="continue-button" type="button" onClick={() => setView("home")}>Return to your story <span>→</span></button>
            </div>
          )}
        </div>

        <aside className="evidence-dock"><div className="dock-label">THE THREAD</div><div className="dock-goal"><small>YOUR DIRECTION</small><p>{profile.desiredShift}</p></div>{profile.focusAreas.map((area) => <div className="dock-item filled" key={area}><span>·</span><div><strong>{area}</strong><small>In focus</small></div></div>)}{activeResult && <div className="dock-confidence"><small>CURRENT THEORY</small><strong>{activeResult.confidence}%</strong><i><b style={{ width: `${activeResult.confidence}%` }} /></i></div>}</aside>
      </section>
    </main>
  );
}

function HypothesisArena({ result }: { result: CoachResponse }) {
  return <section className="hypothesis-arena" aria-label="Competing hypotheses">
    <div className="arena-heading"><span>ZERO GENERATED 3 COMPETING HYPOTHESES</span><small>Akash agent selected the best testable explanation</small></div>
    <div className="hypothesis-grid">{result.hypotheses.map((item, index) => {
      const selected = item.id === result.selectedHypothesisId;
      return <article className={selected ? "selected" : ""} key={item.id}>
        <div className="hypothesis-top"><span>H{index + 1}</span>{selected && <strong>SELECTED</strong>}</div>
        <h2>{item.label}</h2><p>{item.explanation}</p>
        <div className="hypothesis-evidence">{item.evidence?.[0] || "Needs more evidence"}</div>
        <div className="hypothesis-meter"><i><b style={{ width: `${item.confidence}%` }} /></i><strong>{item.confidence}%</strong></div>
      </article>;
    })}</div>
  </section>;
}

function ConfidenceShift({ before, after }: { before: CoachResponse; after: CoachResponse }) {
  return <section className="confidence-shift" aria-label="How the hypotheses changed">
    <div className="arena-heading"><span>THE MODEL CHANGED ITS MIND</span><small>New evidence updated every candidate</small></div>
    <div className="shift-list">{after.hypotheses.map((item) => {
      const prior = before.hypotheses.find((candidate) => candidate.id === item.id);
      const previous = item.previousConfidence ?? prior?.confidence ?? item.confidence;
      const delta = item.delta ?? item.confidence - previous;
      return <article key={item.id} className={item.id === after.selectedHypothesisId ? "selected" : ""}>
        <div><span className={`verdict ${item.verdict || "steady"}`}>{item.verdict || "updated"}</span><h3>{item.label}</h3><p>{item.evidence?.[0]}</p></div>
        <div className="shift-numbers"><span>{previous}%</span><i>→</i><strong>{item.confidence}%</strong><small className={delta >= 0 ? "up" : "down"}>{delta > 0 ? "+" : ""}{delta}</small></div>
      </article>;
    })}</div>
  </section>;
}

function SponsorTrace({ result }: { result: CoachResponse }) {
  if (!result.sponsorStack?.verified) return null;
  return <div className="sponsor-trace"><div><span>01</span><strong>Pomerium</strong><small>verified the private agent call</small></div><i>→</i><div><span>02</span><strong>Akash</strong><small>ran the self-correcting loop</small></div><i>→</i><div><span>03</span><strong>Zero.xyz</strong><small>{result.zeroRuns?.length || 2} reasoning stages completed</small></div></div>;
}

function RotatingThought({ kind }: { kind: keyof typeof thinkingLines }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % thinkingLines[kind].length), 1650);
    return () => window.clearInterval(timer);
  }, [kind]);
  return <p className="thinking-line" aria-live="polite">{thinkingLines[kind][index]}</p>;
}

function ThinkingVisual() {
  return <div className="thinking-visual" aria-hidden="true"><span>✦</span><i /><i /><i /></div>;
}

function ThinkingOverlay({ kind }: { kind: "plan" | "reflect" | "save" }) {
  return <div className="thinking-overlay" role="status" aria-label="Proof is working"><div className="thinking-card"><div className="thinking-kicker">PROOF IS ON IT</div><ThinkingVisual /><RotatingThought kind={kind} /><div className="thinking-dots" aria-hidden="true"><i /><i /><i /></div><small>Usually just a few seconds. Existential breakthroughs may vary.</small></div></div>;
}

function LoadingScreen() {
  return <main className="loading-screen"><div className="brand"><span className="brand-mark">P</span><span>Proof</span></div><ThinkingVisual /><RotatingThought kind="profile" /></main>;
}

function AppHeader({ profile, onHome }: { profile: Profile; onHome?: () => void }) {
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }
  return <header className="experiment-nav"><button type="button" className="brand brand-button" onClick={onHome} aria-label="Your Proof home"><span className="brand-mark">P</span><span>Proof</span></button><div className="experiment-status"><span /> Learning over time</div><div className="account-chip"><span>{profile.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{profile.displayName}</strong><small>{profile.checkInRhythm} rhythm</small></div><button type="button" onClick={() => void signOut()}>Sign out</button></div></header>;
}

function OnboardingWizard({ user, onComplete }: { user: { displayName: string; email: string }; onComplete: (profile: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(user.displayName.includes("@") ? "" : user.displayName);
  const [lifeSeason, setLifeSeason] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [lifeSnapshot, setLifeSnapshot] = useState("");
  const [desiredShift, setDesiredShift] = useState("");
  const [checkInRhythm, setCheckInRhythm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleFocus(area: string) {
    setFocusAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : current.length < 3 ? [...current, area] : current);
  }

  async function finish() {
    setSaving(true); setError("");
    const response = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, lifeSeason, focusAreas, lifeSnapshot, desiredShift, checkInRhythm }) });
    if (response.ok) onComplete(((await response.json()) as { profile: Profile }).profile);
    else { setError("Proof couldn’t save this yet. Try once more."); setSaving(false); }
  }

  const canContinue = [displayName.trim().length > 1 && !!lifeSeason, focusAreas.length > 0, lifeSnapshot.trim().length > 20 && desiredShift.trim().length > 10, !!checkInRhythm][step];

  return <main className="onboarding-app">
    {saving && <ThinkingOverlay kind="save" />}
    <header className="onboarding-header"><a className="brand" href="/"><span className="brand-mark">P</span><span>Proof</span></a><span>Getting to know you · {step + 1} of 4</span></header>
    <div className="onboarding-progress"><i style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
    <section className="onboarding-card">
      <div className="onboarding-count">0{step + 1}</div>
      {step === 0 && <><div className="stage-kicker">A SMALL BEGINNING</div><h1>Let’s start with the chapter you’re <em>in.</em></h1><p>Proof needs context, not a personality test.</p><label className="wizard-field"><span>What should Proof call you?</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your first name" autoFocus /></label><fieldset className="choice-grid"><legend>Which season feels closest?</legend>{["Building something", "Finding my footing", "In a transition", "Protecting what matters"].map((item) => <button type="button" className={lifeSeason === item ? "selected" : ""} onClick={() => setLifeSeason(item)} key={item}>{item}</button>)}</fieldset></>}
      {step === 1 && <><div className="stage-kicker">WHERE LIFE HAS YOUR ATTENTION</div><h1>What matters <em>right now?</em></h1><p>Choose up to three. These can change as your life changes.</p><div className="focus-choice-grid">{focusOptions.map((area) => <button type="button" className={focusAreas.includes(area) ? "selected" : ""} onClick={() => toggleFocus(area)} key={area}><span>{focusAreas.includes(area) ? "✓" : "○"}</span>{area}</button>)}</div><small className="selection-note">{focusAreas.length}/3 selected</small></>}
      {step === 2 && <><div className="stage-kicker">AN HONEST SNAPSHOT</div><h1>What is taking up <em>space</em> lately?</h1><p>No need to make it sound profound. This becomes the backdrop for your future check-ins.</p><label className="wizard-field"><span>Life feels like…</span><textarea value={lifeSnapshot} onChange={(event) => setLifeSnapshot(event.target.value)} placeholder="Work is exciting but crowded, and I’m noticing…" rows={4} autoFocus /></label><label className="wizard-field"><span>In the next month, I’d love to feel…</span><textarea value={desiredShift} onChange={(event) => setDesiredShift(event.target.value)} placeholder="more present without losing momentum" rows={3} /></label></>}
      {step === 3 && <><div className="stage-kicker">A GENTLE RHYTHM</div><h1>How often should you <em>pause?</em></h1><p>No streaks. No guilt. Just a rhythm that creates enough evidence to notice change.</p><div className="rhythm-grid">{[{label:"Daily",note:"A two-minute pulse"},{label:"Three times a week",note:"Enough signal, more space"},{label:"Weekly",note:"A wider-angle reflection"}].map((item) => <button type="button" className={checkInRhythm === item.label ? "selected" : ""} onClick={() => setCheckInRhythm(item.label)} key={item.label}><strong>{item.label}</strong><span>{item.note}</span></button>)}</div><div className="privacy-note"><span>⌁</span><div><strong>This is your private learning history.</strong><p>Proof remembers patterns so the next reflection starts with context, not from zero.</p></div></div></>}
      {error && <div className="experiment-error">{error}</div>}
      <div className="wizard-actions">{step > 0 && <button className="secondary-button" type="button" onClick={() => setStep(step - 1)}>← Back</button>}<button className="continue-button" type="button" disabled={!canContinue || saving} onClick={() => step < 3 ? setStep(step + 1) : void finish()}>{saving ? "Saving your chapter…" : step === 3 ? "Begin with Proof" : "Continue"}<span>→</span></button></div>
    </section>
    <footer className="onboarding-footer"><span>Signed in as {user.email}</span><span>Curiosity over criticism.</span></footer>
  </main>;
}
