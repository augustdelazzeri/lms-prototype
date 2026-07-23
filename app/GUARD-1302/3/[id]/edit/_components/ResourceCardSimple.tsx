// Epic 1E: Simplified resource card for stepper layout
// Epic 1G.5: Rich Text Editor + AI Inline Editing
"use client";

import React, { useState } from "react";
import { GripVertical, Eye, Pencil, Trash2, FileText, Link as LinkIcon, FileImage, Video, File, Sparkles, RotateCcw, Presentation, Mic, Volume2, CircleCheck } from "lucide-react";
import { Resource, Slide } from "@/types";
import type { AiAction } from "@/types";
import { formatFileSize } from "@/lib/uploads";
import { 
  listHistory,
  addVersionSnapshot,
  addAuditEvent,
  getCurrentUser,
  getEntitySnapshot,
  pushUndo,
  clearRedo,
  performUndo,
  performRedo,
  canUndo,
  canRedo,
  getResourceById
} from "@/lib/store-guard-1302";
import RichTextEditor from "@/components/editor/RichTextEditor";
import AIPreviewModal from "@/components/editor/AIPreviewModal";
import { aiRewrite, aiExpand, aiSimplify } from "@/lib/ai/inlineTransforms";
import { markdownToHtml } from "@/lib/markdownToHtml";

// Simple time ago formatter
function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  return 'just now';
}

// Get icon and styling for resource type
function getResourceIcon(type: Resource['type']) {
  switch (type) {
    case 'text':
      return <FileText className="w-5 h-5 text-indigo-600" />;
    case 'link':
      return <LinkIcon className="w-5 h-5 text-emerald-600" />;
    case 'image':
      return <FileImage className="w-5 h-5 text-sky-600" />;
    case 'video':
      return <Video className="w-5 h-5 text-rose-600" />;
    case 'pdf':
      return <File className="w-5 h-5 text-amber-600" />;
    case 'slides':
      return <Presentation className="w-5 h-5 text-violet-600" />;
    case 'narrated-walkthrough':
      return <Mic className="w-5 h-5 text-teal-600" />;
    case 'knowledge-check':
      return <CircleCheck className="w-5 h-5 text-purple-600" />;
    default:
      return <File className="w-5 h-5 text-gray-600" />;
  }
}

// Get left accent color for resource type
function getAccentColor(type: Resource['type']): string {
  switch (type) {
    case 'text':
      return 'border-l-indigo-400';
    case 'link':
      return 'border-l-emerald-400';
    case 'image':
      return 'border-l-sky-400';
    case 'video':
      return 'border-l-rose-400';
    case 'pdf':
      return 'border-l-amber-400';
    case 'slides':
      return 'border-l-violet-400';
    case 'narrated-walkthrough':
      return 'border-l-teal-400';
    case 'knowledge-check':
      return 'border-l-purple-400';
    default:
      return 'border-l-gray-400';
  }
}

// Get background color for type badge
function getTypeBadgeColor(type: Resource['type']): string {
  switch (type) {
    case 'text':
      return 'bg-indigo-50 text-indigo-700';
    case 'link':
      return 'bg-emerald-50 text-emerald-700';
    case 'image':
      return 'bg-sky-50 text-sky-700';
    case 'video':
      return 'bg-rose-50 text-rose-700';
    case 'pdf':
      return 'bg-amber-50 text-amber-700';
    case 'slides':
      return 'bg-violet-50 text-violet-700';
    case 'narrated-walkthrough':
      return 'bg-teal-50 text-teal-700';
    case 'knowledge-check':
      return 'bg-purple-50 text-purple-700';
    default:
      return 'bg-gray-50 text-gray-700';
  }
}

interface ResourceCardSimpleProps {
  resource: Resource;
  isReadOnly: boolean;
  isAIDraft?: boolean;
  onEdit: (updatedResource: Resource) => void;
  onPreview: () => void;
  onDelete: () => void;
  dragHandleProps?: any;
}

export default function ResourceCardSimple({
  resource,
  isReadOnly,
  isAIDraft,
  onEdit,
  onPreview,
  onDelete,
  dragHandleProps,
}: ResourceCardSimpleProps) {
  const [isExpanded, setIsExpanded] = React.useState(true); // Start expanded so content is readable and editable
  const [editMode, setEditMode] = useState(false); // For AI drafts: false = rendered preview, true = editor

  // Helper: detect if content is raw Markdown (no HTML tags, has heading syntax)
  const isMarkdownContent = (text: string) =>
    text.length > 0 && !text.trim().startsWith('<') && /^#{1,6}\s/m.test(text);

  // When switching to edit mode on an AI draft, convert Markdown → HTML first
  // so TipTap gets proper rich text, not raw markup
  const handleToggleEdit = () => {
    if (!editMode && isAIDraft) {
      const raw = resource.content || '';
      if (isMarkdownContent(raw)) {
        const converted = markdownToHtml(raw);
        onEdit({ ...resource, content: converted });
      }
    }
    setEditMode(!editMode);
  };
  
  const metadata = [];
  if (resource.durationSec) {
    const mins = Math.floor(resource.durationSec / 60);
    const secs = resource.durationSec % 60;
    metadata.push(`${mins}:${secs.toString().padStart(2, '0')}`);
  }
  if (resource.fileSize) metadata.push(formatFileSize(resource.fileSize));
  metadata.push(timeAgo(resource.updatedAt));

  const accentColor = getAccentColor(resource.type);
  const typeBadgeColor = getTypeBadgeColor(resource.type);

  // Epic 1G.4: Check if this section was recently AI-generated (last 24 hours)
  const { audits } = listHistory('section', resource.id);
  const recentAIAudit = audits.find(a => {
    const actionIsAI = typeof a.action === 'string' && a.action.startsWith('ai_');
    const isRecent = (Date.now() - new Date(a.at).getTime()) < 24 * 60 * 60 * 1000;
    return actionIsAI && isRecent;
  });

  // Epic 1G.5: AI inline editing state
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiPreview, setAIPreview] = useState<{
    isOpen: boolean;
    action: 'rewrite' | 'expand' | 'simplify' | null;
    originalContent: string;
    aiContent: string;
  } | null>(null);
  const [showAIBadge, setShowAIBadge] = useState(false);
  
  // Inline title editing
  const [editableTitle, setEditableTitle] = useState(resource.title);
  const [isTitleFocused, setIsTitleFocused] = useState(false);

  // Sync title when resource changes (e.g., after undo/redo)
  React.useEffect(() => {
    setEditableTitle(resource.title);
  }, [resource.title]);

  // AI action handler
  const handleAIAction = async (
    action: 'rewrite' | 'expand' | 'simplify',
    selection: string
  ) => {
    setIsAIProcessing(true);
    
    // Use current content or selection
    const contentToTransform = selection || resource.content || '';
    
    try {
      let aiResult = '';
      switch (action) {
        case 'rewrite':
          aiResult = await aiRewrite(contentToTransform);
          break;
        case 'expand':
          aiResult = await aiExpand(contentToTransform);
          break;
        case 'simplify':
          aiResult = await aiSimplify(contentToTransform);
          break;
      }
      
      setAIPreview({
        isOpen: true,
        action,
        originalContent: contentToTransform,
        aiContent: aiResult,
      });
    } catch (error) {
      console.error('AI action failed:', error);
    } finally {
      setIsAIProcessing(false);
    }
  };

  // Accept AI result handler
  const handleAcceptAI = () => {
    if (!aiPreview) return;
    
    const currentUser = getCurrentUser();
    const aiActionMap: Record<string, AiAction> = {
      rewrite: 'ai_rewrite',
      expand: 'ai_expand',
      simplify: 'ai_simplify',
    };
    
    // 1. Create version snapshot (before change)
    const snapshot = addVersionSnapshot({
      entityType: 'section',
      entityId: resource.id,
      parentCourseId: resource.courseId,
      createdBy: currentUser.id,
      cause: 'ai',
      aiAction: aiActionMap[aiPreview.action!],
      summary: `AI ${aiPreview.action}: "${resource.title}"`,
      payload: getEntitySnapshot('section', resource.id),
    });
    
    pushUndo('section', resource.id, snapshot.id);
    clearRedo('section', resource.id);
    
    // 2. Add audit event
    addAuditEvent({
      byUserId: currentUser.id,
      entityType: 'section',
      entityId: resource.id,
      parentCourseId: resource.courseId,
      action: aiActionMap[aiPreview.action!],
      meta: {
        sectionTitle: resource.title,
        hadSelection: !!aiPreview.originalContent,
      },
    });
    
    // 3. Update content
    onEdit({ ...resource, content: aiPreview.aiContent });
    
    // 4. Show badge
    setShowAIBadge(true);
    setTimeout(() => setShowAIBadge(false), 10000); // 10 seconds
    
    // 5. Close modal
    setAIPreview(null);
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    performUndo('section', resource.id);
    const updated = getResourceById(resource.id);
    if (updated) {
      onEdit(updated);
    }
  };

  const handleRedo = () => {
    performRedo('section', resource.id);
    const updated = getResourceById(resource.id);
    if (updated) {
      onEdit(updated);
    }
  };

  // Title editing handlers
  const handleTitleBlur = () => {
    setIsTitleFocused(false);
    if (editableTitle !== resource.title && editableTitle.trim()) {
      onEdit({ ...resource, title: editableTitle.trim() });
    } else if (!editableTitle.trim()) {
      // Reset to original if empty
      setEditableTitle(resource.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setEditableTitle(resource.title);
      (e.target as HTMLInputElement).blur();
    }
  };

  // Extract a plain-text snippet from HTML content for collapsed preview
  const getTextSnippet = (html: string, maxLen = 160): string => {
    const text = html
      .replace(/<[^>]*>/g, " ")    // strip HTML tags
      .replace(/&[^;]+;/g, " ")     // strip HTML entities
      .replace(/\s+/g, " ")         // collapse whitespace
      .trim();
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trimEnd() + "…";
  };

  // Count headings/sections within content for a structural hint
  const getContentStructure = (html: string): { headings: string[]; wordCount: number } => {
    const headingMatches = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
    const headings = headingMatches
      .map((h) => h.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean)
      .slice(0, 5);
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = text ? text.split(" ").length : 0;
    return { headings, wordCount };
  };

  // Collapsed preview for text content
  const renderCollapsedPreview = () => {
    if (isExpanded || resource.type !== "text" || !resource.content) return null;

    const { headings, wordCount } = getContentStructure(resource.content);
    const snippet = getTextSnippet(resource.content);

    return (
      <div className="mt-2 pt-2 border-t border-gray-100">
        {/* Structural outline if there are headings */}
        {headings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {headings.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 font-medium"
              >
                {h}
              </span>
            ))}
            {headings.length < (resource.content.match(/<h[1-6]/gi) || []).length && (
              <span className="text-[11px] text-gray-400 self-center">
                +{(resource.content.match(/<h[1-6]/gi) || []).length - headings.length} more
              </span>
            )}
          </div>
        )}
        {/* Text snippet */}
        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{snippet}</p>
        {wordCount > 0 && (
          <span className="text-[10px] text-gray-300 mt-1 inline-block">{wordCount} words</span>
        )}
      </div>
    );
  };

  // Render content preview based on type
  const renderContent = () => {
    if (!isExpanded) return null;

    switch (resource.type) {
      case 'text':
        // AI Draft preview mode: render formatted HTML so the admin reviews final output
        if (isAIDraft && !editMode) {
          const rawContent = resource.content || '';
          const htmlToRender = isMarkdownContent(rawContent) ? markdownToHtml(rawContent) : rawContent;
          return (
            <div className="mt-3 pt-3 border-t border-gray-100">
              {showAIBadge && (
                <div className="mb-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  AI-updated
                </div>
              )}
              <div
                className="ProseMirror prose prose-base max-w-none min-h-[120px] p-5 prose-headings:text-gray-900 prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 prose-blockquote:border-indigo-300 prose-blockquote:text-gray-600"
                dangerouslySetInnerHTML={{ __html: htmlToRender || '<p class="text-gray-400 italic">No content yet.</p>' }}
              />
            </div>
          );
        }
        // Editor mode (default for non-AI drafts, or when toggled on for AI drafts)
        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {showAIBadge && (
              <div className="mb-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded animate-pulse">
                <Sparkles className="w-3 h-3" />
                AI-updated
              </div>
            )}
            <RichTextEditor
              value={resource.content || ''}
              onChange={(html) => onEdit({ ...resource, content: html })}
              readOnly={isReadOnly}
              showAIToolbar={!isReadOnly}
              onAIAction={handleAIAction}
              sectionId={resource.id}
              lessonId={resource.lessonId}
              courseId={resource.courseId}
            />
          </div>
        );
      case 'link':
        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline break-all"
            >
              {resource.url}
            </a>
          </div>
        );
      case 'image':
        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {resource.url ? (
              <img
                src={resource.url}
                alt={resource.title}
                className="max-w-full h-auto rounded-lg shadow-sm"
                style={{ maxHeight: '400px' }}
              />
            ) : (
              <span className="text-gray-400 italic text-sm">No image uploaded</span>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {resource.url ? (
              <video
                src={resource.url}
                controls
                className="w-full rounded-lg shadow-sm"
                style={{ maxHeight: '400px' }}
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <span className="text-gray-400 italic text-sm">No video uploaded</span>
            )}
          </div>
        );
      case 'pdf':
        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {resource.url ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>File:</strong> {resource.fileName || 'Document.pdf'}
                </p>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  <Eye className="w-4 h-4" />
                  Open PDF in new tab
                </a>
              </div>
            ) : (
              <span className="text-gray-400 italic text-sm">No PDF uploaded</span>
            )}
          </div>
        );
      case 'slides': {
        const slides = resource.slides || [];
        const slideCount = slides.length;
        const estMin = resource.durationSec
          ? Math.ceil(resource.durationSec / 60)
          : slideCount;
        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">
              Slides &middot; {slideCount} slide{slideCount !== 1 ? 's' : ''} &middot; ~{estMin} min
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="flex-shrink-0 w-16 h-10 bg-gray-100 border border-gray-200 rounded flex items-center justify-center"
                >
                  <span className="text-xs text-gray-500 font-medium">{idx + 1}</span>
                </div>
              ))}
            </div>
            {!isReadOnly && (
              <button
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-colors"
                onClick={() => onEdit(resource)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>
        );
      }
      case 'narrated-walkthrough': {
        const narration = resource.narrationData;
        const slides = narration?.slides || [];
        const slideCount = slides.length;
        const audioDuration = narration?.audioDurationSeconds || resource.durationSec || 0;
        const estMin = Math.ceil(audioDuration / 60);
        const audioMin = Math.floor(audioDuration / 60);
        const audioSec = audioDuration % 60;

        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">
              Narrated Walkthrough &middot; {slideCount} slide{slideCount !== 1 ? 's' : ''} &middot; ~{estMin} min
            </p>

            {slideCount > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className="flex-shrink-0 w-16 h-10 bg-gray-100 border border-gray-200 rounded flex items-center justify-center"
                  >
                    <span className="text-xs text-gray-500 font-medium">{idx + 1}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
              <Volume2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Audio: Generated &middot; {audioMin}:{audioSec.toString().padStart(2, '0')}
              </span>
              <button
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded transition-colors"
                onClick={() => {}}
              >
                &#9654; Preview
              </button>
            </div>

            {!isReadOnly && (
              <button
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                onClick={() => onEdit(resource)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>
        );
      }
      case 'knowledge-check': {
        const kc = resource.knowledgeCheckData;
        if (!kc) {
          return (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-400 italic text-sm">No question data</span>
            </div>
          );
        }
        const typeLabel = kc.type === 'multiple-choice'
          ? 'Multiple Choice'
          : kc.type === 'true-false'
            ? 'True / False'
            : 'Scenario';

        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">
              {typeLabel} &middot; Not Graded
            </p>
            <p className="text-sm text-gray-700 italic mb-3">
              &ldquo;{kc.question}&rdquo;
            </p>
            <ul className="space-y-1.5">
              {kc.options.map((opt, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    opt.isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'
                  }`} />
                  <span className={opt.isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}>
                    {opt.text}
                  </span>
                </li>
              ))}
            </ul>
            {!isReadOnly && (
              <button
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                onClick={() => onEdit(resource)}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-gray-400 italic text-sm">No preview available</span>
          </div>
        );
    }
  };

  return (
    <div 
      className={`group flex flex-col gap-2 p-4 bg-white rounded-lg border-l-3 ${accentColor} border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out ${isExpanded ? 'pb-5' : ''}`}
    >
      {/* Header Row */}
      <div className="flex items-center gap-4">
        {/* Drag Handle - Visible on hover */}
        {!isReadOnly && dragHandleProps && (
          <div
            {...dragHandleProps}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </div>
        )}

        {/* Icon */}
        <div className="flex-shrink-0">
          {getResourceIcon(resource.type)}
        </div>

        {/* Title & Meta */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Inline Editable Title for Text Sections */}
          {resource.type === 'text' && !isReadOnly ? (
            <input
              type="text"
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className={`w-full font-semibold text-gray-900 text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 ${
                isTitleFocused ? 'bg-white' : ''
              }`}
              placeholder="Section title..."
            />
          ) : (
            <div className="font-semibold text-gray-900 text-sm">{resource.title}</div>
          )}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeColor}`}>
              {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
            </span>
            {recentAIAudit && (
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded"
                title={`AI ${recentAIAudit.action} ${timeAgo(recentAIAudit.at)}`}
              >
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            )}
            {metadata.length > 0 && (
              <span className="text-xs text-gray-400">{metadata.join(' • ')}</span>
            )}
          </div>
        </div>

        {/* AI Draft: Edit / Preview toggle */}
        {isAIDraft && resource.type === 'text' && isExpanded && (
          <button
            onClick={handleToggleEdit}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              editMode
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
            title={editMode ? 'Switch to preview' : 'Switch to editor'}
          >
            {editMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                Preview
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </>
            )}
          </button>
        )}

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Epic 1G.5: Undo/Redo Buttons (for text sections) */}
        {resource.type === 'text' && !isReadOnly && (
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo('section', resource.id)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Undo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={handleRedo}
              disabled={!canRedo('section', resource.id)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Redo"
            >
              <RotateCcw className="w-3.5 h-3.5 transform scale-x-[-1]" />
            </button>
          </div>
        )}

        {/* Hover Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={onPreview}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Preview section"
            title="Preview"
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          {!isReadOnly && (
            <>
              {/* Edit button: Only show for non-text sections (text is inline editable) */}
              {resource.type !== 'text' && (
                <button
                  onClick={() => onEdit(resource)}
                  className="p-1.5 hover:bg-indigo-100 rounded-md transition-colors"
                  aria-label="Edit section"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4 text-indigo-600" />
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(`Delete "${resource.title}"?`)) {
                    onDelete();
                  }
                }}
                className="p-1.5 hover:bg-red-100 rounded-md transition-colors"
                aria-label="Delete section"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Preview (expanded) or Collapsed snippet */}
      {renderContent()}
      {renderCollapsedPreview()}

      {/* Epic 1G.5: AI Preview Modal */}
      <AIPreviewModal
        isOpen={aiPreview?.isOpen || false}
        onClose={() => setAIPreview(null)}
        onAccept={handleAcceptAI}
        originalContent={aiPreview?.originalContent || ''}
        aiContent={aiPreview?.aiContent || ''}
        actionType={aiPreview?.action || 'rewrite'}
        isLoading={isAIProcessing}
      />
    </div>
  );
}

