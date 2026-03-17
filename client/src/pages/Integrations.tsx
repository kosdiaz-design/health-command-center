import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, XCircle, RefreshCw, Unplug, Upload,
  Wifi, WifiOff, FileUp, Info, AlertTriangle, ChevronDown, ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────
interface IntegrationStatus {
  oura: { connected: boolean; connectedAt?: string };
  withings: { connected: boolean; connectedAt?: string };
  appleHealth: { connected: boolean; note: string };
}

// ── Connection card ────────────────────────────────────────────────────────
function IntegrationCard({
  title,
  subtitle,
  logo,
  connected,
  connectedAt,
  dataPoints,
  onConnect,
  onSync,
  onDisconnect,
  syncLabel,
  disabled,
}: {
  title: string;
  subtitle: string;
  logo: string;
  connected: boolean;
  connectedAt?: string;
  dataPoints: string[];
  onConnect?: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  syncLabel: string;
  disabled?: boolean;
}) {
  const [syncing, setSyncing] = useState(false);
  const [showData, setShowData] = useState(false);

  const handleSync = async () => {
    if (!onSync) return;
    setSyncing(true);
    await onSync();
    setSyncing(false);
  };

  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-muted/40 border border-card-border">
            {logo}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm">{title}</span>
              <Badge
                className={`text-xs px-1.5 py-0 border-0 ${connected
                  ? "bg-green-500/15 text-green-500"
                  : "bg-muted text-muted-foreground"}`}
              >
                {connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>

            {connectedAt && (
              <p className="text-xs text-muted-foreground mb-3">
                Connected {new Date(connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}

            {/* Data points toggle */}
            <button
              onClick={() => setShowData(v => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mb-3"
            >
              {showData ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              What data syncs
            </button>

            {showData && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {dataPoints.map(dp => (
                  <span key={dp} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{dp}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {!connected ? (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onConnect}
                  disabled={disabled}
                  data-testid={`btn-connect-${title.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Wifi size={12} className="mr-1.5" />
                  {disabled ? "Requires API key" : "Connect"}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleSync}
                    disabled={syncing}
                    data-testid={`btn-sync-${title.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <RefreshCw size={12} className={`mr-1.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing…" : syncLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={onDisconnect}
                    data-testid={`btn-disconnect-${title.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Unplug size={12} className="mr-1.5" />
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Status icon */}
          <div className="flex-shrink-0 mt-0.5">
            {connected
              ? <CheckCircle2 size={18} className="text-green-500" />
              : <WifiOff size={18} className="text-muted-foreground" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Quest PDF uploader ──────────────────────────────────────────────────────
function QuestPDFCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<{ count: number; date: string; reportDate: string } | null>(null);
  const [showData, setShowData] = useState(false);
  const labTypes = ["Glucose","Total Cholesterol","LDL","HDL","Triglycerides","HbA1c","Creatinine","eGFR","TSH","Testosterone","hsCRP","Vitamin D","BNP","Ferritin","Sodium","Potassium"];

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "PDF only", description: "Please upload a .pdf from MyQuest.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const response = await fetch("/api/integrations/quest/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setLastImport({ count: data.imported, date: new Date().toLocaleTimeString(), reportDate: data.reportDate });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });
      toast({ title: "Import complete", description: data.message });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-muted/40 border border-card-border">🧪</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm">Quest Diagnostics</span>
              <Badge className="text-xs px-1.5 py-0 border-0 bg-muted text-muted-foreground">PDF Upload</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Download your lab results PDF from <strong>MyQuest</strong>, then upload here. Values auto-populate your Health Records with reference ranges.</p>
            <button onClick={() => setShowData(v => !v)} className="flex items-center gap-1 text-xs text-primary hover:underline mb-3">
              {showData ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} What data imports
            </button>
            {showData && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {labTypes.map(l => <span key={l} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{l}</span>)}
              </div>
            )}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer mb-3 ${dragOver ? "border-primary bg-primary/5" : "border-card-border hover:border-primary/50"}`}
              onClick={() => document.getElementById("quest-pdf-file")?.click()}
              data-testid="dropzone-quest-pdf"
            >
              <input id="quest-pdf-file" type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {importing ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><RefreshCw size={14} className="animate-spin"/> Parsing PDF…</div>
              ) : (
                <div className="flex flex-col items-center gap-1"><FileUp size={20} className="text-muted-foreground"/><span className="text-xs text-muted-foreground">Drag & drop Quest PDF, or click to browse</span></div>
              )}
            </div>
            {lastImport && (
              <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Imported {lastImport.count} lab values from {lastImport.reportDate} at {lastImport.date}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Withings CSV uploader (manual export) ────────────────────────────────
function WithingsCSVCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragOverWeight, setDragOverWeight] = useState(false);
  const [dragOverBP, setDragOverBP] = useState(false);
  const [importingWeight, setImportingWeight] = useState(false);
  const [importingBP, setImportingBP] = useState(false);
  const [lastWeight, setLastWeight] = useState<{ rows: number; date: string } | null>(null);
  const [lastBP, setLastBP] = useState<{ rows: number; date: string } | null>(null);

  const parseAndUpload = async (file: File, fileType: "weight" | "blood_pressure") => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "CSV only", description: "Please upload a .csv file from Withings export.", variant: "destructive" });
      return;
    }
    if (fileType === "weight") setImportingWeight(true); else setImportingBP(true);
    try {
      const text = await file.text();
      const lines = text.trim().split("\n").filter(l => l.trim());
      if (lines.length < 2) throw new Error("CSV appears empty");
      // Handle quoted headers
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map(line => {
        // Handle quoted values with commas inside
        const vals: string[] = [];
        let cur = ""; let inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
          else { cur += ch; }
        }
        vals.push(cur.trim());
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
      });
      const res = await apiRequest("POST", "/api/integrations/withings/upload-csv", { rows, fileType });
      if (fileType === "weight") setLastWeight({ rows: res.synced, date: new Date().toLocaleTimeString() });
      else setLastBP({ rows: res.synced, date: new Date().toLocaleTimeString() });
      queryClient.invalidateQueries({ queryKey: ["/api/health-stats"] });
      toast({ title: "Import complete", description: res.message });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      if (fileType === "weight") setImportingWeight(false); else setImportingBP(false);
    }
  };

  const DropZone = ({ type, dragOver, setDragOver, importing, last, label, inputId }: {
    type: "weight" | "blood_pressure"; dragOver: boolean; setDragOver: (v: boolean) => void;
    importing: boolean; last: { rows: number; date: string } | null; label: string; inputId: string;
  }) => (
    <div className="mb-2">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseAndUpload(f, type); }}
        onClick={() => document.getElementById(inputId)?.click()}
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-card-border hover:border-primary/50"
        }`}
        data-testid={`dropzone-withings-${type}`}
      >
        <input id={inputId} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) parseAndUpload(f, type); }} />
        {importing ? (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <RefreshCw size={12} className="animate-spin" /> Importing…
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <FileUp size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Drag & drop or click to upload</span>
          </div>
        )}
      </div>
      {last && (
        <p className="text-xs text-green-500 flex items-center gap-1 mt-1.5">
          <CheckCircle2 size={11} /> {last.rows} days imported at {last.date}
        </p>
      )}
    </div>
  );

  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-muted/40 border border-card-border">
            ⚖️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm">Withings</span>
              <Badge className="text-xs px-1.5 py-0 border-0 bg-muted text-muted-foreground">CSV Upload</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              In the Withings app: <strong>Profile → Settings → Export All Health Data</strong>. You’ll get an email with a CSV. Upload the <strong>weight.csv</strong> and <strong>blood_pressure.csv</strong> files below.
            </p>
            <DropZone
              type="weight" dragOver={dragOverWeight} setDragOver={setDragOverWeight}
              importing={importingWeight} last={lastWeight}
              label="Weight + Body Fat CSV (weight.csv)"
              inputId="withings-weight-file"
            />
            <DropZone
              type="blood_pressure" dragOver={dragOverBP} setDragOver={setDragOverBP}
              importing={importingBP} last={lastBP}
              label="Blood Pressure CSV (blood_pressure.csv)"
              inputId="withings-bp-file"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Apple Health CSV uploader ───────────────────────────────────────────────
// Maps Health Auto Export per-metric filenames to wide-format column names
const HAE_FILENAME_MAP: Record<string, string> = {
  'step_count':                    'Step Count (count)',
  'steps':                         'Step Count (count)',
  'resting_heart_rate':            'Resting Heart Rate (count/min)',
  'heart_rate_variability':        'Heart Rate Variability (ms)',
  'hrv':                           'Heart Rate Variability (ms)',
  'vo2max':                        'VO2 Max (mL/min·kg)',
  'vo2_max':                       'VO2 Max (mL/min·kg)',
  'weight_body_mass':              'Body Mass (lb)',
  'body_mass':                     'Body Mass (lb)',
  'weight':                        'Body Mass (lb)',
  'body_fat_percentage':           'Body Fat Percentage (%)',
  'body_fat':                      'Body Fat Percentage (%)',
  'blood_pressure_systolic':       'Blood Pressure Systolic (mmHg)',
  'blood_pressure_diastolic':      'Blood Pressure Diastolic (mmHg)',
  'sleep_analysis':                'Sleep Duration (hr)',
  'blood_oxygen_saturation':       'Oxygen Saturation (%)',
  'oxygen_saturation':             'Oxygen Saturation (%)',
  'active_energy':                 'Active Energy Burned (kcal)',
  'active_energy_burned':          'Active Energy Burned (kcal)',
  'dietary_protein':               'Dietary Protein (g)',
  'protein':                       'Dietary Protein (g)',
  'dietary_water':                 'Dietary Water (mL)',
  'water':                         'Dietary Water (mL)',
  'apple_exercise_time':           'Exercise Time (min)',
  'exercise_time':                 'Exercise Time (min)',
  'apple_stand_time':              'Exercise Time (min)',
};

function detectMetricFromFilename(filename: string): string | null {
  // Strip path, extension, and trailing timestamps like _20260209_210736
  const base = filename.toLowerCase()
    .replace(/\.csv$/i, '')
    .replace(/_?\d{8}[_\-]?\d{0,6}$/, '')  // strip trailing date/time stamp
    .replace(/-/g, '_')
    .trim();
  // Direct match
  if (HAE_FILENAME_MAP[base]) return HAE_FILENAME_MAP[base];
  // Prefix/substring match
  for (const [key, col] of Object.entries(HAE_FILENAME_MAP)) {
    if (base.includes(key) || key.includes(base)) return col;
  }
  return null;
}

function AppleHealthCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [lastImport, setLastImport] = useState<{
    rows: number; labs: number; cleared: boolean; date: string;
    cols: string[]; matchedCols: string[]; isLongFormat: boolean;
    totalRows: number; filesProcessed: number; skippedFiles: string[];
  } | null>(null);
  const [showData, setShowData] = useState(false);

  const dataPoints = ["Weight", "Resting HR", "HRV", "Steps", "VO2 Max", "Body Fat", "Blood Pressure", "Sleep", "Blood Oxygen", "Calories", "Protein", "Water"];

  // Robust CSV parser — handles quoted fields, BOM, various line endings
  const parseCSV = (text: string): Array<Record<string, string>> => {
    // Strip BOM if present
    const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const lines = clean.split("\n");
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const fields: string[] = [];
      let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQ = !inQ; }
        } else if (ch === ',' && !inQ) {
          fields.push(cur.trim()); cur = "";
        } else { cur += ch; }
      }
      fields.push(cur.trim());
      return fields;
    };

    const headers = parseLine(lines[0]);
    return lines.slice(1)
      .filter(l => l.trim())
      .map(line => {
        const vals = parseLine(line);
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
      });
  };

  // Merge multiple per-metric CSVs into a single wide-format date-keyed map
  const mergePerMetricFiles = async (files: File[]): Promise<{ merged: Array<Record<string,string>>; filesProcessed: number; skippedFiles: string[] }> => {
    const dateMap = new Map<string, Record<string, string>>();
    let filesProcessed = 0;
    const skippedFiles: string[] = [];

    for (const file of files) {
      const colName = detectMetricFromFilename(file.name);
      if (!colName) {
        skippedFiles.push(file.name);
        continue;
      }
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { skippedFiles.push(file.name); continue; }

      // Health Auto Export per-metric CSV: columns are Date + qty (+ units)
      // Date may be "2026-02-09 00:00:00 -0500" or "2026-02-09"
      for (const row of rows) {
        const rawDate = row['Date'] || row['date'] || row['startDate'] || row['Start Date'] || '';
        if (!rawDate) continue;
        const isoDate = rawDate.split('T')[0].split(' ')[0].trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) continue;

        const val = row['qty'] || row['Qty'] || row['value'] || row['Value'] || '';
        if (!val) continue;

        if (!dateMap.has(isoDate)) dateMap.set(isoDate, { Date: isoDate });
        const entry = dateMap.get(isoDate)!;

        // For steps, accumulate across multiple readings per day
        if (colName === 'Step Count (count)') {
          entry[colName] = String((parseFloat(entry[colName] || '0') + parseFloat(val)));
        } else {
          // For weight — convert kg → lbs if units say kg
          const units = (row['units'] || row['Units'] || '').toLowerCase();
          if (colName === 'Body Mass (lb)' && (units === 'kg' || units === 'kilograms')) {
            entry[colName] = String(parseFloat(val) * 2.20462);
          } else {
            entry[colName] = val;
          }
        }
      }
      filesProcessed++;
    }

    return { merged: Array.from(dateMap.values()), filesProcessed, skippedFiles };
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (fileArr.length === 0) {
      toast({ title: "No CSV files", description: "Please select .csv files from Health Auto Export.", variant: "destructive" });
      return;
    }
    setImporting(true);
    setImportStatus(`Reading ${fileArr.length} file${fileArr.length > 1 ? 's' : ''}…`);
    try {
      let rows: Array<Record<string,string>>;
      let filesProcessed = fileArr.length;
      let skippedFiles: string[] = [];

      if (fileArr.length === 1) {
        // Single file — try direct CSV parse first (Health Export CSV / combined export)
        const text = await fileArr[0].text();
        const direct = parseCSV(text.replace(/^\uFEFF/, ''));
        if (direct.length > 0) {
          rows = direct;
        } else {
          // Fall back to per-metric merge with single file
          const result = await mergePerMetricFiles(fileArr);
          rows = result.merged;
          filesProcessed = result.filesProcessed;
          skippedFiles = result.skippedFiles;
        }
      } else {
        // Multiple files — treat as per-metric collection
        setImportStatus(`Merging ${fileArr.length} metric files by date…`);
        const result = await mergePerMetricFiles(fileArr);
        rows = result.merged;
        filesProcessed = result.filesProcessed;
        skippedFiles = result.skippedFiles;
      }

      if (rows.length === 0) {
        toast({ title: "Nothing to import", description: `Processed ${filesProcessed} files but found no date-matched data. Check file names match Health Auto Export metrics.`, variant: "destructive" });
        setLastImport({ rows: 0, labs: 0, cleared: false, date: new Date().toLocaleTimeString(), cols: [], matchedCols: [], isLongFormat: false, totalRows: 0, filesProcessed, skippedFiles });
        return;
      }

      // Preview
      setImportStatus(`Uploading ${rows.length} days of data…`);
      const preview = await apiRequest("POST", "/api/integrations/apple-health/preview", { rows: rows.slice(0, 50) });

      // Upload in chunks
      const CHUNK = 500;
      let totalSynced = 0; let totalLabs = 0; let clearedSeed = false;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const res = await apiRequest("POST", "/api/integrations/apple-health/upload", { rows: chunk });
        totalSynced += res.synced || 0;
        totalLabs += res.labsSynced || 0;
        if (res.clearedSeed) clearedSeed = true;
      }

      setLastImport({
        rows: totalSynced, labs: totalLabs, cleared: clearedSeed,
        date: new Date().toLocaleTimeString(),
        cols: preview.columns || [],
        matchedCols: preview.matchedColumns || [],
        isLongFormat: preview.isLongFormat || false,
        totalRows: rows.length,
        filesProcessed, skippedFiles,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/health-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-results"] });

      if (totalSynced === 0) {
        toast({ title: "0 days matched", description: `Merged ${rows.length} date rows but no metrics matched. Check column panel below.`, variant: "destructive" });
      } else {
        toast({ title: "Import complete", description: `${totalSynced} days imported from ${filesProcessed} file${filesProcessed > 1 ? 's' : ''}${totalLabs > 0 ? ` + ${totalLabs} lab values` : ''}` });
      }
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      setImportStatus('');
    }
  };

  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-muted/40 border border-card-border">
            🍎
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-sm">Apple Health</span>
              <Badge className="text-xs px-1.5 py-0 border-0 bg-muted text-muted-foreground">CSV Upload</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              Supports <strong>Health Auto Export</strong> — select all your metric CSV files at once and drop them here. Also works with a single combined CSV from <strong>Health Export CSV</strong> by Lybik.
            </p>
            <p className="text-xs text-primary/80 mb-3 font-medium">💡 Select multiple files at once — hold Cmd (Mac) or Ctrl (Windows) to pick all metric files together.</p>

            <button
              onClick={() => setShowData(v => !v)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mb-3"
            >
              {showData ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              What data syncs
            </button>

            {showData && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {dataPoints.map(dp => (
                  <span key={dp} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{dp}</span>
                ))}
              </div>
            )}

            {/* Drop zone — accepts multiple files */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer mb-3 ${dragOver ? "border-primary bg-primary/5" : "border-card-border hover:border-primary/50"}`}
              onClick={() => document.getElementById("apple-health-file")?.click()}
              data-testid="dropzone-apple-health"
            >
              <input
                id="apple-health-file"
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
              />
              {importing ? (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw size={14} className="animate-spin" /> {importStatus || 'Importing…'}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <FileUp size={20} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Drag & drop CSV files (one or many), or click to browse</span>
                </div>
              )}
            </div>

            {lastImport && (
              <div className="space-y-2 mt-2">
                {lastImport.rows > 0 ? (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    {lastImport.rows} days imported from {lastImport.filesProcessed} file{lastImport.filesProcessed !== 1 ? 's' : ''}{lastImport.labs > 0 ? ` + ${lastImport.labs} lab values` : ''}{lastImport.cleared ? ' (sample data cleared)' : ''} at {lastImport.date}
                  </p>
                ) : (
                  <p className="text-xs text-yellow-500 font-medium flex items-center gap-1"><AlertTriangle size={12}/> 0 days matched — {lastImport.filesProcessed} file{lastImport.filesProcessed !== 1 ? 's' : ''} processed</p>
                )}
                {lastImport.skippedFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">Skipped (unrecognized): {lastImport.skippedFiles.join(', ')}</p>
                )}
                {lastImport.totalRows > 0 && (
                  <details className="text-xs" open={lastImport.rows === 0}>
                    <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                      {lastImport.isLongFormat ? 'Long-format' : 'Wide-format'} · {lastImport.totalRows} date rows · {lastImport.cols.length} columns · {lastImport.matchedCols.length} recognized
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lastImport.cols.map(col => {
                        const isMatched = lastImport.matchedCols.includes(col);
                        return (
                          <span key={col} className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            isMatched
                              ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20'
                              : 'bg-muted text-muted-foreground'
                          }`}>{col}</span>
                        );
                      })}
                    </div>
                    <p className="text-muted-foreground mt-2">Green = matched · Grey = ignored</p>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Setup guide card ────────────────────────────────────────────────────────
function SetupGuideCard({ title, steps, note }: { title: string; steps: string[]; note?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="bg-card border-card-border">
      <button
        className="w-full text-left p-4 flex items-center justify-between"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Info size={15} className="text-primary flex-shrink-0" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <CardContent className="pt-0 px-4 pb-4">
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-[10px]">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          {note && (
            <div className="mt-3 flex gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle size={13} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-600 dark:text-yellow-400">{note}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Integrations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    queryFn: () => apiRequest("GET", "/api/integrations/status"),
    refetchInterval: 10000,
  });

  const syncMutation = useMutation({
    mutationFn: (source: "oura" | "withings") =>
      apiRequest("POST", `/api/integrations/${source}/sync`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-stats"] });
      toast({ title: "Sync complete", description: data.message });
    },
    onError: (e: any) => {
      // If token expired, refresh status so UI shows disconnected + reconnect button
      if (e.message?.includes('expired') || e.message?.includes('401') || e.message?.includes('reconnect')) {
        queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
        toast({ title: "Session expired", description: "Please reconnect to resume syncing.", variant: "destructive" });
      } else {
        toast({ title: "Sync failed", description: e.message, variant: "destructive" });
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (source: "oura" | "withings") =>
      apiRequest("DELETE", `/api/integrations/${source}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Disconnected" });
    },
  });

  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });

  const openOAuthPopup = (url: string, source: "oura" | "withings") => {
    const popup = window.open(url, "_blank", "width=600,height=700");
    const afterConnect = () => {
      refreshStatus();
      // Auto-sync immediately after connecting
      setTimeout(() => {
        syncMutation.mutate(source);
        queryClient.invalidateQueries({ queryKey: ["/api/health-stats"] });
      }, 1500);
    };
    // Listen for postMessage from the callback page
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "oauth-success") {
        afterConnect();
        window.removeEventListener("message", onMsg);
      }
    };
    window.addEventListener("message", onMsg);
    // Fallback: poll until popup closes
    const poll = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", onMsg);
        afterConnect();
      }
    }, 500);
  };

  const connectOura = async () => {
    try {
      const { url } = await apiRequest("GET", "/api/integrations/oura/auth");
      openOAuthPopup(url, "oura");
    } catch {
      toast({ title: "Cannot connect", description: "Oura API keys not configured. See setup guide below.", variant: "destructive" });
    }
  };

  const connectWithings = async () => {
    try {
      const { url } = await apiRequest("GET", "/api/integrations/withings/auth");
      openOAuthPopup(url, "withings");
    } catch {
      toast({ title: "Cannot connect", description: "Withings API keys not configured. See setup guide below.", variant: "destructive" });
    }
  };

  const connectedCount = [status?.oura.connected, status?.withings.connected].filter(Boolean).length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold mb-1">Data Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect your devices to auto-sync real health data into your dashboard.
        </p>
      </div>

      {/* Status bar */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${connectedCount > 0 ? "bg-green-500" : "bg-muted"}`} />
            <div>
              <p className="text-sm font-medium">
                {connectedCount > 0 ? `${connectedCount} source${connectedCount > 1 ? "s" : ""} connected` : "No sources connected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {connectedCount > 0
                  ? "Dashboard KPIs will update automatically on next sync"
                  : "Connect Oura or Withings to start seeing live data"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live API Sync</h2>

        <IntegrationCard
          title="Oura Ring"
          subtitle="Syncs readiness, sleep score, HRV, resting HR, steps, and activity."
          logo="💍"
          connected={status?.oura.connected ?? false}
          connectedAt={status?.oura.connectedAt}
          dataPoints={["Readiness score", "Sleep score", "HRV", "Resting HR", "Steps", "Activity", "VO2 Max"]}
          onConnect={connectOura}
          onSync={() => syncMutation.mutateAsync("oura")}
          onDisconnect={() => disconnectMutation.mutate("oura")}
          syncLabel="Sync last 30 days"
        />

        <IntegrationCard
          title="Withings"
          subtitle="Syncs body weight, blood pressure, and heart rate from your Withings scale and BPM."
          logo="⚖️"
          connected={status?.withings.connected ?? false}
          connectedAt={status?.withings.connectedAt}
          dataPoints={["Body weight (lbs)", "Blood pressure (systolic/diastolic)", "Heart rate"]}
          onConnect={connectWithings}
          onSync={() => syncMutation.mutateAsync("withings")}
          onDisconnect={() => disconnectMutation.mutate("withings")}
          syncLabel="Sync last 30 days"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manual Upload</h2>
        <WithingsCSVCard />
        <QuestPDFCard />
        <AppleHealthCard />
      </div>

      <Separator />

      {/* Setup guides */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Setup Guides</h2>

        <SetupGuideCard
          title="How to connect Oura Ring"
          steps={[
            "Go to cloud.ouraring.com → Developer → Applications",
            "Create a new application — set Redirect URI to this dashboard's URL + /api/integrations/oura/callback",
            "Copy your Client ID and Client Secret",
            "Set OURA_CLIENT_ID and OURA_CLIENT_SECRET as environment variables on your server",
            "Restart the server, then click Connect above",
            "Oura will ask you to authorize — approve, and the window will close automatically",
            "Click 'Sync last 30 days' to pull your data",
          ]}
          note="Personal access tokens were deprecated by Oura in December 2025. OAuth2 is now required."
        />

        <SetupGuideCard
          title="How to connect Withings"
          steps={[
            "Go to developer.withings.com → Create account → New Application",
            "Under Callback URL, enter this dashboard's URL + /api/integrations/withings/callback",
            "Set scopes: user.metrics and user.activity",
            "Copy your Client ID and Client Secret",
            "Set WITHINGS_CLIENT_ID and WITHINGS_CLIENT_SECRET as environment variables on your server",
            "Restart the server, then click Connect above",
            "Authorize in the Withings window — it will close automatically",
            "Click 'Sync last 30 days' to pull weight and blood pressure data",
          ]}
        />

        <SetupGuideCard
          title="How to export Apple Health data (Health Auto Export)"
          steps={[
            "Download 'Health Auto Export - JSON+CSV' from the App Store (free, by Lybron Sobers — search 'Health Auto Export')",
            "Open the app and tap 'Quick Export' (the lightning bolt icon)",
            "Tap 'Add Metrics' and select all the metrics you want: Steps, Resting Heart Rate, Heart Rate Variability, VO2 Max, Weight Body Mass, Body Fat Percentage, Blood Pressure Systolic, Blood Pressure Diastolic, Active Energy, Sleep Analysis, Blood Oxygen Saturation",
            "Set Aggregation to 'Day' (very important — do not leave it at 'None')",
            "Set your date range (last 90 days is a good start)",
            "Tap Export → choose CSV format → share/save the file",
            "Upload the CSV file here using the Apple Health upload area above",
          ]}
          note="Make sure Aggregation is set to 'Day' — otherwise you get thousands of raw readings per metric and the file will be too large."
        />

        <SetupGuideCard
          title="How to export Apple Health data (Health Export CSV — alternative)"
          steps={[
            "Download 'Health Export CSV' from the App Store (free, by Lybik)",
            "Open the app → tap 'New Export'",
            "Select ALL metrics you want: Body Mass, Resting Heart Rate, Heart Rate Variability, Step Count, VO2 Max, Body Fat Percentage, Blood Pressure Systolic/Diastolic, Sleep Analysis, Oxygen Saturation, Active Energy, Dietary Protein, Dietary Water, Apple Exercise Time",
            "Set your date range (last 30–90 days recommended)",
            "Set Aggregation to 'Day'",
            "Tap Export → Wide format → save the CSV",
            "Upload the CSV here",
          ]}
          note="When using Health Export CSV, make sure to select ALL metrics in a single export — not just one. The dashboard needs a combined file with all columns."
        />
      </div>
    </div>
  );
}
