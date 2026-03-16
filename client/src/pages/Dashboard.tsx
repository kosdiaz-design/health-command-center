import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { HealthStats, Workout, RecoverySession, CardiacEvent } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Moon, Zap, Scale, TrendingUp, TrendingDown, Minus, Droplets, Flame, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatStatValue(value: string | number | null | undefined, decimals = 0): string | number | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return +value.toFixed(decimals);
  return value;
}

function StatCard({ label, value, unit, icon: Icon, delta, deltaLabel, color, testId, decimals = 0 }: {
  label: string; value: string | number | null | undefined; unit?: string; icon: any; delta?: number; deltaLabel?: string; color?: string; testId?: string; decimals?: number;
}) {
  const DeltaIcon = !delta ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaColor = !delta ? "text-muted-foreground" : delta > 0 ? "text-green-500" : "text-red-400";
  const displayValue = formatStatValue(value, decimals);
  return (
    <Card data-testid={testId} className="bg-card border-card-border">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className={`p-1.5 rounded-md ${color || "bg-primary/10"}`}>
            <Icon size={14} className={color ? "text-white" : "text-primary"} />
          </div>
        </div>
        <div className="flex items-end gap-1.5">
          <span className="text-2xl font-semibold tabular-nums" data-testid={`value-${testId}`}>
            {displayValue ?? "—"}
          </span>
          {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
        </div>
        {deltaLabel && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs ${deltaColor}`}>
            <DeltaIcon size={11} />
            <span>{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadinessBadge({ score }: { score: number | undefined | null }) {
  if (!score) return null;
  if (score >= 80) return <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 text-xs">Optimal</Badge>;
  if (score >= 65) return <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-0 text-xs">Moderate</Badge>;
  return <Badge className="bg-red-500/15 text-red-500 border-0 text-xs">Low</Badge>;
}

export default function Dashboard() {
  const { data: statsArr, isLoading: statsLoading } = useQuery<HealthStats[]>({
    queryKey: ["/api/health-stats"],
    queryFn: () => apiRequest("GET", "/api/health-stats"),
  });
  const { data: workouts } = useQuery<Workout[]>({
    queryKey: ["/api/workouts"],
    queryFn: () => apiRequest("GET", "/api/workouts"),
  });
  const { data: recovery } = useQuery<RecoverySession[]>({
    queryKey: ["/api/recovery"],
    queryFn: () => apiRequest("GET", "/api/recovery"),
  });
  const { data: cardiacEvents } = useQuery<CardiacEvent[]>({
    queryKey: ["/api/cardiac-events"],
    queryFn: () => apiRequest("GET", "/api/cardiac-events"),
  });

  const latest = statsArr?.[0];
  const prev = statsArr?.[1];

  const today = new Date().toISOString().split('T')[0];
  const todayWorkout = workouts?.find(w => w.date === today);
  const weekWorkouts = workouts?.filter(w => {
    const mon = new Date();
    mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1));
    const monStr = mon.toISOString().split('T')[0];
    return w.date >= monStr;
  }) || [];
  const completedThisWeek = weekWorkouts.filter(w => w.completed).length;
  const recentRecovery = recovery?.slice(0, 7) || [];
  const saunaCount = recentRecovery.filter(r => r.type === 'sauna').length;
  const coldCount = recentRecovery.filter(r => r.type === 'cold_plunge').length;
  const recentCardiac = cardiacEvents?.slice(0, 3) || [];

  const bpStatus = latest?.systolic
    ? latest.systolic < 120 ? { label: "Normal", color: "text-green-500" }
      : latest.systolic < 130 ? { label: "Elevated", color: "text-yellow-500" }
        : { label: "High", color: "text-red-400" }
    : null;

  // Weight trend
  const weightDelta = (latest?.weight && prev?.weight) ? +(latest.weight - prev.weight).toFixed(1) : 0;

  // HRV trend
  const hrvDelta = (latest?.hrv && prev?.hrv) ? latest.hrv - prev.hrv : 0;

  // Health score
  const healthScore = (() => {
    if (!latest) return null;
    let score = 0;
    if (latest.readinessScore) score += Math.min(latest.readinessScore, 100) * 0.3;
    if (latest.hrv) score += Math.min((latest.hrv / 80) * 100, 100) * 0.25;
    if (latest.sleepScore) score += Math.min(latest.sleepScore, 100) * 0.25;
    if (latest.restingHr) score += Math.max(0, (1 - (latest.restingHr - 50) / 40)) * 100 * 0.2;
    return Math.round(score);
  })();

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Kos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's your health snapshot for today</p>
        </div>
        {latest && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Readiness</div>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className="text-lg font-semibold tabular-nums">{latest.readinessScore}</span>
              <ReadinessBadge score={latest.readinessScore} />
            </div>
          </div>
        )}
      </div>

      {/* Cardiac Alert Banner */}
      {recentCardiac.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/8 border border-red-400/20">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-500 dark:text-red-400">Cardiac monitoring active</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last event: {recentCardiac[0].description} — {recentCardiac[0].date}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="HRV" value={latest?.hrv} unit="ms" icon={Activity} testId="stat-hrv"
            delta={hrvDelta} deltaLabel={`${Math.abs(hrvDelta)} ms vs last week`} />
          <StatCard label="Resting HR" value={latest?.restingHr} unit="bpm" icon={Heart} testId="stat-rhr"
            deltaLabel={latest?.restingHr ? (latest.restingHr < 60 ? "Athletic range" : "Within range") : undefined} />
          <StatCard label="Sleep Score" value={latest?.sleepScore} icon={Moon} testId="stat-sleep"
            deltaLabel={latest?.sleepScore && latest.sleepScore >= 80 ? "Excellent" : latest?.sleepScore && latest.sleepScore >= 65 ? "Good" : "Needs work"} />
          <StatCard label="Body Weight" value={latest?.weight} unit="lbs" icon={Scale} testId="stat-weight" decimals={1}
            delta={-weightDelta} deltaLabel={`${Math.abs(weightDelta)} lbs vs last week`} />
          <StatCard label="Blood Pressure" value={latest ? `${latest.systolic}/${latest.diastolic}` : null} unit="mmHg" icon={Heart} testId="stat-bp"
            deltaLabel={bpStatus?.label} color={latest?.systolic && latest.systolic >= 130 ? "bg-red-500/15" : "bg-green-500/15"} />
          <StatCard label="Health Score" value={healthScore} unit="/100" icon={Zap} testId="stat-health-score"
            deltaLabel="Composite index" />
          <StatCard label="Body Fat" value={latest?.bodyFat} unit="%" icon={TrendingDown} testId="stat-bodyfat" decimals={1} />
          <StatCard label="Steps Today" value={latest?.steps?.toLocaleString()} icon={Activity} testId="stat-steps" />
        </div>
      )}

      {/* Three columns: Today's Workout, Recovery, Cardiac */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Workout */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              Today's Session
              {todayWorkout?.completed && <CheckCircle2 size={14} className="text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {todayWorkout ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{todayWorkout.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{todayWorkout.type} · {todayWorkout.dayOfWeek}</p>
                </div>
                {todayWorkout.duration && (
                  <p className="text-xs text-muted-foreground">{todayWorkout.duration} min {todayWorkout.rpe ? `· RPE ${todayWorkout.rpe}/10` : ""}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs border-0 ${todayWorkout.completed ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-primary/15 text-primary"}`}>
                    {todayWorkout.completed ? "Completed" : "Scheduled"}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No session scheduled today</p>
            )}
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">This week: <span className="font-medium text-foreground">{completedThisWeek}/{weekWorkouts.filter(w => w.type !== 'rest').length} sessions</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Recovery */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recovery This Week</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-orange-500/15 flex items-center justify-center">
                  <Flame size={14} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{saunaCount}</p>
                  <p className="text-xs text-muted-foreground">Sauna</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-500/15 flex items-center justify-center">
                  <Droplets size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{coldCount}</p>
                  <p className="text-xs text-muted-foreground">Cold Plunge</p>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Target: 3–4 sauna, 2–3 cold plunge</div>
            <div className="flex gap-2 mt-2">
              <div className="h-1.5 rounded-full bg-muted flex-1 overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((saunaCount / 4) * 100, 100)}%` }} />
              </div>
              <div className="h-1.5 rounded-full bg-muted flex-1 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((coldCount / 3) * 100, 100)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cardiac */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Heart size={13} className="text-red-400" />
              Cardiac Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5 space-y-2">
            {recentCardiac.slice(0, 2).map(e => (
              <div key={e.id} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  e.severity === 'severe' ? 'bg-red-500' : e.severity === 'moderate' ? 'bg-yellow-500' : 'bg-blue-400'
                }`} />
                <div>
                  <p className="text-xs">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{e.date} {e.heartRate ? `· ${e.heartRate} bpm` : ""}</p>
                </div>
              </div>
            ))}
            {recentCardiac.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 size={13} className="text-green-500" />
                No recent events logged
              </div>
            )}
            {latest && (
              <div className="pt-2 border-t border-border text-xs">
                <span className="text-muted-foreground">Current BP: </span>
                <span className={`font-medium tabular-nums ${bpStatus?.color}`}>{latest.systolic}/{latest.diastolic}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend Chart (simple bar) */}
      {statsArr && statsArr.length > 1 && (
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">8-Week HRV Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-20">
              {[...statsArr].reverse().map((s, i) => {
                const maxHrv = Math.max(...statsArr.map(x => x.hrv || 0));
                const pct = s.hrv ? (s.hrv / maxHrv) * 100 : 10;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-primary/20 relative overflow-hidden" style={{ height: "64px" }}>
                      <div className="absolute bottom-0 w-full bg-primary rounded-sm transition-all" style={{ height: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{s.hrv}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Most recent on right · ms</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
