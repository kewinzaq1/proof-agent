export type CoachStage = "plan" | "reflect";

export type CoachRequest = {
  stage: CoachStage;
  goal: string;
  context?: string;
  experiment?: string;
  reflection?: string;
  completed?: boolean;
};

export type CoachResponse = {
  hypothesis: string;
  confidence: number;
  experiment: {
    title: string;
    instruction: string;
    duration: string;
    reason: string;
  };
  insight?: string;
  learned?: string[];
  provider: "proof" | "zero";
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

  if (input.stage === "plan") {
    return {
      hypothesis: pattern.hypothesis,
      confidence: 62,
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
  const confidence = completed && !frictionSignal ? 78 : frictionSignal ? 48 : 67;

  return {
    hypothesis: completed
      ? `${pattern.hypothesis} The result suggests the starting conditions matter more than raw motivation.`
      : `${pattern.hypothesis} The missed attempt suggests the experiment still asked for too much at the trigger moment.`,
    confidence,
    insight: completed
      ? "You moved once the action became concrete. That is evidence against the idea that you simply lack discipline."
      : "Not doing the experiment is evidence too: the intervention arrived too late or carried too much friction.",
    experiment: {
      title: completed ? "Repeat, one degree harder" : "Move the cue earlier",
      instruction: completed
        ? `Repeat “${pattern.title}” once more, but prepare the cue five minutes before the usual trigger.`
        : "Place one visible cue where the pattern begins. Your only action is to notice it and name the feeling out loud.",
      duration: completed ? "3 min" : "30 sec",
      reason: completed
        ? "A small increase tests whether the learning holds without turning it into a willpower challenge."
        : "The next loop reduces the action until observation itself is easy enough to complete.",
    },
    learned: completed
      ? ["Clarity reduces resistance", "A tiny start creates momentum", "The original self-judgment is less likely"]
      : ["The cue needs to arrive earlier", "The first experiment carried friction", "Failure changed the plan—not your worth"],
    provider: "proof",
  };
}
