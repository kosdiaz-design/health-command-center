import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Store DB in /data on Railway (persistent volume) or local ./data folder
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "health.db");
export const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS health_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    weight REAL,
    body_fat REAL,
    hrv INTEGER,
    resting_hr INTEGER,
    sleep_score INTEGER,
    readiness_score INTEGER,
    systolic INTEGER,
    diastolic INTEGER,
    vo2max REAL,
    steps INTEGER,
    blood_oxygen REAL,
    calories INTEGER,
    protein INTEGER,
    water REAL,
    workout_minutes INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    duration INTEGER,
    completed INTEGER DEFAULT 0,
    rpe INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS recovery_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_time TEXT NOT NULL,
    name TEXT NOT NULL,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    training_day INTEGER DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    dose TEXT,
    frequency TEXT,
    timing TEXT,
    purpose TEXT,
    active INTEGER DEFAULT 1,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS med_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    taken INTEGER DEFAULT 0,
    taken_at TEXT
  );

  CREATE TABLE IF NOT EXISTS lab_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    test_name TEXT NOT NULL,
    value REAL,
    unit TEXT,
    ref_low REAL,
    ref_high REAL,
    flag TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS doctor_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    doctor TEXT NOT NULL,
    specialty TEXT,
    reason TEXT,
    findings TEXT,
    follow_up TEXT,
    next_visit_date TEXT
  );

  CREATE TABLE IF NOT EXISTS cardiac_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT,
    heart_rate INTEGER,
    systolic INTEGER,
    diastolic INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS voice_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    section TEXT NOT NULL,
    transcript TEXT NOT NULL,
    tags TEXT
  );

  CREATE TABLE IF NOT EXISTS integration_tokens (
    id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at INTEGER,
    connected_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS seed_done (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    done INTEGER DEFAULT 0
  );
`);

// Run migrations for existing DBs that predate new columns
const existingCols = (db.prepare(`PRAGMA table_info(health_stats)`).all() as any[]).map((c: any) => c.name);
const migrateCol = (col: string, type: string) => {
  if (!existingCols.includes(col)) {
    db.exec(`ALTER TABLE health_stats ADD COLUMN ${col} ${type}`);
    console.log(`[db] migrated: added ${col} to health_stats`);
  }
};
migrateCol('blood_oxygen', 'REAL');
migrateCol('calories', 'INTEGER');
migrateCol('protein', 'INTEGER');
migrateCol('water', 'REAL');
migrateCol('workout_minutes', 'INTEGER');

console.log(`[db] SQLite database at ${dbPath}`);
