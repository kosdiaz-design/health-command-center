import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { VoiceNote } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Trash2, Tag, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sections = ["general", "dashboard", "workout", "meals", "recovery", "health", "meds"];
const sectionColors: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  workout: "bg-primary/10 text-primary",
  meals: "bg-green-500/10 text-green-600 dark:text-green-400",
  recovery: "bg-orange-500/10 text-orange-500",
  health: "bg-red-500/10 text-red-500",
  meds: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  dashboard: "bg-blue-500/10 text-blue-500",
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceNotes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [section, setSection] = useState("general");
  const [filter, setFilter] = useState("all");
  const recognitionRef = useRef<any>(null);
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: notes = [] } = useQuery<VoiceNote[]>({
    queryKey: ["/api/voice-notes"],
    queryFn: () => apiRequest("GET", "/api/voice-notes"),
  });

  const saveNote = useMutation({
    mutationFn: (text: string) => {
      const now = new Date();
      return apiRequest("POST", "/api/voice-notes", {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        section,
        transcript: text,
        tags: null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/voice-notes"] }); setTranscript(""); toast({ title: "Note saved" }); },
  });

  const deleteNote = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/voice-notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/voice-notes"] }),
  });

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice input not supported", description: "Use Chrome or Edge for voice transcription. Type your note below.", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e: any) => {
      let fullTranscript = "";
      for (let i = 0; i < e.results.length; i++) {
        fullTranscript += e.results[i][0].transcript;
      }
      setTranscript(fullTranscript);
    };
    recognition.onerror = () => {
      setIsRecording(false);
      toast({ title: "Mic error", description: "Check browser permissions for microphone access.", variant: "destructive" });
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  useEffect(() => () => { if (recognitionRef.current) recognitionRef.current.stop(); }, []);

  const filtered = filter === "all" ? notes : notes.filter(n => n.section === filter);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Voice Notes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Tap the mic, speak, and your note is saved</p>
      </div>

      {/* Recorder */}
      <Card className="bg-card border-card-border">
        <CardContent className="pt-5 pb-5 px-5">
          <div className="flex items-center gap-3 mb-4">
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="w-40" data-testid="select-note-section"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sections.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Tag this note to a section</span>
          </div>

          {/* Mic button */}
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={toggleRecording}
              data-testid="button-record"
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-red-500 shadow-lg shadow-red-500/30 scale-110"
                  : "bg-primary hover:bg-primary/90 shadow-md"
              }`}
            >
              {isRecording
                ? <MicOff size={24} className="text-white" />
                : <Mic size={24} className="text-white" />
              }
            </button>
            <p className="text-sm text-muted-foreground">
              {isRecording ? (
                <span className="text-red-500 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                  Recording — tap to stop
                </span>
              ) : "Tap mic to start recording"}
            </p>
          </div>

          {/* Transcript / text area */}
          <Textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Your transcribed note will appear here — or type directly..."
            className="min-h-24 text-sm resize-none"
            data-testid="input-transcript"
          />

          <div className="flex gap-2 mt-3">
            <Button
              className="flex-1"
              onClick={() => transcript.trim() && saveNote.mutate(transcript.trim())}
              disabled={!transcript.trim() || saveNote.isPending}
              data-testid="button-save-note"
            >
              <FileText size={14} className="mr-1.5" />
              Save Note
            </Button>
            <Button variant="outline" onClick={() => setTranscript("")} disabled={!transcript} data-testid="button-clear-note">
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Browser support notice */}
      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        Voice transcription works in Chrome and Edge. On iPhone, tap the mic icon on your keyboard — the transcript pastes into the text field automatically. In Safari, use the text field to type directly.
      </div>

      {/* Filter + Notes list */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag size={12} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-2">Filter by section:</span>
          <div className="flex gap-1.5 flex-wrap">
            {["all", ...sections].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                data-testid={`filter-${s}`}
                className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${
                  filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filtered.map(note => (
          <Card key={note.id} data-testid={`card-note-${note.id}`} className="bg-card border-card-border">
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs border-0 capitalize ${sectionColors[note.section] || "bg-muted text-muted-foreground"}`}>
                    {note.section}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />{note.date} · {note.time}
                  </span>
                </div>
                <button
                  onClick={() => deleteNote.mutate(note.id)}
                  data-testid={`button-delete-note-${note.id}`}
                  className="text-muted-foreground/30 hover:text-red-400 shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-sm leading-relaxed">{note.transcript}</p>
              {note.tags && (
                <p className="text-xs text-muted-foreground mt-2">{note.tags.split(",").map(t => `#${t.trim()}`).join(" ")}</p>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No notes yet. Tap the mic above or type a note.
          </div>
        )}
      </div>
    </div>
  );
}
