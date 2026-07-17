export type CoachStage = "plan" | "reflect";

export type CoachRequest = {
  stage: CoachStage;
  goal: string;
  context?: string;
  experiment?: string;
  reflection?: string;
  completed?: boolean;
  checkInId?: string;
  priorHypotheses?: Hypothesis[];
  selectedHypothesisId?: string;
  prediction?: string;
};

export type Hypothesis = {
  id: string;
  label: string;
  explanation: string;
  confidence: number;
  previousConfidence?: number;
  delta?: number;
  verdict?: "promoted" | "weakened" | "rejected" | "steady" | string;
  evidence?: string[];
};

export type CoachResponse = {
  hypothesis: string;
  confidence: number;
  hypotheses: Hypothesis[];
  selectedHypothesisId: string;
  selectionReason: string;
  prediction: string;
  experiment: {
    title: string;
    instruction: string;
    duration: string;
    reason: string;
  };
  insight?: string;
  learned?: string[];
  provider: "proof" | "zero";
  checkInId?: string;
  zeroRuns?: Array<{ stage: string; runId: string }>;
  sponsorStack?: {
    access: "pomerium";
    compute: "akash";
    reasoning: "zero";
    verified: boolean;
  };
};

type Pattern = {
  words: string[];
  hypothesis: string;
  title: string;
  instruction: string;
  reason: string;
};

const patterns: Pattern[] = [
  {
    words: ["scroll", "phone", "instagram", "tiktok", "social"],
    hypothesis: "The scrolling is doing a job for you: it creates an easy transition when your mind is tired or uncertain.",
    title: "Interrupt the first reach",
    instruction: "The first time you reach for your phone during the trigger window, put it face-down and take ten slow breaths before deciding what to do next.",
    reason: "This tests whether the urge is automatic or whether it still feels useful after a ninety-second pause.",
  },
  {
    words: ["procrast", "deep work", "focus", "start", "project", "work"],
    hypothesis: "You may not be avoiding the work itself. You may be avoiding the ambiguity of where to begin.",
    title: "Make the first step visible",
    instruction: "Before opening messages, spend two minutes writing the smallest physical action that would move the work forward.",
    reason: "This separates a motivation problem from a clarity problem without asking for a heroic work session.",
  },
  {
    words: ["exercise", "workout", "gym", "run", "move"],
    hypothesis: "The barrier may be the transition into exercise, not the exercise itself.",
    title: "Lower the starting line",
    instruction: "Put on your exercise clothes and move for exactly three minutes. After that, stopping counts as completing the experiment.",
    reason: "This tests whether friction lives before the first movement rather than during the workout.",
  },
  {
    words: ["sleep", "bed", "night", "tired", "wake"],
    hypothesis: "Your late-night behavior may be protecting a sense of personal time, even when it costs you sleep.",
    title: "Protect ten minutes earlier",
    instruction: "Ten minutes before your usual wind-down, do one thing that feels chosen—not productive—and keep your phone outside arm’s reach.",
    reason: "This tests whether reclaiming a small amount of intentional time reduces the urge to delay sleep.",
  },
];

function choosePattern(goal: string, context = "") {
  const source = `${goal} ${context}`.toLowerCase();
  return patterns.find((pattern) => pattern.words.some((word) => source.includes(word))) ?? {
    hypothesis: "The behavior may be less about discipline and more about a recurring moment of friction you haven’t isolated yet.",
    title: "Shrink the moment",
    instruction: "When the pattern appears next, pause for two minutes and write what happened immediately before it—without trying to change anything.",
    reason: "Better observation is the smallest experiment when the trigger is still unclear.",
  };
}

export function runLocalCoach(input: CoachRequest): CoachResponse {
  const pattern = choosePattern(input.goal, `${input.context ?? ""} ${input.reflection ?? ""}`);
  const workPattern = /procrast|deep work|focus|start|project|work/i.test(`${input.goal} ${input.context ?? ""}`);

  if (input.stage === "plan") {
    const hypotheses: Hypothesis[] = workPattern ? [
      { id: "h1", label: "Discipline deficit", explanation: "You may be avoiding the work because sustained effort feels difficult right now.", confidence: 28, evidence: ["You described the pattern as a lack of discipline"] },
      { id: "h2", label: "Ambiguous first step", explanation: "You may be avoiding ambiguity about where to begin, rather than the work itself.", confidence: 72, evidence: ["The difficulty appears at the moment of starting"] },
      { id: "h3", label: "Interruption sensitivity", explanation: "External interruptions may be breaking momentum before it becomes stable.", confidence: 34, evidence: ["Your environment may compete for attention"] },
    ] : [
      { id: "h1", label: "Willpower story", explanation: "You may be interpreting a situational pattern as a personal failure.", confidence: 26, evidence: ["Your goal contains a self-judgment"] },
      { id: "h2", label: "Transition friction", explanation: pattern.hypothesis, confidence: 68, evidence: ["The behavior clusters around a recurring moment"] },
      { id: "h3", label: "Unmet need", explanation: "The behavior may be meeting a need that the current plan does not acknowledge.", confidence: 43, evidence: ["The pattern continues despite knowing what you should do"] },
    ];
    const selected = hypotheses[1];
    return {
      hypothesis: selected.explanation,
      confidence: selected.confidence,
      hypotheses,
      selectedHypothesisId: selected.id,
      selectionReason: "This explanation best matches the moment where the pattern begins and can be distinguished with a small test.",
      prediction: workPattern ? "If ambiguity is the real barrier, making the first physical action explicit should make starting noticeably easier." : "If transition friction is driving the pattern, a tiny pause at the trigger should change what happens next.",
      experiment: {
        title: pattern.title,
        instruction: pattern.instruction,
        duration: "2 min",
        reason: pattern.reason,
      },
      learned: ["Your stated goal", "The moment the pattern appears", "What you have already noticed"],
      provider: "proof",
    };
  }

  const reflection = (input.reflection ?? "").toLowerCase();
  const frictionSignal = ["forgot", "busy", "notification", "tired", "hard", "didn't", "did not", "couldn't"].some((word) => reflection.includes(word));
  const completed = Boolean(input.completed);
  const interruptionSignal = /slack|notification|message|interrupted|email/.test(reflection);
  const prior = input.priorHypotheses?.length ? input.priorHypotheses : runLocalCoach({ ...input, stage: "plan" }).hypotheses;
  const hypotheses = prior.map((item) => {
    const confidence = interruptionSignal
      ? item.id === "h3" ? 84 : item.id === "h2" ? 38 : 14
      : item.id === input.selectedHypothesisId ? (completed && !frictionSignal ? 81 : 44) : Math.min(78, item.confidence + (frictionSignal ? 8 : -3));
    return {
      ...item,
      previousConfidence: item.confidence,
      confidence,
      delta: confidence - item.confidence,
      verdict: confidence - item.confidence > 10 ? "promoted" : confidence - item.confidence < -20 ? "rejected" : confidence - item.confidence < -5 ? "weakened" : "steady",
      evidence: [interruptionSignal ? "An interruption appeared after you had already started" : input.reflection || "The real-world result changed the evidence"],
    };
  });
  const selected = [...hypotheses].sort((a, b) => b.confidence - a.confidence)[0];

  return {
    hypothesis: selected.explanation,
    confidence: selected.confidence,
    hypotheses,
    selectedHypothesisId: selected.id,
    selectionReason: interruptionSignal ? "The new evidence contradicts a starting problem: you started, then an interruption broke momentum." : "The result changed which explanation currently fits best.",
    prediction: interruptionSignal ? "If interruptions are the real barrier, one protected five-minute window should preserve momentum without requiring more motivation." : "If this updated explanation is right, changing the trigger conditions should change the outcome.",
    insight: interruptionSignal ? "You did start. That is evidence against the discipline story and for interruption sensitivity." : completed
      ? "You moved once the action became concrete. That is evidence against the idea that you simply lack discipline."
      : "Not doing the experiment is evidence too: the intervention arrived too late or carried too much friction.",
    experiment: {
      title: interruptionSignal ? "Protect the first five" : completed ? "Repeat, one degree harder" : "Move the cue earlier",
      instruction: interruptionSignal ? "For one work start, silence notifications until five minutes after the first physical action is complete." : completed
        ? `Repeat “${pattern.title}” once more, but prepare the cue five minutes before the usual trigger.`
        : "Place one visible cue where the pattern begins. Your only action is to notice it and name the feeling out loud.",
      duration: interruptionSignal ? "5 min" : completed ? "3 min" : "30 sec",
      reason: interruptionSignal ? "This distinguishes an interruption problem from a motivation or clarity problem." : completed
        ? "A small increase tests whether the learning holds without turning it into a willpower challenge."
        : "The next loop reduces the action until observation itself is easy enough to complete.",
    },
    learned: completed
      ? ["Clarity reduces resistance", "A tiny start creates momentum", "The original self-judgment is less likely"]
      : ["The cue needs to arrive earlier", "The first experiment carried friction", "Failure changed the plan—not your worth"],
    provider: "proof",
  };
}
