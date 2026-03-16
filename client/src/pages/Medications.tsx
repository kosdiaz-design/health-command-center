import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Medication, MedLog } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Circle, Plus, Trash2, Pill, Leaf, Clock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

const timingColors: Record<string, string> = {
  Morning: "text-yellow-600 dark:text-yellow-400",
  Evening: "text-blue-500",
  "Post-workout or morning": "text-primary",
  "With meal": "text-green-500",
  "Morning with fat": "text-orange-500",
  "Post-workout or between meals": "text-primary",
  "Morning with food": "text-yellow-600 dark:text-yellow-400",
};

export default function Medications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const { data: meds = [] } = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
    queryFn: () => apiRequest("GET", "/api/medications"),
  });
  const { data: logs = [] } = useQuery<MedLog[]>({
    queryKey: ["/api/med-logs", today],
    queryFn: () => apiRequest("GET", `/api/med-logs?date=${today}`),
  });

  const toggleLog = useMutation({
    mutationFn: async ({ medId, taken }: { medId: number; taken: boolean }) => {
      const existing = logs.find(l => l.medicationId === medId);
      if (existing) {
        return apiRequest("PATCH", `/api/med-logs/${existing.id}`, { taken, takenAt: taken ? new Date().toTimeString().slice(0, 5) : null });
      } else {
        return apiRequest("POST", "/api/med-logs", { medicationId: medId, date: today, taken, takenAt: taken ? new Date().toTimeString().slice(0, 5) : null });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/med-logs"] }),
  });

  const addMed = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/medications", { ...data, active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/medications"] }); setShowAdd(false); reset(); toast({ title: "Added" }); },
  });

  const deleteMed = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/medications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/medications"] }),
  });

  const medications = meds.filter(m => m.type === 'medication');
  const supplements = meds.filter(m => m.type === 'supplement');
  const takenCount = logs.filter(l => l.taken).length;

  const getLogForMed = (medId: number) => logs.find(l => l.medicationId === medId);

  const timingOrder = ["Morning", "Morning with food", "Morning with fat", "Post-workout or morning", "Post-workout or between meals", "With meal", "Evening"];
  const sortedMeds = (arr: Medication[]) => [...arr].sort((a, b) =>
    (timingOrder.indexOf(a.timing || "") || 99) - (timingOrder.indexOf(b.timing || "") || 99)
  );

  function MedRow({ med }: { med: Medication }) {
    const log = getLogForMed(med.id);
    const taken = log?.taken || false;
    return (
      <div data-testid={`row-med-${med.id}`} className={`flex items-start gap-3 py-3 border-b border-border last:border-0 transition-opacity ${!med.active ? "opacity-40" : ""}`}>
        <button
          onClick={() => toggleLog.mutate({ medId: med.id, taken: !taken })}
          data-testid={`button-toggle-med-${med.id}`}
          className="mt-0.5 shrink-0"
        >
          {taken ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${taken ? "line-through text-muted-foreground" : ""}`}>{med.name}</p>
            {med.dose && <span className="text-xs text-muted-foreground font-mono">{med.dose}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{med.purpose}</p>
          <div className="flex items-center gap-3 mt-1">
            {med.timing && (
              <span className={`text-xs flex items-center gap-1 ${timingColors[med.timing] || "text-muted-foreground"}`}>
                <Clock size={10} />{med.timing}
              </span>
            )}
            {log?.takenAt && taken && (
              <span className="text-xs text-green-600 dark:text-green-400">✓ {log.takenAt}</span>
            )}
          </div>
        </div>
        <button onClick={() => deleteMed.mutate(med.id)} data-testid={`button-delete-med-${med.id}`} className="text-muted-foreground/30 hover:text-red-400 shrink-0">
          <Trash2 size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Meds & Supplements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Daily checklist & protocol tracker</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5" data-testid="button-add-med">
          <Plus size={14} /> Add
        </Button>
      </div>

      {/* Today progress */}
      <Card className="bg-card border-card-border">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Today's compliance</p>
            <span className="text-sm font-semibold tabular-nums">{takenCount}/{meds.length}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${meds.length > 0 ? (takenCount / meds.length) * 100 : 0}%` }} />
          </div>
          {takenCount === meds.length && meds.length > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1"><CheckCircle2 size={11} /> All doses completed for today</p>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Pill size={14} className="text-red-400" /> Prescription Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-5">
          {sortedMeds(medications).map(med => <MedRow key={med.id} med={med} />)}
          {medications.length === 0 && <p className="text-xs text-muted-foreground py-2">No medications added</p>}
        </CardContent>
      </Card>

      {/* Supplements */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Leaf size={14} className="text-green-500" /> Supplements
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-5">
          {sortedMeds(supplements).map(med => <MedRow key={med.id} med={med} />)}
          {supplements.length === 0 && <p className="text-xs text-muted-foreground py-2">No supplements added</p>}
        </CardContent>
      </Card>

      {/* Cardiac interaction note */}
      <Card className="bg-card border-card-border border-yellow-500/20">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium mb-1.5">Cardiac Protocol Reminders</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>· Metoprolol: Take at the same time daily — do not skip. Do not stop abruptly.</li>
                <li>· Aspirin 81mg: Take with food to reduce GI irritation.</li>
                <li>· CoQ10: Particularly important if on statin therapy (mitochondrial support).</li>
                <li>· Creatine: Safe with cardiac meds — ensure adequate hydration during workouts.</li>
                <li>· Fish Oil: Check with cardiologist if on blood thinners — can increase bleeding risk.</li>
                <li>· All supplements: Review with Dr. Martinez at next cardiology visit.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Med / Supplement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => addMed.mutate(d))} className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input {...register("name", { required: true })} className="mt-1" data-testid="input-med-name" /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select onValueChange={v => setValue("type", v)} defaultValue="supplement">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="supplement">Supplement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Dose</Label><Input {...register("dose")} placeholder="e.g. 25mg" className="mt-1" /></div>
              <div><Label className="text-xs">Frequency</Label><Input {...register("frequency")} placeholder="Daily" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Timing</Label><Input {...register("timing")} placeholder="Morning" className="mt-1" /></div>
            <div><Label className="text-xs">Purpose</Label><Input {...register("purpose")} placeholder="Why you take it" className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={addMed.isPending} data-testid="button-submit-med">Add</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
