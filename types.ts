// Phase I Epic 1 & 2: Core type definitions for UpKeep Learn

export type Role = "ADMIN" | "MANAGER" | "LEARNER";

export interface OrgSettings {
  timezone: string;
  dateFormat: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";
  primaryLanguage?: string;
  secondaryLanguages?: string[];
  autoGenerate?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  settings: OrgSettings;
  styleGuide?: OrgStyleGuide;
}

export interface Site {
  id: string;
  name: string;
  region?: string;  // Geographic region, e.g., "Midwest", "Northeast"
  organizationId: string;
}

export interface Department {
  id: string;
  name: string;
  siteId: string;
}

export type Scope = {
  siteId: string; // "ALL" or site ID
  deptId: string; // "ALL" or dept ID
};

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  jobTitleId?: string;    // Reference to a JobTitle entity
  jobTitleText?: string;  // Free-text fallback (e.g., "Forklift Operator", "Safety Coordinator")
  siteId?: string;
  departmentId?: string;
  managerId?: string;
  active: boolean;
}

// Explicit access grants (for cross-team visibility beyond direct reports)
export type AccessGrantRelationship = "co-manager" | "matrix" | "coverage" | "mentor";

export interface UserAccessGrant {
  id: string;
  userId: string;           // Who gets access
  siteId?: string;          // Access to entire site (optional)
  departmentId?: string;    // Access to specific department (optional)
  grantedBy: string;        // Admin/manager who granted
  reason?: string;          // "Coverage for Q4", "VP oversight", etc.
  createdAt: string;
}

// Secondary/additional managers (many-to-many management relationships)
export interface UserAdditionalManager {
  id: string;
  userId: string;           // The employee being managed
  managerId: string;        // The additional manager
  relationship: AccessGrantRelationship;
  createdAt: string;
}

// Helper function to get full name
export function getFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

export interface NavItem {
  label: string;
  path: string;
  children?: NavItem[];
}

// Phase I Epic 2: Training & Compliance types

export interface TrainingAssignment {
  roles?: Role[];
  sites?: string[];
  departments?: string[];
  users?: string[];
}

// Training category and status types for filtering
export type TrainingCategory = "Safety" | "Compliance" | "Onboarding" | "Technical" | "HR" | "Other";
export type TrainingStatus = "active" | "draft" | "archived";
export type TrainingFormat = "in-person" | "classroom" | "on-site" | "third-party-online" | "other";

export interface Training {
  id: string;
  title: string;
  description?: string;
  standardRef?: string;
  assignment: TrainingAssignment;
  retrainIntervalDays?: number;
  ownerManagerId?: string;
  policyUrl?: string;
  policy?: string; // Phase II 1H.4: Support shadow trainings (e.g., 'LMS-COURSE')
  courseId?: string; // Phase II 1H.4: Link to course if training is course-based
  category?: TrainingCategory;
  status: TrainingStatus;
  tags?: string[];
  vendor?: string; // Third-party vendor/provider of the training
  contentUrl?: string; // URL link or uploaded file path for training content/materials
  trainingFormat?: TrainingFormat;
  trainingFormatOther?: string;
  createdAt: string;
  updatedAt: string;
  // Skills V2: What skills completing this training grants
  skillsGranted?: Array<{
    skillId: string;
    level?: number;
    evidenceRequired: boolean;
  }>;
  // Skills V2: What skills needed to take this training
  skillsRequired?: Array<{
    skillId: string;
    level?: number;
    required: boolean;
  }>;
}

export type CompletionStatus = "ASSIGNED" | "COMPLETED" | "OVERDUE" | "EXEMPT";

export interface TrainingCompletion {
  id: string;
  trainingId: string;
  userId: string;
  status: CompletionStatus;
  dueAt: string;
  completedAt?: string;
  expiresAt?: string;
  overdueDays?: number;
  notes?: string;
  proofUrl?: string;
  exemptionReason?: string;
  exemptionAttestedBy?: string;
  exemptionAttestedAt?: string;
  assignedManagerId?: string;
  courseId?: string; // Phase II: Link to course if training is course-based
}

// Phase I Epic 3: Reminders & Escalation types

export type ReminderTrigger = "upcoming" | "overdue" | "retraining";

export interface ReminderRule {
  id: string;
  name: string;
  trigger: ReminderTrigger;
  offsetDays: number;
  escalationAfterDays?: number;
  active: boolean;
}

export interface EscalationLog {
  id: string;
  trainingCompletionId: string;
  triggeredAt: string;
  escalatedToUserId: string;
  resolved: boolean;
}

export type NotificationType = "reminder" | "escalation";
export type NotificationSource = "Compliance" | "Coach" | "Manual";
export type Audience = "MANAGERS" | "LEARNERS" | "SPECIFIC";

export interface Notification {
  id: string;
  type?: NotificationType; // Legacy field, optional
  recipientId?: string; // Legacy field, optional
  message?: string; // Legacy field, optional
  createdAt?: string; // Legacy field, optional
  sentAt: string;
  senderId: string; // Who sent it
  audience: Audience; // Target audience type
  subject: string;
  body: string;
  source: NotificationSource;
  recipients: Array<{ userId: string; name: string; email: string }>;
  scopeSnapshot?: { siteId: string; deptId: string; siteName?: string; deptName?: string };
  contextSnapshot?: {
    departmentName?: string;
    siteName?: string;
    countOverdue: number;
    dueSoonCount: number;
    topTrainingTitle?: string;
    nearestDueDate?: string;
    onTimePct?: number;
  };
  status: "SENT";
  metadata?: Record<string, any>;
}

// Phase I Polish Pack: Additional types

// Phase II 1H.3: Updated ChangeLog to support multiple entity types
// Phase II 1H.4: Added CourseAssignment entity
export type ChangeLog = {
  id: string;
  entity: "TrainingCompletion" | "Certificate" | "CertificateTemplate" | "CourseAssignment" | "QuizAttempt";
  entityId: string;
  byUserId: string;
  at: string;
  summary: string;
  metadata?: Record<string, any>;
};

export interface AuditSnapshot {
  id: string;
  createdAt: string;
  createdByUserId: string;
  filtersSummary: string;
  filters: {
    site?: string;
    department?: string;
    training?: string;
    status?: string;
    search?: string;
  };
  rows: TrainingCompletion[];
  rowCount: number;
}

// Phase II 1H.3: Certificate Template type
export interface CertificateTemplate {
  id: string;
  name: string;
  isDefault?: boolean;
  backgroundUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  showOrgLogo?: boolean;
  showSignatures?: boolean;
  fields: {
    showCourseTitle?: boolean;
    showUserName?: boolean;
    showIssuedAt?: boolean;
    showSerial?: boolean;
    showCustomText?: boolean;
    customText?: string;
  };
  signatures?: Array<{ title: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationTemplate {
  id: string;
  type: "upcoming" | "overdue" | "escalation";
  subject: string;
  body: string;
}

// Phase II Epic 1 Fix Pass: Complete Course Library types with proper timestamps and relationships

// Base type for all timestamped entities
export type Timestamped = {
  createdAt: string;
  updatedAt: string;
};

// Phase II — 1M.1: Skills Tagging
export interface Skill extends Timestamped {
  id: string;
  name: string;
  category?: string; // optional: "Safety", "Equipment", "Compliance", "Emergency"
}

// Phase II — 1N.3: Library types
export type LibraryItemType = "file" | "link";
export type LibraryItemFileType = "pdf" | "ppt" | "pptx" | "doc" | "docx" | "image" | "video" | "other";
export type LibraryItemSource = "upload" | "loom" | "teams" | "youtube" | "vimeo" | "sharepoint" | "drive" | "other";

export interface LibraryItem extends Timestamped {
  id: string;
  type: LibraryItemType;
  title: string;
  description?: string;
  tags: string[];           // free-form tags
  categories: string[];     // hierarchical labels optional (e.g., ["Safety","PPE"])
  fileType?: LibraryItemFileType;
  url?: string;             // for links OR blob/object URL for files in prototype
  source?: LibraryItemSource;
  durationSec?: number;     // optional if known (video)
  pages?: number;           // optional if known (pdf)
  siteId?: string;          // optional scope tag
  departmentId?: string;    // optional scope tag
  createdByUserId: string;
  archivedAt?: string;
  version: number;
  parentId?: string;        // if this is a new version of another LibraryItem
  checksum?: string;        // used for dedupe (string hash of file name+size)
  // File upload metadata (for files)
  fileName?: string;
  fileSize?: number;       // bytes
  mimeType?: string;

  // Knowledge Source / Synthesis metadata (Phase II)
  sourceType?: "policy" | "sop" | "manual" | "regulation" | "text";
  content?: string;              // For pasted text/Markdown content
  regulatoryRef?: string;        // "OSHA 1910.147", "ISO 9001"
  allowedForSynthesis?: boolean; // Can AI use this for training synthesis? (undefined = false)
}

// Course Policy configuration
export interface CoursePolicy {
  progression: "linear" | "free";
  requireAllLessons: boolean;
  requirePassingQuiz: boolean;
  enableRetakes: boolean;
  lockNextUntilPrevious: boolean;
  showExplanations: boolean;
  requiresManualCompletion?: boolean; // Phase II 1H.1b: If true, show "Mark Complete" button; if false, allow auto-complete
  minVideoWatchPct?: number;
  minTimeOnLessonSec?: number;
  maxQuizAttempts?: number;
  retakeCooldownMin?: number;
  // Phase II 1H.2d: Quiz pass to completion
  requireQuizPassToCompleteLesson?: boolean; // default: false
  requireAllLessonsToCompleteCourse?: boolean; // default: true
  passingScorePct?: number; // optional course-level override for quizzes
  issueCertificateOnComplete?: boolean; // default: true
  minScoreForCertificatePct?: number; // optional threshold
  // Reminder Cadence Settings
  retrainIntervalDays?: number;        // e.g., 365 (yearly), 180 (6 months) - how often course must be retaken
  reminderEnabled?: boolean;           // Toggle reminders on/off
  reminderDaysBefore?: number[];       // e.g., [30, 15, 7, 1] - days before expiration to send reminders
}

// Course Scope - defines who should be assigned this course
export interface CourseScope {
  type: "company-wide" | "site" | "department" | "custom";
  siteIds?: string[];
  departmentIds?: string[];
}

// Course entity
export type CourseStatus = "draft" | "published" | "ai-draft" | "in-review" | "rejected" | "generating";

export interface Course extends Timestamped {
  id: string;
  title: string;
  description: string;
  category?: string;
  estimatedMinutes?: number;
  status: CourseStatus;
  outputFormat?: OutputFormat;
  tags?: string[];
  standards?: string[];
  skills?: string[]; // Phase II — 1M.1: array of Skill IDs
  policy?: CoursePolicy;
  ownerUserId?: string;
  lessonIds: string[];
  quizId?: string;
  ai?: { source: "AI"; origin: "prompt" | "file" }; // Epic 1G: AI generation metadata
  metadata?: CourseMetadata; // Epic 1G.7: AI-enhanced metadata
  scope?: CourseScope; // Assignment scope for new user onboarding
  // Skills V2: What skills completing this course grants
  skillsGranted?: Array<{
    skillId: string;
    level?: number;
    evidenceRequired: boolean;
  }>;
  // Skills V2: What skills needed to take this course
  skillsRequired?: Array<{
    skillId: string;
    level?: number;
    required: boolean;
  }>;

  // AI Generation metadata (populated when aiGenerated === true)
  aiGenerated?: boolean;
  synthesisType?: SynthesisType;
  sourceIds?: string[];                // Library item IDs used for generation
  sourceAttributions?: string[];       // Library item titles (for display)
  conversationHistory?: ChatMessage[]; // Full chat log from generation
  confidenceScore?: number;            // 0-1 AI confidence
  suggestedSkillIds?: string[];        // AI-suggested skills
  reviewNotes?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
}

// Lesson entity
// Knowledge check — low-stakes inline question within a lesson
export interface KnowledgeCheck {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false";
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
}

export interface Slide {
  id: string;
  layoutType: 'title' | 'content' | 'two-column' | 'image-focus' | 'key-point' | 'comparison' | 'quote';
  title: string;
  body: string;
  speakerNotes?: string;
  imageUrl?: string;
}

export interface NarrationData {
  script: string;
  audioDurationSeconds: number;
  slides: Slide[];
}

export interface KnowledgeCheckData {
  question: string;
  type: 'multiple-choice' | 'true-false' | 'scenario';
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface DownloadableResource {
  title: string;
  url: string;
  fileType: string;
}

export interface Lesson extends Timestamped {
  id: string;
  courseId: string;
  title: string;
  order: number;
  resourceIds: string[];
  sourceAttributions?: string[];
  knowledgeChecks?: KnowledgeCheck[];
  estimatedMinutes?: number;
  lessonType?: "lesson" | "assessment";
  downloadableResources?: DownloadableResource[];
}

// Resource entity (attached to lessons)
export type ResourceType = "pdf" | "link" | "text" | "image" | "video" | "slides" | "narrated-walkthrough" | "knowledge-check";

export interface Resource extends Timestamped {
  id: string;
  courseId: string;       // denormalized for easier queries
  lessonId: string;
  type: ResourceType;
  title: string;
  url?: string;
  content?: string;
  durationSec?: number;
  // File upload metadata
  fileName?: string;
  fileSize?: number;      // bytes
  mimeType?: string;
  order: number;          // stable ordering within lesson (0, 1, 2, ...)
  // Epic 1G.8: Style lint metadata
  metadata?: {
    ignoredLints?: IgnoredLint[];
  };
  // Phase II — 1N.3: Library integration
  libraryItemId?: string; // Links to LibraryItem if this resource came from Library
  // Q2: New content type data
  slides?: Slide[];
  narrationData?: NarrationData;
  knowledgeCheckData?: KnowledgeCheckData;
}

// UI alias: Resource data is displayed as "Sections" in the lesson editor
export type Section = Resource;

// Quiz entity (Epic 1G.6: Updated structure)
export type QuestionType = "mcq" | "true_false" | "scenario" | "shorttext" | "multiselect" | "numeric" | "ordering"; // Phase II 1H.2b: Added multiselect, numeric, ordering

export interface QuestionOption {
  id: string;         // opt_<id>
  text: string;       // option text
  correct: boolean;
}

export interface QuestionMeta {
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: { type: 'section' | 'lesson' | 'course', id: string } | 'AI' | 'Manual'; // provenance or AI/Manual indicator
  rationale?: string; // explanation for answer
  language?: string;  // e.g., 'en', 'es'
  tags?: string[];
  confidenceScore?: number; // Phase II 1I.2: AI confidence score (0-1)
  bloomsLevel?: 'knowledge' | 'comprehension' | 'application' | 'analysis'; // Phase II 1I.2: Bloom's taxonomy level
}

export interface Question {
  id: string;                 // q_<id>
  type: QuestionType;
  prompt: string;             // HTML or plain text
  options?: QuestionOption[]; // required for 'mcq', 'scenario', 'multiselect', 'ordering'
  answer?: boolean;           // required for 'true_false'
  correctAnswerText?: string; // Phase II 1H.2a: For shorttext questions
  required?: boolean;         // Phase II 1H.2b: default true
  points?: number;            // Phase II 1H.2b: default 1
  explanation?: string;       // Phase II 1H.2b: shown in result detail
  // Phase II 1H.2b: For multiselect
  grading?: {
    mode: 'all-or-nothing' | 'partial';
  };
  // Phase II 1H.2b: For numeric
  correctNumber?: number;
  tolerance?: number;         // e.g., ±0.5
  // Phase II 1H.2b: For ordering
  correctOrder?: string[];    // array of option IDs in correct sequence
  meta?: QuestionMeta;
  createdAt: string;
  updatedAt: string;
  // Legacy field for backward compatibility during migration
  quizId?: string;            // deprecated: questions now inline in Quiz
}

export interface QuizConfig {
  passingScore: number;       // 0–100
  maxAttempts?: number;       // optional for later
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showRationales?: boolean;   // for author preview
}

// Phase II 1I.1: Quiz Policy (new structure)
export type QuizPolicy = {
  passingScorePct: number;       // e.g., 80
  maxAttempts?: number;          // undefined = unlimited
  showFeedback: 'immediate' | 'end' | 'none';
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  lockOnPass?: boolean;          // hides quiz once passed
};

export interface Quiz extends Timestamped {
  id: string;                 // quiz_<id>
  courseId: string;
  lessonId?: string;          // optional lesson-level quiz
  title: string;
  description?: string;       // Phase II 1H.2b: Optional description
  questions: Question[];     // inline questions (replaces questionIds)
  config: QuizConfig;         // Legacy: kept for backward compatibility
  policy?: QuizPolicy;        // Phase II 1I.1: New policy structure
  showResultDetail?: boolean; // Phase II 1H.2b: default true
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility during migration
  passingScorePct?: number;  // deprecated: use config.passingScore or policy.passingScorePct
  maxAttempts?: number;       // deprecated: use config.maxAttempts or policy.maxAttempts
  questionIds?: string[];     // deprecated: use questions array
}

// Phase II 1H.4: Course Assignment (supports user/role/site/dept targeting with arrays)
export type CourseAssignmentTarget =
  | { type: "user"; userIds: string[] }
  | { type: "role"; roles: Array<"ADMIN" | "MANAGER" | "LEARNER">; siteIds?: string[]; departmentIds?: string[] }
  | { type: "site"; siteIds: string[] }
  | { type: "department"; departmentIds: string[] };

export interface CourseAssignment extends Timestamped {
  id: string;
  courseId: string;
  target: CourseAssignmentTarget;
  dueAt?: string;
  assignerUserId: string;
  notes?: string;
}

// Progress tracking for courses
export interface ProgressCourse extends Timestamped {
  id: string;
  courseId: string;
  userId: string;
  status: "not_started" | "in_progress" | "completed";
  lessonDoneCount: number;
  lessonTotal: number;
  scorePct?: number;
  attempts?: number;
  completedAt?: string;
  lastLessonId?: string; // Phase II 1H.1b: Resume pointer - last lesson viewed/active
  // Phase II 1H.2d: Enhanced progress tracking
  percentComplete?: number; // Computed 0-100 percentage
  lessonsCompletedCount?: number; // Computed count
  lessonsTotal?: number; // Total lessons (alias for lessonTotal for consistency)
  lastCompletedLessonId?: string; // Most recently completed lesson
  completionReason?: 'all_lessons_complete' | 'admin_override' | 'other'; // Why course was marked complete
}

// Progress tracking for individual lessons
export interface ProgressLesson extends Timestamped {
  id: string;
  lessonId: string;
  userId: string;
  status: "not_started" | "in_progress" | "completed";
  watchPct?: number;
  timeSpentSec?: number;
  scrollDepth?: number; // Phase II 1H.5: Scroll depth (0-1) for text/PDF resources
  startedAt?: string; // Phase II 1H.1b: First view timestamp
  completedAt?: string;
  // Phase II 1H.2d: Quiz attempt tracking
  lastQuizAttemptId?: string; // Links to most recent attempt
  lastPassedQuizAttemptId?: string; // Links to most recent passed attempt
  // Knowledge check persistence
  knowledgeCheckAnswers?: Record<string, string>; // checkId -> selectedOptionId
}

// Course feedback / rating from learners
export interface CourseFeedbackEntry {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  comment?: string;
  submittedAt: string;
}

// Certificate for course completion
export interface Certificate extends Timestamped {
  id: string;
  courseId: string;
  userId: string;
  issuedAt: string;
  expiresAt?: string;
  serial: string;
  // Phase II 1H.2d: Optional display metadata
  courseTitle?: string;
  userName?: string;
  orgName?: string;
  // Phase II 1H.3: Template and PDF support
  templateId?: string;
  pdfUrl?: string;
}

// Phase II 1H.2a: Quiz Attempt tracking
export interface GradedQuestion {
  questionId: string;
  pointsAwarded: number;
  pointsPossible: number;
  correct: boolean;
}

// Phase II 1I.1: Updated QuizAttempt interface
export interface QuizAttempt extends Timestamped {
  id: string;
  quizId: string;
  courseId: string;
  lessonId: string;
  userId: string;
  startedAt: string;
  submittedAt?: string;
  answers: Array<{ questionId: string; value: string | string[] }>;
  scorePct?: number;
  passed?: boolean;
  // Legacy fields for backward compatibility (deprecated)
  correctCount?: number;
  totalCount?: number;
  attemptNumber?: number; // 1-based (deprecated, calculate from attempts array)
  breakdown?: GradedQuestion[]; // Phase II 1H.2b: per-question grading details (deprecated)
}


// Phase II Epic 1G.7: Course Metadata & Style Guide types

export interface CourseStandards {
  osha?: string[];  // e.g., ["1910.178", "1910.147"]
  msha?: string[];  // optional
  epa?: string[];   // optional
  other?: { label: string; codes: string[] }[];
}

export interface CourseMetadata {
  objectives?: string[];     // bullet goals
  tags?: string[];           // normalized, kebab or lowercased
  estimatedMinutes?: number; // total duration estimate
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;         // 'en', 'es', etc.
  languages?: string[];      // Multi-language support
  readingLevel?: 'basic' | 'standard' | 'technical';
  standards?: CourseStandards;
  lastAIReviewAt?: string;   // ISO timestamp
}

export interface OrgStyleGuide {
  tone?: 'plain' | 'professional' | 'friendly';
  bannedTerms?: string[];    // e.g., ["PPE kit", prefer "PPE"]
  preferredTerms?: { term: string; preferred: string }[]; // replacements
  readingLevelTarget?: 'basic' | 'standard' | 'technical';
  glossary?: { term: string; definition: string }[];
}

export interface StyleAuditIssue {
  kind: 'bannedTerm' | 'preferredTerm' | 'readingLevel' | 'tone';
  message: string;
  location?: { lessonId?: string; sectionId?: string };
  suggestion?: string; // for quick-fix
}

// Epic 1G.8: Inline style linting types
export interface IgnoredLint {
  kind: StyleAuditIssue['kind'];
  from: number;      // ProseMirror position
  to: number;        // ProseMirror position
  textHash: string;  // hash of text at that range for remapping
}

// Phase II Epic 1G: AI Course Generation types

export type AIInput = {
  prompt: string;
  audienceLevel?: "Beginner" | "Intermediate" | "Advanced";
  tone?: "Practical" | "Concise" | "Compliance";
  targetDurationMins?: number;
};

export type AICourseDraft = {
  title: string;
  description: string;
  tags: string[];
  estimatedMinutes?: number;
  lessons: Array<{
    title: string;
    sections: Array<{
      kind: "TEXT";
      content: string;
    }>;
  }>;
  quiz?: {
    questions: Array<{
      type: "MULTIPLE_CHOICE";
      question: string;
      options: string[];
      correctIndex: number;
      rationale?: string;
    }>;
  };
  aiMeta: {
    source: "AI";
    origin: "prompt" | "file";
    modelHint?: string;
    confidence?: number;
  };
  previewInsights?: AIPreviewInsights;
};

// Epic 1G.3: Preview-only types for AI workspace
export type PreviewSection = {
  kind: "TEXT";
  content: string;
  ai?: {
    generated: boolean;
    lastAction?: "generate" | "regenerate" | "simplify" | "expand";
  };
  _history?: string[]; // Local-only for undo
};

export type AIPreviewInsights = {
  extractedTopics: string[];
  detectedHazards: string[];
  confidence?: number; // 0-1
  source: {
    origin: "prompt" | "file";
    filename?: string;
    prompt?: string;
  };
};

// Epic 1G.4: Audit & Versioning Types

export type AiAction =
  | 'ai_generate_course'
  | 'ai_generate_from_file'
  | 'ai_regenerate'
  | 'ai_rewrite'
  | 'ai_expand'
  | 'ai_simplify'
  | 'ai_add_quiz'
  | 'ai_autofill_metadata'
  | 'style_fix'
  | 'style_fix_inline'
  | 'style_adjust_tone'
  | 'insert_glossary_callout'
  | 'style_fix_bulk'
  | 'style_guide_updated_inline';

export type VersionedEntityType = 'course' | 'lesson' | 'section';

// Version Snapshot - Point-in-time capture of an entity
export interface VersionSnapshot {
  id: string;              // vsn_<ts>_<rand>
  entityType: VersionedEntityType;
  entityId: string;        // id of course|lesson|section
  parentCourseId?: string; // helpful for lesson/section
  createdAt: string;       // ISO timestamp
  createdBy: string;       // userId
  cause: 'manual' | 'ai';
  aiAction?: AiAction;     // when cause === 'ai'
  summary: string;         // short "what changed"
  payload: any;            // deep clone of the entity
}

// Audit Event - Log entry for actions
export interface AuditEvent {
  id: string;              // aud_<ts>_<rand>
  at: string;              // ISO timestamp
  byUserId: string;
  entityType: VersionedEntityType;
  entityId: string;
  parentCourseId?: string;
  action: AiAction | 'manual_edit' | 'undo' | 'redo' | 'assign' | 'unassign';
  meta?: Record<string, any>; // prompt, fileName, tokens, etc.
}

// ============================================================================
// SKILLS V2 TYPES (New Implementation - Surgical Rebuild)
// ============================================================================

export interface SkillV2 extends Timestamped {
  id: string;                           // "skl_<timestamp>" or existing IDs
  name: string;                         // "LOTO Certified", "Forklift Operation"
  category?: string;                    // "Safety", "Equipment", "Compliance", "Technical"
  type: "skill" | "certification";      // Certification = requires renewal
  expiryDays?: number;                  // For certifications: days until expiry
  requiresEvidence: boolean;            // Does completion need proof?
  requiresAssessment: boolean;          // Must pass quiz/test to earn?
  description?: string;
  regulatoryRef?: string;               // "OSHA 1910.147", "EPA 608"
  level?: number;                       // Optional: 1=basic, 2=intermediate, 3=advanced
  prerequisiteSkillIds?: string[];      // Optional: skills needed before earning this one
  active: boolean;                      // Can be granted/used
}

export type UserSkillStatus = "active" | "expired" | "pending" | "revoked" | "suspended" | "renewing" | "expiring";
export type EvidenceType = "training" | "course" | "manual" | "import" | "assessment";

export interface UserSkillRecord extends Timestamped {
  id: string;                           // "usr_<timestamp>_<userId>_<skillId>"
  userId: string;
  skillId: string;                      // References SkillV2

  // Lifecycle
  status: UserSkillStatus;
  achievedDate?: string;                // ISO date when earned
  expiryDate?: string;                  // ISO date when expires (auto-calculated)
  renewalDate?: string;                 // When user must renew by
  revokedDate?: string;
  revokedReason?: string;

  // Provenance (how they got this skill)
  evidenceType: EvidenceType;
  evidenceId?: string;                  // trainingId, courseId, or assessmentId
  evidenceUrl?: string;                 // Link to proof document (upload)

  // Validation
  verifiedByUserId?: string;            // Who verified/granted this
  verificationDate?: string;

  // Optional: Competency level
  level?: number;                       // If skill has levels
  assessmentScore?: number;             // Quiz/test score when earned

  // Admin
  notes?: string;

  // Suspension (set by OperationalSignal)
  suspendedAt?: string;
  suspendedReason?: string;
  suspendedBySignalId?: string;
  renewalTrainingId?: string;
  contentCurrencyAtRenewal?: number;
}

export type EnforcementMode = "none" | "warn" | "block";

export interface RoleSkillRequirement extends Timestamped {
  id: string;                           // "rsr_<timestamp>"
  siteId?: string;                      // Scope: specific site (undefined = all sites)
  departmentId?: string;                // Scope: specific department (undefined = all depts)
  jobTitle?: string;                    // Scope: specific job title (undefined = all titles)
  skillId: string;                      // References SkillV2
  required: boolean;                    // Is this mandatory?
  level?: number;                       // Minimum level required
  enforcementMode: EnforcementMode;     // Future: gate actions if missing
  gracePeriodDays?: number;             // Days allowed to complete after hire
}

export type WorkContextType = "asset_type" | "work_order_type" | "permit_type" | "inspection_type" | "training_type";

export interface WorkContextSkillRequirement extends Timestamped {
  id: string;                           // "wsr_<timestamp>"
  contextType: WorkContextType;
  contextKey: string;                   // "LOTO", "ConfinedSpace", "HotWork", "HVAC"
  skillId: string;                      // References SkillV2
  required: boolean;
  level?: number;
  enforcementMode: EnforcementMode;
}

// ============================================================================
// LEARNING SYNTHESIS ENGINE TYPES (Phase II)
// ============================================================================

export type SynthesisType = "micro-lesson" | "full-course" | "onboarding-path" | "toolbox-talk" | "refresher" | "what-changed" | "assessment-only";
export type OutputFormat = "reading" | "presentation" | "mixed";
export type DraftStatus = "pending" | "approved" | "rejected" | "published";

export interface GeneratedQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedLesson {
  title: string;
  description: string;
  contentType: "text" | "video" | "quiz" | "interactive";
  content: string;                      // Markdown content
  duration: number;                     // Minutes
  skillsAddressed?: string[];           // Skill IDs
  quizQuestions?: GeneratedQuiz[];
  sourceAttributions?: string[];        // Library item IDs this lesson drew from
}export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachedOutline?: GeneratedLesson[];
  attachedSources?: string[];           // Library item IDs referenced
}

export interface SynthesisDraft extends Timestamped {
  id: string;                           // "draft_<timestamp>"
  synthesisType: SynthesisType;
  status: DraftStatus;

  // Context (from the generation form)
  sourceIds: string[];                  // LibraryItem IDs used for synthesis
  targetRole?: string;                  // "ADMIN" | "MANAGER" | "LEARNER"
  targetSkillId?: string;               // Skill this training should grant
  targetContext?: string;               // Work context (LOTO, ConfinedSpace, etc.)
  industryContext?: string;

  // Conversation
  conversationHistory: ChatMessage[];   // Full chat log with agent

  // Generated Output
  generatedTitle?: string;
  generatedDescription?: string;
  generatedLessons?: GeneratedLesson[];
  suggestedSkillIds?: string[];         // AI-suggested skills to link
  confidenceScore?: number;             // 0-1

  // Review
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Publishing
  publishedCourseId?: string;           // Links to Course once published
  publishedAt?: string;

  // Audit
  generatedByUserId: string;
}

export interface SynthesisHistory extends Timestamped {
  id: string;                           // "syn_<timestamp>"
  draftId: string;
  synthesisType: SynthesisType;
  status: "success" | "failed";

  // Metadata
  sourceCount: number;
  lessonCount: number;
  generatedByUserId: string;
  generatedTitle?: string;
  generationTimeMs?: number;

  // Outcome
  outcome?: "approved" | "rejected" | "pending";
  publishedCourseId?: string;
}

export interface AISynthesisSettings {
  defaultSynthesisType: SynthesisType;
  defaultIndustry: string;
  complianceStrictness: "standard" | "strict" | "maximum";
  defaultTone: "professional" | "conversational" | "technical";
  autoSuggestSkills: boolean;
  includeQuizzes: boolean;
  maxLessonsPerCourse: number;
}

// ============================================================================
// ORGANIZATION PROFILE (singleton)
// ============================================================================

export interface OrganizationProfile {
  companyName: string;
  industry: string;
  industrySubtype: string;
  companySize: string;
  description: string;
  primaryCountry: string;
  stateRegion: string;
  additionalCountries: string[];
  primaryLanguage: string;
  additionalLanguages: string[];
  regulatoryFrameworks: string[];
  otherRegulations: string;
  defaultPassingScore: number;
  defaultRecertPeriod: string;
  trainingLanguageReq: string;
  customAIInstructions: string;
  updatedAt: string;
  updatedByUserId: string;
}

// ============================================================================
// JOB TITLE TYPES
// ============================================================================

export type SkillPriority = "critical" | "high" | "medium" | "low";

export interface JobTitleSkillRequirement {
  skillId: string;
  required: boolean;
  priority: SkillPriority;
  targetTimelineDays: number;
  notes?: string;
}

export interface JobTitle extends Timestamped {
  id: string;
  name: string;
  department: string;
  site: string;
  description: string;
  requiredSkills: JobTitleSkillRequirement[];
  onboardingPathId?: string;
  active: boolean;
}

// Computed result for user skill gap analysis
export interface UserSkillGapResult {
  required: JobTitleSkillRequirement[];
  gaps: JobTitleSkillRequirement[];
  covered: JobTitleSkillRequirement[];
  compliancePct: number;
}

// ============================================================================
// ONBOARDING PATH TYPES
// ============================================================================

export type OnboardingPathStatus = "draft" | "published" | "archived";

export interface OnboardingPhaseCourse {
  id: string;
  title: string;
  category: string;
  estimatedMinutes: number;
  skillsGranted: string[];
  sourceAttributions: string[];
  passingScore?: number;
  lessons: { title: string; estimatedMinutes: number; isAssessment: boolean }[];
}

export interface OnboardingPhase {
  id: string;
  name: string;
  description: string;
  timeline: string;
  dayStart: number;
  dayEnd: number;
  courses: OnboardingPhaseCourse[];
}

export interface OnboardingPath extends Timestamped {
  id: string;
  jobTitleId: string;
  title: string;
  description: string;
  status: OnboardingPathStatus;
  durationDays: number;
  totalEstimatedMinutes: number;
  phases: OnboardingPhase[];
  skillsCovered: string[];
  skillsGap: string[];
  confidenceScore: number;
  sourceIds: string[];
  additionalInstructions?: string;
  industryContext?: string;
  generatedByUserId: string;
  publishedAt?: string;
  publishedByUserId?: string;
}

export type OnboardingAssignmentStatus = "active" | "completed" | "cancelled";
export type OnboardingPhaseStatus = "locked" | "in_progress" | "completed";

export interface OnboardingAssignment extends Timestamped {
  id: string;
  pathId: string;
  userId: string;
  status: OnboardingAssignmentStatus;
  startDate: string;
  completedAt?: string;
  phaseProgress: {
    phaseId: string;
    status: OnboardingPhaseStatus;
    coursesCompleted: number;
    coursesTotal: number;
  }[];
  skillsEarned: string[];
  assignedByUserId: string;
}

// ============================================================================
// OPERATIONAL SIGNALS
// ============================================================================

export type SignalType =
  | "incident"
  | "near_miss"
  | "regulatory_change"
  | "source_update"
  | "equipment_change"
  | "process_change"
  | "assessment_anomaly";

export type SignalSeverity = "critical" | "high" | "medium" | "low";

export type SignalStatus = "open" | "acknowledged" | "training_generated" | "resolved";

export type RecommendedAction =
  | "individual_retraining"
  | "corrective_training"
  | "micro_lesson"
  | "content_review"
  | "delta_renewal"
  | "full_regeneration"
  | "none";

export interface OperationalSignal extends Timestamped {
  id: string;
  type: SignalType;
  severity: SignalSeverity;
  status: SignalStatus;

  title: string;
  description: string;
  occurredAt: string;

  affectedSkillIds: string[];
  affectedSiteId?: string;
  affectedDepartmentId?: string;
  affectedRoleIds?: string[];
  affectedAssetId?: string;

  involvedUserIds?: string[];
  incidentWorkContext?: string;

  regulatoryRef?: string;
  effectiveDate?: string;

  sourceId?: string;
  previousVersion?: number;
  newVersion?: number;

  recommendedAction: RecommendedAction;
  recommendedActionReason?: string;

  acknowledgedByUserId?: string;
  acknowledgedAt?: string;
  trainingIds?: string[];
  resolvedAt?: string;
  resolutionNotes?: string;

  reportedByUserId: string;
}

// ============================================================================
// CONTENT CURRENCY
// ============================================================================

export type CurrencyStatus = "current" | "aging" | "stale" | "outdated";

export interface ContentCurrency extends Timestamped {
  id: string;
  artifactId: string;
  artifactType: "course" | "onboarding_path" | "micro_lesson";

  currentScore: number;
  status: CurrencyStatus;
  lastEvaluatedAt: string;
  lastRefreshedAt?: string;

  activeSignals: Array<{
    signalId: string;
    signalType: SignalType;
    impact: number;
    appliedAt: string;
  }>;

  sourceVersionsAtGeneration: Array<{
    sourceId: string;
    sourceTitle: string;
    versionAtGeneration: number;
    currentVersion: number;
    isOutdated: boolean;
  }>;
}

// ============================================================================
// TRAINING RESPONSES
// ============================================================================

export type TrainingResponseType =
  | "incident_retraining"
  | "corrective_training"
  | "near_miss_briefing"
  | "regulatory_update"
  | "delta_renewal"
  | "rebuilt_renewal"
  | "clean_renewal"
  | "path_refresh"
  | "role_change_gap"
  | "new_equipment_process";

export type TrainingResponseStatus = "draft" | "approved" | "assigned" | "completed" | "rejected";

export type SkillAction = "suspend_until_complete" | "flag_until_complete" | "renew" | "grant" | "none";

export type TrainingResponseUrgency = "immediate" | "urgent" | "standard" | "blocking";

export type TrainingResponseTrigger = "signal" | "renewal" | "role_change" | "path_refresh" | "manual";

export interface TrainingResponseLesson {
  title: string;
  estimatedMinutes: number;
  isAssessment: boolean;
}

export interface TrainingResponseSection {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  lessons: TrainingResponseLesson[];
  isAssessment: boolean;
  sourceAttributions: string[];
}

export type TrainingResponseTargetStatus = "pending" | "in_progress" | "completed" | "failed";

export interface TrainingResponseTarget {
  userId: string;
  status: TrainingResponseTargetStatus;
  assignedAt?: string;
  completedAt?: string;
  assessmentScore?: number;
  skillActions: Array<{
    skillId: string;
    action: SkillAction;
  }>;
}

export interface DeltaChange {
  changeType: "incident" | "regulatory" | "source_update" | "process_change" | "equipment_change";
  description: string;
  before?: string;
  after?: string;
  signalId?: string;
}

export interface TrainingResponse extends Timestamped {
  id: string;
  type: TrainingResponseType;
  status: TrainingResponseStatus;
  title: string;
  description: string;
  urgency: TrainingResponseUrgency;

  triggerType: TrainingResponseTrigger;
  triggeredBySignalId?: string;
  triggeredByRenewalSkillId?: string;
  triggeredByRoleChangeUserId?: string;

  sections: TrainingResponseSection[];
  totalEstimatedMinutes: number;
  assessmentRequired: boolean;
  passingScore?: number;

  targetUserIds: string[];
  targets: TrainingResponseTarget[];

  affectedSkillIds: string[];
  skillAction: SkillAction;

  sourceIds: string[];
  sourceAttributions: string[];

  deltaChanges?: DeltaChange[];

  generatedByUserId: string;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  rejectedAt?: string;
  rejectionReason?: string;

  deadline?: string;

  pathId?: string;
  refreshType?: "supplemental" | "partial" | "full";
}
