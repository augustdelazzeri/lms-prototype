// Phase II 1I.1 & 1I.2: Quiz Tab Component with Full Editor UI + AI Generator
"use client";

import React, { useState } from "react";
import { Plus, Sparkles, Edit2, Trash2, Copy, GripVertical, Eye, Settings, Undo2, Redo2, History, ClipboardCheck, BookOpen, Check } from "lucide-react";
import { Quiz, Lesson, Question, QuestionType } from "@/types";
import { getQuizzesByLessonId, getQuizByCourseId, getQuizzesByCourseId } from "@/lib/store-guard-1302";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { formatDate } from "@/lib/utils";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuizTabProps {
  quiz: Quiz | undefined;
  courseId: string;
  activeLessonId: string | null;
  lessons: Lesson[];
  isManager: boolean;
  quizType: "course" | "lesson";
  selectedLessonIdForQuiz: string | null;
  onQuizTypeChange: (type: "course" | "lesson") => void;
  onSelectLessonForQuiz: (lessonId: string | null) => void;
  onCreateLessonQuiz: () => void;
  onGenerate: () => void;
  onCreateQuestion: () => void;
  onEditQuestion: (question: any) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onDragEnd: (event: any) => void;
  onUpdateConfig: (config: any) => void;
  onPreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
  genScope: any;
  setGenScope: (scope: any) => void;
  genScopeId: string;
  setGenScopeId: (id: string) => void;
  genCount: number;
  setGenCount: (count: number) => void;
  genTypes: any[];
  setGenTypes: (types: any[]) => void;
  genLanguage: string;
  setGenLanguage: (lang: string) => void;
  genDifficulties: any[];
  setGenDifficulties: (difficulties: any[]) => void;
  replaceExisting: boolean;
  setReplaceExisting: (replace: boolean) => void;
  isGenerating: boolean;
  onOpenAIGenerator: () => void; // Phase II 1I.2: New prop for opening AI modal
}

function SortableQuestionCard({
  question,
  index,
  isManager,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  question: Question;
  index: number;
  isManager: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border-2 p-4 ${
        isDragging ? 'opacity-50 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      } transition-all`}
    >
      <div className="flex items-start gap-3">
        {!isManager && (
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded mt-1"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              #{index + 1}
            </span>
            <span className="text-xs font-medium text-gray-500 uppercase">
              {question.type.replace('_', ' ')}
            </span>
            {question.meta?.source === 'AI' && (
              <>
                <Badge variant="info" className="text-xs">
                  AI Generated
                </Badge>
                {question.meta?.confidenceScore && (
                  <Badge variant="info" className="text-xs">
                    Confidence: {(question.meta.confidenceScore * 100).toFixed(0)}%
                  </Badge>
                )}
              </>
            )}
            {question.meta?.difficulty && (
              <Badge variant="default" className="text-xs capitalize">
                {question.meta.difficulty}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
            {question.prompt}
          </p>
          {question.options && question.options.length > 0 && (
            <div className="text-xs text-gray-600 space-y-1">
              {question.options.map((opt) => (
                <div key={opt.id} className={opt.correct ? 'text-green-700 font-medium' : ''}>
                  {opt.correct ? '✓' : '○'} {opt.text}
                </div>
              ))}
            </div>
          )}
        </div>
        {!isManager && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Edit question"
            >
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Duplicate question"
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-50 rounded transition-colors"
              title="Delete question"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizTab(props: QuizTabProps) {
  const {
    quiz,
    courseId,
    activeLessonId,
    lessons,
    isManager,
    quizType,
    selectedLessonIdForQuiz,
    onQuizTypeChange,
    onSelectLessonForQuiz,
    onCreateLessonQuiz,
    onCreateQuestion,
    onEditQuestion,
    onDeleteQuestion,
    onDuplicateQuestion,
    onDragEnd,
    onPreview,
    onUndo,
    onRedo,
    onHistory,
    canUndo,
    canRedo,
    onOpenAIGenerator,
  } = props;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Compute quiz counts for the toggle badges
  const courseQuiz = getQuizByCourseId(courseId);
  const allCourseQuizzes = getQuizzesByCourseId(courseId);
  const lessonQuizCount = lessons.filter((l) => {
    const lq = getQuizzesByLessonId(l.id);
    return lq.length > 0;
  }).length;
  const hasCourseQuiz = allCourseQuizzes.some((q) => !q.lessonId);

  // Build the empty state for when no quiz is selected/available
  const renderEmptyState = () => (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
      {quizType === "course" ? (
        <>
          <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1 font-medium">No final assessment yet</p>
          <p className="text-sm text-gray-400 mb-4">Create a course-level quiz that learners take at the end.</p>
          {!isManager && (
            <Button onClick={onCreateQuestion} variant="primary" className="!text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Final Assessment
            </Button>
          )}
        </>
      ) : (
        <>
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1 font-medium">
            {selectedLessonIdForQuiz
              ? `No quiz for this lesson`
              : `Select a lesson`}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {selectedLessonIdForQuiz
              ? "Add a knowledge check quiz for this lesson."
              : "Choose a lesson from the list above to view or create its quiz."}
          </p>
          {!isManager && selectedLessonIdForQuiz && (
            <Button onClick={onCreateLessonQuiz} variant="primary" className="!text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Lesson Quiz
            </Button>
          )}
        </>
      )}
    </div>
  );

  const questions = quiz?.questions || [];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Quiz Type Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onQuizTypeChange("course")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                quizType === "course"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Course Quiz
              {hasCourseQuiz && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">1</span>
              )}
            </button>
            <button
              onClick={() => onQuizTypeChange("lesson")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                quizType === "lesson"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Lesson Quizzes
              <span className={`ml-1 inline-flex items-center justify-center px-1.5 h-5 rounded-full text-xs font-bold ${
                lessonQuizCount > 0 ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"
              }`}>
                {lessonQuizCount}/{lessons.length}
              </span>
            </button>
          </div>
          <span className="text-xs text-gray-400">
            {quizType === "course"
              ? "Single final assessment at the end of the course"
              : "Knowledge check quizzes after individual lessons"}
          </span>
        </div>

        {/* Lesson Selector (only visible when quizType is "lesson") */}
        {quizType === "lesson" && lessons.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
            {lessons.map((lesson) => {
              const hasQuiz = getQuizzesByLessonId(lesson.id).length > 0;
              const isSelected = selectedLessonIdForQuiz === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLessonForQuiz(lesson.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isSelected
                      ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                      : hasQuiz
                      ? "bg-white border-gray-200 text-gray-700 hover:border-blue-200 hover:bg-blue-50/50"
                      : "bg-white border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                  }`}
                  title={hasQuiz ? `${lesson.title} — has quiz` : `${lesson.title} — no quiz`}
                >
                  {hasQuiz && (
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[140px]">
                    {lesson.order + 1}. {lesson.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Show empty state or quiz editor */}
      {!quiz ? renderEmptyState() : (
      <>
      {/* Quiz Editor Section */}
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              <h3 className="text-lg font-bold text-gray-900">Quiz Questions</h3>
              <Badge variant="default" className="ml-2">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              </Badge>
            </div>
            {!isManager && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={onUndo}
                  disabled={!canUndo}
                  variant="secondary"
                  className="px-2 py-1 text-sm"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={onRedo}
                  disabled={!canRedo}
                  variant="secondary"
                  className="px-2 py-1 text-sm"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={onHistory}
                  variant="secondary"
                  className="px-2 py-1 text-sm"
                >
                  <History className="w-4 h-4 mr-1" />
                  History
                </Button>
                <Button
                  onClick={onPreview}
                  variant="secondary"
                  className="px-2 py-1 text-sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="p-6">
          {/* Action Buttons */}
          {!isManager && (
            <div className="flex gap-3 mb-6">
              <Button onClick={onCreateQuestion} variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
              <Button onClick={onOpenAIGenerator} variant="secondary">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          )}

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-500 mb-4">No questions yet</p>
              {!isManager && (
                <p className="text-sm text-gray-400">
                  Click "Add Question" or "Generate with AI" to get started
                </p>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={questions.map(q => q.id)}
                strategy={verticalListSortingStrategy}
                disabled={isManager}
              >
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <SortableQuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      isManager={isManager}
                      onEdit={() => onEditQuestion(question)}
                      onDelete={() => onDeleteQuestion(question.id)}
                      onDuplicate={() => onDuplicateQuestion(question.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      </>
      )}
    </div>
  );
}
