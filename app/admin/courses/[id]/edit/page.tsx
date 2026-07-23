// Phase II Epic 1 Fix Pass: Course Editor with Full Features + Drag-and-Drop
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, X, 
  FileText, Link as LinkIcon, Video, Image, FileImage,
  Calendar, User, RotateCcw, Upload, Sparkles, Eye, Clock,
  Copy, Edit2, History, Undo2, Redo2, ChevronDown, PanelRightOpen, MessageSquare, Globe, CheckCircle2, AlertTriangle,
  MoreHorizontal, Share2, Presentation
} from "lucide-react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import Progress from "@/components/Progress";
import ResourcePreview from "@/components/ResourcePreview";
import ResourcesWorkspace from "./_components/ResourcesWorkspace";
import LessonStepper from "./_components/LessonStepper";
import LessonFocusedView from "./_components/LessonFocusedView";
import PreviewSectionModal from "./_components/PreviewSectionModal";
import ResourceEditorDrawer from "./_components/ResourceEditorDrawer";
import SlideEditorModal from "./_components/SlideEditorModal";
import NarratedWalkthroughEditorModal from "./_components/NarratedWalkthroughEditorModal";
import LessonSummaryPanelStepper from "./_components/LessonSummaryPanelStepper";
import LessonPreviewModalStepper from "./_components/LessonPreviewModalStepper";
import QuizTab from "./_components/QuizTab";
import { 
  getCourseById, 
  updateCourse, 
  getLessonsByCourseId,
  getResourcesByLessonId,
  getResourceById,
  getQuizByCourseId,
  getQuizzesByCourseId,
  getQuizzesByLessonId,
  getQuestionsByQuizId,
  getAssignmentsByCourseId,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  reorderResources,
  createResource,
  updateResource,
  deleteResource,
  createCourseAssignment,
  deleteCourseAssignment,
  updateCourseAssignment,
  resolveAssigneesForCourse,
  formatAssignmentTargetSummary,
  recomputeProgressCourse,
  getUsers,
  getSites,
  getDepartments,
  subscribe,
  getCurrentUser,
  ensureFirstLesson,
  getLessonById,
  // Epic 1G.4: Versioning & Audit functions
  performUndo,
  performRedo,
  canUndo,
  canRedo,
  getLastUndoSummary,
  getLastRedoSummary,
  // Epic 1G.6: Quiz functions
  getQuizById,
  upsertQuiz,
  createEmptyQuizFor,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  updateQuiz,
  // Epic 1G.4: Versioning functions for quiz generation
  addVersionSnapshot,
  addAuditEvent,
  getEntitySnapshot,
  pushUndo,
  clearRedo,
  // Epic 1G.7: Metadata & Style functions
  applyCourseMetadata,
  collectCourseHtml,
  // Phase II — 1M.1: Skills functions
  getSkills,
  createSkill,
  assignSkillsToCourse,
  getSkillsByCourseId,
  createSynthesisHistory,
  // AI Agent support
  getSynthesisReadyLibraryItems,
  getActiveSkillsV2,
  getAIContextData,
  getLibraryItemById,
  getAvailableCourseLanguages,
} from "@/lib/store";
import { generateQuestionsFromScope, GenScope } from "@/lib/ai/quizGen";
import EditQuestionModal from "@/components/quiz/EditQuestionModal";
import PreviewQuizModal from "@/components/quiz/PreviewQuizModal";
import AIQuizGeneratorModal from "@/components/quiz/AIQuizGeneratorModal"; // Phase II 1I.2: AI Quiz Generator
import StandardsEditModal from "@/components/quiz/StandardsEditModal";
import ChatArea from "@/components/admin/courses/generate/ChatArea";
import { generateAgentResponse } from "@/lib/mockAIAgent";
import type { AgentContext } from "@/lib/mockAIAgent";
import { markdownToHtml } from "@/lib/markdownToHtml";
import Toast from "@/components/Toast";
import { getFileAccept, formatFileSize } from "@/lib/uploads";
import { logChange } from "@/lib/changeLog"; // Phase II 1I.2: ChangeLog for AI generation
import { Course, CourseStatus, Lesson, Resource, CoursePolicy, CourseAssignment, ResourceType, VersionedEntityType, Quiz, Question, QuestionType, CourseStandards, StyleAuditIssue, CourseScope, ChatMessage } from "@/types";
import HistoryDrawer from "@/components/history/HistoryDrawer";
import CourseAssignmentModal from "@/components/admin/courses/CourseAssignmentModal";
import AssignmentResolveModal from "@/components/admin/courses/AssignmentResolveModal";

type TabType = "overview" | "lessons" | "quiz" | "settings" | "assignment";

export default function CourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const currentUser = getCurrentUser();
  const isManager = currentUser.role === "MANAGER";

  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [hasChanges, setHasChanges] = useState(false);

  // AI Conversation modal state
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  // AI Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  // AI Agent chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [agentPanelOpen, setAgentPanelOpen] = useState(true);

  // Epic 1G.4: History & Versioning state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyEntity, setHistoryEntity] = useState<{
    type: VersionedEntityType;
    id: string;
  } | null>(null);

  // Overview form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>();
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [standards, setStandards] = useState<string[]>([]);
  const [standardInput, setStandardInput] = useState("");
  // Epic 1G.7: Metadata fields
  const [objectives, setObjectives] = useState<string[]>([]);
  const [objectiveInput, setObjectiveInput] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced" | undefined>();
  const [readingLevel, setReadingLevel] = useState<"basic" | "standard" | "technical" | undefined>();
  const [language, setLanguage] = useState<string>("en");

  // Phase II — 1M.1: Skills state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [isNewSkillModalOpen, setIsNewSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("");

  // Lesson panel state (Epic 1E: Stepper-based)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | undefined>(undefined);
  const [previewingSection, setPreviewingSection] = useState<Resource | null>(null);
  const [slideEditorResource, setSlideEditorResource] = useState<Resource | null>(null);
  const [narrationEditorResource, setNarrationEditorResource] = useState<Resource | null>(null);
  const [isLessonPreviewOpen, setIsLessonPreviewOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null); // Keep for Epic 1D compatibility
  const [lessonResources, setLessonResources] = useState<Resource[]>([]);
  const [isResourceFormOpen, setIsResourceFormOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    type: "text" as ResourceType,
    title: "",
    url: "",
    content: "",
    durationSec: undefined as number | undefined,
  });
  const [uploadMode, setUploadMode] = useState<'upload' | 'link' | 'text'>('upload');
  const [uploadFileType, setUploadFileType] = useState<'image' | 'video' | 'pdf'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const [replacingResourceId, setReplacingResourceId] = useState<string | null>(null);

  // Assignment tab state
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<CourseAssignment | null>(null);

  // Quiz tab state
  const [quiz, setQuiz] = useState<Quiz | undefined>(undefined);
  const [quizType, setQuizType] = useState<"course" | "lesson">("course"); // Whether we're editing course or lesson quiz
  const [selectedLessonIdForQuiz, setSelectedLessonIdForQuiz] = useState<string | null>(null); // Selected lesson for lesson quiz
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [isPreviewQuizOpen, setIsPreviewQuizOpen] = useState(false);
  const [isAIQuizModalOpen, setIsAIQuizModalOpen] = useState(false); // Phase II 1I.2: AI Quiz Generator modal
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Multi-Language View State
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [availableLanguages, setAvailableLanguages] = useState(["en"]);
  const LANGUAGE_LABELS: Record<string, string> = {
    en: "English",
    es: "Spanish (Español)",
    fr: "French (Français)",
    de: "German (Deutsch)",
    pt: "Portuguese (Português)"
  };
  
  // Epic 1G.7: Metadata & Style state
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genScope, setGenScope] = useState<GenScope["type"]>("course");
  const [genScopeId, setGenScopeId] = useState<string>("");
  const [genCount, setGenCount] = useState(6);
  const [genTypes, setGenTypes] = useState<QuestionType[]>(["mcq", "true_false", "scenario"]);
  const [genLanguage, setGenLanguage] = useState("en");
  const [genDifficulties, setGenDifficulties] = useState<("easy" | "medium" | "hard")[]>(["easy", "medium", "hard"]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Course policy state
  const [policy, setPolicy] = useState<CoursePolicy>({
    progression: "linear",
    requireAllLessons: true,
    requirePassingQuiz: true,
    enableRetakes: true,
    lockNextUntilPrevious: true,
    showExplanations: true,
    requiresManualCompletion: false,
    minVideoWatchPct: 80,
    minTimeOnLessonSec: 60,
    maxQuizAttempts: 3,
    retakeCooldownMin: 60,
    // Phase II 1H.2d: New policy fields
    requireQuizPassToCompleteLesson: false,
    requireAllLessonsToCompleteCourse: true,
    issueCertificateOnComplete: true,
  });

  // Course scope state (for new user assignment)
  const [scope, setScope] = useState<CourseScope>({ type: "custom" });
  const allSites = getSites();
  const allDepartments = getDepartments();

  useEffect(() => {
    const loadData = () => {
      try {
        const loadedCourse = getCourseById(courseId);
        if (!loadedCourse) {
          console.warn(`Course not found: ${courseId}`);
          router.push("/admin/courses");
          return;
        }
        setCourse(loadedCourse);
        setTitle(loadedCourse.title);
        setDescription(loadedCourse.description || "");
        setCategory(loadedCourse.category || "");
        setTags(loadedCourse.tags || []);
        setEstimatedMinutes(loadedCourse.estimatedMinutes);
        setStatus(loadedCourse.status);
        setStandards(loadedCourse.standards || []);
        // Epic 1G.7: Load metadata fields
        if (loadedCourse.metadata) {
          setObjectives(loadedCourse.metadata.objectives || []);
          setDifficulty(loadedCourse.metadata.difficulty);
          setReadingLevel(loadedCourse.metadata.readingLevel);
          setLanguage(loadedCourse.metadata.language || "en");

          // Also sync estimatedMinutes from metadata if present
          if (loadedCourse.metadata.estimatedMinutes) {
            setEstimatedMinutes(loadedCourse.metadata.estimatedMinutes);
          }
          // Sync tags from metadata if present
          if (loadedCourse.metadata.tags && loadedCourse.metadata.tags.length > 0) {
            setTags(loadedCourse.metadata.tags);
          }
        }

        // Learning Model languages drive the Lessons language switcher (prototype demo)
        const orgLanguages = getAvailableCourseLanguages();
        const courseLanguages = loadedCourse.metadata?.languages;
        if (courseLanguages && courseLanguages.length > 1) {
          setAvailableLanguages(Array.from(new Set([...courseLanguages, ...orgLanguages])));
        } else {
          setAvailableLanguages(orgLanguages);
        }
        // Phase II — 1M.1: Load skills
        setSelectedSkills(loadedCourse.skills || []);
        if (loadedCourse.policy) {
          setPolicy(loadedCourse.policy);
        }
        // Load scope for new user assignment
        if (loadedCourse.scope) {
          setScope(loadedCourse.scope);
        } else {
          setScope({ type: "custom" });
        }

        setLessons(getLessonsByCourseId(courseId));
        setAssignments(getAssignmentsByCourseId(courseId));
        
        // Epic 1G.6: Load quiz based on quizType (default to course quiz)
        if (quizType === "course") {
          const courseQuiz = getQuizByCourseId(courseId);
          setQuiz(courseQuiz);
          setGenScopeId(courseId);
        } else if (selectedLessonIdForQuiz) {
          const lessonQuizzes = getQuizzesByLessonId(selectedLessonIdForQuiz);
          setQuiz(lessonQuizzes[0] || undefined);
          setGenScopeId(selectedLessonIdForQuiz);
        } else {
          setGenScopeId(courseId);
        }
      } catch (error) {
        console.error("Error loading course:", error);
        router.push("/admin/courses");
      }
    };

    loadData();
    const unsubscribe = subscribe(loadData);
    return unsubscribe;
  }, [courseId, router]);

  // Epic 1G.6: Update quiz when quizType or selectedLessonIdForQuiz changes
  useEffect(() => {
    if (quizType === "course") {
      const courseQuiz = getQuizByCourseId(courseId);
      setQuiz(courseQuiz);
      setGenScopeId(courseId);
      setGenScope("course");
    } else if (selectedLessonIdForQuiz) {
      const lessonQuizzes = getQuizzesByLessonId(selectedLessonIdForQuiz);
      setQuiz(lessonQuizzes[0] || undefined);
      setGenScopeId(selectedLessonIdForQuiz);
      setGenScope("lesson");
    }
  }, [quizType, selectedLessonIdForQuiz, courseId]);

  // Epic 1G.6: Update genScopeId when genScope changes
  useEffect(() => {
    if (genScope === "course") {
      setGenScopeId(courseId);
    } else if (genScope === "lesson" && activeLessonId) {
      setGenScopeId(activeLessonId);
    } else if (genScope === "section" && activeSectionId) {
      setGenScopeId(activeSectionId);
    }
  }, [genScope, courseId, activeLessonId, activeSectionId]);

  // Update lesson resources when selectedLessonId changes
  useEffect(() => {
    if (selectedLessonId) {
      setLessonResources(getResourcesByLessonId(selectedLessonId));
    }
  }, [selectedLessonId]);

  // Epic 1E: Ensure at least one lesson exists and set active lesson
  // Skip auto-creation for new AI courses — the agent will create all lessons
  // Also skip if course hasn't loaded yet (course === undefined) to prevent
  // creating an empty "Lesson 1" before we know if it's an AI-generated course
  const isNewAIBuild = course?.aiGenerated && course?.status === "ai-draft" && lessons.length === 0;
  useEffect(() => {
    if (!course) return; // Wait for course data to load before deciding
    if (lessons.length === 0 && !isManager && !isNewAIBuild) {
      // Auto-create first lesson
      const firstLesson = ensureFirstLesson(courseId);
      setActiveLessonId(firstLesson.id);
    } else if (lessons.length > 0 && !activeLessonId) {
      // Set first lesson as active
      setActiveLessonId(lessons[0].id);
    }
  }, [course, lessons, courseId, isManager, activeLessonId, isNewAIBuild]);

  // ══════════════════════════════════════════════════════════════════
  // AI AGENT — Chat initialization & auto-build for new AI courses
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!course || chatInitialized) return;
    setChatInitialized(true);

    // Load any existing conversation history
    if (course.conversationHistory && course.conversationHistory.length > 0) {
      setChatMessages(course.conversationHistory);

      // If this is a new AI course with only the setup context message, auto-trigger the build
      const hasSetupMsg = course.conversationHistory.some(
        (m) => m.role === "system" && m.content.startsWith("Setup context:")
      );
      const hasAssistantMsg = course.conversationHistory.some(
        (m) => m.role === "assistant"
      );

      console.log("[AI-AGENT] Init check:", {
        aiGenerated: course.aiGenerated,
        status: course.status,
        hasSetupMsg,
        hasAssistantMsg,
        convHistoryLen: course.conversationHistory?.length,
      });

      if (course.aiGenerated && course.status === "ai-draft" && hasSetupMsg && !hasAssistantMsg) {
        console.log("[AI-AGENT] Auto-build will fire in 500ms");
        // Auto-send a build trigger after a short delay
        setTimeout(() => {
          console.log("[AI-AGENT] triggerAutoBuild firing now");
          triggerAutoBuild(course);
        }, 500);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, chatInitialized]);

  const buildChatAgentContext = (isNew: boolean): AgentContext => {
    const sources = getSynthesisReadyLibraryItems();
    const skills = getActiveSkillsV2();
    const contextData = getAIContextData();

    const selectedSourceTitles = sources
      .filter((s) => course?.sourceIds?.includes(s.id))
      .map((s) => s.title);
    const targetSkill = course?.suggestedSkillIds?.[0]
      ? skills.find((s) => s.id === course.suggestedSkillIds![0])
      : undefined;

    return {
      selectedSourceTitles,
      selectedSourceIds: course?.sourceIds || [],
      targetSkillName: targetSkill?.name,
      targetRole: undefined, // extracted from setup message by agent
      synthesisType: course?.synthesisType || "full-course",
      skillGapSummary: contextData.skillGapSummary,
      expiringCertifications: contextData.expiringCertifications,
      isNewCourse: isNew,
      currentCourseTitle: title,
      currentCourseDescription: description,
      currentLessonCount: lessons.length,
      currentObjectives: objectives,
    };
  };

  // Shared helper to create lessons (and quizzes) from an agent outline
  const createLessonsFromOutline = (outline: NonNullable<Awaited<ReturnType<typeof generateAgentResponse>>["attachedOutline"]>, startOrder = 0) => {
    for (let i = 0; i < outline.length; i++) {
      const gl = outline[i];
      const lesson = createLesson({
        courseId,
        title: gl.title,
        order: startOrder + i,
        resourceIds: [],
        sourceAttributions: gl.sourceAttributions,
      });

      // Create the text/content resource — convert markdown to HTML for proper rendering
      const htmlContent = gl.content ? markdownToHtml(gl.content) : '';
      createResource({
        lessonId: lesson.id,
        courseId,
        type: "text",
        title: gl.title,
        content: htmlContent,
      });

      // Add supplementary image and PDF resources based on lesson content keywords
      const titleLower = gl.title.toLowerCase();
      const contentLower = (gl.content || '').toLowerCase();
      const combined = `${titleLower} ${contentLower}`;

      type SupplementaryResource = { type: "image" | "pdf"; title: string; url: string; fileName?: string };
      const supplements: SupplementaryResource[] = [];

      if (/lockout|tagout|loto|energy isolation|hazardous energy/.test(combined) && !/assessment|final/.test(titleLower)) {
        if (/introduc|overview|energy source|energy type|hazardous energy/.test(combined)) {
          supplements.push({ type: "image", title: "Hazardous Energy Sources — Electrical Panel Lockout", url: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=900&auto=format&fit=crop" });
          supplements.push({ type: "pdf", title: "OSHA Fact Sheet — Lockout/Tagout", url: "https://www.osha.gov/sites/default/files/publications/factsheet-lockout-tagout.pdf", fileName: "OSHA_LOTO_FactSheet.pdf" });
        }
        if (/6.step|procedure|step 1|shutdown|isolation|verification/.test(combined)) {
          supplements.push({ type: "image", title: "LOTO Devices — Padlocks, Hasps, and Tags on Equipment", url: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=900&auto=format&fit=crop" });
          supplements.push({ type: "pdf", title: "OSHA Quick Card — Lockout/Tagout Steps", url: "https://www.osha.gov/sites/default/files/publications/osha3120.pdf", fileName: "OSHA_LOTO_QuickCard.pdf" });
        }
        if (/1910\.147|regulatory|compliance|employer|penalt|osha standard/.test(combined)) {
          supplements.push({ type: "pdf", title: "OSHA 1910.147 — Control of Hazardous Energy (Full Text)", url: "https://www.osha.gov/sites/default/files/publications/osha3151.pdf", fileName: "OSHA_1910_147_Standard.pdf" });
        }
        if (/group lockout|lockbox|shift change|complex equipment|multiple/.test(combined)) {
          supplements.push({ type: "image", title: "Group Lockbox System — Multiple Locks on Shared Lockout", url: "https://images.unsplash.com/photo-1590959651373-a3db0f38a961?w=900&auto=format&fit=crop" });
          supplements.push({ type: "image", title: "Complex Industrial Equipment — Multiple Energy Sources", url: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900&auto=format&fit=crop" });
        }
        if (/equipment|device|padlock|hasp|cable lock|tag/.test(combined) && /device|lock type|equipment/.test(titleLower)) {
          supplements.push({ type: "image", title: "Lockout/Tagout Device Kit — Assorted Safety Locks and Tags", url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&auto=format&fit=crop" });
        }
        if (/case study|scenario|incident|real.world|near.miss/.test(combined)) {
          supplements.push({ type: "image", title: "Maintenance Worker Following LOTO Procedures", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop" });
          supplements.push({ type: "pdf", title: "OSHA LOTO Inspection Procedures Guide", url: "https://www.osha.gov/sites/default/files/publications/osha3151.pdf", fileName: "OSHA_LOTO_Inspection_Guide.pdf" });
        }
      } else if (/confined space/.test(combined) && !/assessment|final/.test(titleLower)) {
        supplements.push({ type: "image", title: "Confined Space Entry — Manhole with Safety Equipment", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&auto=format&fit=crop" });
        if (/permit|atmospheric|testing/.test(combined)) {
          supplements.push({ type: "pdf", title: "OSHA Permit-Required Confined Spaces Guide", url: "https://www.osha.gov/sites/default/files/publications/osha3138.pdf", fileName: "OSHA_Confined_Space_Guide.pdf" });
        }
      } else if (/ppe|protective equipment/.test(combined) && !/assessment|final/.test(titleLower)) {
        supplements.push({ type: "image", title: "Personal Protective Equipment — Safety Gear Overview", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop" });
        if (/selection|hazard assessment/.test(combined)) {
          supplements.push({ type: "pdf", title: "OSHA PPE Selection Guide", url: "https://www.osha.gov/sites/default/files/publications/osha3151.pdf", fileName: "OSHA_PPE_Selection_Guide.pdf" });
        }
      } else if (/forklift|powered industrial/.test(combined) && !/assessment|final/.test(titleLower)) {
        supplements.push({ type: "image", title: "Forklift Operating in Warehouse", url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&auto=format&fit=crop" });
        if (/stability|load/.test(combined)) {
          supplements.push({ type: "pdf", title: "OSHA Powered Industrial Trucks Quick Reference", url: "https://www.osha.gov/sites/default/files/publications/osha3949.pdf", fileName: "OSHA_Forklift_Reference.pdf" });
        }
      } else if (/fire|extinguish|evacuat/.test(combined) && !/assessment|final/.test(titleLower)) {
        supplements.push({ type: "image", title: "Fire Extinguisher Station", url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=900&auto=format&fit=crop" });
        if (/evacuat|emergency/.test(combined)) {
          supplements.push({ type: "pdf", title: "OSHA Emergency Action Plan Guide", url: "https://www.osha.gov/sites/default/files/publications/osha3088.pdf", fileName: "OSHA_Emergency_Plan.pdf" });
        }
      }

      for (const sup of supplements) {
        createResource({
          lessonId: lesson.id,
          courseId,
          type: sup.type,
          title: sup.title,
          url: sup.url,
          ...(sup.fileName ? { fileName: sup.fileName } : {}),
        });
      }

      // Create quiz from quizQuestions if present
      if (gl.quizQuestions && gl.quizQuestions.length > 0) {
        const isQuizLesson = gl.contentType === "quiz";
        // Final assessment (contentType=quiz) becomes a course-level quiz (no lessonId)
        // Lesson knowledge checks get lessonId set
        const quiz = isQuizLesson
          ? createEmptyQuizFor(courseId)
          : createEmptyQuizFor(courseId, lesson.id);
        const now = new Date().toISOString();
        const questions = gl.quizQuestions.map((qq, qIdx) => ({
          id: `q_${Date.now()}_${qIdx}_${Math.random().toString(36).substring(2, 7)}`,
          type: "mcq" as const,
          prompt: qq.question,
          options: qq.options.map((optText, optIdx) => ({
            id: `opt_${Date.now()}_${qIdx}_${optIdx}`,
            text: optText,
            correct: optIdx === qq.correctIndex,
          })),
          explanation: qq.explanation,
          required: true,
          points: 1,
          createdAt: now,
          updatedAt: now,
        }));
        updateQuiz(quiz.id, {
          title: isQuizLesson ? gl.title : `${gl.title} — Knowledge Check`,
          description: isQuizLesson
            ? "Complete this assessment to demonstrate your understanding. Minimum 80% required to pass."
            : "Quick knowledge check for this lesson.",
          questions,
          config: {
            passingScore: isQuizLesson ? 80 : 70,
            shuffleQuestions: true,
            shuffleOptions: true,
            showRationales: true,
          },
        });
      }
    }
    setLessons(getLessonsByCourseId(courseId));
  };

  // Shared helper to apply agent fieldUpdates to both React state AND the store
  // (Must persist to store because the store subscription re-reads the entity on every store change)
  const applyFieldUpdates = (fu: NonNullable<Awaited<ReturnType<typeof generateAgentResponse>>["fieldUpdates"]>) => {
    // 1. Update React state for immediate UI feedback
    if (fu.title) setTitle(fu.title);
    if (fu.description) setDescription(fu.description);
    if (fu.objectives) setObjectives(fu.objectives);
    if (fu.skillIds) setSelectedSkills(fu.skillIds);
    if (fu.category) setCategory(fu.category);
    if (fu.difficulty) setDifficulty(fu.difficulty);
    if (fu.estimatedMinutes) setEstimatedMinutes(fu.estimatedMinutes);
    if (fu.readingLevel) setReadingLevel(fu.readingLevel);
    if (fu.language) setLanguage(fu.language);
    if (fu.tags) setTags(fu.tags);
    if (fu.standards) setStandards(fu.standards);

    // 2. Also persist to the course entity in the store so the store subscription
    //    doesn't overwrite these values when it re-reads the entity
    updateCourse(courseId, {
      ...(fu.title ? { title: fu.title } : {}),
      ...(fu.description ? { description: fu.description } : {}),
      ...(fu.category ? { category: fu.category } : {}),
      ...(fu.tags ? { tags: fu.tags } : {}),
      ...(fu.standards ? { standards: fu.standards } : {}),
      ...(fu.estimatedMinutes ? { estimatedMinutes: fu.estimatedMinutes } : {}),
      ...(fu.skillIds ? { skills: fu.skillIds } : {}),
      metadata: {
        ...(fu.objectives ? { objectives: fu.objectives } : {}),
        ...(fu.tags ? { tags: fu.tags } : {}),
        ...(fu.estimatedMinutes ? { estimatedMinutes: fu.estimatedMinutes } : {}),
        ...(fu.difficulty ? { difficulty: fu.difficulty } : {}),
        ...(fu.readingLevel ? { readingLevel: fu.readingLevel } : {}),
        ...(fu.language ? { language: fu.language } : {}),
      },
    });

    setHasChanges(false); // Already saved to store
  };

  const triggerAutoBuild = async (courseData: Course) => {
    console.log("[AI-AGENT] triggerAutoBuild called with course:", courseData.id);
    setIsChatTyping(true);
    try {
      const buildMsg: ChatMessage = {
        id: `msg_user_auto_${Date.now()}`,
        role: "user",
        content: "Build this course based on my setup context.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, buildMsg]);

      const sources = getSynthesisReadyLibraryItems();
      const skills = getActiveSkillsV2();
      const contextData = getAIContextData();
      const selectedSourceTitles = sources
        .filter((s) => courseData.sourceIds?.includes(s.id))
        .map((s) => s.title);

      // Extract target skill name from suggestedSkillIds
      const targetSkillId = courseData.suggestedSkillIds?.[0];
      const targetSkill = targetSkillId ? skills.find((s) => s.id === targetSkillId) : undefined;

      // Extract target role from setup context message
      const setupMsg = courseData.conversationHistory?.find(
        (m) => m.role === "system" && m.content.startsWith("Setup context:")
      );
      const targetRoleMatch = setupMsg?.content.match(/Target Job Title:\s*(.+)/);
      const targetRole = targetRoleMatch?.[1]?.trim();

      const agentCtx: AgentContext = {
        selectedSourceTitles,
        selectedSourceIds: courseData.sourceIds || [],
        targetSkillName: targetSkill?.name,
        targetRole,
        synthesisType: courseData.synthesisType || "full-course",
        skillGapSummary: contextData.skillGapSummary,
        expiringCertifications: contextData.expiringCertifications,
        isNewCourse: true,
        currentCourseTitle: courseData.title,
        currentLessonCount: 0,
      };

      const allMessages = [...(courseData.conversationHistory || []), buildMsg];

      const response = await generateAgentResponse({
        userMessage: buildMsg.content,
        conversationHistory: allMessages,
        context: agentCtx,
      });

      const assistantMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        attachedOutline: response.attachedOutline,
        attachedSources: response.attachedSources,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      console.log("[AI-AGENT] Agent response received:", {
        hasFieldUpdates: !!response.fieldUpdates,
        fieldUpdateKeys: response.fieldUpdates ? Object.keys(response.fieldUpdates) : [],
        outlineLength: response.attachedOutline?.length || 0,
        messagePreview: response.message.substring(0, 100),
      });

      // Apply field updates (persists to both React state and the store)
      if (response.fieldUpdates) {
        console.log("[AI-AGENT] Applying field updates:", response.fieldUpdates);
        applyFieldUpdates(response.fieldUpdates);
      }

      // Create lessons (with quizzes) from outline
      if (response.attachedOutline && response.attachedOutline.length > 0) {
        console.log("[AI-AGENT] Creating", response.attachedOutline.length, "lessons");
        createLessonsFromOutline(response.attachedOutline, 0);
      }

      // Persist conversation history to the store
      const finalMessages = [...allMessages, assistantMsg];
      updateCourse(courseId, { conversationHistory: finalMessages });
    } catch (err) {
      console.error("[AI-AGENT] Auto-build error:", err);
      const errMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: "I encountered an error building the course. Please try sending a message to retry.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatTyping) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatTyping(true);

    try {
      const isNewAICourse = !!(course?.aiGenerated && course?.status === "ai-draft");
      const agentCtx = buildChatAgentContext(isNewAICourse);
      const allMessages = [...chatMessages, userMsg];

      const response = await generateAgentResponse({
        userMessage: userMsg.content,
        conversationHistory: allMessages,
        context: agentCtx,
      });

      const assistantMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        attachedOutline: response.attachedOutline,
        attachedSources: response.attachedSources,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      // Apply field updates from agent
      if (response.fieldUpdates) {
        applyFieldUpdates(response.fieldUpdates);
      }

      // Create lessons (with quizzes) from outline
      if (response.attachedOutline && response.attachedOutline.length > 0) {
        createLessonsFromOutline(response.attachedOutline, lessons.length);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: "I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleSave = () => {
    if (!course || isManager) return;

    updateCourse(courseId, {
      title,
      description,
      category: category || undefined,
      tags,
      estimatedMinutes,
      status,
      standards,
      skills: selectedSkills, // Phase II — 1M.1: Save skills
      policy,
      scope, // Assignment scope for new user onboarding
      // Epic 1G.7: Save metadata
      metadata: {
        objectives,
        tags,
        estimatedMinutes,
        difficulty,
        language,
        readingLevel,
        standards: course.metadata?.standards, // Preserve standards from metadata
      },
      // AI Agent: Persist conversation history
      conversationHistory: chatMessages.length > 0 ? chatMessages : undefined,
    });

    setHasChanges(false);
  };

  // Epic 1G.4: History & Versioning handlers
  const handleUndo = () => {
    const entityType = activeTab === 'overview' ? 'course' : 'lesson';
    const entityId = activeTab === 'overview' ? courseId : activeLessonId;
    if (entityId) {
      performUndo(entityType, entityId);
      // Refresh data
      const refreshedCourse = getCourseById(courseId);
      if (refreshedCourse) {
        setCourse(refreshedCourse);
        setTitle(refreshedCourse.title);
        setDescription(refreshedCourse.description || "");
        setCategory(refreshedCourse.category || "");
        setTags(refreshedCourse.tags || []);
        setEstimatedMinutes(refreshedCourse.estimatedMinutes);
        setStatus(refreshedCourse.status || "draft");
        setStandards(refreshedCourse.standards || []);
        setPolicy(refreshedCourse.policy || {
          progression: "linear",
          requireAllLessons: true,
          requirePassingQuiz: true,
          enableRetakes: true,
          lockNextUntilPrevious: true,
          showExplanations: true,
          requiresManualCompletion: false,
          minVideoWatchPct: 80,
          minTimeOnLessonSec: 60,
          maxQuizAttempts: 3,
          retakeCooldownMin: 60,
        });
      }
      const refreshedLessons = getLessonsByCourseId(courseId);
      setLessons(refreshedLessons);
    }
  };

  const handleRedo = () => {
    const entityType = activeTab === 'overview' ? 'course' : 'lesson';
    const entityId = activeTab === 'overview' ? courseId : activeLessonId;
    if (entityId) {
      performRedo(entityType, entityId);
      // Refresh data
      const refreshedCourse = getCourseById(courseId);
      if (refreshedCourse) {
        setCourse(refreshedCourse);
        setTitle(refreshedCourse.title);
        setDescription(refreshedCourse.description || "");
        setCategory(refreshedCourse.category || "");
        setTags(refreshedCourse.tags || []);
        setEstimatedMinutes(refreshedCourse.estimatedMinutes);
        setStatus(refreshedCourse.status || "draft");
        setStandards(refreshedCourse.standards || []);
        setPolicy(refreshedCourse.policy || {
          progression: "linear",
          requireAllLessons: true,
          requirePassingQuiz: true,
          enableRetakes: true,
          lockNextUntilPrevious: true,
          showExplanations: true,
          requiresManualCompletion: false,
          minVideoWatchPct: 80,
          minTimeOnLessonSec: 60,
          maxQuizAttempts: 3,
          retakeCooldownMin: 60,
        });
      }
      const refreshedLessons = getLessonsByCourseId(courseId);
      setLessons(refreshedLessons);
    }
  };

  const handleOpenHistory = () => {
    const entityType = activeTab === 'overview' ? 'course' : 'lesson';
    const entityId = activeTab === 'overview' ? courseId : activeLessonId;
    if (entityId) {
      setHistoryEntity({ type: entityType, id: entityId });
      setIsHistoryOpen(true);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
      setHasChanges(true);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
    setHasChanges(true);
  };

  const handleAddStandard = () => {
    if (standardInput.trim() && !standards.includes(standardInput.trim())) {
      setStandards([...standards, standardInput.trim()]);
      setStandardInput("");
      setHasChanges(true);
    }
  };

  const handleRemoveStandard = (standard: string) => {
    setStandards(standards.filter(s => s !== standard));
    setHasChanges(true);
  };

  // Epic 1G.7: Objectives handlers
  const handleAddObjective = () => {
    if (objectiveInput.trim() && !objectives.includes(objectiveInput.trim())) {
      setObjectives([...objectives, objectiveInput.trim()]);
      setObjectiveInput("");
      setHasChanges(true);
    }
  };

  const handleRemoveObjective = (objective: string) => {
    setObjectives(objectives.filter(o => o !== objective));
    setHasChanges(true);
  };

  // Phase II — 1M.1: Skills handlers
  const handleAddSkill = (skillId: string) => {
    if (!selectedSkills.includes(skillId)) {
      setSelectedSkills([...selectedSkills, skillId]);
      setHasChanges(true);
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter(id => id !== skillId));
    setHasChanges(true);
  };

  const handleCreateSkill = () => {
    if (!newSkillName.trim() || isManager) return;
    
    const newSkill = createSkill(newSkillName.trim(), newSkillCategory.trim() || undefined);
    setSelectedSkills([...selectedSkills, newSkill.id]);
    setNewSkillName("");
    setNewSkillCategory("");
    setIsNewSkillModalOpen(false);
    setHasChanges(true);
  };

  const handleAddLesson = () => {
    if (isManager) return;
    const order = lessons.length;
    const newLesson = createLesson({
      courseId,
      title: `Lesson ${lessons.length + 1}`,
      order,
      resourceIds: [],
    });
    setActiveLessonId(newLesson.id);
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (isManager) return;
    if (confirm("Delete this lesson and all its resources?")) {
      deleteLesson(lessonId);
      if (selectedLessonId === lessonId) {
        setSelectedLessonId(null);
      }
    }
  };

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndLessons = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || isManager) return;

    const oldIndex = lessons.findIndex(l => l.id === active.id);
    const newIndex = lessons.findIndex(l => l.id === over.id);

    if (oldIndex !== newIndex) {
      const reordered = arrayMove(lessons, oldIndex, newIndex);
      const orderedIds = reordered.map(l => l.id);
      reorderLessons(courseId, orderedIds);
    }
  };

  // Epic 1E: Stepper-specific handlers
  const handleReorderLessons = (fromIndex: number, toIndex: number) => {
    if (isManager) return;
    const reordered = arrayMove(lessons, fromIndex, toIndex);
    const orderedIds = reordered.map(l => l.id);
    reorderLessons(courseId, orderedIds);
  };

  const handleUpdateLessonTitle = (title: string) => {
    if (!activeLessonId || isManager) return;
    updateLesson(activeLessonId, { title });
  };

  const handleUpdateEstimatedMinutes = (minutes: number | undefined) => {
    if (!activeLessonId || isManager) return;
    updateLesson(activeLessonId, { estimatedMinutes: minutes });
  };

  const handleUpdateDownloadableResources = (resources: import("@/types").DownloadableResource[]) => {
    if (!activeLessonId || isManager) return;
    updateLesson(activeLessonId, { downloadableResources: resources });
  };

  const handleMoveLessonUp = () => {
    if (!activeLessonId || isManager) return;
    const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
    if (currentIndex > 0) {
      handleReorderLessons(currentIndex, currentIndex - 1);
    }
  };

  const handleMoveLessonDown = () => {
    if (!activeLessonId || isManager) return;
    const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
    if (currentIndex < lessons.length - 1) {
      handleReorderLessons(currentIndex, currentIndex + 1);
    }
  };

  const handleReorderResources = (fromIndex: number, toIndex: number) => {
    if (!activeLessonId || isManager) return;
    const resources = getResourcesByLessonId(activeLessonId);
    const reordered = arrayMove(resources, fromIndex, toIndex);
    reorderResources(activeLessonId, reordered.map(r => r.id));
  };

  const handleAddResource = () => {
    setEditingResource(undefined);
    setIsResourceDrawerOpen(true);
  };

  const handleEditResource = (resource: Resource) => {
    if (resource.type === 'slides') {
      setSlideEditorResource(resource);
      return;
    }
    if (resource.type === 'narrated-walkthrough') {
      setNarrationEditorResource(resource);
      return;
    }
    setEditingResource(resource);
    setIsResourceDrawerOpen(true);
  };

  const handleUpdateResourceInline = (updatedResource: Resource) => {
    // For inline editing (text sections with rich text editor)
    updateResource(updatedResource.id, {
      title: updatedResource.title,
      content: updatedResource.content,
      url: updatedResource.url,
      durationSec: updatedResource.durationSec,
      fileSize: updatedResource.fileSize,
      fileName: updatedResource.fileName,
      mimeType: updatedResource.mimeType,
    });
  };

  const handlePreviewResource = (resource: Resource) => {
    setPreviewingSection(resource);
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (isManager) return;
    if (confirm("Delete this resource?")) {
      await deleteResource(resourceId);
    }
  };

  const handleSaveResource = async (resourceData: Partial<Resource>) => {
    if (!activeLessonId || isManager) return;

    if (editingResource) {
      // Update existing
      updateResource(editingResource.id, resourceData);
    } else {
      // Create new - ensure all required fields are present
      const newResourceData: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'order'> = {
        courseId,
        lessonId: activeLessonId,
        type: resourceData.type!,
        title: resourceData.title!,
        url: resourceData.url,
        content: resourceData.content,
        durationSec: resourceData.durationSec,
        fileName: resourceData.fileName,
        fileSize: resourceData.fileSize,
        mimeType: resourceData.mimeType,
      };
      createResource(newResourceData);
    }
  };

  const handleSaveLesson = () => {
    // Already auto-saved, this is just for user feedback
    console.log('Lesson saved');
  };

  const handleSaveAndNext = () => {
    if (!activeLessonId || isManager) return;

    const currentIndex = lessons.findIndex(l => l.id === activeLessonId);

    if (currentIndex < lessons.length - 1) {
      // Navigate to next lesson
      setActiveLessonId(lessons[currentIndex + 1].id);
    } else {
      // Create new lesson and navigate to it
      handleAddLesson();
    }
  };

  const handleDragEndResources = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || isManager || !selectedLessonId) return;

    const oldIndex = lessonResources.findIndex(r => r.id === active.id);
    const newIndex = lessonResources.findIndex(r => r.id === over.id);

    if (oldIndex !== newIndex) {
      const reordered = arrayMove(lessonResources, oldIndex, newIndex);
      const orderedIds = reordered.map(r => r.id);
      reorderResources(selectedLessonId, orderedIds);
    }
  };

  const handleFileUpload = async (file: File, type: ResourceType) => {
    if (!selectedLessonId) {
      console.error('No lesson selected');
      return;
    }
    
    console.log('Starting upload:', { fileName: file.name, type, size: file.size });
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      console.log('Sending request to /api/upload...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (result.ok) {
        const titleWithoutExtension = result.fileName.replace(/\.[^/.]+$/, '');
        
        if (replacingResourceId) {
          // Replace existing resource
          const oldResource = getResourceById(replacingResourceId);
          updateResource(replacingResourceId, {
            url: result.url,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
            title: titleWithoutExtension,
          });
          
          // Delete old file if it was an upload
          if (oldResource?.url && oldResource.url.startsWith('/uploads/')) {
            await fetch('/api/upload/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: oldResource.url }),
            });
          }
          
          setReplacingResourceId(null);
          console.log('Resource replaced successfully');
        } else {
          // Create new resource
          console.log('Creating new resource with data:', {
            lessonId: selectedLessonId,
            type,
            title: titleWithoutExtension,
            url: result.url,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
          });
          
          createResource({
            courseId,
            lessonId: selectedLessonId,
            type,
            title: titleWithoutExtension,
            url: result.url,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
          });
          
          console.log('Resource created successfully');
        }
        
        setIsResourceFormOpen(false);
        setReplacingResourceId(null);
      } else {
        console.error('Upload failed:', result.error);
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsUploading(false);
      console.log('Upload process complete, isUploading set to false');
    }
  };

  // Epic 1C/1D handlers - kept for compatibility with old resources workspace component
  const handleReplaceResource = (resourceId: string) => {
    setReplacingResourceId(resourceId);
    setIsResourceFormOpen(true);
    setUploadMode('upload');
  };

  const handleCreateAssignment = () => {
    if (isManager) return;
    setEditingAssignment(null);
    setIsAssignmentModalOpen(true);
  };

  const handleEditAssignment = (assignment: CourseAssignment) => {
    if (isManager) return;
    setEditingAssignment(assignment);
    setIsAssignmentModalOpen(true);
  };

  const handleAssignmentSaved = () => {
    const updatedAssignments = getAssignmentsByCourseId(courseId);
    setAssignments(updatedAssignments);
  };

  // Epic 1G.7: Metadata & Style handlers
  const handleMetadataUpdated = () => {
    const updatedCourse = getCourseById(courseId);
    if (updatedCourse) {
      setCourse(updatedCourse);
      if (updatedCourse.metadata) {
        if (updatedCourse.metadata.objectives) {
          setObjectives(updatedCourse.metadata.objectives);
        }
        if (updatedCourse.metadata.tags) {
          setTags(updatedCourse.metadata.tags);
        }
        if (updatedCourse.metadata.estimatedMinutes) {
          setEstimatedMinutes(updatedCourse.metadata.estimatedMinutes);
        }
        if (updatedCourse.metadata.difficulty) {
          setDifficulty(updatedCourse.metadata.difficulty);
        }
        if (updatedCourse.metadata.readingLevel) {
          setReadingLevel(updatedCourse.metadata.readingLevel);
        }
        if (updatedCourse.metadata.language) {
          setLanguage(updatedCourse.metadata.language);
        }
      }
    }
    setToast({ message: "Metadata updated", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleViewInContext = (lessonId: string, sectionId: string, text?: string) => {
    setActiveTab("lessons");
    setActiveLessonId(lessonId);
    // TODO: Add highlighting logic when navigation enhancement is implemented
    // For now, just navigate to the lesson
  };

  const handleQuickFix = async (issue: StyleAuditIssue) => {
    if (!issue.suggestion || !issue.location) return;
    
    try {
      const { lessonId, sectionId } = issue.location;
      if (!lessonId || !sectionId) return;
      
      const resource = getResourceById(sectionId);
      if (!resource || !resource.content) return;
      
      // Extract the term to replace from the issue message
      const bannedMatch = issue.message.match(/Banned term "([^"]+)" found/);
      const preferredMatch = issue.message.match(/Use preferred term "([^"]+)" instead of "([^"]+)"/);
      
      let oldText = '';
      let newText = issue.suggestion.replace(/^Replace "([^"]+)" with (.+)$/, (_, old, newVal) => {
        oldText = old;
        return newVal;
      });
      
      if (preferredMatch) {
        oldText = preferredMatch[2];
        newText = preferredMatch[1];
      } else if (bannedMatch) {
        oldText = bannedMatch[1];
        newText = issue.suggestion.replace(/^Replace "([^"]+)" with (.+)$/, '$2') || oldText.replace('kit', '');
      }
      
      if (oldText && newText) {
        const updatedContent = resource.content.replace(
          new RegExp(`\\b${oldText}\\b`, 'gi'),
          newText
        );
        
        // Capture snapshot before update
        const snapshot = addVersionSnapshot({
          entityType: 'section',
          entityId: sectionId,
          parentCourseId: courseId,
          createdBy: getCurrentUser().id,
          cause: 'ai',
          aiAction: 'style_fix',
          summary: `Quick fix: ${oldText} → ${newText}`,
          payload: getEntitySnapshot('section', sectionId),
        });
        
        pushUndo('section', sectionId, snapshot.id);
        clearRedo('section', sectionId);
        
        updateResource(sectionId, { content: updatedContent });
        
        addAuditEvent({
          byUserId: getCurrentUser().id,
          entityType: 'section',
          entityId: sectionId,
          parentCourseId: courseId,
          action: 'style_fix',
          meta: {
            oldText,
            newText,
            issueKind: issue.kind,
          },
        });
        
        // Refresh course data
        const updatedCourse = getCourseById(courseId);
        if (updatedCourse) setCourse(updatedCourse);
        
        setToast({ message: `Replaced "${oldText}" with "${newText}"`, type: "success" });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Failed to apply quick fix:', error);
      setToast({ message: "Failed to apply quick fix", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSaveStandards = (standards: CourseStandards) => {
    applyCourseMetadata(courseId, { standards });
    const updatedCourse = getCourseById(courseId);
    if (updatedCourse) setCourse(updatedCourse);
    setToast({ message: "Standards updated", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    if (isManager) return;
    if (confirm("Remove this assignment?")) {
      deleteCourseAssignment(assignmentId);
      const updatedAssignments = getAssignmentsByCourseId(courseId);
      setAssignments(updatedAssignments);
      setToast({ message: "Assignment deleted", type: "success" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleRecomputeProgress = () => {
    // Recompute for all learners who have progress
    const users = getUsers().filter(u => u.role === "LEARNER");
    users.forEach(user => {
      recomputeProgressCourse(user.id, courseId);
    });
    alert("Progress recomputed for all learners");
  };

  // Epic 1G.6: Quiz handlers
  const handleGenerateQuestions = async () => {
    if (isManager || !genScopeId) return;
    
    setIsGenerating(true);
    try {
      // Determine which quiz to use/create based on quizType
      let currentQuiz = quiz;
      if (!currentQuiz) {
        if (quizType === "course") {
          currentQuiz = createEmptyQuizFor(courseId);
        } else if (selectedLessonIdForQuiz) {
          currentQuiz = createEmptyQuizFor(courseId, selectedLessonIdForQuiz);
        } else {
          // Fallback: create course quiz
          currentQuiz = createEmptyQuizFor(courseId);
        }
        setQuiz(currentQuiz);
      }

      const scope: GenScope = {
        type: genScope,
        id: genScopeId,
        language: genLanguage,
        count: genCount,
        mix: genTypes,
        difficulty: genDifficulties,
      };

      const generatedQuestions = await generateQuestionsFromScope(scope);
      
      // Add source metadata to questions
      const questionsWithMeta = generatedQuestions.map(q => ({
        ...q,
        meta: {
          ...q.meta,
          source: { type: genScope, id: genScopeId },
        },
      }));
      
      if (replaceExisting) {
        currentQuiz.questions = questionsWithMeta;
      } else {
        currentQuiz.questions = [...(currentQuiz.questions || []), ...questionsWithMeta];
      }
      
      // Capture snapshot before update (for AI generation)
      const entityType: VersionedEntityType = currentQuiz.lessonId ? 'lesson' : 'course';
      const entityId = currentQuiz.lessonId || courseId;
      const parentCourseId = currentQuiz.lessonId ? courseId : undefined;

      // Use upsertQuiz with 'ai' cause to properly handle versioning
      const updatedQuiz = { ...currentQuiz };
      upsertQuiz(updatedQuiz, 'ai');
      setQuiz(updatedQuiz);
      
      setToast({ message: `Generated ${questionsWithMeta.length} questions`, type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error generating questions:", error);
      setToast({ message: "Failed to generate questions", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizTypeChange = (newType: "course" | "lesson") => {
    setQuizType(newType);
    if (newType === "course") {
      setSelectedLessonIdForQuiz(null);
    } else if (lessons.length > 0 && !selectedLessonIdForQuiz) {
      // Default to first lesson if none selected
      setSelectedLessonIdForQuiz(lessons[0].id);
    }
  };

  const handleCreateLessonQuiz = () => {
    setQuizType("lesson");
    // Lesson ID should already be selected via onSelectLessonForQuiz
    // Quiz will be loaded in useEffect
  };

  const handleCreateQuestion = () => {
    // Ensure quiz exists first
    if (!quiz) {
      let newQuiz: Quiz;
      if (quizType === "course") {
        newQuiz = createEmptyQuizFor(courseId);
      } else if (selectedLessonIdForQuiz) {
        newQuiz = createEmptyQuizFor(courseId, selectedLessonIdForQuiz);
      } else {
        newQuiz = createEmptyQuizFor(courseId);
      }
      setQuiz(newQuiz);
    }
    setEditingQuestion(null); // null means creating new question
    setIsEditQuestionModalOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setIsEditQuestionModalOpen(true);
  };

  const handleSaveQuestion = (updatedQuestion: Question) => {
    const isNewQuestion = !quiz || !quiz.questions.find(q => q.id === updatedQuestion.id);
    
    if (!quiz) {
      // Create quiz if it doesn't exist
      const newQuiz = createEmptyQuizFor(courseId);
      addQuestion(newQuiz.id, updatedQuestion);
      // Refresh from store
      const refreshedQuiz = getQuizByCourseId(courseId);
      setQuiz(refreshedQuiz);
    } else {
      if (isNewQuestion) {
        // New question
        addQuestion(quiz.id, updatedQuestion);
      } else {
        // Update existing question
        updateQuestion(quiz.id, updatedQuestion.id, updatedQuestion);
      }
      // Refresh from store
      const refreshedQuiz = getQuizByCourseId(courseId);
      setQuiz(refreshedQuiz);
    }
    setIsEditQuestionModalOpen(false);
    setEditingQuestion(null);
    setToast({ message: isNewQuestion ? "Question created" : "Question updated", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!quiz || !confirm("Delete this question?")) return;
    // Remove from inline questions array
    const updatedQuestions = quiz.questions.filter(q => q.id !== questionId);
    updateQuiz(quiz.id, { questions: updatedQuestions });
    // Also clean up legacy store
    deleteQuestion(questionId);
    // Refresh quiz from store based on current quizType
    if (quizType === "course") {
      setQuiz(getQuizByCourseId(courseId));
    } else if (selectedLessonIdForQuiz) {
      const lessonQuizzes = getQuizzesByLessonId(selectedLessonIdForQuiz);
      setQuiz(lessonQuizzes[0] || undefined);
    }
    setToast({ message: "Question deleted", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDuplicateQuestion = (questionId: string) => {
    if (!quiz) return;
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return;
    const duplicated = {
      ...question,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      prompt: `${question.prompt} (Copy)`,
    };
    addQuestion(quiz.id, duplicated);
    // Refresh quiz from store to pick up the new question
    const refreshed = getQuizById(quiz.id);
    if (refreshed) setQuiz(refreshed);
    setToast({ message: "Question duplicated", type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleQuizDragEnd = (event: DragEndEvent) => {
    if (!quiz) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = quiz.questions.findIndex(q => q.id === active.id);
    const newIndex = quiz.questions.findIndex(q => q.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderQuestions(quiz.id, oldIndex, newIndex);
      setQuiz({ ...quiz });
    }
  };

  const handleUpdateQuizConfig = (updates: Partial<Quiz["config"]>) => {
    if (!quiz) return;
    const updatedQuiz = {
      ...quiz,
      config: { ...quiz.config, ...updates },
    };
    upsertQuiz(updatedQuiz);
    setQuiz(updatedQuiz);
  };

  // Phase II 1I.2: Handle AI-generated questions
  const handleAIGeneratedQuestions = (questions: Question[]) => {
    // Ensure quiz exists first
    let currentQuiz = quiz;
    if (!currentQuiz) {
      if (quizType === "course") {
        currentQuiz = createEmptyQuizFor(courseId);
      } else if (selectedLessonIdForQuiz) {
        currentQuiz = createEmptyQuizFor(courseId, selectedLessonIdForQuiz);
      } else {
        currentQuiz = createEmptyQuizFor(courseId);
      }
      setQuiz(currentQuiz);
    }

    // Add each question to the quiz
    questions.forEach((question) => {
      addQuestion(currentQuiz!.id, question);
    });

    // Refresh from store
    const refreshedQuiz = getQuizByCourseId(courseId);
    if (refreshedQuiz) {
      setQuiz(refreshedQuiz);
    }

    // Log change for AI generation
    logChange(
      currentQuiz.id,
      `Generated ${questions.length} AI quiz questions`,
      {
        action: 'ai_quiz_generate',
        questionCount: questions.length,
        sourceType: questions[0]?.meta?.source === 'AI' ? 'AI' : 'Manual',
        difficulty: questions[0]?.meta?.difficulty,
        questionTypes: questions.map(q => q.type),
      },
      'QuizAttempt'
    );

    setToast({ message: `Added ${questions.length} AI-generated question(s) to quiz`, type: "success" });
    setTimeout(() => setToast(null), 3000);
  };

  const handleQuizUndo = () => {
    if (performUndo('course', courseId)) {
      const refreshedCourse = getCourseById(courseId);
      if (refreshedCourse) {
        setCourse(refreshedCourse);
        const refreshedQuiz = getQuizByCourseId(courseId);
        setQuiz(refreshedQuiz);
      }
    }
  };

  const handleQuizRedo = () => {
    if (performRedo('course', courseId)) {
      const refreshedCourse = getCourseById(courseId);
      if (refreshedCourse) {
        setCourse(refreshedCourse);
        const refreshedQuiz = getQuizByCourseId(courseId);
        setQuiz(refreshedQuiz);
      }
    }
  };

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case "text": return <FileText className="w-4 h-4" />;
      case "link": return <LinkIcon className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "pdf": return <FileImage className="w-4 h-4" />;
      case "image": return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getAssignmentLabel = (assignment: CourseAssignment): string => {
    return formatAssignmentTargetSummary(assignment.target);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Sortable Lesson Row Component
  function SortableLessonRow({ lesson, index }: { lesson: Lesson; index: number }) {
    const resources = getResourcesByLessonId(lesson.id);
    const isSelected = selectedLessonId === lesson.id;
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: lesson.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`border rounded-lg p-3 ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"} ${
          isDragging ? "opacity-50 shadow-lg" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {!isManager && (
            <button
              className="drag-handle p-1 text-gray-400 hover:text-gray-700"
              {...attributes}
              {...listeners}
              aria-label="Drag to reorder lesson"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
          <input
            type="text"
            value={lesson.title}
            onChange={(e) => {
              if (!isManager) {
                updateLesson(lesson.id, { title: e.target.value });
              }
            }}
            disabled={isManager || currentLanguage !== 'en'}
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            aria-label={`Lesson ${index + 1} title`}
          />
          <Badge variant="default">{resources.length} resources</Badge>
          <Button
            variant="secondary"
            onClick={() => setSelectedLessonId(isSelected ? null : lesson.id)}
            className="text-sm"
          >
            {isSelected ? "Close" : "Manage"}
          </Button>
          {!isManager && (
            <button
              onClick={() => handleDeleteLesson(lesson.id)}
              className="text-red-600 hover:text-red-700"
              aria-label="Delete lesson"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Sortable Resource Row Component
  function SortableResourceRow({ resource }: { resource: Resource }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: resource.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const isUploadedFile = resource.url && resource.url.startsWith('/uploads/');

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white ${
          isDragging ? "opacity-50 shadow-lg" : ""
        }`}
      >
        {!isManager && (
          <button
            className="drag-handle flex-shrink-0 p-1 text-gray-400 hover:text-gray-700 mt-0.5"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder resource"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <div className="flex-shrink-0 mt-1 text-gray-500">
          {getResourceIcon(resource.type)}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="text-sm font-medium text-gray-900">{resource.title}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="capitalize">{resource.type}</span>
              {resource.fileName && (
                <>
                  <span>•</span>
                  <span className="truncate">{resource.fileName}</span>
                </>
              )}
              {resource.fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(resource.fileSize)}</span>
                </>
              )}
              {resource.mimeType && (
                <>
                  <span>•</span>
                  <span className="truncate">{resource.mimeType}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Preview */}
          <div className="mt-2">
            <ResourcePreview resource={resource} size="small" />
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-1">
          {!isManager && isUploadedFile && resource.type !== 'link' && resource.type !== 'text' && (
            <button
              onClick={() => handleReplaceResource(resource.id)}
              className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
              aria-label="Replace file"
              title="Replace file"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
          {!isManager && (
            <button
              onClick={() => handleDeleteResource(resource.id)}
              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              aria-label="Delete resource"
              title="Delete resource"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
        <AdminLayout>
          <div className="text-center py-12">Loading...</div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  // Find owner user for display
  const ownerUser = course ? getUsers().find(u => u.id === course.ownerUserId) : undefined;

  return (
    <RouteGuard allowedRoles={["ADMIN", "MANAGER"]}>
      <AdminLayout>
        {/* Outer flex: page content left, agent panel right */}
        <div className="flex -mt-6 -mr-6 -mb-6 min-h-[calc(100vh-56px)]">
          {/* Left: all page content */}
          <div className="flex-1 min-w-0 py-6 pr-6 overflow-y-auto max-h-[calc(100vh-56px)]">
        <div>
          {/* Header — production-style */}
          <div className="mb-4">
            <button
              onClick={() => router.push("/admin/courses")}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">{course.title}</h1>
                  {course.status === "ai-draft" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      AI Draft
                    </span>
                  ) : (
                    <Badge variant={course.status === "published" ? "success" : course.status === "rejected" ? "error" : course.status === "in-review" ? "warning" : "default"}>
                      {course.status === "published" ? "Published" : course.status === "in-review" ? "In Review" : course.status === "rejected" ? "Rejected" : "Draft"}
                    </Badge>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Created {formatDate(course.createdAt)}</span>
                  <span>Updated {formatDate(course.updatedAt)}</span>
                </div>
              </div>

              {!isManager && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!course || isManager) return;
                      updateCourse(courseId, {
                        title,
                        description,
                        category: category || undefined,
                        tags,
                        estimatedMinutes,
                        status: "published",
                        standards,
                        skills: selectedSkills,
                        policy,
                        scope,
                        metadata: {
                          objectives,
                          tags,
                          estimatedMinutes,
                          difficulty,
                          language,
                          readingLevel,
                          standards: course.metadata?.standards,
                        },
                        conversationHistory: chatMessages.length > 0 ? chatMessages : undefined,
                      });
                      setStatus("published");
                      setHasChanges(false);
                    }}
                    className="!text-sm !py-2 !px-4"
                  >
                    Publish
                  </Button>
                  <button
                    type="button"
                    className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50"
                    title="More"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {isManager && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>Read-Only Mode:</strong> You are viewing this course as a Manager and cannot make edits.
              </div>
            )}
          </div>

          {/* AI Draft Banner */}
          {course.ai?.source === "AI" && course.status === "draft" && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900">Generated by AI from prompt</p>
                <p className="text-xs text-purple-700 mt-0.5">
                  Review and refine this content before publishing. You can edit all sections, add resources, and customize to your needs.
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-0 flex items-center justify-between">
            <nav className="flex gap-6">
              {(["overview", "lessons", "quiz", "settings", "assignment"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            {activeTab === "lessons" && !isManager && (
              <button
                type="button"
                className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Presentation className="w-3.5 h-3.5" />
                Create Presentation
              </button>
            )}
          </div>

          {/* AI Review Banner — visible across all tabs */}
          {course.aiGenerated && (course.status === "ai-draft" || course.status === "in-review") && (
            <div className="-mx-1 mb-6">
              <div className="bg-purple-50/95 backdrop-blur-sm border-l-4 border-purple-500 border-y border-r border-purple-200 rounded-r-xl px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-purple-900 text-sm">AI-Generated Course — Ready for Review</h3>
                      <p className="text-xs text-purple-600 mt-0.5">
                        Generated {new Date(course.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} from {course.sourceAttributions?.length ?? 0} source{(course.sourceAttributions?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {course.conversationHistory && course.conversationHistory.length > 0 && (
                      <button
                        onClick={() => setIsConversationModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        View Conversation
                      </button>
                    )}
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 border border-red-300 bg-white hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        updateCourse(courseId, { status: "published", reviewedByUserId: currentUser.id, reviewedAt: new Date().toISOString() });
                        createSynthesisHistory({
                          draftId: courseId,
                          synthesisType: course.synthesisType || "full-course",
                          status: "success",
                          sourceCount: course.sourceIds?.length ?? 0,
                          lessonCount: lessons.length,
                          generatedByUserId: course.ownerUserId || "unknown",
                          generatedTitle: course.title,
                          outcome: "approved",
                          publishedCourseId: courseId,
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                    >
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Published/Rejected AI info bar */}
          {course.aiGenerated && (course.status === "published" || course.status === "rejected") && course.reviewedAt && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg mb-6 text-sm ${
              course.status === "published"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>
                AI-Generated · {course.status === "published" ? "Published" : "Rejected"} {new Date(course.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {course.reviewNotes && <> · {course.reviewNotes}</>}
              </span>
              {course.conversationHistory && course.conversationHistory.length > 0 && (
                <button
                  onClick={() => setIsConversationModalOpen(true)}
                  className="ml-auto text-xs font-medium underline underline-offset-2 hover:no-underline flex-shrink-0"
                >
                  View Conversation
                </button>
              )}
            </div>
          )}

          {/* Tab Content */}
          <div className={activeTab === "lessons" ? "" : "mt-6"}>
            {activeTab === "overview" && (
              <div>
                {/* Main Content */}
                <div className="space-y-6">
                {/* Title & Description — production-style flat Course Details */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Course Details</h3>
                    {!isManager && currentLanguage === 'en' && (
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    )}
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Course Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={isManager || currentLanguage !== 'en'}
                        placeholder="Enter course title"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                          isManager || currentLanguage !== 'en' ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={isManager || currentLanguage !== 'en'}
                        rows={4}
                        placeholder="Describe what learners will gain from this course..."
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm ${
                          isManager || currentLanguage !== 'en' ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => { setCategory(e.target.value); setHasChanges(true); }}
                          disabled={isManager || currentLanguage !== 'en'}
                          placeholder="e.g., Safety"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select
                          value={status}
                          onChange={(e) => { setStatus(e.target.value as any); setHasChanges(true); }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="draft">Draft</option>
                          <option value="ai-draft">AI Draft</option>
                          <option value="in-review">In Review</option>
                          <option value="published">Published</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Difficulty</label>
                        <select
                          value={difficulty || ""}
                          onChange={(e) => { setDifficulty((e.target.value || undefined) as any); setHasChanges(true); }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="">Select...</option>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Reading Level</label>
                        <select
                          value={readingLevel || ""}
                          onChange={(e) => { setReadingLevel((e.target.value || undefined) as any); setHasChanges(true); }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="">Select...</option>
                          <option value="basic">Basic</option>
                          <option value="standard">Standard</option>
                          <option value="technical">Technical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Output Format</label>
                        <select
                          disabled={isManager || currentLanguage !== 'en'}
                          defaultValue="reading"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="reading">Reading Material</option>
                          <option value="mixed">Mixed</option>
                          <option value="video">Video</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                        <select
                          value={language}
                          onChange={(e) => { setLanguage(e.target.value); setHasChanges(true); }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Minutes</label>
                      <input
                        type="number"
                        value={estimatedMinutes ?? ""}
                        onChange={(e) => {
                          setEstimatedMinutes(e.target.value === "" ? undefined : Number(e.target.value));
                          setHasChanges(true);
                        }}
                        disabled={isManager || currentLanguage !== 'en'}
                        placeholder="e.g. 30"
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                      {!isManager && currentLanguage === 'en' && (
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                            placeholder="Add a tag..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {tags.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No tags yet.</p>
                        ) : (
                          tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200"
                            >
                              {tag}
                              {!isManager && currentLanguage === 'en' && (
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-gray-900">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Standards</label>
                      {!isManager && currentLanguage === 'en' && (
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={standardInput}
                            onChange={(e) => setStandardInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStandard())}
                            placeholder="e.g., OSHA 1910.147"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddStandard}
                            disabled={!standardInput.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {standards.map((standard) => (
                          <span
                            key={standard}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            {standard}
                            {!isManager && currentLanguage === 'en' && (
                              <button onClick={() => handleRemoveStandard(standard)} className="hover:text-gray-900">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Learning Objectives — keep but flatten */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Learning Objectives</h3>
                  </div>
                  <div className="p-6">
                    {!isManager && currentLanguage === 'en' && (
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={objectiveInput}
                          onChange={(e) => setObjectiveInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObjective())}
                          placeholder="Add a learning objective..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddObjective}
                          disabled={!objectiveInput.trim()}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {objectives.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No objectives yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {objectives.map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                            <span className="text-blue-600 font-bold mt-0.5 text-sm">{idx + 1}.</span>
                            <span className="flex-1 text-sm text-gray-700">{objective}</span>
                            {!isManager && currentLanguage === 'en' && (
                              <button
                                onClick={() => handleRemoveObjective(objective)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* PLACEHOLDER_REMOVE_OLD_COURSE_DETAILS */}
                <div className="hidden">
                <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                      Course Details
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <span>Course Title</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={isManager || currentLanguage !== 'en'}
                        placeholder="Enter course title"
                        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base ${
                          isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          setHasChanges(true);
                        }}
                        disabled={isManager || currentLanguage !== 'en'}
                        rows={5}
                        placeholder="Describe what learners will gain from this course..."
                        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-base ${
                          isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Course Objectives */}
                <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                      Learning Objectives
                    </h3>
                  </div>
                  <div className="p-6">
                    {!isManager && (
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={objectiveInput}
                          onChange={(e) => setObjectiveInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddObjective())}
                          placeholder="Add a learning objective..."
                          className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300"
                        />
                        <Button variant="primary" onClick={handleAddObjective} disabled={!objectiveInput.trim()} className="px-6">
                          Add
                        </Button>
                      </div>
                    )}
                    {objectives.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No objectives yet. Add learning objectives to define what learners will achieve.</p>
                    ) : (
                      <ul className="space-y-2">
                        {objectives.map((objective, idx) => (
                          <li key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <span className="text-indigo-600 font-bold mt-0.5">{idx + 1}.</span>
                            <span className="flex-1 text-sm text-gray-700">{objective}</span>
                            {!isManager && (
                              <button
                                onClick={() => handleRemoveObjective(objective)}
                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                </div>

                {/* Phase II — 1M.1: Skills Section */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Skills</h3>
                  </div>
                  <div className="p-6">
                    {!isManager && (
                      <div className="mb-4 space-y-3">
                        {/* Search and Select */}
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={skillSearchQuery}
                              onChange={(e) => setSkillSearchQuery(e.target.value)}
                              placeholder="Search skills..."
                              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300"
                            />
                            {skillSearchQuery && (
                              <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {getSkills()
                                  .filter(skill => 
                                    skill.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) &&
                                    !selectedSkills.includes(skill.id)
                                  )
                                  .slice(0, 10)
                                  .map(skill => (
                                    <button
                                      key={skill.id}
                                      onClick={() => {
                                        handleAddSkill(skill.id);
                                        setSkillSearchQuery("");
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 flex items-center justify-between"
                                    >
                                      <span>{skill.name}</span>
                                      {skill.category && (
                                        <span className="text-xs text-gray-500">({skill.category})</span>
                                      )}
                                    </button>
                                  ))}
                                {getSkills().filter(skill => 
                                  skill.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) &&
                                  !selectedSkills.includes(skill.id)
                                ).length === 0 && (
                                  <div className="px-4 py-2 text-sm text-gray-500">
                                    No matching skills found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="primary"
                            onClick={() => setIsNewSkillModalOpen(true)}
                            className="px-6"
                          >
                            + New Skill
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Selected Skills Chips */}
                    {selectedSkills.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">
                        {isManager ? "No skills tagged yet." : "No skills tagged yet. Add skills to indicate what learners will earn."}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedSkills.map(skillId => {
                          const skill = getSkills().find(s => s.id === skillId) || (() => { const v2 = getActiveSkillsV2().find(s => s.id === skillId); return v2 ? { id: v2.id, name: v2.name, category: v2.category } : null; })();
                          if (!skill) return null;
                          return (
                            <div
                              key={skillId}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700"
                            >
                              <span>{skill.name}</span>
                              {skill.category && (
                                <span className="text-xs text-indigo-500">({skill.category})</span>
                              )}
                              {!isManager && (
                                <button
                                  onClick={() => handleRemoveSkill(skillId)}
                                  className="text-indigo-400 hover:text-indigo-600 transition-colors p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Grid — superseded by flat Course Details above */}
                <div className="hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-indigo-400 rounded-full"></span>
                      Category
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setHasChanges(true);
                      }}
                      disabled={isManager || currentLanguage !== 'en'}
                      placeholder="e.g., Safety, Equipment"
                      className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium ${
                        isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-purple-400 rounded-full"></span>
                      Duration
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={estimatedMinutes || ""}
                        onChange={(e) => {
                          setEstimatedMinutes(e.target.value ? parseInt(e.target.value) : undefined);
                          setHasChanges(true);
                        }}
                        disabled={isManager || currentLanguage !== 'en'}
                        min="0"
                        placeholder="e.g., 30"
                        className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium ${
                          isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">min</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-emerald-400 rounded-full"></span>
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as CourseStatus);
                        setHasChanges(true);
                      }}
                      disabled={isManager || currentLanguage !== 'en'}
                      className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium ${
                        isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <option value="draft">📝 Draft</option>
                      <option value="published">✓ Published</option>
                      {course?.aiGenerated && (
                        <>
                          <option value="ai-draft">✨ AI Draft</option>
                          <option value="in-review">🔍 In Review</option>
                          <option value="rejected">✗ Rejected</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Additional Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-orange-400 rounded-full"></span>
                      Difficulty
                    </label>
                    <select
                      value={difficulty || ""}
                      onChange={(e) => {
                        setDifficulty(e.target.value ? e.target.value as "beginner" | "intermediate" | "advanced" : undefined);
                        setHasChanges(true);
                      }}
                      disabled={isManager || currentLanguage !== 'en'}
                      className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium ${
                        isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <option value="">Select difficulty...</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-blue-400 rounded-full"></span>
                      Reading Level
                    </label>
                    <select
                      value={readingLevel || ""}
                      onChange={(e) => {
                        setReadingLevel(e.target.value ? e.target.value as "basic" | "standard" | "technical" : undefined);
                        setHasChanges(true);
                      }}
                      disabled={isManager || currentLanguage !== 'en'}
                      className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium ${
                        isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <option value="">Select reading level...</option>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 p-5 hover:shadow-lg transition-shadow">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-cyan-400 rounded-full"></span>
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => {
                        setLanguage(e.target.value);
                        setHasChanges(true);
                      }}
                      disabled={isManager || currentLanguage !== 'en'}
                      className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium ${
                        isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                  </div>
                </div>
                </div>

                {/* Tags & Standards — superseded by flat Course Details above */}
                <div className="hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-indigo-600">🏷️</span>
                        Tags
                      </h3>
                    </div>
                    <div className="p-6">
                      {!isManager && (
                        <div className="flex gap-2 mb-4">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                            placeholder="Add a tag..."
                            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300"
                          />
                          <Button variant="primary" onClick={handleAddTag} disabled={!tagInput.trim()} className="px-6">
                            Add
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {tags.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No tags yet. Add tags to help organize and find your course.</p>
                        ) : (
                          tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 hover:bg-indigo-200 transition-colors"
                            >
                              {tag}
                              {!isManager && (
                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="text-emerald-600">📋</span>
                        Compliance Standards
                      </h3>
                    </div>
                    <div className="p-6">
                      {!isManager && (
                        <div className="flex gap-2 mb-4">
                          <input
                            type="text"
                            value={standardInput}
                            onChange={(e) => setStandardInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStandard())}
                            placeholder="e.g., OSHA 1910.1200"
                            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-medium hover:border-gray-300"
                          />
                          <Button variant="primary" onClick={handleAddStandard} disabled={!standardInput.trim()} className="px-6 bg-emerald-600 hover:bg-emerald-700">
                            Add
                          </Button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Legacy standards (simple string array) */}
                        {standards.map((standard) => (
                          <span
                            key={standard}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 hover:bg-emerald-200 transition-colors"
                          >
                            {standard}
                            {!isManager && (
                              <button onClick={() => handleRemoveStandard(standard)} className="hover:text-emerald-900 transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </span>
                        ))}
                        {/* New metadata standards */}
                        {course?.metadata?.standards && (
                          <>
                            {course.metadata.standards.osha?.map((code) => (
                              <button
                                key={`osha-${code}`}
                                onClick={() => !isManager && setIsStandardsModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-red-100 text-red-700 font-semibold border border-red-200 hover:bg-red-200 transition-colors cursor-pointer"
                              >
                                OSHA {code}
                              </button>
                            ))}
                            {course.metadata.standards.msha?.map((code) => (
                              <button
                                key={`msha-${code}`}
                                onClick={() => !isManager && setIsStandardsModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-yellow-100 text-yellow-700 font-semibold border border-yellow-200 hover:bg-yellow-200 transition-colors cursor-pointer"
                              >
                                MSHA {code}
                              </button>
                            ))}
                            {course.metadata.standards.epa?.map((code) => (
                              <button
                                key={`epa-${code}`}
                                onClick={() => !isManager && setIsStandardsModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-700 font-semibold border border-green-200 hover:bg-green-200 transition-colors cursor-pointer"
                              >
                                EPA {code}
                              </button>
                            ))}
                            {course.metadata.standards.other?.flatMap(standard => 
                              standard.codes.map(code => (
                                <button
                                  key={`other-${standard.label}-${code}`}
                                  onClick={() => !isManager && setIsStandardsModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-100 text-blue-700 font-semibold border border-blue-200 hover:bg-blue-200 transition-colors cursor-pointer"
                                >
                                  {standard.label} {code}
                                </button>
                              ))
                            )}
                          </>
                        )}
                        {standards.length === 0 && !course?.metadata?.standards && (
                          <p className="text-sm text-gray-400 italic">No standards yet. Add compliance standards this course covers.</p>
                        )}
                      </div>
                      {!isManager && (
                        <Button
                          variant="secondary"
                          onClick={() => setIsStandardsModalOpen(true)}
                          className="w-full mt-2"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Manage Standards
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                </div>

              </div>
              </div>
            )}

            {activeTab === "lessons" && (
              <div className="flex flex-col border border-gray-200 border-t-0 rounded-b-lg bg-white min-h-[560px]">
                {/* Language switcher — compact bar */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/80">
                  <span className="text-xs font-medium text-gray-500">Language:</span>
                  <div className="flex items-center gap-1">
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setCurrentLanguage(lang)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          currentLanguage === lang
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {LANGUAGE_LABELS[lang] || lang}
                      </button>
                    ))}
                  </div>
                  {currentLanguage !== "en" && (
                    <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Read-Only Translation
                    </span>
                  )}
                </div>

                {isManager && (
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-sm text-amber-900">
                    View-only (Manager) — You can view lesson content but cannot edit.
                  </div>
                )}

                {/* Two-pane: outline left + editor right */}
                <div className="flex flex-1 min-h-[520px]">
                  <div className="w-64 flex-shrink-0 self-stretch">
                    <LessonStepper
                      courseId={courseId}
                      lessons={lessons}
                      activeLessonId={activeLessonId || ""}
                      onSetActive={setActiveLessonId}
                      onReorder={handleReorderLessons}
                      onAddLesson={handleAddLesson}
                      isReadOnly={isManager || currentLanguage !== "en"}
                      language={currentLanguage}
                      chapterTitle={
                        course.title.length > 28 ? `${course.title.slice(0, 28)}...` : course.title
                      }
                    />
                  </div>

                  <div className="flex-1 min-w-0 bg-white">
                    {activeLessonId && getLessonById(activeLessonId) ? (
                      <LessonFocusedView
                        lesson={getLessonById(activeLessonId)!}
                        resources={getResourcesByLessonId(activeLessonId)}
                        totalLessons={lessons.length}
                        language={currentLanguage}
                        isReadOnly={isManager || currentLanguage !== "en"}
                        isAIDraft={!!(course?.aiGenerated && (course.status === "ai-draft" || course.status === "in-review"))}
                        sourceLabels={(() => {
                          const lesson = getLessonById(activeLessonId);
                          if (!lesson?.sourceAttributions || !course?.aiGenerated) return undefined;
                          return lesson.sourceAttributions
                            .map((id) => {
                              const item = getLibraryItemById(id);
                              return item
                                ? `${item.title}${item.regulatoryRef ? ` (${item.regulatoryRef})` : ""}`
                                : id;
                            })
                            .filter((v, i, a) => a.indexOf(v) === i);
                        })()}
                        onUpdateTitle={handleUpdateLessonTitle}
                        onUpdateEstimatedMinutes={handleUpdateEstimatedMinutes}
                        onUpdateDownloadableResources={handleUpdateDownloadableResources}
                        onMoveUp={handleMoveLessonUp}
                        onMoveDown={handleMoveLessonDown}
                        onAddResource={handleAddResource}
                        onEditResource={handleEditResource}
                        onUpdateResource={handleUpdateResourceInline}
                        onPreviewResource={handlePreviewResource}
                        onDeleteResource={handleDeleteResource}
                        onReorderResources={handleReorderResources}
                        onPreviewLesson={() => setIsLessonPreviewOpen(true)}
                        onSave={handleSaveLesson}
                        onSaveAndNext={handleSaveAndNext}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                        <FileText className="w-10 h-10 text-gray-300 mb-3" />
                        <h3 className="text-base font-semibold text-gray-700 mb-1">No lesson selected</h3>
                        <p className="text-sm text-gray-500 mb-4">Select a lesson or create a new one</p>
                        {!isManager && (
                          <Button variant="primary" onClick={handleAddLesson}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Lesson
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Slide Editor Modal */}
                <SlideEditorModal
                  isOpen={!!slideEditorResource}
                  onClose={() => setSlideEditorResource(null)}
                  slides={slideEditorResource?.slides || []}
                  resourceTitle={slideEditorResource?.title || ""}
                />

                {/* Narrated Walkthrough Editor Modal */}
                <NarratedWalkthroughEditorModal
                  isOpen={!!narrationEditorResource}
                  onClose={() => setNarrationEditorResource(null)}
                  narrationData={narrationEditorResource?.narrationData}
                  resourceTitle={narrationEditorResource?.title || ''}
                />

                {/* Resource Editor Drawer */}
                <ResourceEditorDrawer
                  isOpen={isResourceDrawerOpen}
                  onClose={() => {
                    setIsResourceDrawerOpen(false);
                    setEditingResource(undefined);
                  }}
                  resource={editingResource}
                  lessonId={activeLessonId || ''}
                  onSave={handleSaveResource}
                />

                {/* Preview Modal */}
                {activeLessonId && (
                  <LessonPreviewModalStepper
                    isOpen={isLessonPreviewOpen}
                    onClose={() => setIsLessonPreviewOpen(false)}
                    lesson={getLessonById(activeLessonId)!}
                    resources={getResourcesByLessonId(activeLessonId)}
                  />
                )}

                {/* Section Preview Modal */}
                <PreviewSectionModal
                  section={previewingSection}
                  onClose={() => setPreviewingSection(null)}
                />
              </div>
            )}

            {activeTab === "quiz" && (
              <>
                <QuizTab
                  quiz={quiz}
                  courseId={courseId}
                  activeLessonId={activeLessonId}
                  lessons={lessons}
                  isManager={isManager}
                  quizType={quizType}
                  selectedLessonIdForQuiz={selectedLessonIdForQuiz}
                  onQuizTypeChange={handleQuizTypeChange}
                  onSelectLessonForQuiz={setSelectedLessonIdForQuiz}
                  onCreateLessonQuiz={handleCreateLessonQuiz}
                  onGenerate={handleGenerateQuestions}
                  onCreateQuestion={handleCreateQuestion}
                  onEditQuestion={handleEditQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                  onDuplicateQuestion={handleDuplicateQuestion}
                  onDragEnd={handleQuizDragEnd}
                  onUpdateConfig={handleUpdateQuizConfig}
                  onPreview={() => setIsPreviewQuizOpen(true)}
                  onUndo={handleQuizUndo}
                  onRedo={handleQuizRedo}
                  onHistory={() => {
                    setHistoryEntity({ type: 'course', id: courseId });
                    setIsHistoryOpen(true);
                  }}
                  canUndo={canUndo('course', courseId)}
                  canRedo={canRedo('course', courseId)}
                  genScope={genScope}
                  setGenScope={setGenScope}
                  genScopeId={genScopeId}
                  setGenScopeId={setGenScopeId}
                  genCount={genCount}
                  setGenCount={setGenCount}
                  genTypes={genTypes}
                  setGenTypes={setGenTypes}
                  genLanguage={genLanguage}
                  setGenLanguage={setGenLanguage}
                  genDifficulties={genDifficulties}
                  setGenDifficulties={setGenDifficulties}
                  replaceExisting={replaceExisting}
                  setReplaceExisting={setReplaceExisting}
                  isGenerating={isGenerating}
                  onOpenAIGenerator={() => setIsAIQuizModalOpen(true)} // Phase II 1I.2: Open AI modal
                />
                {toast && (
                  <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                  />
                )}
                <EditQuestionModal
                  isOpen={isEditQuestionModalOpen}
                  onClose={() => {
                    setIsEditQuestionModalOpen(false);
                    setEditingQuestion(null);
                  }}
                  question={editingQuestion}
                  onSave={handleSaveQuestion}
                  onDelete={handleDeleteQuestion}
                  isReadOnly={isManager}
                />
                {quiz && (
                  <PreviewQuizModal
                    isOpen={isPreviewQuizOpen}
                    onClose={() => setIsPreviewQuizOpen(false)}
                    quiz={quiz}
                  />
                )}
                {/* Phase II 1I.2: AI Quiz Generator Modal */}
                <AIQuizGeneratorModal
                  isOpen={isAIQuizModalOpen}
                  onClose={() => setIsAIQuizModalOpen(false)}
                  courseId={courseId}
                  lessonId={activeLessonId}
                  onQuestionsGenerated={handleAIGeneratedQuestions}
                  onError={(message) => {
                    setToast({ message, type: "error" });
                    setTimeout(() => setToast(null), 3000);
                  }}
                />
              </>
            )}

            {activeTab === "settings" && (
              <div className="max-w-5xl space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-lg border-2 border-indigo-100 p-6 overflow-hidden">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Course Policy Settings</h2>
                      <p className="text-sm text-gray-600">
                        These settings control how learners progress through the course. Changes are enforced in the course player.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progression Mode */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">Progression Mode</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label 
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          policy.progression === 'linear' 
                            ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                            : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                        } ${isManager ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center h-5">
                          <input
                            type="radio"
                            name="progression"
                            value="linear"
                            checked={policy.progression === 'linear'}
                            onChange={() => {
                              setPolicy({ ...policy, progression: "linear" });
                              setHasChanges(true);
                            }}
                            disabled={isManager || currentLanguage !== 'en'}
                            className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="ml-3">
                          <span className={`block text-sm font-bold ${policy.progression === 'linear' ? 'text-indigo-900' : 'text-gray-900'}`}>
                            Linear Progression
                          </span>
                          <span className={`block text-xs mt-1 ${policy.progression === 'linear' ? 'text-indigo-700' : 'text-gray-500'}`}>
                            Learners must complete lessons in sequential order.
                          </span>
                        </div>
                      </label>

                      <label 
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          policy.progression === 'free' 
                            ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' 
                            : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                        } ${isManager ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center h-5">
                          <input
                            type="radio"
                            name="progression"
                            value="free"
                            checked={policy.progression === 'free'}
                            onChange={() => {
                              setPolicy({ ...policy, progression: "free" });
                              setHasChanges(true);
                            }}
                            disabled={isManager || currentLanguage !== 'en'}
                            className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="ml-3">
                          <span className={`block text-sm font-bold ${policy.progression === 'free' ? 'text-indigo-900' : 'text-gray-900'}`}>
                            Free Navigation
                          </span>
                          <span className={`block text-xs mt-1 ${policy.progression === 'free' ? 'text-indigo-700' : 'text-gray-500'}`}>
                            Learners can access any lesson in any order.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Completion Rules */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">Completion Rules</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Require all lessons</p>
                          <p className="text-xs text-gray-600 mt-1">Learners must complete every lesson to finish the course</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.requireAllLessons}
                          onChange={(e) => {
                            setPolicy({ ...policy, requireAllLessons: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Require passing quiz</p>
                          <p className="text-xs text-gray-600 mt-1">Learners must pass the quiz to complete the course</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.requirePassingQuiz}
                          onChange={(e) => {
                            setPolicy({ ...policy, requirePassingQuiz: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Lock sequential lessons</p>
                          <p className="text-xs text-gray-600 mt-1">Next lesson is locked until the current one is complete</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.lockNextUntilPrevious}
                          onChange={(e) => {
                            setPolicy({ ...policy, lockNextUntilPrevious: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Require learners to manually mark lessons complete</p>
                          <p className="text-xs text-gray-600 mt-1">Learners must click "Mark Complete" to finish a lesson. Progress will not auto-complete on scroll or video watch.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.requiresManualCompletion ?? false}
                          onChange={(e) => {
                            setPolicy({ ...policy, requiresManualCompletion: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      {/* Phase II 1H.2d: New completion policy controls */}
                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Require quiz pass to complete lesson</p>
                          <p className="text-xs text-gray-600 mt-1">Learners must pass the lesson's quiz before the lesson is marked complete</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.requireQuizPassToCompleteLesson ?? false}
                          onChange={(e) => {
                            setPolicy({ ...policy, requireQuizPassToCompleteLesson: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Require all lessons to complete course</p>
                          <p className="text-xs text-gray-600 mt-1">All lessons must be completed before the course is marked complete</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.requireAllLessonsToCompleteCourse ?? true}
                          onChange={(e) => {
                            setPolicy({ ...policy, requireAllLessonsToCompleteCourse: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Phase II 1H.2d: Certificate Settings */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-amber-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">Certificate Settings</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Issue certificate on course completion</p>
                          <p className="text-xs text-gray-600 mt-1">Automatically issue a certificate when the course is completed</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.issueCertificateOnComplete ?? true}
                          onChange={(e) => {
                            setPolicy({ ...policy, issueCertificateOnComplete: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Minimum score for certificate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={policy.minScoreForCertificatePct ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                            setPolicy({ ...policy, minScoreForCertificatePct: value });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          placeholder="e.g., 80"
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-600 mt-2">
                          Minimum quiz score percentage required to receive certificate (leave blank to issue for any completion)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reminder Cadence Settings */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-cyan-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">Reminder Cadence</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Configure retraining intervals and reminder schedules</p>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Retraining Interval */}
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Require periodic retraining</p>
                          <p className="text-xs text-gray-600 mt-1">Learners must retake this course after a set period</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!policy.retrainIntervalDays}
                          onChange={(e) => {
                            setPolicy({ 
                              ...policy, 
                              retrainIntervalDays: e.target.checked ? 365 : undefined,
                              reminderEnabled: e.target.checked ? true : false,
                              reminderDaysBefore: e.target.checked ? [30, 7] : undefined
                            });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-cyan-600 rounded border-2 border-gray-300 focus:ring-cyan-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      {policy.retrainIntervalDays && (
                        <div className="p-4 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 rounded-xl border-2 border-cyan-100">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Retraining Interval
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { value: 30, label: "30 days" },
                              { value: 90, label: "90 days" },
                              { value: 180, label: "6 months" },
                              { value: 365, label: "1 year" },
                              { value: 730, label: "2 years" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setPolicy({ ...policy, retrainIntervalDays: option.value });
                                  setHasChanges(true);
                                }}
                                disabled={isManager || currentLanguage !== 'en'}
                                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                  policy.retrainIntervalDays === option.value
                                    ? "bg-cyan-600 text-white shadow-md"
                                    : "bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-300 hover:bg-cyan-50"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {option.label}
                              </button>
                            ))}
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                max="1825"
                                value={![30, 90, 180, 365, 730].includes(policy.retrainIntervalDays) ? policy.retrainIntervalDays : ""}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value, 10);
                                  if (value > 0) {
                                    setPolicy({ ...policy, retrainIntervalDays: value });
                                    setHasChanges(true);
                                  }
                                }}
                                disabled={isManager || currentLanguage !== 'en'}
                                placeholder="Custom"
                                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                                  ![30, 90, 180, 365, 730].includes(policy.retrainIntervalDays)
                                    ? "border-cyan-600 bg-cyan-50"
                                    : "border-gray-200 bg-white"
                                } focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">days</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-3">
                            Learners must retake this course {policy.retrainIntervalDays} days after completion
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reminder Schedule */}
                    {policy.retrainIntervalDays && (
                      <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-cyan-300 hover:shadow-sm transition-all cursor-pointer">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">Enable reminder notifications</p>
                            <p className="text-xs text-gray-600 mt-1">Send reminders before certification expires</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={policy.reminderEnabled ?? false}
                            onChange={(e) => {
                              setPolicy({ 
                                ...policy, 
                                reminderEnabled: e.target.checked,
                                reminderDaysBefore: e.target.checked ? [30, 7] : undefined
                              });
                              setHasChanges(true);
                            }}
                            disabled={isManager || currentLanguage !== 'en'}
                            className="w-5 h-5 text-cyan-600 rounded border-2 border-gray-300 focus:ring-cyan-500 focus:ring-2 disabled:opacity-50"
                          />
                        </label>

                        {policy.reminderEnabled && (
                          <div className="p-4 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 rounded-xl border-2 border-cyan-100">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Reminder Schedule
                            </label>
                            <p className="text-xs text-gray-600 mb-4">
                              Select when to notify learners before their certification expires
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                              {[
                                { value: 30, label: "30 days before" },
                                { value: 15, label: "15 days before" },
                                { value: 7, label: "7 days before" },
                                { value: 3, label: "3 days before" },
                                { value: 1, label: "1 day before" },
                              ].map((option) => {
                                const isSelected = policy.reminderDaysBefore?.includes(option.value) ?? false;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      const current = policy.reminderDaysBefore || [];
                                      const updated = isSelected
                                        ? current.filter(d => d !== option.value)
                                        : [...current, option.value].sort((a, b) => b - a);
                                      setPolicy({ ...policy, reminderDaysBefore: updated.length > 0 ? updated : undefined });
                                      setHasChanges(true);
                                    }}
                                    disabled={isManager || currentLanguage !== 'en'}
                                    className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                                      isSelected
                                        ? "bg-cyan-600 text-white shadow-md"
                                        : "bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-300 hover:bg-cyan-50"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                            
                            {/* Visual Timeline */}
                            {policy.reminderDaysBefore && policy.reminderDaysBefore.length > 0 && (
                              <div className="mt-4 p-3 pb-6 bg-white rounded-lg border border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-2">Reminder Timeline</p>
                                <div className="relative h-8">
                                  <div className="absolute inset-x-0 top-1/2 h-1 bg-gray-200 rounded-full -translate-y-1/2"></div>
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                                  <span className="absolute right-0 top-full mt-1 text-[10px] font-medium text-red-600 whitespace-nowrap -translate-x-1/2">Due</span>
                                  {policy.reminderDaysBefore.map((day) => {
                                    const position = Math.min((day / Math.max(...policy.reminderDaysBefore!, 30)) * 80, 80);
                                    return (
                                      <div key={day} className="absolute top-1/2 -translate-y-1/2" style={{ right: `${100 - position}%` }}>
                                        <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-white shadow-sm"></div>
                                        <span className="absolute top-full mt-1 text-[10px] font-medium text-cyan-600 whitespace-nowrap -translate-x-1/2">{day}d</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quiz Behavior */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">Quiz Behavior</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Enable quiz retakes</p>
                          <p className="text-xs text-gray-600 mt-1">Allow learners to retake the quiz after failure</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.enableRetakes}
                          onChange={(e) => {
                            setPolicy({ ...policy, enableRetakes: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">Show explanations</p>
                          <p className="text-xs text-gray-600 mt-1">Display answer explanations when learners fail</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={policy.showExplanations}
                          onChange={(e) => {
                            setPolicy({ ...policy, showExplanations: e.target.checked });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="w-5 h-5 text-indigo-600 rounded border-2 border-gray-300 focus:ring-indigo-500 focus:ring-2 disabled:opacity-50"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Max Quiz Attempts
                          </label>
                          <input
                            type="number"
                            value={policy.maxQuizAttempts || ""}
                            onChange={(e) => {
                              setPolicy({ ...policy, maxQuizAttempts: e.target.value ? parseInt(e.target.value) : undefined });
                              setHasChanges(true);
                            }}
                            disabled={isManager || currentLanguage !== 'en'}
                            min="1"
                            placeholder="Unlimited"
                            className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300 ${
                              isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                            Retake Cooldown (min)
                          </label>
                          <input
                            type="number"
                            value={policy.retakeCooldownMin || ""}
                            onChange={(e) => {
                              setPolicy({ ...policy, retakeCooldownMin: e.target.value ? parseInt(e.target.value) : undefined });
                              setHasChanges(true);
                            }}
                            disabled={isManager || currentLanguage !== 'en'}
                            min="0"
                            placeholder="No cooldown"
                            className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300 ${
                              isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timing Requirements */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-amber-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">Timing Requirements</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Min Video Watch Percentage
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={policy.minVideoWatchPct || ""}
                            onChange={(e) => {
                              setPolicy({ ...policy, minVideoWatchPct: e.target.value ? parseInt(e.target.value) : undefined });
                              setHasChanges(true);
                            }}
                            disabled={isManager || currentLanguage !== 'en'}
                            min="0"
                            max="100"
                            placeholder="e.g., 80"
                            className={`flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300 ${
                              isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900'
                            }`}
                          />
                          <span className="text-lg font-bold text-gray-900">%</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Minimum percentage of video that must be watched</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Min Time on Lesson
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={policy.minTimeOnLessonSec || ""}
                            onChange={(e) => {
                              setPolicy({ ...policy, minTimeOnLessonSec: e.target.value ? parseInt(e.target.value) : undefined });
                              setHasChanges(true);
                            }}
                            disabled={isManager || currentLanguage !== 'en'}
                            min="0"
                            placeholder="e.g., 60"
                            className={`flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300 ${
                              isManager ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white text-gray-900'
                            }`}
                          />
                          <span className="text-sm font-semibold text-gray-700">sec</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">Minimum seconds required on each lesson</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment Scope */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 bg-teal-600 rounded-full"></div>
                      <h3 className="text-lg font-bold text-gray-900">Assignment Scope</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Define who should be automatically assigned this course when onboarding new users</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label 
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          scope.type === "company-wide" 
                            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="scope"
                          checked={scope.type === "company-wide"}
                          onChange={() => {
                            setScope({ type: "company-wide" });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                              scope.type === "company-wide" ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                            }`}>
                              {scope.type === "company-wide" && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                  <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 6.586 3.707 5.293z"/>
                                </svg>
                              )}
                            </span>
                            <span className="font-semibold text-gray-900">Company-wide</span>
                            <span className="px-2 py-0.5 text-xs font-bold bg-teal-100 text-teal-700 rounded-full">Required</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 ml-7">
                            All new employees will be automatically assigned this training
                          </p>
                        </div>
                      </label>

                      <label 
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          scope.type === "custom" 
                            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="scope"
                          checked={scope.type === "custom"}
                          onChange={() => {
                            setScope({ type: "custom" });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                              scope.type === "custom" ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                            }`}>
                              {scope.type === "custom" && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                  <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 6.586 3.707 5.293z"/>
                                </svg>
                              )}
                            </span>
                            <span className="font-semibold text-gray-900">Manual Only</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 ml-7">
                            Must be manually assigned to users (not auto-assigned on onboarding)
                          </p>
                        </div>
                      </label>

                      <label 
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          scope.type === "site" 
                            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="scope"
                          checked={scope.type === "site"}
                          onChange={() => {
                            setScope({ type: "site", siteIds: [] });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                              scope.type === "site" ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                            }`}>
                              {scope.type === "site" && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                  <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 6.586 3.707 5.293z"/>
                                </svg>
                              )}
                            </span>
                            <span className="font-semibold text-gray-900">Site-specific</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 ml-7">
                            Auto-assign to new users at selected sites
                          </p>
                        </div>
                      </label>

                      <label 
                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          scope.type === "department" 
                            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="scope"
                          checked={scope.type === "department"}
                          onChange={() => {
                            setScope({ type: "department", departmentIds: [] });
                            setHasChanges(true);
                          }}
                          disabled={isManager || currentLanguage !== 'en'}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border-2 ${
                              scope.type === "department" ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                            }`}>
                              {scope.type === "department" && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                  <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 6.586 3.707 5.293z"/>
                                </svg>
                              )}
                            </span>
                            <span className="font-semibold text-gray-900">Department-specific</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 ml-7">
                            Auto-assign to new users in selected departments
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Site Selection */}
                    {scope.type === "site" && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Sites</label>
                        <div className="flex flex-wrap gap-2">
                          {allSites.map((site) => (
                            <label
                              key={site.id}
                              className={`inline-flex items-center px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                scope.siteIds?.includes(site.id)
                                  ? 'bg-teal-100 border-teal-500 text-teal-800'
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={scope.siteIds?.includes(site.id) || false}
                                onChange={(e) => {
                                  const newSiteIds = e.target.checked
                                    ? [...(scope.siteIds || []), site.id]
                                    : (scope.siteIds || []).filter(id => id !== site.id);
                                  setScope({ ...scope, siteIds: newSiteIds });
                                  setHasChanges(true);
                                }}
                                disabled={isManager || currentLanguage !== 'en'}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">{site.name}</span>
                            </label>
                          ))}
                        </div>
                        {(scope.siteIds?.length || 0) === 0 && (
                          <p className="text-xs text-amber-600 mt-2">Select at least one site for auto-assignment</p>
                        )}
                      </div>
                    )}

                    {/* Department Selection */}
                    {scope.type === "department" && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Departments</label>
                        <div className="flex flex-wrap gap-2">
                          {allDepartments.map((dept) => {
                            const site = allSites.find(s => s.id === dept.siteId);
                            return (
                              <label
                                key={dept.id}
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                  scope.departmentIds?.includes(dept.id)
                                    ? 'bg-teal-100 border-teal-500 text-teal-800'
                                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={scope.departmentIds?.includes(dept.id) || false}
                                  onChange={(e) => {
                                    const newDeptIds = e.target.checked
                                      ? [...(scope.departmentIds || []), dept.id]
                                      : (scope.departmentIds || []).filter(id => id !== dept.id);
                                    setScope({ ...scope, departmentIds: newDeptIds });
                                    setHasChanges(true);
                                  }}
                                  disabled={isManager || currentLanguage !== 'en'}
                                  className="sr-only"
                                />
                                <span className="text-sm font-medium">{dept.name}</span>
                                {site && <span className="text-xs text-gray-500 ml-1">({site.name})</span>}
                              </label>
                            );
                          })}
                        </div>
                        {(scope.departmentIds?.length || 0) === 0 && (
                          <p className="text-xs text-amber-600 mt-2">Select at least one department for auto-assignment</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "assignment" && !isManager && (
              <div className="flex flex-col pb-24">
                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-lg border-2 border-indigo-100 p-6 mb-6 overflow-hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-xl">
                        <User className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Course Assignments</h2>
                        <p className="text-sm text-gray-600">Assign this course to users, roles, sites, or departments with due dates</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsResolveModalOpen(true)}
                        className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border-2 border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        Resolve Preview
                      </button>
                      <Button variant="primary" onClick={handleCreateAssignment}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Assignment
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Assignments Table */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-bold text-gray-900">Current Assignments ({assignments.length})</h3>
                  </div>
                  {assignments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mx-6 my-6">
                      <p className="text-sm font-medium">No assignments yet. Click "New Assignment" to create one.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Target</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {assignments.map((assignment) => (
                            <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                    assignment.target.type === 'user' ? 'bg-indigo-100 text-indigo-700' :
                                    assignment.target.type === 'role' ? 'bg-purple-100 text-purple-700' :
                                    assignment.target.type === 'site' ? 'bg-sky-100 text-sky-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {assignment.target.type.toUpperCase()}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">{getAssignmentLabel(assignment)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {assignment.dueAt ? (
                                  <span className="text-sm text-gray-900">{formatDate(assignment.dueAt)}</span>
                                ) : (
                                  <span className="text-sm text-gray-400">No due date</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-500">{formatDate(assignment.updatedAt)}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleEditAssignment(assignment)}
                                    className="text-indigo-600 hover:text-indigo-900 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                    className="text-red-600 hover:text-red-900 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "assignment" && isManager && (
              <div className="flex flex-col pb-24">
                {/* Read-only Banner */}
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <User className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-amber-900 mb-1">Read-Only View</h3>
                      <p className="text-xs text-amber-700">You can view assignments and resolved users for your scope, but cannot create or delete assignments.</p>
                    </div>
                  </div>
                </div>

                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-lg border-2 border-indigo-100 p-6 mb-6 overflow-hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-xl">
                        <User className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Course Assignments</h2>
                        <p className="text-sm text-gray-600">View assignments for this course</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsResolveModalOpen(true)}
                      className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border-2 border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      Resolve Preview
                    </button>
                  </div>
                </div>

                {/* Assignments Table */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <h3 className="text-lg font-bold text-gray-900">Current Assignments ({assignments.length})</h3>
                  </div>
                  {assignments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mx-6 my-6">
                      <p className="text-sm font-medium">No assignments found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Target</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {assignments.map((assignment) => (
                            <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                    assignment.target.type === 'user' ? 'bg-indigo-100 text-indigo-700' :
                                    assignment.target.type === 'role' ? 'bg-purple-100 text-purple-700' :
                                    assignment.target.type === 'site' ? 'bg-sky-100 text-sky-700' :
                                    'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {assignment.target.type.toUpperCase()}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">{getAssignmentLabel(assignment)}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {assignment.dueAt ? (
                                  <span className="text-sm text-gray-900">{formatDate(assignment.dueAt)}</span>
                                ) : (
                                  <span className="text-sm text-gray-400">No due date</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-500">{formatDate(assignment.updatedAt)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
          </div>
          {/* Right: AI Agent Panel — full height, collapsible */}
          {agentPanelOpen ? (
            <div className="w-[38%] min-w-[340px] flex-shrink-0 border-l border-gray-200 bg-white transition-all duration-300 ease-in-out">
              <div className="h-[calc(100vh-56px)] overflow-hidden">
                <ChatArea
                  messages={chatMessages}
                  isTyping={isChatTyping}
                  inputValue={chatInput}
                  onInputChange={setChatInput}
                  onSend={handleChatSend}
                  mode="editor"
                  courseTitle={title || "Untitled Course"}
                  userName={currentUser.firstName}
                  onCollapse={() => setAgentPanelOpen(false)}
                />
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 border-l border-gray-200 bg-white">
              <div className="h-[calc(100vh-56px)] flex flex-col items-center pt-3 px-1.5">
                <button
                  onClick={() => setAgentPanelOpen(true)}
                  className="group flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Open AI Assistant"
                >
                  <PanelRightOpen className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </button>
                <button
                  onClick={() => setAgentPanelOpen(true)}
                  className="mt-2 group"
                  title="Open AI Assistant"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 group-hover:text-blue-500 transition-colors [writing-mode:vertical-lr] tracking-wider uppercase">
                      AI Assistant
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>

      {/* Phase II 1H.4: Assignment Modals */}
      <CourseAssignmentModal
        courseId={courseId}
        assignment={editingAssignment}
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setEditingAssignment(null);
        }}
        onSave={handleAssignmentSaved}
      />

      <AssignmentResolveModal
        courseId={courseId}
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
      />

      {/* Epic 1G.4: History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entityType={historyEntity?.type || 'course'}
        entityId={historyEntity?.id || courseId}
        isReadOnly={isManager}
      />

      {/* Epic 1G.7: Standards Edit Modal */}
      <StandardsEditModal
        isOpen={isStandardsModalOpen}
        onClose={() => setIsStandardsModalOpen(false)}
        standards={course?.metadata?.standards}
        onSave={handleSaveStandards}
        isReadOnly={isManager}
      />

      {/* Phase II — 1M.1: New Skill Modal */}
      <Modal
        isOpen={isNewSkillModalOpen}
        onClose={() => {
          setIsNewSkillModalOpen(false);
          setNewSkillName("");
          setNewSkillCategory("");
        }}
        title="Create New Skill"
        size="small"
      >
        <div className="px-6 py-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Skill Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g., Lockout/Tagout"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-xs font-normal text-gray-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
                placeholder="e.g., Safety, Equipment, Compliance"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium hover:border-gray-300"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsNewSkillModalOpen(false);
                  setNewSkillName("");
                  setNewSkillCategory("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateSkill}
                disabled={!newSkillName.trim()}
              >
                Create Skill
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => { setIsRejectModalOpen(false); setRejectNotes(""); }}
        title="Reject AI-Generated Course"
        size="small"
      >
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-gray-600">Please provide notes on why this course is being rejected. This helps improve future AI generations.</p>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="e.g., Content accuracy issues, missing key topics, incorrect difficulty level..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-sm resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setIsRejectModalOpen(false); setRejectNotes(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectNotes.trim()}
              onClick={() => {
                updateCourse(courseId, { status: "rejected", reviewNotes: rejectNotes.trim(), reviewedByUserId: currentUser.id, reviewedAt: new Date().toISOString() });
                createSynthesisHistory({
                  draftId: courseId,
                  synthesisType: course?.synthesisType || "full-course",
                  status: "success",
                  sourceCount: course?.sourceIds?.length ?? 0,
                  lessonCount: lessons.length,
                  generatedByUserId: course?.ownerUserId || "unknown",
                  generatedTitle: course?.title || "",
                  outcome: "rejected",
                });
                setIsRejectModalOpen(false);
                setRejectNotes("");
              }}
            >
              Reject Course
            </Button>
          </div>
        </div>
      </Modal>

      {/* Conversation History Modal */}
      <Modal
        isOpen={isConversationModalOpen}
        onClose={() => setIsConversationModalOpen(false)}
        title="AI Generation Conversation"
        size="large"
      >
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {course?.conversationHistory && course.conversationHistory.length > 0 ? (
            <div className="space-y-4">
              {course.conversationHistory.filter(m => m.role !== "system").map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    msg.role === "user" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                  }`}>
                    {msg.role === "user" ? "U" : "AI"}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-xs mt-1.5 ${msg.role === "user" ? "text-blue-200" : "text-gray-400"}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No conversation history available.</p>
          )}
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </RouteGuard>
  );
}
