import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { HealthStats, Workout, RecoverySession, CardiacEvent } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Moon, Zap, Scale, TrendingUp, TrendingDown, Minus, Droplets, Flame, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Source badge ─────────────────────────────────────────────────────────────
type Source = "oura" | "withings" | "apple" | "manual";
const SOURCE_LABELS: Record<Source, { label: string; color: string }> = {
  oura:     { label: "Oura",         color: "bg-indigo-500/15 text-indigo-500 dark:text-indigo-400" },
  withings: { label: "Withings",     color: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  apple:    { label: "Apple Health", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  manual:   { label: "Manual",       color: "bg-muted text-muted-foreground" },
};

function SourceBadge({ source }: { source: Source }) {
  const s = SOURCE_LABELS[source];
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.color} leading-none`}>
      {s.label}
    </span>
  );
}

function formatStatValue(value: string | number | null | undefined, decimals = 0): string | number | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return +value.toFixed(decimals);
  return value;
}

function StatCard({ label, value, unit, icon: Icon, delta, deltaLabel, color, testId, decimals = 0, source }: {
  label: string; value: string | number | null | undefined; unit?: string; icon: any;
  delta?: number; deltaLabel?: string; color?: string; testId?: string; decimals?: number;
  source?: Source;
}) {
  const DeltaIcon = !delta ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaColor = !delta ? "text-muted-foreground" : delta > 0 ? "text-green-500" : "text-red-400";
  const displayValue = formatStatValue(value, decimals);
  return (
    <Card data-testid={testId} className="bg-card border-card-border">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between mb-2">
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
        <div className="flex items-center justify-between mt-1.5 min-h-[18px]">
          {deltaLabel && (
            <div className={`flex items-center gap-1 text-xs ${deltaColor}`}>
              <DeltaIcon size={11} />
              <span>{deltaLabel}</span>
            </div>
          )}
          {!deltaLabel && <span />}
          {source && value !== null && value !== undefined && <SourceBadge source={source} />}
        </div>
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
  const { data: integrationStatus } = useQuery<{
    oura: { connected: boolean }; withings: { connected: boolean };
  }>({
    queryKey: ["/api/integrations/status"],
    queryFn: () => apiRequest("GET", "/api/integrations/status"),
  });

  const ouraConnected    = integrationStatus?.oura?.connected ?? false;
  const withingsConnected = integrationStatus?.withings?.connected ?? false;

  // Determine source for each metric type
  // Oura: HRV, sleep score, readiness, resting HR, steps
  // Withings: weight, body fat, blood pressure
  // Apple Health: everything when synced via CSV (fallback)
  const hrvSource:       Source = ouraConnected    ? "oura"    : "apple";
  const sleepSource:     Source = ouraConnected    ? "oura"    : "apple";
  const hrSource:        Source = ouraConnected    ? "oura"    : "apple";
  const stepsSource:     Source = ouraConnected    ? "oura"    : "apple";
  const weightSource:    Source = withingsConnected ? "withings" : "apple";
  const bpSource:        Source = withingsConnected ? "withings" : "apple";
  const bodyFatSource:   Source = withingsConnected ? "withings" : "apple";

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

  const weightDelta = (latest?.weight && prev?.weight) ? +(latest.weight - prev.weight).toFixed(1) : 0;
  const hrvDelta = (latest?.hrv && prev?.hrv) ? latest.hrv - prev.hrv : 0;

  const healthScore = (() => {
    if (!latest) return null;
    let score = 0;
    if (latest.readinessScore) score += Math.min(latest.readinessScore, 100) * 0.3;
    if (latest.hrv) score += Math.min((latest.hrv / 80) * 100, 100) * 0.25;
    if (latest.sleepScore) score += Math.min(latest.sleepScore, 100) * 0.25;
    if (latest.restingHr) score += Math.max(0, (1 - (latest.restingHr - 50) / 40)) * 100 * 0.2;
    return Math.round(score);
  })();

  // HRV chart — last 14 days only, sorted oldest→newest
  const chartData = statsArr
    ? [...statsArr]
        .filter(s => s.hrv)
        .slice(0, 14)
        .reverse()
    : [];
  const maxHrv = chartData.length > 0 ? Math.max(...chartData.map(s => s.hrv || 0)) : 1;
  const minHrv = chartData.length > 0 ? Math.min(...chartData.map(s => s.hrv || 0)) : 0;
  // Normalize bar heights to use full chart area (min = 20%, max = 100%)
  const barPct = (hrv: number) => {
    if (maxHrv === minHrv) return 70;
    return 20 + ((hrv - minHrv) / (maxHrv - minHrv)) * 80;
  };
  const fmtChartDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };

  // Data source legend — show which integrations are feeding the dashboard
  const activeSources: Array<{ source: Source; fields: string }> = [];
  if (ouraConnected)     activeSources.push({ source: "oura",     fields: "HRV · Sleep · Readiness · Resting HR" });
  if (withingsConnected) activeSources.push({ source: "withings", fields: "Weight · Body Fat · Blood Pressure" });
  if (!ouraConnected || !withingsConnected)
    activeSources.push({ source: "apple", fields: ouraConnected
      ? "Weight · Body Fat · Blood Pressure · Steps"
      : withingsConnected
        ? "HRV · Sleep · Resting HR · Steps · VO2 Max"
        : "All metrics"
    });

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

      {/* Data source legend */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Data from:</span>
        {activeSources.map(({ source, fields }) => (
          <div key={source} className="flex items-center gap-1.5">
            <SourceBadge source={source} />
            <span className="text-xs text-muted-foreground">{fields}</span>
          </div>
        ))}
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
            delta={hrvDelta} deltaLabel={`${Math.abs(hrvDelta)} ms vs yesterday`}
            source={latest?.hrv ? hrvSource : undefined} />
          <StatCard label="Resting HR" value={latest?.restingHr} unit="bpm" icon={Heart} testId="stat-rhr"
            deltaLabel={latest?.restingHr ? (latest.restingHr < 60 ? "Athletic range" : "Within range") : undefined}
            source={latest?.restingHr ? hrSource : undefined} />
          <StatCard label="Sleep Score" value={latest?.sleepScore} icon={Moon} testId="stat-sleep"
            deltaLabel={latest?.sleepScore && latest.sleepScore >= 80 ? "Excellent" : latest?.sleepScore && latest.sleepScore >= 65 ? "Good" : "Needs work"}
            source={latest?.sleepScore ? sleepSource : undefined} />
          <StatCard label="Body Weight" value={latest?.weight} unit="lbs" icon={Scale} testId="stat-weight" decimals={1}
            delta={-weightDelta} deltaLabel={`${Math.abs(weightDelta)} lbs vs yesterday`}
            source={latest?.weight ? weightSource : undefined} />
          <StatCard label="Blood Pressure" value={latest ? `${latest.systolic}/${latest.diastolic}` : null} unit="mmHg" icon={Heart} testId="stat-bp"
            deltaLabel={bpStatus?.label} color={latest?.systolic && latest.systolic >= 130 ? "bg-red-500/15" : "bg-green-500/15"}
            source={latest?.systolic ? bpSource : undefined} />
          <StatCard label="Health Score" value={healthScore} unit="/100" icon={Zap} testId="stat-health-score"
            deltaLabel="Composite index" />
          <StatCard label="Body Fat" value={latest?.bodyFat} unit="%" icon={TrendingDown} testId="stat-bodyfat" decimals={1}
            source={latest?.bodyFat ? bodyFatSource : undefined} />
          <StatCard label="Steps Today" value={latest?.steps?.toLocaleString()} icon={Activity} testId="stat-steps"
            source={latest?.steps ? stepsSource : undefined} />
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

      {/* HRV Trend Chart — last 14 days, fixed height */}
      {chartData.length > 1 && (
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">HRV Trend — Last {chartData.length} Days</CardTitle>
              <SourceBadge source={hrvSource} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Chart area — fixed 72px tall, bars normalized min→max */}
            <div className="flex items-end gap-1" style={{ height: "72px" }}>
              {chartData.map((s, i) => {
                const pct = barPct(s.hrv || 0);
                const isLatest = i === chartData.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: "72px" }}>
                    <div
                      className={`w-full rounded-sm transition-all ${isLatest ? "bg-primary" : "bg-primary/30"}`}
                      style={{ height: `${pct}%` }}
                      title={`${s.date}: ${s.hrv} ms`}
                    />
                  </div>
                );
              })}
            </div>
            {/* X-axis labels — only show every 2nd to avoid crowding */}
            <div className="flex gap-1 mt-1">
              {chartData.map((s, i) => (
                <div key={i} className="flex-1 text-center">
                  {i % 2 === 0 ? (
                    <span className="text-[10px] text-muted-foreground tabular-nums">{fmtChartDate(s.date)}</span>
                  ) : null}
                </div>
              ))}
            </div>
            {/* Value labels only for first, last, min, max */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Low: <span className="text-foreground font-medium">{minHrv} ms</span></span>
              <span>Latest: <span className="text-primary font-semibold">{chartData[chartData.length - 1]?.hrv} ms</span></span>
              <span>High: <span className="text-foreground font-medium">{maxHrv} ms</span></span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
