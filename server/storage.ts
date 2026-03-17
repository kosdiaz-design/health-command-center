import { db } from "./db";
import type {
  HealthStats, InsertHealthStats,
  Workout, InsertWorkout,
  RecoverySession, InsertRecoverySession,
  Meal, InsertMeal,
  Medication, InsertMedication,
  MedLog, InsertMedLog,
  LabResult, InsertLabResult,
  DoctorVisit, InsertDoctorVisit,
  CardiacEvent, InsertCardiacEvent,
  VoiceNote, InsertVoiceNote,
} from "@shared/schema";

export interface IStorage {
  getHealthStats(): Promise<HealthStats[]>;
  getLatestHealthStats(): Promise<HealthStats | undefined>;
  createHealthStats(data: InsertHealthStats): Promise<HealthStats>;
  upsertHealthStatsByDate(date: string, data: Partial<InsertHealthStats>): Promise<HealthStats>;
  getWorkouts(): Promise<Workout[]>;
  getWorkoutsByDate(date: string): Promise<Workout[]>;
  createWorkout(data: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, data: Partial<InsertWorkout>): Promise<Workout>;
  getRecoverySessions(): Promise<RecoverySession[]>;
  createRecoverySession(data: InsertRecoverySession): Promise<RecoverySession>;
  getMeals(): Promise<Meal[]>;
  getMealsByDate(date: string): Promise<Meal[]>;
  createMeal(data: InsertMeal): Promise<Meal>;
  deleteMeal(id: number): Promise<void>;
  getMedications(): Promise<Medication[]>;
  createMedication(data: InsertMedication): Promise<Medication>;
  updateMedication(id: number, data: Partial<InsertMedication>): Promise<Medication>;
  deleteMedication(id: number): Promise<void>;
  getMedLogs(date: string): Promise<MedLog[]>;
  createMedLog(data: InsertMedLog): Promise<MedLog>;
  updateMedLog(id: number, data: Partial<InsertMedLog>): Promise<MedLog>;
  getLabResults(): Promise<LabResult[]>;
  createLabResult(data: InsertLabResult): Promise<LabResult>;
  deleteLabResult(id: number): Promise<void>;
  getDoctorVisits(): Promise<DoctorVisit[]>;
  createDoctorVisit(data: InsertDoctorVisit): Promise<DoctorVisit>;
  deleteDoctorVisit(id: number): Promise<void>;
  getCardiacEvents(): Promise<CardiacEvent[]>;
  createCardiacEvent(data: InsertCardiacEvent): Promise<CardiacEvent>;
  getVoiceNotes(): Promise<VoiceNote[]>;
  createVoiceNote(data: InsertVoiceNote): Promise<VoiceNote>;
  deleteVoiceNote(id: number): Promise<void>;
  getIntegrationToken(id: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number; connectedAt: string } | undefined>;
  setIntegrationToken(id: string, data: { accessToken: string; refreshToken?: string; expiresAt?: number; connectedAt: string }): Promise<void>;
  deleteIntegrationToken(id: string): Promise<void>;
  clearHealthStats(): Promise<void>;
  isSeedData(): Promise<boolean>;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function toHS(r: any): HealthStats {
  return { id: r.id, date: r.date, weight: r.weight, bodyFat: r.body_fat, hrv: r.hrv, restingHr: r.resting_hr, sleepScore: r.sleep_score, readinessScore: r.readiness_score, systolic: r.systolic, diastolic: r.diastolic, vo2max: r.vo2max, steps: r.steps, notes: r.notes };
}
function toW(r: any): Workout {
  return { id: r.id, date: r.date, dayOfWeek: r.day_of_week, type: r.type, label: r.label, duration: r.duration, completed: !!r.completed, rpe: r.rpe, notes: r.notes };
}
function toR(r: any): RecoverySession {
  return { id: r.id, date: r.date, type: r.type, duration: r.duration, notes: r.notes };
}
function toM(r: any): Meal {
  return { id: r.id, date: r.date, mealTime: r.meal_time, name: r.name, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, trainingDay: !!r.training_day, notes: r.notes };
}
function toMed(r: any): Medication {
  return { id: r.id, name: r.name, type: r.type, dose: r.dose, frequency: r.frequency, timing: r.timing, purpose: r.purpose, active: !!r.active, notes: r.notes };
}
function toML(r: any): MedLog {
  return { id: r.id, medicationId: r.medication_id, date: r.date, taken: !!r.taken, takenAt: r.taken_at };
}
function toLR(r: any): LabResult {
  return { id: r.id, date: r.date, testName: r.test_name, value: r.value, unit: r.unit, refLow: r.ref_low, refHigh: r.ref_high, flag: r.flag, notes: r.notes };
}
function toDV(r: any): DoctorVisit {
  return { id: r.id, date: r.date, doctor: r.doctor, specialty: r.specialty, reason: r.reason, findings: r.findings, followUp: r.follow_up, nextVisitDate: r.next_visit_date };
}
function toCE(r: any): CardiacEvent {
  return { id: r.id, date: r.date, eventType: r.event_type, description: r.description, severity: r.severity, heartRate: r.heart_rate, systolic: r.systolic, diastolic: r.diastolic, notes: r.notes };
}
function toVN(r: any): VoiceNote {
  return { id: r.id, date: r.date, time: r.time, section: r.section, transcript: r.transcript, tags: r.tags };
}

class SQLiteStorage implements IStorage {
  constructor() { this.seed(); }

  private seed() {
    const row = db.prepare("SELECT done FROM seed_done WHERE id = 1").get() as any;
    if (row?.done) return;

    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };

    // Health stats - last 8 weeks
    const hrvBase = [58, 62, 55, 67, 61, 59, 64, 60, 57, 63, 66, 54, 61, 58, 65, 62, 56, 69, 60, 63, 58, 61, 64, 57, 59, 66, 62, 60, 55, 63, 67, 61, 58, 64, 60, 57, 62, 65, 59, 61, 66, 58, 63, 60, 57, 62, 64, 59, 61, 63, 58, 60, 65, 62, 59, 64, 61, 57, 63, 60, 62, 58, 65, 61, 59, 66, 63, 60, 58, 62, 64, 59, 61, 65, 60, 57, 63, 62, 59, 64, 61, 58, 66, 63, 60, 62, 57, 65, 59, 61];
    for (let i = 89; i >= 0; i--) {
      db.prepare(`INSERT OR IGNORE INTO health_stats (date, weight, body_fat, hrv, resting_hr, sleep_score, readiness_score, systolic, diastolic, vo2max, steps) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        daysAgo(i), 192 + (Math.random() * 2 - 1), 18.2 + (Math.random() * 0.4 - 0.2),
        hrvBase[i % hrvBase.length], 52 + Math.round(Math.random() * 6),
        70 + Math.round(Math.random() * 20), 68 + Math.round(Math.random() * 22),
        118 + Math.round(Math.random() * 12), 76 + Math.round(Math.random() * 8),
        42.5, 8000 + Math.round(Math.random() * 4000)
      );
    }

    // Workout split
    const weekDays = [
      { dayOfWeek: 'Monday', type: 'strength', label: 'Upper Strength 1 + Zone 2 Walk' },
      { dayOfWeek: 'Tuesday', type: 'strength', label: 'Lower Strength 1 + Zone 2 Bike' },
      { dayOfWeek: 'Wednesday', type: 'cardio', label: 'Zone 2 Walk 45min' },
      { dayOfWeek: 'Thursday', type: 'strength', label: 'Upper Strength 2 + Zone 2 Walk' },
      { dayOfWeek: 'Friday', type: 'strength', label: 'Lower Strength 2 + Zone 2 Bike' },
      { dayOfWeek: 'Saturday', type: 'ruck', label: 'Ruck 75-90min @ 25lbs' },
      { dayOfWeek: 'Sunday', type: 'rest', label: 'Rest & Recovery' },
    ];
    const mon = new Date(today);
    mon.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    for (let w = -1; w <= 1; w++) {
      weekDays.forEach((wd, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + w * 7 + i);
        const isPast = d <= today;
        db.prepare(`INSERT INTO workouts (date, day_of_week, type, label, duration, completed, rpe, notes) VALUES (?,?,?,?,?,?,?,?)`).run(
          fmt(d), wd.dayOfWeek, wd.type, wd.label,
          isPast ? (wd.type === 'ruck' ? 85 : wd.type === 'rest' ? null : 60) : null,
          isPast && wd.type !== 'rest' ? 1 : 0,
          isPast && wd.type !== 'rest' ? 7 : null, null
        );
      });
    }

    // Recovery
    [4, 2, 1, 0].forEach(d => {
      db.prepare(`INSERT INTO recovery_sessions (date, type, duration, notes) VALUES (?,?,?,?)`).run(
        daysAgo(d), d % 2 === 0 ? 'sauna' : 'cold_plunge', d % 2 === 0 ? 20 : 3, d % 2 === 0 ? '3 rounds' : null
      );
    });

    // Medications
    const meds = [
      ['Metoprolol', 'medication', '25mg', 'Daily', 'Morning', 'Cardiac — heart rate control'],
      ['Aspirin', 'medication', '81mg', 'Daily', 'Morning with food', 'Cardiac — antiplatelet'],
      ['Lisinopril', 'medication', '10mg', 'Daily', 'Evening', 'Blood pressure management'],
      ['Fish Oil (Omega-3)', 'supplement', '2g EPA/DHA', 'Daily', 'With meal', 'Cardiac & joint health'],
      ['Magnesium Glycinate', 'supplement', '400mg', 'Daily', 'Evening', 'Sleep quality & muscle recovery'],
      ['Vitamin D3/K2', 'supplement', '5000 IU / 100mcg', 'Daily', 'Morning with fat', 'Bone health & immune function'],
      ['CoQ10', 'supplement', '200mg', 'Daily', 'Morning', 'Mitochondrial / cardiac support'],
      ['Creatine Monohydrate', 'supplement', '5g', 'Daily', 'Post-workout or morning', 'Strength & muscle retention'],
      ['Jocko Molk RTD', 'supplement', '1 bottle (42g protein)', 'Daily', 'Post-workout or between meals', 'Protein target support'],
    ];
    meds.forEach(([name, type, dose, freq, timing, purpose]) => {
      db.prepare(`INSERT INTO medications (name, type, dose, frequency, timing, purpose, active) VALUES (?,?,?,?,?,?,1)`).run(name, type, dose, freq, timing, purpose);
    });
    const allMeds = db.prepare(`SELECT id FROM medications`).all() as any[];
    allMeds.forEach((m, i) => {
      db.prepare(`INSERT INTO med_logs (medication_id, date, taken, taken_at) VALUES (?,?,?,?)`).run(m.id, fmt(today), i < 6 ? 1 : 0, i < 6 ? '08:30' : null);
    });

    // Labs
    const labs = [
      ['Total Cholesterol', 188, 'mg/dL', 0, 200, 'normal'],
      ['LDL Cholesterol', 115, 'mg/dL', 0, 130, 'normal'],
      ['HDL Cholesterol', 48, 'mg/dL', 40, 999, 'normal'],
      ['Triglycerides', 142, 'mg/dL', 0, 150, 'normal'],
      ['Fasting Glucose', 98, 'mg/dL', 70, 100, 'normal'],
      ['HbA1c', 5.4, '%', 0, 5.7, 'normal'],
      ['Creatinine', 1.1, 'mg/dL', 0.7, 1.3, 'normal'],
      ['eGFR', 74, 'mL/min', 60, 999, 'normal'],
      ['TSH', 2.1, 'mIU/L', 0.4, 4.0, 'normal'],
      ['Testosterone (Total)', 520, 'ng/dL', 300, 1000, 'normal'],
      ['hsCRP', 1.8, 'mg/L', 0, 3.0, 'normal'],
      ['BNP', 95, 'pg/mL', 0, 100, 'normal'],
    ];
    labs.forEach(([name, val, unit, lo, hi, flag]) => {
      db.prepare(`INSERT INTO lab_results (date, test_name, value, unit, ref_low, ref_high, flag) VALUES (?,?,?,?,?,?,?)`).run(daysAgo(30), name, val, unit, lo, hi, flag);
    });

    // Doctor visits
    db.prepare(`INSERT INTO doctor_visits (date, doctor, specialty, reason, findings, follow_up, next_visit_date) VALUES (?,?,?,?,?,?,?)`).run(
      daysAgo(30), 'Dr. Martinez', 'Cardiology', 'Follow-up cardiac evaluation',
      'Echo shows stable EF at 52%. Mild LVH noted. Continue current medication regimen. Blood pressure trending high — monitoring.',
      'Repeat echo in 6 months. Adjust Lisinopril if BP remains elevated.', daysAgo(-180)
    );
    db.prepare(`INSERT INTO doctor_visits (date, doctor, specialty, reason, findings, follow_up, next_visit_date) VALUES (?,?,?,?,?,?,?)`).run(
      daysAgo(90), 'Dr. Patel', 'Primary Care / Internal Medicine', 'Annual physical + lab review',
      'Overall in good health for age. Lipids within range. Glucose borderline — recommend dietary focus.',
      'Follow-up labs in 90 days. Continue exercise protocol.', daysAgo(-90)
    );

    // Cardiac events
    db.prepare(`INSERT INTO cardiac_events (date, event_type, description, severity, heart_rate, systolic, diastolic, notes) VALUES (?,?,?,?,?,?,?,?)`).run(
      daysAgo(5), 'symptom', 'Mild chest tightness after morning ruck, resolved in 10 min', 'mild', 148, 138, 88, 'Hydration may have been low. No recurrence.'
    );
    db.prepare(`INSERT INTO cardiac_events (date, event_type, description, severity, heart_rate, systolic, diastolic, notes) VALUES (?,?,?,?,?,?,?,?)`).run(
      daysAgo(2), 'reading', 'Elevated resting HR on wake', 'mild', 74, 132, 84, 'Sleep was poor. Sauna day prior.'
    );

    // Voice notes
    db.prepare(`INSERT INTO voice_notes (date, time, section, transcript, tags) VALUES (?,?,?,?,?)`).run(
      fmt(today), '09:15', 'workout',
      'Feeling strong today. Upper body session went well, hit a new PR on incline press at 185. HRV this morning was 61 which is solid.',
      'PR, upper, zone2'
    );

    db.prepare(`INSERT OR REPLACE INTO seed_done (id, done) VALUES (1, 1)`).run();
    console.log('[db] Seed data inserted');
  }

  async getHealthStats() {
    return (db.prepare(`SELECT * FROM health_stats ORDER BY date DESC`).all() as any[]).map(toHS);
  }
  async getLatestHealthStats() {
    const r = db.prepare(`SELECT * FROM health_stats ORDER BY date DESC LIMIT 1`).get() as any;
    return r ? toHS(r) : undefined;
  }
  async createHealthStats(data: InsertHealthStats) {
    const r = db.prepare(`INSERT INTO health_stats (date,weight,body_fat,hrv,resting_hr,sleep_score,readiness_score,systolic,diastolic,vo2max,steps,blood_oxygen,calories,protein,water,workout_minutes,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      data.date, data.weight ?? null, data.bodyFat ?? null, data.hrv ?? null, data.restingHr ?? null,
      data.sleepScore ?? null, data.readinessScore ?? null, data.systolic ?? null, data.diastolic ?? null,
      data.vo2max ?? null, data.steps ?? null, data.bloodOxygen ?? null, data.calories ?? null,
      data.protein ?? null, data.water ?? null, data.workoutMinutes ?? null, data.notes ?? null
    );
    return toHS(db.prepare(`SELECT * FROM health_stats WHERE id = ?`).get(r.lastInsertRowid));
  }
  async upsertHealthStatsByDate(date: string, data: Partial<InsertHealthStats>) {
    const existing = db.prepare(`SELECT * FROM health_stats WHERE date = ?`).get(date) as any;
    if (existing) {
      const fields = ['weight','body_fat','hrv','resting_hr','sleep_score','readiness_score','systolic','diastolic','vo2max','steps','blood_oxygen','calories','protein','water','workout_minutes','notes'];
      const dataMap: Record<string,any> = { weight: data.weight, body_fat: data.bodyFat, hrv: data.hrv, resting_hr: data.restingHr, sleep_score: data.sleepScore, readiness_score: data.readinessScore, systolic: data.systolic, diastolic: data.diastolic, vo2max: data.vo2max, steps: data.steps, blood_oxygen: data.bloodOxygen, calories: data.calories, protein: data.protein, water: data.water, workout_minutes: data.workoutMinutes, notes: data.notes };
      const updates = fields.filter(f => dataMap[f] !== undefined && dataMap[f] !== null).map(f => `${f} = ?`);
      const vals = fields.filter(f => dataMap[f] !== undefined && dataMap[f] !== null).map(f => dataMap[f]);
      if (updates.length > 0) db.prepare(`UPDATE health_stats SET ${updates.join(', ')} WHERE date = ?`).run(...vals, date);
      return toHS(db.prepare(`SELECT * FROM health_stats WHERE date = ?`).get(date));
    } else {
      return this.createHealthStats({ date, ...data } as InsertHealthStats);
    }
  }

  async getWorkouts() {
    return (db.prepare(`SELECT * FROM workouts ORDER BY date ASC`).all() as any[]).map(toW);
  }
  async getWorkoutsByDate(date: string) {
    return (db.prepare(`SELECT * FROM workouts WHERE date = ?`).all(date) as any[]).map(toW);
  }
  async createWorkout(data: InsertWorkout) {
    const r = db.prepare(`INSERT INTO workouts (date,day_of_week,type,label,duration,completed,rpe,notes) VALUES (?,?,?,?,?,?,?,?)`).run(
      data.date, data.dayOfWeek, data.type, data.label, data.duration ?? null, data.completed ? 1 : 0, data.rpe ?? null, data.notes ?? null
    );
    return toW(db.prepare(`SELECT * FROM workouts WHERE id = ?`).get(r.lastInsertRowid));
  }
  async updateWorkout(id: number, data: Partial<InsertWorkout>) {
    const map: Record<string,any> = { date: data.date, day_of_week: data.dayOfWeek, type: data.type, label: data.label, duration: data.duration, completed: data.completed !== undefined ? (data.completed ? 1 : 0) : undefined, rpe: data.rpe, notes: data.notes };
    const updates = Object.entries(map).filter(([,v]) => v !== undefined).map(([k]) => `${k} = ?`);
    const vals = Object.entries(map).filter(([,v]) => v !== undefined).map(([,v]) => v);
    db.prepare(`UPDATE workouts SET ${updates.join(', ')} WHERE id = ?`).run(...vals, id);
    return toW(db.prepare(`SELECT * FROM workouts WHERE id = ?`).get(id));
  }

  async getRecoverySessions() {
    return (db.prepare(`SELECT * FROM recovery_sessions ORDER BY date DESC`).all() as any[]).map(toR);
  }
  async createRecoverySession(data: InsertRecoverySession) {
    const r = db.prepare(`INSERT INTO recovery_sessions (date,type,duration,notes) VALUES (?,?,?,?)`).run(data.date, data.type, data.duration ?? null, data.notes ?? null);
    return toR(db.prepare(`SELECT * FROM recovery_sessions WHERE id = ?`).get(r.lastInsertRowid));
  }

  async getMeals() {
    return (db.prepare(`SELECT * FROM meals ORDER BY date DESC`).all() as any[]).map(toM);
  }
  async getMealsByDate(date: string) {
    return (db.prepare(`SELECT * FROM meals WHERE date = ?`).all(date) as any[]).map(toM);
  }
  async createMeal(data: InsertMeal) {
    const r = db.prepare(`INSERT INTO meals (date,meal_time,name,calories,protein,carbs,fat,training_day,notes) VALUES (?,?,?,?,?,?,?,?,?)`).run(
      data.date, data.mealTime, data.name, data.calories ?? null, data.protein ?? null, data.carbs ?? null, data.fat ?? null, data.trainingDay ? 1 : 0, data.notes ?? null
    );
    return toM(db.prepare(`SELECT * FROM meals WHERE id = ?`).get(r.lastInsertRowid));
  }
  async deleteMeal(id: number) { db.prepare(`DELETE FROM meals WHERE id = ?`).run(id); }

  async getMedications() {
    return (db.prepare(`SELECT * FROM medications`).all() as any[]).map(toMed);
  }
  async createMedication(data: InsertMedication) {
    const r = db.prepare(`INSERT INTO medications (name,type,dose,frequency,timing,purpose,active,notes) VALUES (?,?,?,?,?,?,?,?)`).run(
      data.name, data.type, data.dose ?? null, data.frequency ?? null, data.timing ?? null, data.purpose ?? null, data.active ? 1 : 0, data.notes ?? null
    );
    return toMed(db.prepare(`SELECT * FROM medications WHERE id = ?`).get(r.lastInsertRowid));
  }
  async updateMedication(id: number, data: Partial<InsertMedication>) {
    const map: Record<string,any> = { name: data.name, type: data.type, dose: data.dose, frequency: data.frequency, timing: data.timing, purpose: data.purpose, active: data.active !== undefined ? (data.active ? 1 : 0) : undefined, notes: data.notes };
    const updates = Object.entries(map).filter(([,v]) => v !== undefined).map(([k]) => `${k} = ?`);
    const vals = Object.entries(map).filter(([,v]) => v !== undefined).map(([,v]) => v);
    db.prepare(`UPDATE medications SET ${updates.join(', ')} WHERE id = ?`).run(...vals, id);
    return toMed(db.prepare(`SELECT * FROM medications WHERE id = ?`).get(id));
  }
  async deleteMedication(id: number) { db.prepare(`DELETE FROM medications WHERE id = ?`).run(id); }

  async getMedLogs(date: string) {
    return (db.prepare(`SELECT * FROM med_logs WHERE date = ?`).all(date) as any[]).map(toML);
  }
  async createMedLog(data: InsertMedLog) {
    const r = db.prepare(`INSERT INTO med_logs (medication_id,date,taken,taken_at) VALUES (?,?,?,?)`).run(data.medicationId, data.date, data.taken ? 1 : 0, data.takenAt ?? null);
    return toML(db.prepare(`SELECT * FROM med_logs WHERE id = ?`).get(r.lastInsertRowid));
  }
  async updateMedLog(id: number, data: Partial<InsertMedLog>) {
    const map: Record<string,any> = { taken: data.taken !== undefined ? (data.taken ? 1 : 0) : undefined, taken_at: data.takenAt };
    const updates = Object.entries(map).filter(([,v]) => v !== undefined).map(([k]) => `${k} = ?`);
    const vals = Object.entries(map).filter(([,v]) => v !== undefined).map(([,v]) => v);
    db.prepare(`UPDATE med_logs SET ${updates.join(', ')} WHERE id = ?`).run(...vals, id);
    return toML(db.prepare(`SELECT * FROM med_logs WHERE id = ?`).get(id));
  }

  async getLabResults() {
    return (db.prepare(`SELECT * FROM lab_results ORDER BY date DESC`).all() as any[]).map(toLR);
  }
  async createLabResult(data: InsertLabResult) {
    const r = db.prepare(`INSERT INTO lab_results (date,test_name,value,unit,ref_low,ref_high,flag,notes) VALUES (?,?,?,?,?,?,?,?)`).run(
      data.date, data.testName, data.value ?? null, data.unit ?? null, data.refLow ?? null, data.refHigh ?? null, data.flag ?? null, data.notes ?? null
    );
    return toLR(db.prepare(`SELECT * FROM lab_results WHERE id = ?`).get(r.lastInsertRowid));
  }
  async deleteLabResult(id: number) { db.prepare(`DELETE FROM lab_results WHERE id = ?`).run(id); }

  async getDoctorVisits() {
    return (db.prepare(`SELECT * FROM doctor_visits ORDER BY date DESC`).all() as any[]).map(toDV);
  }
  async createDoctorVisit(data: InsertDoctorVisit) {
    const r = db.prepare(`INSERT INTO doctor_visits (date,doctor,specialty,reason,findings,follow_up,next_visit_date) VALUES (?,?,?,?,?,?,?)`).run(
      data.date, data.doctor, data.specialty ?? null, data.reason ?? null, data.findings ?? null, data.followUp ?? null, data.nextVisitDate ?? null
    );
    return toDV(db.prepare(`SELECT * FROM doctor_visits WHERE id = ?`).get(r.lastInsertRowid));
  }
  async deleteDoctorVisit(id: number) { db.prepare(`DELETE FROM doctor_visits WHERE id = ?`).run(id); }

  async getCardiacEvents() {
    return (db.prepare(`SELECT * FROM cardiac_events ORDER BY date DESC`).all() as any[]).map(toCE);
  }
  async createCardiacEvent(data: InsertCardiacEvent) {
    const r = db.prepare(`INSERT INTO cardiac_events (date,event_type,description,severity,heart_rate,systolic,diastolic,notes) VALUES (?,?,?,?,?,?,?,?)`).run(
      data.date, data.eventType, data.description, data.severity ?? null, data.heartRate ?? null, data.systolic ?? null, data.diastolic ?? null, data.notes ?? null
    );
    return toCE(db.prepare(`SELECT * FROM cardiac_events WHERE id = ?`).get(r.lastInsertRowid));
  }

  async getVoiceNotes() {
    return (db.prepare(`SELECT * FROM voice_notes ORDER BY date DESC, time DESC`).all() as any[]).map(toVN);
  }
  async createVoiceNote(data: InsertVoiceNote) {
    const r = db.prepare(`INSERT INTO voice_notes (date,time,section,transcript,tags) VALUES (?,?,?,?,?)`).run(data.date, data.time, data.section, data.transcript, data.tags ?? null);
    return toVN(db.prepare(`SELECT * FROM voice_notes WHERE id = ?`).get(r.lastInsertRowid));
  }
  async deleteVoiceNote(id: number) { db.prepare(`DELETE FROM voice_notes WHERE id = ?`).run(id); }

  async getIntegrationToken(id: string) {
    const r = db.prepare(`SELECT * FROM integration_tokens WHERE id = ?`).get(id) as any;
    if (!r) return undefined;
    return { accessToken: r.access_token, refreshToken: r.refresh_token, expiresAt: r.expires_at, connectedAt: r.connected_at };
  }
  async setIntegrationToken(id: string, data: { accessToken: string; refreshToken?: string; expiresAt?: number; connectedAt: string }) {
    db.prepare(`INSERT OR REPLACE INTO integration_tokens (id,access_token,refresh_token,expires_at,connected_at) VALUES (?,?,?,?,?)`).run(id, data.accessToken, data.refreshToken ?? null, data.expiresAt ?? null, data.connectedAt);
  }
  async deleteIntegrationToken(id: string) { db.prepare(`DELETE FROM integration_tokens WHERE id = ?`).run(id); }

  async clearHealthStats() {
    db.prepare(`DELETE FROM health_stats`).run();
  }

  async isSeedData(): Promise<boolean> {
    // Returns true if no real Apple Health / Withings data has been uploaded yet
    const count = (db.prepare(`SELECT COUNT(*) as n FROM health_stats WHERE notes IS NULL OR notes != 'real_data'`).get() as any).n;
    const real = (db.prepare(`SELECT COUNT(*) as n FROM health_stats WHERE notes = 'real_data'`).get() as any).n;
    return real === 0 && count > 0;
  }
}

export const storage = new SQLiteStorage();
