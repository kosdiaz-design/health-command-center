import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Health Stats (weekly updates) ──────────────────────────────────────────
export const healthStats = pgTable("health_stats", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  weight: real("weight"),
  bodyFat: real("body_fat"),
  hrv: integer("hrv"),
  restingHr: integer("resting_hr"),
  sleepScore: integer("sleep_score"),
  readinessScore: integer("readiness_score"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  vo2max: real("vo2max"),
  steps: integer("steps"),
  notes: text("notes"),
});

export const insertHealthStatsSchema = createInsertSchema(healthStats).omit({ id: true });
export type InsertHealthStats = z.infer<typeof insertHealthStatsSchema>;
export type HealthStats = typeof healthStats.$inferSelect;

// ── Workouts ────────────────────────────────────────────────────────────────
export const workouts = pgTable("workouts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  dayOfWeek: text("day_of_week").notNull(),
  type: text("type").notNull(),
  label: text("label").notNull(),
  duration: integer("duration"),
  completed: boolean("completed").default(false),
  rpe: integer("rpe"),
  notes: text("notes"),
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;

// ── Recovery Sessions ───────────────────────────────────────────────────────
export const recoverySessions = pgTable("recovery_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  type: text("type").notNull(), // sauna | cold_plunge
  duration: integer("duration"),
  notes: text("notes"),
});

export const insertRecoverySessionSchema = createInsertSchema(recoverySessions).omit({ id: true });
export type InsertRecoverySession = z.infer<typeof insertRecoverySessionSchema>;
export type RecoverySession = typeof recoverySessions.$inferSelect;

// ── Meals ───────────────────────────────────────────────────────────────────
export const meals = pgTable("meals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  mealTime: text("meal_time").notNull(), // breakfast | lunch | dinner | snack
  name: text("name").notNull(),
  calories: integer("calories"),
  protein: integer("protein"),
  carbs: integer("carbs"),
  fat: integer("fat"),
  trainingDay: boolean("training_day").default(false),
  notes: text("notes"),
});

export const insertMealSchema = createInsertSchema(meals).omit({ id: true });
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

// ── Medications & Supplements ───────────────────────────────────────────────
export const medications = pgTable("medications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  type: text("type").notNull(), // medication | supplement
  dose: text("dose"),
  frequency: text("frequency"),
  timing: text("timing"),
  purpose: text("purpose"),
  active: boolean("active").default(true),
  notes: text("notes"),
});

export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true });
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

export const medLogs = pgTable("med_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  medicationId: integer("medication_id").notNull(),
  date: text("date").notNull(),
  taken: boolean("taken").default(false),
  takenAt: text("taken_at"),
});

export const insertMedLogSchema = createInsertSchema(medLogs).omit({ id: true });
export type InsertMedLog = z.infer<typeof insertMedLogSchema>;
export type MedLog = typeof medLogs.$inferSelect;

// ── Lab Results ──────────────────────────────────────────────────────────────
export const labResults = pgTable("lab_results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  testName: text("test_name").notNull(),
  value: real("value"),
  unit: text("unit"),
  refLow: real("ref_low"),
  refHigh: real("ref_high"),
  flag: text("flag"), // normal | high | low | critical
  notes: text("notes"),
});

export const insertLabResultSchema = createInsertSchema(labResults).omit({ id: true });
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type LabResult = typeof labResults.$inferSelect;

// ── Doctor Visits ────────────────────────────────────────────────────────────
export const doctorVisits = pgTable("doctor_visits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  doctor: text("doctor").notNull(),
  specialty: text("specialty"),
  reason: text("reason"),
  findings: text("findings"),
  followUp: text("follow_up"),
  nextVisitDate: text("next_visit_date"),
});

export const insertDoctorVisitSchema = createInsertSchema(doctorVisits).omit({ id: true });
export type InsertDoctorVisit = z.infer<typeof insertDoctorVisitSchema>;
export type DoctorVisit = typeof doctorVisits.$inferSelect;

// ── Cardiac Events ───────────────────────────────────────────────────────────
export const cardiacEvents = pgTable("cardiac_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  eventType: text("event_type").notNull(), // symptom | reading | episode
  description: text("description").notNull(),
  severity: text("severity"), // mild | moderate | severe
  heartRate: integer("heart_rate"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  notes: text("notes"),
});

export const insertCardiacEventSchema = createInsertSchema(cardiacEvents).omit({ id: true });
export type InsertCardiacEvent = z.infer<typeof insertCardiacEventSchema>;
export type CardiacEvent = typeof cardiacEvents.$inferSelect;

// ── Voice Notes ──────────────────────────────────────────────────────────────
export const voiceNotes = pgTable("voice_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  section: text("section").notNull(), // dashboard | workout | meals | recovery | health | meds | general
  transcript: text("transcript").notNull(),
  tags: text("tags"),
});

export const insertVoiceNoteSchema = createInsertSchema(voiceNotes).omit({ id: true });
export type InsertVoiceNote = z.infer<typeof insertVoiceNoteSchema>;
export type VoiceNote = typeof voiceNotes.$inferSelect;
