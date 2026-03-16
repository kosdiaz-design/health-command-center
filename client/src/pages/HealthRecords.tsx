import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { LabResult, DoctorVisit, CardiacEvent, HealthStats } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Activity, Heart, Stethoscope, FlaskConical, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function FlagBadge({ flag }: { flag: string | null | undefined }) {
  if (!flag || flag === "normal") return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-xs">Normal</Badge>;
  if (flag === "high") return <Badge className="bg-red-500/10 text-red-500 border-0 text-xs">High</Badge>;
  if (flag === "low") return <Badge className="bg-blue-500/10 text-blue-500 border-0 text-xs">Low</Badge>;
  return <Badge className="bg-yellow-500/10 text-yellow-600 border-0 text-xs">{flag}</Badge>;
}

function SeverityDot({ sev }: { sev: string | null | undefined }) {
  if (sev === 'severe') return <div className="w-2 h-2 rounded-full bg-red-500" />;
  if (sev === 'moderate') return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
  return <div className="w-2 h-2 rounded-full bg-blue-400" />;
}

export default function HealthRecords() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAddLab, setShowAddLab] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showAddCardiac, setShowAddCardiac] = useState(false);
  const [showAddStats, setShowAddStats] = useState(false);
  const { register: regLab, handleSubmit: subLab, reset: resetLab, setValue: setLabVal } = useForm<any>();
  const { register: regVisit, handleSubmit: subVisit, reset: resetVisit } = useForm<any>();
  const { register: regCardiac, handleSubmit: subCardiac, reset: resetCardiac, setValue: setCardiacVal } = useForm<any>();
  const { register: regStats, handleSubmit: subStats, reset: resetStats } = useForm<any>();

  const { data: labs = [] } = useQuery<LabResult[]>({ queryKey: ["/api/lab-results"], queryFn: () => apiRequest("GET", "/api/lab-results") });
  const { data: visits = [] } = useQuery<DoctorVisit[]>({ queryKey: ["/api/doctor-visits"], queryFn: () => apiRequest("GET", "/api/doctor-visits") });
  const { data: cardiac = [] } = useQuery<CardiacEvent[]>({ queryKey: ["/api/cardiac-events"], queryFn: () => apiRequest("GET", "/api/cardiac-events") });
  const { data: stats = [] } = useQuery<HealthStats[]>({ queryKey: ["/api/health-stats"], queryFn: () => apiRequest("GET", "/api/health-stats") });

  const addLab = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/lab-results", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/lab-results"] }); setShowAddLab(false); resetLab(); toast({ title: "Lab result added" }); } });
  const deleteLab = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/lab-results/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/lab-results"] }) });
  const addVisit = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/doctor-visits", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/doctor-visits"] }); setShowAddVisit(false); resetVisit(); toast({ title: "Visit added" }); } });
  const deleteVisit = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/doctor-visits/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/doctor-visits"] }) });
  const addCardiac = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/cardiac-events", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/cardiac-events"] }); setShowAddCardiac(false); resetCardiac(); toast({ title: "Event logged" }); } });
  const addStats = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/health-stats", d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/health-stats"] }); setShowAddStats(false); resetStats(); toast({ title: "Stats updated" }); } });

  const abnormalLabs = labs.filter(l => l.flag !== 'normal');
  const nextVisit = visits.find(v => v.nextVisitDate && v.nextVisitDate > new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Health Records</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Labs, doctor visits, cardiac events & weekly stats</p>
      </div>

      {/* Quick alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {abnormalLabs.length > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/8 border border-yellow-500/20">
            <AlertTriangle size={13} className="text-yellow-500 mt-0.5" />
            <p className="text-xs"><span className="font-medium">{abnormalLabs.length} lab flag{abnormalLabs.length > 1 ? "s" : ""}</span> — {abnormalLabs.map(l => l.testName).join(", ")}</p>
          </div>
        )}
        {nextVisit && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/8 border border-primary/20">
            <Stethoscope size={13} className="text-primary mt-0.5" />
            <p className="text-xs"><span className="font-medium">Next visit:</span> {nextVisit.doctor} · {nextVisit.nextVisitDate}</p>
          </div>
        )}
      </div>

      <Tabs defaultValue="labs">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="labs" className="text-xs gap-1.5"><FlaskConical size={11} />Labs</TabsTrigger>
          <TabsTrigger value="visits" className="text-xs gap-1.5"><Stethoscope size={11} />Visits</TabsTrigger>
          <TabsTrigger value="cardiac" className="text-xs gap-1.5"><Heart size={11} />Cardiac</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs gap-1.5"><TrendingUp size={11} />Weekly Stats</TabsTrigger>
        </TabsList>

        {/* Labs */}
        <TabsContent value="labs" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Update every 90 days · Last draw: {labs[0]?.date || "—"}</p>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddLab(true)} data-testid="button-add-lab"><Plus size={12} />Add Result</Button>
          </div>
          <Card className="bg-card border-card-border">
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Test</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Value</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Range</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">Status</th>
                  <th className="p-3" />
                </tr></thead>
                <tbody>
                  {labs.map(l => (
                    <tr key={l.id} data-testid={`row-lab-${l.id}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{l.testName}</td>
                      <td className="p-3 text-right tabular-nums font-medium">{l.value} {l.unit}</td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">{l.refLow}–{l.refHigh}</td>
                      <td className="p-3 text-center"><FlagBadge flag={l.flag} /></td>
                      <td className="p-3 text-right"><button onClick={() => deleteLab.mutate(l.id)} className="text-muted-foreground/30 hover:text-red-400"><Trash2 size={11} /></button></td>
                    </tr>
                  ))}
                  {labs.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">No lab results yet</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctor Visits */}
        <TabsContent value="visits" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddVisit(true)} data-testid="button-add-visit"><Plus size={12} />Add Visit</Button>
          </div>
          {visits.map(v => (
            <Card key={v.id} data-testid={`card-visit-${v.id}`} className="bg-card border-card-border">
              <CardContent className="pt-4 pb-4 px-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{v.doctor}</p>
                    <p className="text-xs text-muted-foreground">{v.specialty} · {v.date}</p>
                  </div>
                  <button onClick={() => deleteVisit.mutate(v.id)} className="text-muted-foreground/30 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
                {v.reason && <p className="text-xs font-medium mb-1">{v.reason}</p>}
                {v.findings && <p className="text-xs text-muted-foreground mb-2">{v.findings}</p>}
                {v.followUp && (
                  <div className="p-2.5 rounded-md bg-primary/8 border border-primary/20 mt-2">
                    <p className="text-xs font-medium text-primary mb-0.5">Follow-up</p>
                    <p className="text-xs">{v.followUp}</p>
                    {v.nextVisitDate && <p className="text-xs text-muted-foreground mt-1">Next appointment: {v.nextVisitDate}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {visits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No visits recorded yet</p>}
        </TabsContent>

        {/* Cardiac */}
        <TabsContent value="cardiac" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{cardiac.length} events logged · Monitored for Dr. Martinez</p>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddCardiac(true)} data-testid="button-add-cardiac"><Plus size={12} />Log Event</Button>
          </div>
          {cardiac.map(e => (
            <Card key={e.id} data-testid={`card-cardiac-${e.id}`} className={`bg-card border-card-border ${e.severity === 'severe' ? "border-red-400/30" : ""}`}>
              <CardContent className="pt-4 pb-4 px-5">
                <div className="flex items-start gap-3">
                  <SeverityDot sev={e.severity} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium capitalize">{e.eventType}</p>
                      <Badge className="text-xs border-0 bg-muted text-muted-foreground capitalize">{e.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{e.date}</span>
                    </div>
                    <p className="text-xs mt-1">{e.description}</p>
                    {(e.heartRate || e.systolic) && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {e.heartRate && <span>HR: <span className="font-medium text-foreground tabular-nums">{e.heartRate} bpm</span></span>}
                        {e.systolic && <span>BP: <span className="font-medium text-foreground tabular-nums">{e.systolic}/{e.diastolic}</span></span>}
                      </div>
                    )}
                    {e.notes && <p className="text-xs text-muted-foreground mt-1 italic">{e.notes}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {cardiac.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 text-green-500" size={20} />No cardiac events logged</div>}
        </TabsContent>

        {/* Weekly Stats */}
        <TabsContent value="stats" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddStats(true)} data-testid="button-add-stats"><Plus size={12} />Update Stats</Button>
          </div>
          <Card className="bg-card border-card-border">
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Weight</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">HRV</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Resting HR</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Sleep</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">BP</th>
                </tr></thead>
                <tbody>
                  {stats.slice(0, 12).map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{s.date}</td>
                      <td className="p-3 text-right tabular-nums">{s.weight} lbs</td>
                      <td className="p-3 text-right tabular-nums">{s.hrv} ms</td>
                      <td className="p-3 text-right tabular-nums">{s.restingHr} bpm</td>
                      <td className="p-3 text-right tabular-nums">{s.sleepScore}</td>
                      <td className="p-3 text-right tabular-nums">{s.systolic}/{s.diastolic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Lab Dialog */}
      <Dialog open={showAddLab} onOpenChange={setShowAddLab}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Lab Result</DialogTitle></DialogHeader>
          <form onSubmit={subLab(d => addLab.mutate(d))} className="space-y-3">
            <div><Label className="text-xs">Date</Label><Input {...regLab("date", { required: true })} type="date" className="mt-1" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div><Label className="text-xs">Test Name</Label><Input {...regLab("testName", { required: true })} placeholder="e.g. HbA1c" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Value</Label><Input {...regLab("value", { valueAsNumber: true })} type="number" step="0.1" className="mt-1" /></div>
              <div><Label className="text-xs">Unit</Label><Input {...regLab("unit")} placeholder="mg/dL" className="mt-1" /></div>
              <div><Label className="text-xs">Ref Low</Label><Input {...regLab("refLow", { valueAsNumber: true })} type="number" step="0.1" className="mt-1" /></div>
              <div><Label className="text-xs">Ref High</Label><Input {...regLab("refHigh", { valueAsNumber: true })} type="number" step="0.1" className="mt-1" /></div>
            </div>
            <div>
              <Label className="text-xs">Flag</Label>
              <Select onValueChange={v => setLabVal("flag", v)} defaultValue="normal">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["normal", "high", "low", "critical"].map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={addLab.isPending}>Add Result</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Visit Dialog */}
      <Dialog open={showAddVisit} onOpenChange={setShowAddVisit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Doctor Visit</DialogTitle></DialogHeader>
          <form onSubmit={subVisit(d => addVisit.mutate(d))} className="space-y-3">
            <div><Label className="text-xs">Date</Label><Input {...regVisit("date", { required: true })} type="date" className="mt-1" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Doctor</Label><Input {...regVisit("doctor", { required: true })} className="mt-1" /></div>
              <div><Label className="text-xs">Specialty</Label><Input {...regVisit("specialty")} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Reason</Label><Input {...regVisit("reason")} className="mt-1" /></div>
            <div><Label className="text-xs">Findings</Label><Textarea {...regVisit("findings")} className="mt-1 text-sm" rows={3} /></div>
            <div><Label className="text-xs">Follow-up Notes</Label><Textarea {...regVisit("followUp")} className="mt-1 text-sm" rows={2} /></div>
            <div><Label className="text-xs">Next Visit Date</Label><Input {...regVisit("nextVisitDate")} type="date" className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={addVisit.isPending}>Add Visit</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Cardiac Dialog */}
      <Dialog open={showAddCardiac} onOpenChange={setShowAddCardiac}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Cardiac Event</DialogTitle></DialogHeader>
          <form onSubmit={subCardiac(d => addCardiac.mutate(d))} className="space-y-3">
            <div><Label className="text-xs">Date</Label><Input {...regCardiac("date", { required: true })} type="date" className="mt-1" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select onValueChange={v => setCardiacVal("eventType", v)} defaultValue="symptom">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["symptom", "reading", "episode"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea {...regCardiac("description", { required: true })} className="mt-1 text-sm" rows={2} /></div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select onValueChange={v => setCardiacVal("severity", v)} defaultValue="mild">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["mild", "moderate", "severe"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">HR (bpm)</Label><Input {...regCardiac("heartRate", { valueAsNumber: true })} type="number" className="mt-1" /></div>
              <div><Label className="text-xs">Systolic</Label><Input {...regCardiac("systolic", { valueAsNumber: true })} type="number" className="mt-1" /></div>
              <div><Label className="text-xs">Diastolic</Label><Input {...regCardiac("diastolic", { valueAsNumber: true })} type="number" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea {...regCardiac("notes")} className="mt-1 text-sm" rows={2} /></div>
            <Button type="submit" className="w-full" disabled={addCardiac.isPending}>Log Event</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Stats Dialog */}
      <Dialog open={showAddStats} onOpenChange={setShowAddStats}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Weekly Stats</DialogTitle></DialogHeader>
          <form onSubmit={subStats(d => addStats.mutate(d))} className="space-y-3">
            <div><Label className="text-xs">Date</Label><Input {...regStats("date", { required: true })} type="date" className="mt-1" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Weight (lbs)</Label><Input {...regStats("weight", { valueAsNumber: true })} type="number" step="0.1" className="mt-1" /></div>
              <div><Label className="text-xs">Body Fat %</Label><Input {...regStats("bodyFat", { valueAsNumber: true })} type="number" step="0.1" className="mt-1" /></div>
              <div><Label className="text-xs">HRV (ms)</Label><Input {...regStats("hrv", { valueAsNumber: true })} type="number" className="mt-1" /></div>
              <div><Label className="text-xs">Resting HR</Label><Input {...regStats("restingHr", { valueAsNumber: true })} type="number" className="mt-1" /></div>
              <div><Label className="text-xs">Sleep Score</Label><Input {...regStats("sleepScore", { valueAsNumber: true })} type="number" className="mt-1" /></div>
              <div><Label className="text-xs">Readiness</Label><Input {...regStats("readinessScore", { valueAsNumber: true })} type="number" className="mt-1" /></div>
              <div><Label className="text-xs">Systolic</Label><Input {...regStats("systolic", { valueAsNumber: true })} type="number" className="mt-1" /></div>
              <div><Label className="text-xs">Diastolic</Label><Input {...regStats("diastolic", { valueAsNumber: true })} type="number" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Steps</Label><Input {...regStats("steps", { valueAsNumber: true })} type="number" className="mt-1" /></div>
            <Button type="submit" className="w-full" disabled={addStats.isPending}>Update Stats</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
