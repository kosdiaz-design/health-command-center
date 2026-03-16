import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { RecoverySession, HealthStats, Workout } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Droplets, CheckCircle2, XCircle, AlertTriangle, Clock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function RecommendationCard({ hrv, restingHr, sleepScore, todayWorkout }: {
  hrv?: number | null; restingHr?: number | null; sleepScore?: number | null; todayWorkout?: Workout;
}) {
  const score = (() => {
    let s = 0;
    if (hrv && hrv >= 60) s += 2; else if (hrv && hrv >= 45) s += 1;
    if (restingHr && restingHr < 60) s += 2; else if (restingHr && restingHr < 68) s += 1;
    if (sleepScore && sleepScore >= 80) s += 2; else if (sleepScore && sleepScore >= 70) s += 1;
    if (todayWorkout?.type === 'rest') s += 1;
    return s;
  })();

  const saunaRec = score >= 5
    ? { ok: true, msg: "Great day for sauna — recovery markers are strong", sub: "20–25 min, 170–190°F. Hydrate well beforehand." }
    : score >= 3
      ? { ok: true, msg: "Sauna is fine today — keep it moderate", sub: "15–20 min max. Watch heart rate. Avoid if BP is elevated." }
      : { ok: false, msg: "Skip sauna today — recovery is low", sub: "HRV or sleep is below baseline. Rest instead." };

  const coldRec = score >= 3
    ? { ok: true, msg: "Cold plunge is recommended today", sub: "3–5 min at 50–55°F. Cardiac benefit: reduces inflammation, lowers HR." }
    : { ok: true, msg: "Cold plunge is beneficial — moderate exposure", sub: "2–3 min. Avoid breath-holding. Good for cardiac vagal tone." };

  // Cardiac-specific rule
  const cardiacWarning = restingHr && restingHr > 80;

  return (
    <Card className="bg-card border-card-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Today's Recovery Recommendation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {cardiacWarning && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle size={14} className="text-yellow-500 mt-0.5" />
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Resting HR elevated ({restingHr} bpm) — monitor your response in sauna closely</p>
          </div>
        )}

        {/* Sauna */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${saunaRec.ok ? "bg-orange-500/15" : "bg-muted"}`}>
            <Flame size={16} className={saunaRec.ok ? "text-orange-500" : "text-muted-foreground"} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">Sauna</p>
              {saunaRec.ok
                ? <CheckCircle2 size={13} className="text-green-500" />
                : <XCircle size={13} className="text-red-400" />}
            </div>
            <p className="text-xs text-foreground">{saunaRec.msg}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{saunaRec.sub}</p>
          </div>
        </div>

        {/* Cold Plunge */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Droplets size={16} className="text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium">Cold Plunge</p>
              <CheckCircle2 size={13} className="text-green-500" />
            </div>
            <p className="text-xs text-foreground">{coldRec.msg}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{coldRec.sub}</p>
          </div>
        </div>

        {/* Cardiac note */}
        <div className="pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Cardiac note: </span>
            Sauna raises HR significantly — keep sessions ≤20 min if BP is elevated. Cold plunge improves vagal tone (raises HRV). Always check BP before sauna on lift days. Access before 4:30pm on work days.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Recovery() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [logging, setLogging] = useState<"sauna" | "cold_plunge" | null>(null);

  const { data: sessions = [] } = useQuery<RecoverySession[]>({
    queryKey: ["/api/recovery"],
    queryFn: () => apiRequest("GET", "/api/recovery"),
  });
  const { data: statsArr } = useQuery<HealthStats[]>({
    queryKey: ["/api/health-stats"],
    queryFn: () => apiRequest("GET", "/api/health-stats"),
  });
  const { data: workouts } = useQuery<Workout[]>({
    queryKey: ["/api/workouts"],
    queryFn: () => apiRequest("GET", "/api/workouts"),
  });

  const latest = statsArr?.[0];
  const today = new Date().toISOString().split('T')[0];
  const todayWorkout = workouts?.find(w => w.date === today);

  const logMutation = useMutation({
    mutationFn: (type: "sauna" | "cold_plunge") =>
      apiRequest("POST", "/api/recovery", {
        date: today, type, duration: type === 'sauna' ? 20 : 3, notes: null
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recovery"] });
      toast({ title: "Recovery session logged" });
      setLogging(null);
    },
    onError: () => toast({ title: "Failed to log", variant: "destructive" }),
  });

  // Last 14 days
  const last14 = [...Array(14)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
  const sessionsByDate = sessions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, RecoverySession[]>);

  const saunaThisWeek = sessions.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() || 7) + 1);
    return d >= monday && s.type === 'sauna';
  }).length;
  const coldThisWeek = sessions.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() || 7) + 1);
    return d >= monday && s.type === 'cold_plunge';
  }).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Sauna & Cold Plunge</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Recovery protocol tracking & daily recommendations</p>
      </div>

      {/* Recommendation */}
      <RecommendationCard
        hrv={latest?.hrv}
        restingHr={latest?.restingHr}
        sleepScore={latest?.sleepScore}
        todayWorkout={todayWorkout}
      />

      {/* Log buttons */}
      <div className="flex gap-3">
        <Button
          data-testid="button-log-sauna"
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => logMutation.mutate("sauna")}
          disabled={logMutation.isPending}
        >
          <Flame size={14} className="text-orange-500" />
          Log Sauna
        </Button>
        <Button
          data-testid="button-log-cold"
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => logMutation.mutate("cold_plunge")}
          disabled={logMutation.isPending}
        >
          <Droplets size={14} className="text-blue-500" />
          Log Cold Plunge
        </Button>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-card-border">
          <CardContent className="pt-4 pb-4 px-5">
            <div className="flex items-center gap-3 mb-2">
              <Flame size={16} className="text-orange-500" />
              <span className="text-sm font-medium">Sauna This Week</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{saunaThisWeek}<span className="text-sm text-muted-foreground font-normal">/4 target</span></p>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((saunaThisWeek / 4) * 100, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-card-border">
          <CardContent className="pt-4 pb-4 px-5">
            <div className="flex items-center gap-3 mb-2">
              <Droplets size={16} className="text-blue-500" />
              <span className="text-sm font-medium">Cold Plunge This Week</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{coldThisWeek}<span className="text-sm text-muted-foreground font-normal">/3 target</span></p>
            <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((coldThisWeek / 3) * 100, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 14-day calendar */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">14-Day Recovery Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {last14.map(date => {
              const daySessions = sessionsByDate[date] || [];
              const hasSauna = daySessions.some(s => s.type === 'sauna');
              const hasCold = daySessions.some(s => s.type === 'cold_plunge');
              const isToday = date === today;
              const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
              const dayNum = new Date(date).getDate();
              return (
                <div key={date} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${isToday ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}>
                  <span className="text-xs text-muted-foreground">{dayName}</span>
                  <span className="text-xs font-medium tabular-nums">{dayNum}</span>
                  <div className="flex gap-0.5">
                    <div className={`w-2 h-2 rounded-full ${hasSauna ? "bg-orange-500" : "bg-muted"}`} title="Sauna" />
                    <div className={`w-2 h-2 rounded-full ${hasCold ? "bg-blue-500" : "bg-muted"}`} title="Cold Plunge" />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> Sauna</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Cold Plunge</div>
          </div>
        </CardContent>
      </Card>

      {/* Protocol guide */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Protocol Guide — Cardiac Adapted</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-medium mb-2 flex items-center gap-1.5"><Flame size={12} className="text-orange-500" /> Sauna Protocol</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>· Temperature: 170–190°F (76–88°C)</li>
                <li>· Duration: 15–20 min per round</li>
                <li>· Rounds: 2–3 with rest between</li>
                <li>· Hydrate: 16–24 oz water before</li>
                <li>· Exit if HR exceeds 160 bpm</li>
                <li>· Avoid within 2h of heavy lifting</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2 flex items-center gap-1.5"><Droplets size={12} className="text-blue-500" /> Cold Plunge Protocol</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>· Temperature: 50–58°F (10–14°C)</li>
                <li>· Duration: 3–5 minutes</li>
                <li>· Frequency: 2–3x per week</li>
                <li>· No breath-holding (cardiac risk)</li>
                <li>· Post-training ideal for inflammation</li>
                <li>· Improves vagal tone / HRV over time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
