import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useGetApplication, useUpdateApplication, getGetApplicationQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { AskClaude } from "@/components/ask-claude";
import { ArrowLeft, FileText, Save, Sparkles, Loader2, RefreshCw, Wand2, Minimize2, AlignLeft, ZoomIn, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { AiThinkingOverlay } from "@/components/ai-thinking-overlay";
import { safeSuccess, safeDing } from "@/lib/sounds";
import confetti from "canvas-confetti";

const REWRITE_OPTIONS = [
  { id: "more compelling", label: "More Compelling", icon: Megaphone },
  { id: "more concise", label: "More Concise", icon: Minimize2 },
  { id: "more specific", label: "More Specific", icon: ZoomIn },
  { id: "more formal", label: "More Formal", icon: AlignLeft },
  { id: "stronger opening", label: "Stronger Opening", icon: Sparkles },
];

interface SelectionPopup {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
}

export default function ApplicationWorkspace() {
  const [, params] = useRoute("/applications/:id");
  const appId = parseInt(params?.id || "0", 10);
  const { toast } = useToast();

  const [draftText, setDraftText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [status, setStatus] = useState<string>("draft");
  const [popup, setPopup] = useState<SelectionPopup>({
    visible: false, x: 0, y: 0, selectedText: "", selectionStart: 0, selectionEnd: 0,
  });

  const initializedForId = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);

  const { data: app, isLoading } = useGetApplication(appId, {
    query: { enabled: !!appId, queryKey: getGetApplicationQueryKey(appId) },
  });

  const updateApp = useUpdateApplication();

  useEffect(() => {
    if (app && initializedForId.current !== appId) {
      initializedForId.current = appId;
      setDraftText(app.draftText || "");
      setStatus(app.status);
    }
  }, [app, appId]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popup.visible) {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-rewrite-popup]")) {
          setPopup((p) => ({ ...p, visible: false }));
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popup.visible]);

  const handleTextSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end).trim();

    if (selected.length < 10) {
      setPopup((p) => ({ ...p, visible: false }));
      return;
    }

    const rect = textarea.getBoundingClientRect();
    const panelRect = editorPanelRef.current?.getBoundingClientRect();
    if (!panelRect) return;

    const lines = textarea.value.substring(0, start).split("\n");
    const lineHeight = 24;
    const approxTop = rect.top - panelRect.top + lines.length * lineHeight - textarea.scrollTop;

    setPopup({
      visible: true,
      x: rect.left - panelRect.left + 24,
      y: Math.max(8, approxTop - 52),
      selectedText: selected,
      selectionStart: start,
      selectionEnd: end,
    });
  }, []);

  const handleRewrite = async (instruction: string) => {
    if (!popup.selectedText || isRewriting) return;

    setIsRewriting(true);
    setPopup((p) => ({ ...p, visible: false }));

    const beforeSelection = draftText.substring(0, popup.selectionStart);
    const afterSelection = draftText.substring(popup.selectionEnd);

    setDraftText(beforeSelection + "▌" + afterSelection);

    try {
      const response = await fetch(`/api/applications/${appId}/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText: popup.selectedText, instruction }),
      });

      if (!response.ok) throw new Error("Rewrite failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let rewritten = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                rewritten += data.content;
                setDraftText(beforeSelection + rewritten + "▌" + afterSelection);
              }
              if (data.done) {
                setDraftText(beforeSelection + rewritten + afterSelection);
                setIsRewriting(false);
                safeDing();
                toast({ title: "Rewrite complete", description: `Passage rewritten to be "${instruction}".` });
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch {
      setDraftText(beforeSelection + popup.selectedText + afterSelection);
      setIsRewriting(false);
      toast({ variant: "destructive", title: "Rewrite failed", description: "Could not rewrite the selected text." });
    }
  };

  const handleSave = () => {
    updateApp.mutate(
      { id: appId, data: { draftText, status } },
      {
        onSuccess: () => {
          safeDing();
          toast({ title: "Draft saved", description: "Your application draft has been saved." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Save failed", description: "Could not save your draft right now." });
        },
      },
    );
  };

  const handleGenerate = async () => {
    if (!app) return;
    setIsGenerating(true);
    setDraftText("");

    try {
      const response = await fetch(`/api/applications/${appId}/generate`, { method: "POST" });
      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullText += data.content;
                setDraftText(fullText);
              }
              if (data.done) {
                setIsGenerating(false);

                // Confetti + sound on completion
                safeSuccess();
                confetti({
                  particleCount: 150,
                  spread: 90,
                  origin: { y: 0.55 },
                  colors: ["#3b82f6", "#10b981", "#6366f1", "#f59e0b", "#ec4899"],
                });
                setTimeout(() => {
                  confetti({
                    particleCount: 80,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.6 },
                    colors: ["#3b82f6", "#10b981"],
                  });
                  confetti({
                    particleCount: 80,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.6 },
                    colors: ["#6366f1", "#f59e0b"],
                  });
                }, 300);

                toast({ title: "🎉 Draft complete!", description: "AI has finished writing your application." });
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setIsGenerating(false);
      toast({ variant: "destructive", title: "Error", description: "Generation failed. Please try again." });
    }
  };

  if (isLoading || !app) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-8rem)] gap-4">
          <Skeleton className="w-1/3 h-full" />
          <Skeleton className="w-2/3 h-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* AI Thinking fullscreen overlay */}
      <AiThinkingOverlay visible={isGenerating && !draftText} phase="writing" />

      <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <Link href="/applications">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-none">{app.grant.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Application Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isRewriting && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Rewriting…</span>
              </div>
            )}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleSave}
              disabled={updateApp.isPending || isGenerating}
              variant="outline"
              className="border-white/10 bg-white/5"
              data-testid="button-save"
            >
              {updateApp.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Draft
            </Button>
          </div>
        </div>

        {/* Split Layout */}
        <div className="flex flex-1 flex-col gap-6 md:flex-row overflow-hidden">
          {/* Left Panel: Grant Info */}
          <div className="flex w-full flex-col overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-5 md:w-1/3">
            <Badge variant="secondary" className="mb-4 w-fit bg-primary/20 text-primary">Grant Details</Badge>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Funder</p>
                <p className="mt-1 font-medium text-foreground">{app.grant.funder}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount</p>
                <p className="mt-1 font-medium text-foreground">
                  {app.grant.amount ? `$${app.grant.amount.toLocaleString()}` : "Variable"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Focus Area</p>
                <p className="mt-1 font-medium text-foreground">{app.grant.focusArea}</p>
              </div>
              <div className="rounded-lg bg-black/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{app.grant.description}</p>
              </div>
              <div className="rounded-lg bg-black/20 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Eligibility</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{app.grant.eligibility}</p>
              </div>

              {/* Rewrite hint */}
              {draftText && !isGenerating && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Wand2 className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">AI Rewrite</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select any text in the editor, then choose how to improve it with AI.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Editor */}
          <div ref={editorPanelRef} className="relative flex w-full flex-col rounded-xl border border-white/10 bg-card md:w-2/3 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Draft Content
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isRewriting}
                size="sm"
                className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30"
                data-testid="button-generate-draft"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : draftText ? (
                  <RefreshCw className="mr-2 h-4 w-4" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {draftText ? "Regenerate" : "Generate Draft"}
              </Button>
            </div>

            <div className="relative flex-1 overflow-hidden">
              {/* Streaming indicator when text is flowing in */}
              {isGenerating && draftText && (
                <div className="absolute right-4 top-3 z-10 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="h-1.5 w-1.5 rounded-full bg-primary inline-block"
                  />
                  Writing…
                </div>
              )}

              {/* Rewrite selection popup */}
              <AnimatePresence>
                {popup.visible && (
                  <motion.div
                    data-rewrite-popup
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute z-20 flex items-center gap-1 rounded-lg border border-white/20 bg-[#1a1f2e] p-1 shadow-xl"
                    style={{ left: popup.x, top: popup.y }}
                  >
                    <span className="px-2 text-xs text-muted-foreground font-medium">Rewrite:</span>
                    {REWRITE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleRewrite(opt.id)}
                        disabled={isRewriting}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/20 hover:text-primary disabled:opacity-50"
                        title={opt.label}
                      >
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <Textarea
                ref={textareaRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onMouseUp={handleTextSelect}
                onKeyUp={handleTextSelect}
                placeholder="Click 'Generate Draft' to have AI write your application based on your organization profile and grant requirements. Then select any text to rewrite it with AI."
                className="h-full w-full resize-none border-none bg-transparent p-6 font-mono text-sm leading-7 focus-visible:ring-0"
                data-testid="textarea-draft"
              />
            </div>
          </div>
        </div>
      </div>
      <AskClaude />
    </AppLayout>
  );
}
