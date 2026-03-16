import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertHealthStatsSchema, insertWorkoutSchema, insertRecoverySessionSchema, insertMealSchema, insertMedicationSchema, insertMedLogSchema, insertLabResultSchema, insertDoctorVisitSchema, insertCardiacEventSchema, insertVoiceNoteSchema } from "@shared/schema";
// Uses global fetch (Node 18+)

const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID || "";
const OURA_CLIENT_SECRET = process.env.OURA_CLIENT_SECRET || "";
const WITHINGS_CLIENT_ID = process.env.WITHINGS_CLIENT_ID || "";
const WITHINGS_CLIENT_SECRET = process.env.WITHINGS_CLIENT_SECRET || "";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Health Stats
  app.get("/api/health-stats", async (_req, res) => res.json(await storage.getHealthStats()));
  app.get("/api/health-stats/latest", async (_req, res) => res.json(await storage.getLatestHealthStats()));
  app.post("/api/health-stats", async (req, res) => {
    const data = insertHealthStatsSchema.parse(req.body);
    res.json(await storage.createHealthStats(data));
  });

  // Workouts
  app.get("/api/workouts", async (_req, res) => res.json(await storage.getWorkouts()));
  app.post("/api/workouts", async (req, res) => {
    const data = insertWorkoutSchema.parse(req.body);
    res.json(await storage.createWorkout(data));
  });
  app.patch("/api/workouts/:id", async (req, res) => {
    const updated = await storage.updateWorkout(Number(req.params.id), req.body);
    res.json(updated);
  });

  // Recovery
  app.get("/api/recovery", async (_req, res) => res.json(await storage.getRecoverySessions()));
  app.post("/api/recovery", async (req, res) => {
    const data = insertRecoverySessionSchema.parse(req.body);
    res.json(await storage.createRecoverySession(data));
  });

  // Meals
  app.get("/api/meals", async (req, res) => {
    const date = req.query.date as string;
    if (date) return res.json(await storage.getMealsByDate(date));
    res.json(await storage.getMeals());
  });
  app.post("/api/meals", async (req, res) => {
    const data = insertMealSchema.parse(req.body);
    res.json(await storage.createMeal(data));
  });
  app.delete("/api/meals/:id", async (req, res) => {
    await storage.deleteMeal(Number(req.params.id));
    res.json({ success: true });
  });

  // Medications
  app.get("/api/medications", async (_req, res) => res.json(await storage.getMedications()));
  app.post("/api/medications", async (req, res) => {
    const data = insertMedicationSchema.parse(req.body);
    res.json(await storage.createMedication(data));
  });
  app.patch("/api/medications/:id", async (req, res) => {
    const updated = await storage.updateMedication(Number(req.params.id), req.body);
    res.json(updated);
  });
  app.delete("/api/medications/:id", async (req, res) => {
    await storage.deleteMedication(Number(req.params.id));
    res.json({ success: true });
  });

  // Med Logs
  app.get("/api/med-logs", async (req, res) => {
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    res.json(await storage.getMedLogs(date));
  });
  app.post("/api/med-logs", async (req, res) => {
    const data = insertMedLogSchema.parse(req.body);
    res.json(await storage.createMedLog(data));
  });
  app.patch("/api/med-logs/:id", async (req, res) => {
    const updated = await storage.updateMedLog(Number(req.params.id), req.body);
    res.json(updated);
  });

  // Lab Results
  app.get("/api/lab-results", async (_req, res) => res.json(await storage.getLabResults()));
  app.post("/api/lab-results", async (req, res) => {
    const data = insertLabResultSchema.parse(req.body);
    res.json(await storage.createLabResult(data));
  });
  app.delete("/api/lab-results/:id", async (req, res) => {
    await storage.deleteLabResult(Number(req.params.id));
    res.json({ success: true });
  });

  // Doctor Visits
  app.get("/api/doctor-visits", async (_req, res) => res.json(await storage.getDoctorVisits()));
  app.post("/api/doctor-visits", async (req, res) => {
    const data = insertDoctorVisitSchema.parse(req.body);
    res.json(await storage.createDoctorVisit(data));
  });
  app.delete("/api/doctor-visits/:id", async (req, res) => {
    await storage.deleteDoctorVisit(Number(req.params.id));
    res.json({ success: true });
  });

  // Cardiac Events
  app.get("/api/cardiac-events", async (_req, res) => res.json(await storage.getCardiacEvents()));
  app.post("/api/cardiac-events", async (req, res) => {
    const data = insertCardiacEventSchema.parse(req.body);
    res.json(await storage.createCardiacEvent(data));
  });

  // Voice Notes
  app.get("/api/voice-notes", async (_req, res) => res.json(await storage.getVoiceNotes()));
  app.post("/api/voice-notes", async (req, res) => {
    const data = insertVoiceNoteSchema.parse(req.body);
    res.json(await storage.createVoiceNote(data));
  });
  app.delete("/api/voice-notes/:id", async (req, res) => {
    await storage.deleteVoiceNote(Number(req.params.id));
    res.json({ success: true });
  });

  // ── Integration Status ─────────────────────────────────────────────────────
  app.get("/api/integrations/status", async (_req, res) => {
    const [ouraToken, withingsToken] = await Promise.all([
      storage.getIntegrationToken('oura'),
      storage.getIntegrationToken('withings'),
    ]);
    res.json({
      oura: ouraToken ? { connected: true, connectedAt: ouraToken.connectedAt } : { connected: false },
      withings: withingsToken ? { connected: true, connectedAt: withingsToken.connectedAt } : { connected: false },
      appleHealth: { connected: false, note: "Upload CSV from iPhone Health Export app" },
    });
  });

  // ── Oura OAuth ────────────────────────────────────────────────────────────
  // Redirect URI points back to the dashboard's own /oauth-callback page
  // That page extracts the code and POSTs it to /api/integrations/oura/token
  app.get("/api/integrations/oura/auth", (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${origin}/oauth-callback.html`;
    const scope = "daily heartrate personal workout session";
    const url = `https://cloud.ouraring.com/oauth/authorize?response_type=code&client_id=${OURA_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=oura`;
    res.json({ url, redirectUri });
  });

  // Receive the code from the oauth-callback page and exchange for token
  app.post("/api/integrations/oura/token", async (req, res) => {
    const { code, redirectUri } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });
    try {
      const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: OURA_CLIENT_ID, client_secret: OURA_CLIENT_SECRET, redirect_uri: redirectUri }),
      });
      const tokens = await tokenRes.json() as any;
      if (!tokens.access_token) return res.status(400).json({ error: "Token exchange failed", detail: tokens });
      await storage.setIntegrationToken('oura', { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, connectedAt: new Date().toISOString() });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Oura sync — pull last 30 days of key data into health stats
  app.post("/api/integrations/oura/sync", async (_req, res) => {
    const ouraToken = await storage.getIntegrationToken('oura');
    if (!ouraToken) return res.status(401).json({ error: "Not connected" });
    const token = ouraToken.accessToken;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [readRes, sleepRes, hrRes, actRes] = await Promise.all([
        fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`, { headers }),
        fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`, { headers }),
        fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`, { headers }),
        fetch(`https://api.ouraring.com/v2/usercollection/daily_cardiovascular_age?start_date=${startDate}&end_date=${endDate}`, { headers }),
      ]);
      const [readiness, sleep, activity] = await Promise.all([readRes.json(), sleepRes.json(), hrRes.json(), actRes.json()]) as any[];
      let synced = 0;
      const readMap = new Map((readiness.data || []).map((d: any) => [d.day, d]));
      const sleepMap = new Map((sleep.data || []).map((d: any) => [d.day, d]));
      const actMap = new Map((activity.data || []).map((d: any) => [d.day, d]));
      const allDates = new Set([...readMap.keys(), ...sleepMap.keys(), ...actMap.keys()]);
      for (const date of allDates) {
        const r = readMap.get(date) as any;
        const s = sleepMap.get(date) as any;
        const a = actMap.get(date) as any;
        await storage.upsertHealthStatsByDate(date, {
          date,
          readinessScore: r?.score ?? null,
          sleepScore: s?.score ?? null,
          hrv: r?.contributors?.hrv_balance ? Math.round(r.contributors.hrv_balance) : null,
          restingHr: s?.average_heart_rate ? Math.round(s.average_heart_rate) : null,
          steps: a?.steps ?? null,
        });
        synced++;
      }
      res.json({ success: true, synced, message: `Synced ${synced} days from Oura` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Oura disconnect
  app.delete("/api/integrations/oura", async (_req, res) => {
    await storage.deleteIntegrationToken('oura');
    res.json({ success: true });
  });

  // ── Withings OAuth ───────────────────────────────────────────────────────
  app.get("/api/integrations/withings/auth", (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${origin}/oauth-callback.html`;
    const scope = "user.metrics,user.activity";
    const url = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${WITHINGS_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=withings`;
    res.json({ url, redirectUri });
  });

  app.post("/api/integrations/withings/token", async (req, res) => {
    const { code, redirectUri } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });
    try {
      const tokenRes = await fetch("https://wbsapi.withings.net/v2/oauth2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action: "requesttoken", grant_type: "authorization_code", client_id: WITHINGS_CLIENT_ID, client_secret: WITHINGS_CLIENT_SECRET, code, redirect_uri: redirectUri }),
      });
      const data = await tokenRes.json() as any;
      const tokens = data.body;
      if (!tokens?.access_token) return res.status(400).json({ error: "Token exchange failed", detail: data });
      await storage.setIntegrationToken('withings', { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000, connectedAt: new Date().toISOString() });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Withings sync — pull weight & BP into health stats
  app.post("/api/integrations/withings/sync", async (_req, res) => {
    const withingsToken = await storage.getIntegrationToken('withings');
    if (!withingsToken) return res.status(401).json({ error: "Not connected" });
    const token = withingsToken.accessToken;
    const startDate = Math.floor((Date.now() - 30 * 86400000) / 1000);
    try {
      // meastypes: 1=weight, 9=diastolic, 10=systolic
      const measRes = await fetch("https://wbsapi.withings.net/measure?action=getmeas&meastypes=1,9,10&category=1&startdate=" + startDate, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await measRes.json() as any;
      const groups = data.body?.measuregrps || [];
      const byDate = new Map<string, { weight?: number; systolic?: number; diastolic?: number }>();
      for (const grp of groups) {
        const date = new Date(grp.date * 1000).toISOString().split('T')[0];
        if (!byDate.has(date)) byDate.set(date, {});
        const entry = byDate.get(date)!;
        for (const m of grp.measures) {
          const val = m.value * Math.pow(10, m.unit);
          if (m.type === 1) entry.weight = Math.round(val * 2.205 * 10) / 10; // kg → lbs
          if (m.type === 10) entry.systolic = Math.round(val);
          if (m.type === 9) entry.diastolic = Math.round(val);
        }
      }
      let synced = 0;
      for (const [date, vals] of byDate.entries()) {
        await storage.upsertHealthStatsByDate(date, { date, ...vals });
        synced++;
      }
      res.json({ success: true, synced, message: `Synced ${synced} days from Withings` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Withings disconnect
  app.delete("/api/integrations/withings", async (_req, res) => {
    await storage.deleteIntegrationToken('withings');
    res.json({ success: true });
  });

  // ── Apple Health CSV Upload ───────────────────────────────────────────────
  // Accepts JSON body parsed from Health Export CSV format
  app.post("/api/integrations/apple-health/upload", async (req, res) => {
    const { rows } = req.body as { rows: Array<Record<string, string>> };
    if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: "Expected { rows: [...] }" });
    let synced = 0;
    for (const row of rows) {
      const date = row["Date"] || row["date"];
      if (!date) continue;
      const isoDate = date.split(' ')[0]; // strip time if present
      await storage.upsertHealthStatsByDate(isoDate, {
        date: isoDate,
        weight: row["Body Mass (lb)"] ? parseFloat(row["Body Mass (lb)"]) : undefined,
        restingHr: row["Resting Heart Rate (count/min)"] ? Math.round(parseFloat(row["Resting Heart Rate (count/min)"])) : undefined,
        hrv: row["Heart Rate Variability (ms)"] ? Math.round(parseFloat(row["Heart Rate Variability (ms)"])) : undefined,
        steps: row["Step Count (count)"] ? Math.round(parseFloat(row["Step Count (count)"])) : undefined,
        vo2max: row["VO2 Max (mL/min·kg)"] ? parseFloat(row["VO2 Max (mL/min·kg)"]) : undefined,
        bodyFat: row["Body Fat Percentage (%)"] ? parseFloat(row["Body Fat Percentage (%)"]) : undefined,
        systolic: row["Blood Pressure Systolic (mmHg)"] ? Math.round(parseFloat(row["Blood Pressure Systolic (mmHg)"])) : undefined,
        diastolic: row["Blood Pressure Diastolic (mmHg)"] ? Math.round(parseFloat(row["Blood Pressure Diastolic (mmHg)"])) : undefined,
      });
      synced++;
    }
    res.json({ success: true, synced, message: `Imported ${synced} rows from Apple Health` });
  });

  return httpServer;
}
