import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, ChevronDown, ChevronUp, Save, ClipboardList } from "lucide-react";
import type { HealthStats } from "@shared/schema";

// ── helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

function Num({
  label, id, value, onChange, placeholder, unit, step = "1", min,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  unit?: string; step?: string; min?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative flex items-center">
        <Input
          id={id}
          type="number"
          step={step}
          min={min}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "—"}
          className="h-9 text-sm pr-10"
          data-testid={`input-${id}`}
        />
        {unit && (
          <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">{unit}</span>
        )}
      </div>
    </div>
  );
}

// ── section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-card-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        data-testid={`section-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span className="text-sm font-semibold">{title}</span>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>
      {open && <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>}
    </div>
  );
}

// ── today's existing entry (for pre-fill) ────────────────────────────────────
function useTodayStats() {
  return useQuery<HealthStats[]>({
    queryKey: ["/api/health-stats"],
    select: (data) => {
      const t = today();
      return data.filter(r => r.date === t);
    },
  });
}

// ── main component ────────────────────────────────────────────────────────────
export default function LogEntry() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: todayRows } = useTodayStats();
  const existing = todayRows?.[0];

  // ── form state ──────────────────────────────────────────────────────────────
  const [date, setDate] = useState(today());
  const [weight, setWeight]       = useState(existing?.weight?.toString() ?? "");
  const [bodyFat, setBodyFat]     = useState(existing?.bodyFat?.toString() ?? "");
  const [hrv, setHrv]             = useState(existing?.hrv?.toString() ?? "");
  const [restingHr, setRestingHr] = useState(existing?.restingHr?.toString() ?? "");
  const [sleepScore, setSleepScore]     = useState(existing?.sleepScore?.toString() ?? "");
  const [readiness, setReadiness]       = useState(existing?.readinessScore?.toString() ?? "");
  const [systolic, setSystolic]         = useState(existing?.systolic?.toString() ?? "");
  const [diastolic, setDiastolic]       = useState(existing?.diastolic?.toString() ?? "");
  const [vo2max, setVo2max]             = useState(existing?.vo2max?.toString() ?? "");
  const [steps, setSteps]               = useState(existing?.steps?.toString() ?? "");
  const [bloodOxygen, setBloodOxygen]   = useState(existing?.bloodOxygen?.toString() ?? "");
  const [calories, setCalories]         = useState(existing?.calories?.toString() ?? "");
  const [protein, setProtein]           = useState(existing?.protein?.toString() ?? "");
  const [water, setWater]               = useState(existing?.water?.toString() ?? "");
  const [workoutMin, setWorkoutMin]     = useState(existing?.workoutMinutes?.toString() ?? "");
  const [notes, setNotes]               = useState(existing?.notes ?? "");

  const [saved, setSaved] = useState(false);

  // ── submit ──────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | number | null> = { date };
      const n = (v: string) => v !== "" ? parseFloat(v) : null;
      const i = (v: string) => v !== "" ? parseInt(v, 10) : null;
      payload.weight        = n(weight);
      payload.bodyFat       = n(bodyFat);
      payload.hrv           = i(hrv);
      payload.restingHr     = i(restingHr);
      payload.sleepScore    = i(sleepScore);
      payload.readinessScore = i(readiness);
      payload.systolic      = i(systolic);
      payload.diastolic     = i(diastolic);
      payload.vo2max        = n(vo2max);
      payload.steps         = i(steps);
      payload.bloodOxygen   = n(bloodOxygen);
      payload.calories      = i(calories);
      payload.protein       = i(protein);
      payload.water         = n(water);
      payload.workoutMinutes = i(workoutMin);
      payload.notes         = notes || null;
      return apiRequest("POST", "/api/health-stats", payload);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      qc.invalidateQueries({ queryKey: ["/api/health-stats"] });
      toast({ title: "Saved!", description: `Entry for ${date} recorded.` });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Something went wrong. Try again.", variant: "destructive" });
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ClipboardList size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Daily Log</h1>
          <p className="text-xs text-muted-foreground">Enter today's readings from iPhone Health</p>
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="entry-date" className="text-xs text-muted-foreground">Date</Label>
        <Input
          id="entry-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="h-9 text-sm w-48"
          data-testid="input-date"
        />
      </div>

      <form
        onSubmit={e => { e.preventDefault(); mutation.mutate(); }}
        className="space-y-3"
      >
        {/* Body */}
        <Section title="Body">
          <Num label="Weight"   id="weight"   value={weight}   onChange={setWeight}   unit="lbs" step="0.1" />
          <Num label="Body Fat" id="body-fat" value={bodyFat}  onChange={setBodyFat}  unit="%" step="0.1" />
        </Section>

        {/* Heart */}
        <Section title="Heart & Blood">
          <Num label="Resting HR"  id="resting-hr"  value={restingHr} onChange={setRestingHr} unit="bpm" />
          <Num label="HRV"         id="hrv"          value={hrv}       onChange={setHrv}       unit="ms" />
          <Num label="Blood Oxygen" id="spo2"        value={bloodOxygen} onChange={setBloodOxygen} unit="%" step="0.1" />
          <div className="col-span-2 sm:col-span-3">
            <Label className="text-xs text-muted-foreground">Blood Pressure</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number" id="systolic" value={systolic}
                onChange={e => setSystolic(e.target.value)}
                placeholder="Systolic" className="h-9 text-sm"
                data-testid="input-systolic"
              />
              <span className="text-muted-foreground font-bold">/</span>
              <Input
                type="number" id="diastolic" value={diastolic}
                onChange={e => setDiastolic(e.target.value)}
                placeholder="Diastolic" className="h-9 text-sm"
                data-testid="input-diastolic"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">mmHg</span>
            </div>
          </div>
        </Section>

        {/* Sleep & Recovery */}
        <Section title="Sleep & Recovery">
          <Num label="Sleep Score"    id="sleep-score"  value={sleepScore} onChange={setSleepScore} unit="/100" />
          <Num label="Readiness Score" id="readiness"   value={readiness}  onChange={setReadiness}  unit="/100" />
        </Section>

        {/* Activity */}
        <Section title="Activity">
          <Num label="Steps"           id="steps"        value={steps}      onChange={setSteps} />
          <Num label="Workout Time"    id="workout-min"  value={workoutMin} onChange={setWorkoutMin} unit="min" />
          <Num label="Active Calories" id="calories"     value={calories}   onChange={setCalories}   unit="kcal" />
          <Num label="VO₂ Max"         id="vo2max"       value={vo2max}     onChange={setVo2max}     unit="mL/kg" step="0.1" />
        </Section>

        {/* Nutrition */}
        <Section title="Nutrition" defaultOpen={false}>
          <Num label="Protein" id="protein" value={protein} onChange={setProtein} unit="g" />
          <Num label="Water"   id="water"   value={water}   onChange={setWater}   unit="mL" step="100" />
        </Section>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How do you feel today? Any symptoms or observations…"
            className="text-sm min-h-[80px] resize-none"
            data-testid="input-notes"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-11 text-sm font-semibold"
          disabled={mutation.isPending}
          data-testid="button-save-entry"
        >
          {saved ? (
            <><CheckCircle2 size={16} className="mr-2 text-green-400" /> Saved</>
          ) : mutation.isPending ? (
            "Saving…"
          ) : (
            <><Save size={16} className="mr-2" /> Save Entry</>
          )}
        </Button>
      </form>
    </div>
  );
}
