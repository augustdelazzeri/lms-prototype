"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SynthesisType, OutputFormat, ChatMessage } from "@/types";
import type { LibraryItem, SkillV2 } from "@/types";
import {
  getSynthesisReadyLibraryItems,
  getActiveSkillsV2,
  getUsers,
  createCourse,
  getCurrentUser,
  getOrganization,
  getAvailableCourseLanguages,
  subscribe,
} from "@/lib/store";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import { generateObjectivesForTopic, detectCategory } from "@/lib/mockAIAgent";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Library,
  Search,
  Check,
  FileText,
  Loader2,
  Globe,
  CheckCircle2,
  Info,
  Upload,
  LayoutGrid,
} from "lucide-react";

const GENERIC_STREAM_TEXT = `## What LOTO Is and When It Applies

**Lockout/Tagout (LOTO)** is the set of practices used to **control hazardous energy** so equipment cannot start or release energy while someone is working on it.

### What "hazardous energy" means (in plain terms)
- Electrical energy from power sources
- Mechanical energy stored in springs or moving parts
- Hydraulic / pneumatic pressure
- Thermal energy (heat or cold)
- Gravity (suspended loads)

### When LOTO applies (typical triggers)
- Servicing or maintenance where unexpected startup could injure someone
- Clearing jams inside equipment
- Adjusting or replacing machine parts
- Any task where body parts enter a danger zone

### Key terms you will hear
1. **Stop** — bring the equipment to a safe stop
2. **Isolate** — disconnect energy sources
3. **Verify** — try-start and test for stored energy

Image placeholder — Simple diagram showing: machine -> energy sources -> isolation points with lockouts/tags -> verification ("try start" and test for stored energy)
`;

type GenPhase = "grounding" | "outline" | "chapter" | "finalize" | "ready";

export default function GenerateCoursePage() {
  const router = useRouter();

  const [buildMode, setBuildMode] = useState<"ai" | "manual">("ai");
  const [topic, setTopic] = useState("Lockout/Tagout Safety Procedures");
  const [synthesisType, setSynthesisType] = useState<SynthesisType>("micro-lesson");
  const [targetRole, setTargetRole] = useState("");
  const [targetSkillId, setTargetSkillId] = useState("");
  const [audienceLevel, setAudienceLevel] = useState<"new-hire" | "experienced" | "recertification" | "">("new-hire");
  const [outputFormat] = useState<OutputFormat>("mixed");

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en", "es"]);
  const [orgSettings, setOrgSettings] = useState<any>({ secondaryLanguages: ["es"], autoGenerate: true });

  const [estimatedDuration, setEstimatedDuration] = useState<number | "">("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [quizPlacement, setQuizPlacement] = useState<"per-lesson" | "end-of-course" | "both">("both");
  const [sourceSearch, setSourceSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  const [sources, setSources] = useState<LibraryItem[]>([]);
  const [skills, setSkills] = useState<SkillV2[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);

  const [genPhase, setGenPhase] = useState<GenPhase>("grounding");
  const [streamedText, setStreamedText] = useState("");
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [lessonsDone, setLessonsDone] = useState(0);
  const streamRef = useRef<HTMLDivElement>(null);

  const SUPPORTED_LANGUAGES: Record<string, string> = {
    en: "English",
    es: "Spanish (Español)",
    fr: "French (Français)",
    de: "German (Deutsch)",
    pt: "Portuguese (Português)",
    zh: "Mandarin (中文)",
    ja: "Japanese (日本語)",
  };

  const CHAPTER_LESSONS = [
    "What LOTO Is and When It Applies",
    "Hazardous Energy Sources and Roles on the Floor",
    "Core LOTO Steps and Safety-First Escalation",
  ];

  useEffect(() => {
    const refresh = () => {
      setSources(getSynthesisReadyLibraryItems());
      setSkills(getActiveSkillsV2());
      const allUsers = getUsers();
      const titles = Array.from(
        new Set(allUsers.map((u) => u.jobTitleText).filter(Boolean) as string[])
      ).sort();
      setJobTitles(titles);

      const org = getOrganization();
      const languages = getAvailableCourseLanguages();
      const secondary = languages.filter((c) => c !== "en");
      setOrgSettings({
        ...(org.settings || {}),
        secondaryLanguages: secondary.length > 0 ? secondary : ["es"],
        autoGenerate: true,
      });
      if (secondary.length > 0) {
        setSelectedLanguages((prev) => Array.from(new Set([...prev, ...secondary])));
      }
    };
    refresh();
    return subscribe(refresh);
  }, []);

  const toggleLanguage = (code: string) => {
    if (code === "en") return;
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return sources;
    const q = sourceSearch.toLowerCase();
    return sources.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q)
    );
  }, [sources, sourceSearch]);

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const canProceed = topic.trim().length > 0 && audienceLevel !== "";
  // Allow submit even without sources (production allows skip / upload)
  const canSubmit = canProceed;

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamedText]);

  const doCreateCourse = (): string | null => {
    try {
      const currentUser = getCurrentUser();
      const selectedSources = sources.filter((s) => selectedSourceIds.includes(s.id));
      const selectedSourceTitles = selectedSources.map((s) => s.title);
      const targetSkill = skills.find((s) => s.id === targetSkillId);

      const setupMessage: ChatMessage = {
        id: `msg_setup_${Date.now()}`,
        role: "system",
        content: [
          `Setup context:`,
          `Topic: ${topic.trim()}`,
          `Course Type: ${synthesisType}`,
          `Languages: ${selectedLanguages.join(", ")}`,
          targetRole ? `Target Job Title: ${targetRole}` : null,
          targetSkill ? `Target Skill: ${targetSkill.name}` : null,
          audienceLevel ? `Audience Level: ${audienceLevel}` : null,
          `Library Sources: ${selectedSourceTitles.join(", ") || "None"}`,
          `Quiz Placement: ${quizPlacement}`,
          additionalContext.trim() ? `Additional Context: ${additionalContext.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        timestamp: new Date().toISOString(),
      };

      const autoObjectives = generateObjectivesForTopic(topic.trim());
      const autoCategory = detectCategory(topic.trim());
      const autoDescription = `A ${synthesisType === "micro-lesson" ? "micro-lesson" : "comprehensive training course"} covering ${topic.trim().toLowerCase()}. Generated in ${selectedLanguages.length} languages.`;

      const newCourse = createCourse({
        title: topic.trim(),
        description: autoDescription,
        status: "ai-draft",
        category: autoCategory,
        tags: [],
        lessonIds: [],
        ownerUserId: currentUser?.id,
        aiGenerated: true,
        synthesisType,
        sourceIds: selectedSourceIds,
        sourceAttributions: selectedSourceTitles,
        conversationHistory: [setupMessage],
        suggestedSkillIds: targetSkillId ? [targetSkillId] : [],
        metadata: {
          objectives: autoObjectives,
          difficulty:
            audienceLevel === "new-hire"
              ? "beginner"
              : audienceLevel === "recertification"
              ? "intermediate"
              : undefined,
          languages: selectedLanguages,
          estimatedMinutes: estimatedDuration === "" ? undefined : Number(estimatedDuration),
        },
      });

      return newCourse.id;
    } catch {
      alert("Failed to create course. Please try again.");
      setIsSubmitting(false);
      return null;
    }
  };

  const handleStartBuilding = () => {
    if (!canSubmit || isSubmitting) return;
    if (buildMode === "manual") {
      router.push("/admin/courses");
      return;
    }

    setIsSubmitting(true);
    setGenPhase("grounding");
    setStreamedText("");
    setLessonsDone(0);
    setCreatedCourseId(null);

    const courseId = doCreateCourse();
    if (!courseId) return;
    setCreatedCourseId(courseId);

    // Simulate generation phases
    setTimeout(() => setGenPhase("outline"), 1200);
    setTimeout(() => {
      setGenPhase("chapter");
      // Stream text character by character
      let i = 0;
      const interval = setInterval(() => {
        i += 8;
        setStreamedText(GENERIC_STREAM_TEXT.slice(0, i));
        if (i >= Math.floor(GENERIC_STREAM_TEXT.length * 0.35)) setLessonsDone(1);
        if (i >= Math.floor(GENERIC_STREAM_TEXT.length * 0.7)) setLessonsDone(2);
        if (i >= GENERIC_STREAM_TEXT.length) {
          clearInterval(interval);
          setLessonsDone(3);
          setTimeout(() => setGenPhase("finalize"), 600);
          setTimeout(() => setGenPhase("ready"), 1400);
        }
      }, 40);
    }, 2400);
  };

  const handleOpenEditor = () => {
    if (createdCourseId) {
      router.push(`/admin/courses/${createdCourseId}/edit`);
    }
  };

  const handleContinueWorking = () => {
    router.push("/admin/courses?toast=generating");
  };

  const phaseComplete = (p: GenPhase) => {
    const order: GenPhase[] = ["grounding", "outline", "chapter", "finalize", "ready"];
    return order.indexOf(genPhase) > order.indexOf(p);
  };

  const phaseActive = (p: GenPhase) => genPhase === p;

  // ─── GENERATING SCREEN ───
  if (isSubmitting) {
    const chaptersComplete = genPhase === "ready" ? 1 : 0;
    return (
      <RouteGuard allowedRoles={["ADMIN"]}>
        <AdminLayout>
          <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-6 px-6">
            <button
              onClick={() => router.push("/admin/courses")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-gray-900 truncate">{topic.trim() || "Course"}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  We&apos;ll notify you when it&apos;s ready. You can leave this page and come back anytime — generation
                  continues in the background.
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>
                      {chaptersComplete} of 1 chapters complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-700"
                      style={{
                        width:
                          genPhase === "ready"
                            ? "100%"
                            : genPhase === "finalize"
                            ? "90%"
                            : genPhase === "chapter"
                            ? `${30 + lessonsDone * 20}%`
                            : genPhase === "outline"
                            ? "20%"
                            : "8%",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
              {/* Progress column */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Progress</h2>
                <div className="space-y-1">
                  {/* Grounding */}
                  <div className="flex items-start justify-between py-2 px-2 rounded-md">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Grounding</div>
                      <div className="text-xs text-gray-500">
                        {selectedSourceIds.length === 0 ? (
                          <>
                            No library sources <span className="text-gray-400">Skipped</span>
                          </>
                        ) : (
                          `${selectedSourceIds.length} source${selectedSourceIds.length > 1 ? "s" : ""} selected`
                        )}
                      </div>
                    </div>
                    {(phaseComplete("grounding") || phaseActive("grounding") || true) && genPhase !== "grounding" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : phaseActive("grounding") ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />
                    )}
                  </div>

                  {/* Outline */}
                  <div
                    className={`flex items-start justify-between py-2 px-2 rounded-md ${
                      phaseActive("outline") ? "bg-blue-50 border-l-2 border-blue-500" : ""
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">Outline</div>
                      {(phaseComplete("outline") || phaseActive("chapter") || phaseActive("finalize") || phaseActive("ready")) && (
                        <div className="text-xs text-gray-500">1 chapter planned</div>
                      )}
                    </div>
                    {phaseComplete("outline") || ["chapter", "finalize", "ready"].includes(genPhase) ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : phaseActive("outline") ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />
                    )}
                  </div>

                  {/* Chapter 1 */}
                  {(["chapter", "finalize", "ready"].includes(genPhase) || phaseComplete("outline")) && (
                    <div
                      className={`py-2 px-2 rounded-md ${
                        phaseActive("chapter") ? "bg-blue-50 border-l-2 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Chapter 1</div>
                          <div className="text-sm font-medium text-gray-900">
                            LOTO Essentials: Preventing Unexpected Startup and Energy Release
                          </div>
                        </div>
                        {phaseActive("chapter") ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-1" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <ul className="mt-2 space-y-1.5 ml-1">
                        {CHAPTER_LESSONS.map((lesson, idx) => (
                          <li key={lesson} className="flex items-center gap-2 text-xs text-gray-600">
                            {lessonsDone > idx || genPhase === "ready" || genPhase === "finalize" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-blue-400 flex-shrink-0" />
                            )}
                            {lesson}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Finalize */}
                  <div className="flex items-start justify-between py-2 px-2 rounded-md">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Finalize</div>
                      {genPhase === "ready" && <div className="text-xs text-gray-500">Course ready</div>}
                    </div>
                    {genPhase === "ready" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : phaseActive("finalize") ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* Streaming / Ready column */}
              <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg flex flex-col min-h-[420px]">
                {genPhase === "ready" ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Course ready</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Your AI-generated course has finished. Open it in the editor to review the content.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {genPhase === "grounding" || genPhase === "outline"
                          ? "Waiting for the next section to start streaming..."
                          : "Streaming · LOTO Essentials: Preventing Unexpected Startup and Energy Release"}
                      </span>
                    </div>
                    <div ref={streamRef} className="flex-1 overflow-y-auto p-5 prose prose-sm max-w-none">
                      {streamedText ? (
                        <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">
                          {streamedText}
                          <span className="inline-block w-0.5 h-4 bg-blue-600 ml-0.5 animate-pulse align-middle" />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center mt-16">
                          Waiting for the next section to start streaming...
                        </p>
                      )}
                    </div>
                  </>
                )}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={handleContinueWorking}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Continue Working
                  </button>
                  <div className="flex items-center gap-3">
                    <button className="text-sm text-gray-400 hover:text-gray-600" type="button">
                      View Detail
                    </button>
                    <button
                      onClick={handleOpenEditor}
                      disabled={genPhase !== "ready"}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Open in Editor
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  // ─── WIZARD FORM ───
  return (
    <RouteGuard allowedRoles={["ADMIN"]}>
      <AdminLayout>
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
          <div className="max-w-3xl mx-auto px-6">
            <button
              onClick={() => router.push("/admin/courses")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Course</h1>
            <p className="text-sm text-gray-500 mb-6">Choose how you want to start building your course.</p>

            {/* Build mode cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setBuildMode("ai")}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  buildMode === "ai"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className={`w-5 h-5 ${buildMode === "ai" ? "text-blue-600" : "text-gray-400"}`} />
                  <span className="font-semibold text-gray-900">Build with AI</span>
                </div>
                <p className="text-xs text-gray-500">Use the guided wizard to generate a course draft.</p>
              </button>
              <button
                type="button"
                onClick={() => setBuildMode("manual")}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  buildMode === "manual"
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className={`w-5 h-5 ${buildMode === "manual" ? "text-blue-600" : "text-gray-400"}`} />
                  <span className="font-semibold text-gray-900">Build manually</span>
                </div>
                <p className="text-xs text-gray-500">Start from your own files or blank lessons.</p>
              </button>
            </div>

            {buildMode === "ai" && (
              <>
                {/* Stepper */}
                <div className="flex items-center gap-3 mb-6">
                  {[
                    { step: 1 as const, label: "What are you building?" },
                    { step: 2 as const, label: "Who's it for?" },
                  ].map((s, i) => (
                    <div key={s.step} className="flex items-center gap-3">
                      {i > 0 && (
                        <div
                          className={`w-16 h-0.5 ${wizardStep >= s.step ? "bg-blue-500" : "bg-gray-200"}`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (s.step === 1 || canProceed) setWizardStep(s.step);
                        }}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            wizardStep > s.step
                              ? "bg-blue-600 text-white"
                              : wizardStep === s.step
                              ? "bg-blue-600 text-white"
                              : "bg-white border-2 border-gray-300 text-gray-400"
                          }`}
                        >
                          {wizardStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            wizardStep === s.step ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {s.label}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* STEP 1 */}
                  {wizardStep === 1 && (
                    <div className="p-6 space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Course Topic <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="e.g. Lockout/Tagout Safety Procedures"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                          The main subject area for the generated course.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Course Type</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              value: "micro-lesson" as SynthesisType,
                              label: "Micro-Lesson",
                              desc: "5-15 min focused lesson",
                            },
                            {
                              value: "full-course" as SynthesisType,
                              label: "Full Course",
                              desc: "30-60 min multi-lesson training",
                            },
                            {
                              value: "onboarding-path" as SynthesisType,
                              label: "Onboarding Path",
                              desc: "Multi-session learning path",
                            },
                          ].map((opt) => (
                            <label
                              key={opt.value}
                              className={`flex flex-col p-3 rounded-lg cursor-pointer border-2 transition-all ${
                                synthesisType === opt.value
                                  ? "border-blue-500 bg-blue-50/40"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="synthesisType"
                                value={opt.value}
                                checked={synthesisType === opt.value}
                                onChange={() => setSynthesisType(opt.value)}
                                className="sr-only"
                              />
                              <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                              <span className="text-xs text-gray-500 mt-0.5">{opt.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Audience Level <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { value: "new-hire", label: "New Hire", desc: "No prior knowledge assumed" },
                            {
                              value: "experienced",
                              label: "Experienced",
                              desc: "Familiar with basics, deeper focus",
                            },
                            {
                              value: "recertification",
                              label: "Recertification",
                              desc: "Refresher for expired or expiring skills",
                            },
                          ].map((opt) => (
                            <label
                              key={opt.value}
                              className={`flex flex-col p-3 rounded-lg cursor-pointer border-2 transition-all ${
                                audienceLevel === opt.value
                                  ? "border-blue-500 bg-blue-50/40"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="audienceLevel"
                                value={opt.value}
                                checked={audienceLevel === opt.value}
                                onChange={() => setAudienceLevel(opt.value as any)}
                                className="sr-only"
                              />
                              <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                              <span className="text-xs text-gray-500 mt-0.5">{opt.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Language</label>
                          <input
                            type="text"
                            value="English"
                            readOnly
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-700"
                          />
                          <p className="text-xs text-gray-400 mt-1.5">
                            Determined by your Learning Model settings.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Estimated Duration (optional)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={estimatedDuration}
                              onChange={(e) =>
                                setEstimatedDuration(e.target.value === "" ? "" : Number(e.target.value))
                              }
                              placeholder="e.g. 45"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-500 whitespace-nowrap">minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {wizardStep === 2 && (
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Target Job Titles
                          </label>
                          <select
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            <option value="">Select...</option>
                            {jobTitles.map((title) => (
                              <option key={title} value={title}>
                                {title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Target Skills
                          </label>
                          <select
                            value={targetSkillId}
                            onChange={(e) => setTargetSkillId(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            <option value="">Select...</option>
                            {skills.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Library className="w-4 h-4 text-blue-600" />
                            Library Sources
                          </label>
                          <span className="text-xs text-gray-400">{sources.length} available</span>
                        </div>
                        <div className="relative mb-2">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                          <input
                            type="text"
                            value={sourceSearch}
                            onChange={(e) => setSourceSearch(e.target.value)}
                            placeholder="Search sources..."
                            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                          {filteredSources.length === 0 ? (
                            <p className="text-xs text-gray-400 p-3">No sources found</p>
                          ) : (
                            filteredSources.map((source) => (
                              <label
                                key={source.id}
                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-gray-50 last:border-0 ${
                                  selectedSourceIds.includes(source.id) ? "bg-blue-50" : "hover:bg-gray-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedSourceIds.includes(source.id)}
                                  onChange={() => toggleSource(source.id)}
                                  className="accent-blue-600"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm text-gray-800 truncate">{source.title}</div>
                                  <span className="text-[10px] text-gray-400 font-medium">Manual</span>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      {/* File upload mock */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Drop files here or click to upload</p>
                        <p className="text-xs text-gray-400 mt-1">
                          .jpg, .png, .pdf, .docx, .mp3, and more — Max 100.0 MB per file · Up to 5 files
                        </p>
                      </div>

                      {/* Quiz Placement */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quiz Placement</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              value: "per-lesson" as const,
                              label: "After Each Chapter",
                              desc: "One quiz at the end of each chapter",
                            },
                            {
                              value: "end-of-course" as const,
                              label: "End of Course",
                              desc: "Single final assessment",
                            },
                            {
                              value: "both" as const,
                              label: "Both",
                              desc: "Lesson quizzes + final exam",
                            },
                          ].map((opt) => (
                            <label
                              key={opt.value}
                              className={`flex flex-col p-3 rounded-lg cursor-pointer border-2 transition-all ${
                                quizPlacement === opt.value
                                  ? "border-blue-500 bg-blue-50/40"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="quizPlacement"
                                value={opt.value}
                                checked={quizPlacement === opt.value}
                                onChange={() => setQuizPlacement(opt.value)}
                                className="sr-only"
                              />
                              <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                              <span className="text-xs text-gray-500 mt-0.5">{opt.desc}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Choose where quizzes appear. You can adjust per-lesson quizzes in the editor.
                        </p>
                      </div>

                      {/* Multi-Language */}
                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Globe className="size-4 text-blue-600" />
                            Target Languages
                          </label>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100">
                            AI Translation
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-bold flex items-center gap-2">
                            <CheckCircle2 className="size-3.5" />
                            {SUPPORTED_LANGUAGES.en} (Primary)
                          </div>
                          {(orgSettings.secondaryLanguages || ["es"]).map((code: string) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => toggleLanguage(code)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                                selectedLanguages.includes(code)
                                  ? "bg-blue-50 border-blue-200 text-blue-700"
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {selectedLanguages.includes(code) ? (
                                <CheckCircle2 className="size-3.5" />
                              ) : (
                                <div className="size-3.5 rounded-full border border-gray-300" />
                              )}
                              {SUPPORTED_LANGUAGES[code] || code}
                            </button>
                          ))}
                          {(!orgSettings.secondaryLanguages || orgSettings.secondaryLanguages.length === 0) && (
                            <Link
                              href="/admin/settings/customization"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Info className="size-3" />
                              Configure secondary languages in settings
                            </Link>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 italic">
                          Each selected language will have a corresponding version of the course generated.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Additional Context (Optional)
                        </label>
                        <textarea
                          value={additionalContext}
                          onChange={(e) => setAdditionalContext(e.target.value)}
                          placeholder="e.g. Focus on annual recertification requirements and hands-on verification procedures."
                          rows={3}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                    <button
                      onClick={() => router.push("/admin/courses")}
                      className="text-sm font-medium text-gray-500 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    {wizardStep === 1 ? (
                      <button
                        onClick={() => setWizardStep(2)}
                        disabled={!canProceed}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setWizardStep(1)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                        >
                          <ChevronLeft className="size-4" />
                          Back
                        </button>
                        <button
                          onClick={handleStartBuilding}
                          disabled={!canSubmit || isSubmitting}
                          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <LayoutGrid className="size-4" />
                          Start Building
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {buildMode === "manual" && (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Build manually</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Create a blank course and add lessons yourself.
                </p>
                <button
                  onClick={() => {
                    const currentUser = getCurrentUser();
                    const newCourse = createCourse({
                      title: "Untitled Course",
                      description: "",
                      status: "draft",
                      category: "",
                      tags: [],
                      lessonIds: [],
                      ownerUserId: currentUser?.id,
                      aiGenerated: false,
                    });
                    router.push(`/admin/courses/${newCourse.id}/edit`);
                  }}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  Create Blank Course
                </button>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
