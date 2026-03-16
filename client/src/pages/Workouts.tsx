import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Workout } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Dumbbell, Bike, Footprints, Zap, Wind, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const typeConfig = {
  strength: { icon: Dumbbell, color: "text-primary", bg: "bg-primary/10", label: "Strength" },
  cardio: { icon: Footprints, color: "text-green-500", bg: "bg-green-500/10", label: "Cardio" },
  ruck: { icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10", label: "Ruck" },
  bike: { icon: Bike, color: "text-blue-500", bg: "bg-blue-500/10", label: "Bike" },
  rest: { icon: Wind, color: "text-muted-foreground", bg: "bg-muted", label: "Rest" },
};

const strengthTemplates: Record<string, { exercises: string[] }> = {
  'Upper Strength 1 + 40m Zone 2 Walk': {
    exercises: ['Bench Press 4×6-8', 'Incline DB Press 3×10', 'Cable Row 4×10', 'Lat Pulldown 3×12', 'Overhead Press 3×10', 'Face Pulls 3×15', 'Bicep Curls 3×12', '40m Zone 2 Walk'],
  },
  'Lower Strength 1 + 40m Zone 2 Bike': {
    exercises: ['Back Squat 4×6-8', 'Romanian Deadlift 3×10', 'Leg Press 3×12', 'Leg Curl 3×12', 'Calf Raises 4×15', 'Ab Wheel 3×10', '40m Zone 2 Bike'],
  },
  '45m Zone 2 Walk': {
    exercises: ['45 min Zone 2 walk — target 115–135 bpm', 'Nasal breathing only', 'Low intensity / active recovery'],
  },
  'Upper Strength 2 + 40m Zone 2 Walk': {
    exercises: ['Weighted Pull-ups 4×6', 'DB Row 4×10', 'Seated Cable Row 3×12', 'DB Shoulder Press 4×10', 'Lateral Raises 3×15', 'Tricep Pushdowns 3×12', 'Hammer Curls 3×12', '40m Zone 2 Walk'],
  },
  'Lower Strength 2 + 40m Zone 2 Bike': {
    exercises: ['Deadlift 4×5', 'Bulgarian Split Squat 3×10ea', 'Hack Squat 3×12', 'Leg Extension 3×15', 'Nordic Curl 3×8', 'Hanging Leg Raise 3×12', '40m Zone 2 Bike'],
  },
  '75–90m Ruck @ 25 lbs': {
    exercises: ['Load ruck to 25 lbs', 'Target pace 3.0–3.5 mph', 'Terrain variation if possible', 'Heart rate Zone 2–3 (130–155 bpm)', 'Stay hydrated — 32–48 oz water'],
  },
  'Full Rest / Active Recovery': {
    exercises: ['No structured training', 'Gentle walk if desired', 'Focus on sleep & nutrition', 'Foam roll / stretch OK'],
  },
};

function WorkoutCard({ workout, onToggle }: { workout: Workout; onToggle: () => void }) {
  const cfg = typeConfig[workout.type as keyof typeof typeConfig] || typeConfig.rest;
  const Icon = cfg.icon;
  const template = strengthTemplates[workout.label];
  const today = new Date().toISOString().split('T')[0];
  const isToday = workout.date === today;
  const isPast = workout.date < today;

  return (
    <Card data-testid={`card-workout-${workout.id}`} className={`bg-card border-card-border transition-all ${isToday ? "ring-1 ring-primary/40" : ""}`}>
      <CardContent className="pt-4 pb-4 px-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${cfg.bg}`}>
              <Icon size={14} className={cfg.color} />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">{workout.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{workout.dayOfWeek} · {workout.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isToday && <Badge className="bg-primary/15 text-primary border-0 text-xs">Today</Badge>}
            {workout.type !== 'rest' && (
              <button
                onClick={onToggle}
                data-testid={`button-toggle-workout-${workout.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {workout.completed
                  ? <CheckCircle2 size={18} className="text-green-500" />
                  : <Circle size={18} />
                }
              </button>
            )}
          </div>
        </div>

        {workout.duration && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span>{workout.duration} min</span>
            {workout.rpe && <span>RPE {workout.rpe}/10</span>}
          </div>
        )}

        {template && (
          <div className="space-y-1">
            {template.exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-muted-foreground">{ex}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Workouts() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: workouts = [], isLoading } = useQuery<Workout[]>({
    queryKey: ["/api/workouts"],
    queryFn: () => apiRequest("GET", "/api/workouts"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/workouts/${id}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/workouts"] }),
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const sortedWorkouts = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().split('T')[0];
  const completed = workouts.filter(w => w.completed).length;
  const total = workouts.filter(w => w.type !== 'rest').length;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workout Split</h1>
          <p className="text-sm text-muted-foreground mt-0.5">7-day periodized training program</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{completed}<span className="text-sm text-muted-foreground font-normal">/{total}</span></p>
          <p className="text-xs text-muted-foreground">sessions this week</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(7).fill(0).map((_, i) => <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedWorkouts.map(w => (
            <WorkoutCard
              key={w.id}
              workout={w}
              onToggle={() => toggleMutation.mutate({ id: w.id, completed: !w.completed })}
            />
          ))}
        </div>
      )}

      {/* Readiness note */}
      <Card className="bg-card border-card-border">
        <CardContent className="py-4 px-5">
          <p className="text-xs font-medium mb-1">Training Guidelines — Cardiac Considerations</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>· Keep Zone 2 HR at 115–135 bpm. Max Zone 3 during rucking (135–155 bpm).</li>
            <li>· If resting HR is 10+ bpm above baseline, consider deload or lighter session.</li>
            <li>· If HRV drops below 45 ms, swap heavy lift for Zone 2 or mobility.</li>
            <li>· Any chest tightness during training — stop, rest, log in Health Records.</li>
            <li>· BP check recommended before max-effort lifting days.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
