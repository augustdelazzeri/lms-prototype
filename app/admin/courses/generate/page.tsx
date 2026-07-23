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
  subscribe,
} from "@/lib/store";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import { generateObjectivesForTopic, detectCategory } from "@/lib/mockAIAgent";
import Link from "next/link";
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Library, 
  Search, 
  Check, 
  BookOpen, 
  Presentation, 
  Mic, 
  Loader2,
  Globe,
  CheckCircle2,
  Info
} from "lucide-react";

export default function GenerateCoursePage() {
  const router = useRouter();

  // Form state
  const [topic, setTopic] = useState("Lockout/Tagout Safety Procedures");
  const [synthesisType, setSynthesisType] = useState<SynthesisType>("full-course");
  const [targetRole, setTargetRole] = useState("Maintenance Technician");
  const [targetSkillId, setTargetSkillId] = useState("skl_loto");
  const [audienceLevel, setAudienceLevel] = useState<"new-hire" | "experienced" | "recertification" | "">("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mixed");
  
  // Multi-Language State (H1 Requirement)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en", "es"]);
  const [orgSettings, setOrgSettings] = useState<any>({ secondaryLanguages: ["es"], autoGenerate: true });
  
  const [estimatedDuration, setEstimatedDuration] = useState<number | "">("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(["lib_002", "lib_004"]);
  const [additionalContext, setAdditionalContext] = useState("Focus on annual recertification requirements and hands-on verification procedures.");
  const [quizPlacement, setQuizPlacement] = useState<"per-lesson" | "end-of-course" | "both">("both");
  const [sourceSearch, setSourceSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  const [showMoreTypes, setShowMoreTypes] = useState(false);

  // Data from store
  const [sources, setSources] = useState<LibraryItem[]>([]);
  const [skills, setSkills] = useState<SkillV2[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);

  const SUPPORTED_LANGUAGES: Record<string, string> = {
    en: "English",
    es: "Spanish (Español)",
    fr: "French (Français)",
    de: "German (Deutsch)",
    pt: "Portuguese (Português)",
    zh: "Mandarin (中文)",
    ja: "Japanese (日本語)"
  };

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
      setOrgSettings(org.settings || {});
      if ((org.settings as any)?.autoGenerate && (org.settings as any)?.secondaryLanguages?.length > 0) {
        setSelectedLanguages(prev => Array.from(new Set([...prev, ...(org.settings as any).secondaryLanguages])));
      }
    };
    refresh();
    return subscribe(refresh);
  }, []);

  const toggleLanguage = (code: string) => {
    if (code === "en") return;
    setSelectedLanguages(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
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
  const canSubmit = canProceed && selectedSourceIds.length > 0;

  // Loading screen state
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingDone, setLoadingDone] = useState(false);
  const hasRedirected = useRef(false);
  const [showNarrationScreen, setShowNarrationScreen] = useState(false);
  const [waitingHere, setWaitingHere] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  
  const loadingSteps = useMemo(() => {
    const steps = [
      "Analyzing your selected sources...",
      "Mapping organizational skill gaps...",
      "Generating base course structure...",
    ];
    
    if (selectedLanguages.length > 1) {
      steps.push(`Translating content into ${selectedLanguages.length - 1} additional languages...`);
      steps.push("Building localized lesson modules...");
    }
    
    steps.push("Creating assessments and quizzes...");
    steps.push("Finalizing course outline...");
    return steps;
  }, [selectedLanguages]);

  useEffect(() => {
    if (loadingDone && !hasRedirected.current) {
      hasRedirected.current = true;
      if (outputFormat === "reading") {
        doCreateAndRedirect();
      } else {
        const courseId = doCreateCourse();
        if (courseId) {
          setCreatedCourseId(courseId);
          setShowNarrationScreen(true);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDone]);

  const handleStartBuilding = () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setLoadingStep(0);
    setLoadingDone(false);
    setShowNarrationScreen(false);
    setWaitingHere(false);
    setCreatedCourseId(null);
    hasRedirected.current = false;

    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      if (step >= loadingSteps.length - 1) {
        clearInterval(stepInterval);
        setLoadingStep(loadingSteps.length - 1);
        setTimeout(() => setLoadingDone(true), 1200);
      } else {
        setLoadingStep(step);
      }
    }, 1000);
  };

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
          `Library Sources: ${selectedSourceTitles.join(", ")}`,
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
          difficulty: audienceLevel === "new-hire" ? "beginner" : audienceLevel === "recertification" ? "intermediate" : undefined,
          languages: selectedLanguages
        },
      });

      return newCourse.id;
    } catch {
      alert("Failed to create course. Please try again.");
      setIsSubmitting(false);
      return null;
    }
  };

  const doCreateAndRedirect = () => {
    const courseId = doCreateCourse();
    if (courseId) {
      router.push(`/admin/courses/${courseId}/edit`);
    }
  };

  const handleContinueWorking = () => {
    router.push("/admin/courses?toast=generating");
  };

  const handleWaitHere = () => {
    setWaitingHere(true);
    setTimeout(() => {
      if (createdCourseId) {
        router.push(`/admin/courses/${createdCourseId}/edit`);
      }
    }, 3000);
  };

  return (
    <RouteGuard allowedRoles={["ADMIN"]}>
      <AdminLayout>
        {/* ═══ LOADING SCREEN ═══ */}
        {isSubmitting && !showNarrationScreen && (
          <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
            <div className="max-w-md mx-auto text-center px-6">
              <div className="relative mb-8">
                <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center animate-pulse">
                  <Sparkles className="w-10 h-10 text-purple-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-400 rounded-full animate-ping opacity-30" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">Building Your Multi-Language Course</h2>
              <p className="text-sm text-gray-500 mb-8">
                AI is generating content in {selectedLanguages.length} languages simultaneously.
              </p>

              <div className="space-y-3 text-left mb-8">
                {loadingSteps.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 transition-all duration-500 ${
                      i < loadingStep ? "opacity-50" : i === loadingStep ? "opacity-100" : "opacity-30"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors duration-300 ${
                      i < loadingStep ? "bg-purple-600 text-white" : i === loadingStep ? "bg-purple-100 text-purple-600 ring-2 ring-purple-300 ring-offset-1" : "bg-gray-100 text-gray-400"
                    }`}>
                      {i < loadingStep ? "✓" : i + 1}
                    </div>
                    <span className={`text-sm ${i === loadingStep ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">Localized generation takes slightly longer...</p>
            </div>
          </div>
        )}

        {/* ═══ NARRATION RENDERING SCREEN ═══ */}
        {isSubmitting && showNarrationScreen && (
          <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
            <div className="max-w-md mx-auto text-center px-6">
              <div className="relative mb-8">
                <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-purple-600" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">Rendering Audio for {selectedLanguages.length} Languages</h2>
              <p className="text-sm text-gray-500 mb-8">
                AI voiceovers are being generated for each lesson in all selected languages.
              </p>

              {waitingHere ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                  <p className="text-sm text-gray-500">Almost ready...</p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <button onClick={handleContinueWorking} className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Continue Working &rarr;
                  </button>
                  <button onClick={handleWaitHere} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                    Wait Here
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ FORM ═══ */}
        {!isSubmitting && (
        <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-6">
            <div className="mb-8">
              <button onClick={() => router.push("/admin/courses")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" />
                Back to Courses
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Create Course</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Provide context and the AI agent will build your course in the editor.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              {[
                { step: 1 as const, label: "What are you building?" },
                { step: 2 as const, label: "Who's it for?" },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-3">
                  {i > 0 && <div className={`w-12 h-0.5 rounded-full transition-colors ${wizardStep >= s.step ? "bg-purple-400" : "bg-gray-200"}`} />}
                  <button onClick={() => { if (s.step === 1 || canProceed) setWizardStep(s.step); }} className="flex items-center gap-2 group">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${wizardStep === s.step ? "bg-purple-600 text-white ring-2 ring-purple-200 ring-offset-1" : wizardStep > s.step ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {wizardStep > s.step ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${wizardStep === s.step ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
              {wizardStep === 1 && (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course Topic <span className="text-red-500">*</span></label>
                  <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Lockout/Tagout Safety..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-base bg-white" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "micro-lesson" as SynthesisType, label: "Micro-Lesson", desc: "5-15 min" },
                      { value: "full-course" as SynthesisType, label: "Full Course", desc: "30-60 min" },
                      { value: "onboarding-path" as SynthesisType, label: "Onboarding", desc: "Multi-session" },
                    ].map(opt => (
                      <label key={opt.value} className={`flex flex-col items-center gap-1 p-4 rounded-xl cursor-pointer border-2 transition-all text-center ${synthesisType === opt.value ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:bg-gray-50"}`}>
                        <input type="radio" name="synthesisType" value={opt.value} checked={synthesisType === opt.value} onChange={() => setSynthesisType(opt.value)} className="sr-only" />
                        <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                        <span className="text-[10px] text-gray-500">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Audience Level <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ value: "new-hire", label: "New Hire" }, { value: "experienced", label: "Experienced" }, { value: "recertification", label: "Recertification" }].map((opt) => (
                      <label key={opt.value} className={`flex flex-col items-center gap-1 p-4 rounded-xl cursor-pointer border-2 transition-all text-center ${audienceLevel === opt.value ? "border-purple-400 bg-purple-50 shadow-sm" : "border-gray-200 hover:bg-gray-50"}`}>
                        <input type="radio" name="audienceLevel" value={opt.value} checked={audienceLevel === opt.value} onChange={() => setAudienceLevel(opt.value as any)} className="sr-only" />
                        <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              )}

              {wizardStep === 2 && (
              <div className="p-6 space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Job Title</label>
                    <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white">
                      <option value="">Any job title</option>
                      {jobTitles.map((title) => <option key={title} value={title}>{title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Skill</label>
                    <select value={targetSkillId} onChange={(e) => setTargetSkillId(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white">
                      <option value="">No specific skill</option>
                      {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Library className="w-4 h-4 text-purple-600" />
                    Library Sources <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input type="text" value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} placeholder="Search sources..." className="w-full border-2 border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm" />
                  </div>
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-lg bg-gray-50 p-2 space-y-1">
                    {filteredSources.map((source) => (
                      <label key={source.id} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all ${selectedSourceIds.includes(source.id) ? "bg-purple-50 border-purple-200 border" : "hover:bg-white"}`}>
                        <input type="checkbox" checked={selectedSourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} className="mt-0.5 accent-purple-600" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-700">{source.title}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Multi-Language Selection (H1 Requirement) */}
                <div className="pt-4 border-t border-gray-100 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Globe className="size-4 text-purple-600" />
                      Target Languages
                    </label>
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100">AI Translation</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700 font-bold flex items-center gap-2">
                      <CheckCircle2 className="size-3.5" />
                      {SUPPORTED_LANGUAGES.en} (Primary)
                    </div>
                    {orgSettings.secondaryLanguages?.map((code: string) => (
                      <button
                        key={code}
                        onClick={() => toggleLanguage(code)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                          selectedLanguages.includes(code)
                            ? "bg-purple-50 border-purple-200 text-purple-700"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {selectedLanguages.includes(code) ? <CheckCircle2 className="size-3.5" /> : <div className="size-3.5 rounded-full border border-gray-300" />}
                        {SUPPORTED_LANGUAGES[code]}
                      </button>
                    ))}
                    {(!orgSettings.secondaryLanguages || orgSettings.secondaryLanguages.length === 0) && (
                      <Link href="/admin/settings/customization" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                        <Info className="size-3" />
                        Configure secondary languages in settings
                      </Link>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 italic">Each selected language will have a corresponding version of the course generated.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Context (Optional)</label>
                  <textarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder="Any specific guidance for the AI?" rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm bg-white resize-none" />
                </div>
              </div>
              )}

              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                {wizardStep === 1 ? (
                  <>
                    <button onClick={() => router.push("/admin/courses")} className="text-sm font-bold text-gray-500 hover:text-gray-800 px-4 py-2">Cancel</button>
                    <button onClick={() => setWizardStep(2)} disabled={!canProceed} className="px-8 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-100 flex items-center gap-2">
                      Next
                      <ChevronRight className="size-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setWizardStep(1)} className="text-sm font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1">
                      <ArrowLeft className="size-4" />
                      Back
                    </button>
                    <button onClick={handleStartBuilding} disabled={!canSubmit || isSubmitting} className="px-8 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-100 flex items-center gap-2">
                      <Sparkles className="size-4" />
                      {isSubmitting ? "Creating..." : "Start Building"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </AdminLayout>
    </RouteGuard>
  );
}
