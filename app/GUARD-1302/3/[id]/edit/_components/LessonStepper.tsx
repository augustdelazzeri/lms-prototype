// Vertical chapter/lesson outline matching production UpKeep Learn editor
"use client";

import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Plus, CheckCircle2 } from "lucide-react";
import { Lesson } from "@/types";
import { translateLessonTitle } from "@/lib/lessonI18n-guard-1302";

interface LessonStepperProps {
  courseId: string;
  lessons: Lesson[];
  activeLessonId: string;
  onSetActive: (lessonId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddLesson: () => void;
  isReadOnly: boolean;
  chapterTitle?: string;
  language?: string;
}

export default function LessonStepper({
  lessons,
  activeLessonId,
  onSetActive,
  onReorder,
  onAddLesson,
  isReadOnly,
  chapterTitle = "LOTO Essentials: Preventing Unexpected Startup",
  language = "en",
}: LessonStepperProps) {
  const [chapterOpen, setChapterOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = lessons.findIndex((l) => l.id === activeLessonId);
      if (e.key === "ArrowUp" && currentIndex > 0) {
        onSetActive(lessons[currentIndex - 1].id);
      } else if (e.key === "ArrowDown" && currentIndex < lessons.length - 1) {
        onSetActive(lessons[currentIndex + 1].id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLessonId, lessons, onSetActive]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {/* Chapter header */}
        <button
          type="button"
          onClick={() => setChapterOpen(!chapterOpen)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 text-left group"
        >
          {chapterOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-gray-800 truncate flex-1">
            1 {chapterTitle}
          </span>
          <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 opacity-80" />
        </button>

        {chapterOpen && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={lessons.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
              disabled={isReadOnly}
            >
              <div className="mt-1 space-y-0.5 ml-1">
                {lessons.map((lesson, index) => (
                  <SortableLessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    isActive={lesson.id === activeLessonId}
                    onClick={() => onSetActive(lesson.id)}
                    isReadOnly={isReadOnly}
                    language={language}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!isReadOnly && (
          <button
            type="button"
            onClick={onAddLesson}
            className="mt-2 ml-6 flex items-center gap-1.5 px-2 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lesson
          </button>
        )}
      </div>

      {!isReadOnly && (
        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Chapter
          </button>
        </div>
      )}
    </div>
  );
}

function SortableLessonRow({
  lesson,
  index,
  isActive,
  onClick,
  isReadOnly,
  language = "en",
}: {
  lesson: Lesson;
  index: number;
  isActive: boolean;
  onClick: () => void;
  isReadOnly: boolean;
  language?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayTitle = translateLessonTitle(lesson.title || "Untitled Lesson", language);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1 rounded-md ${
        isDragging ? "opacity-50 z-50" : ""
      } ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}
    >
      {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-600 rounded-full" />}
      {!isReadOnly && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 cursor-grab opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 min-w-0 text-left px-2 py-2 text-sm truncate ${
          isActive ? "text-blue-700 font-medium" : "text-gray-700"
        } ${isReadOnly ? "pl-3" : ""}`}
      >
        <span className="text-gray-400 mr-1.5">{index + 1}.</span>
        {displayTitle}
      </button>
    </div>
  );
}
