import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type FocusArea = "work" | "energy" | "relationships" | "sleep" | "confidence" | "health";

export const profiles = sqliteTable("profiles", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull(),
  lifeSeason: text("life_season").notNull(),
  focusAreas: text("focus_areas", { mode: "json" }).$type<FocusArea[]>().notNull(),
  lifeSnapshot: text("life_snapshot").notNull(),
  desiredShift: text("desired_shift").notNull(),
  checkInRhythm: text("check_in_rhythm").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const checkIns = sqliteTable("check_ins", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  stage: text("stage").notNull(),
  goal: text("goal").notNull(),
  observation: text("observation").notNull(),
  reflection: text("reflection"),
  completed: integer("completed", { mode: "boolean" }),
  hypothesis: text("hypothesis").notNull(),
  confidence: integer("confidence").notNull(),
  experimentTitle: text("experiment_title").notNull(),
  experimentInstruction: text("experiment_instruction").notNull(),
  experimentDuration: text("experiment_duration").notNull(),
  insight: text("insight"),
  learned: text("learned", { mode: "json" }).$type<string[]>(),
  provider: text("provider").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
