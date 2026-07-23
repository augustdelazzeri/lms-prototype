// Epic 1E: Horizontal lesson stepper with drag-drop and keyboard navigation
"use client";

import React, { useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from "lucide-react";
import { Lesson } from "@/types";
import { getLessonStatus } from "@/lib/store";

interface LessonStepperProps {
  courseId: string;
  lessons: Lesson[];
  activeLessonId: string;
  onSetActive: (lessonId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddLesson: () => void;
  isReadOnly: boolean;
}

export default function LessonStepper({
  courseId,
  lessons,
  activeLessonId,
  onSetActive,
  onReorder,
  onAddLesson,
  isReadOnly,
}: LessonStepperProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
      
      // Arrow keys
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onSetActive(lessons[currentIndex - 1].id);
      } else if (e.key === 'ArrowRight' && currentIndex < lessons.length - 1) {
        onSetActive(lessons[currentIndex + 1].id);
      }
      
      // Cmd/Ctrl + Shift + [ or ]
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (e.key === '[' && currentIndex > 0) {
          e.preventDefault();
          onSetActive(lessons[currentIndex - 1].id);
        } else if (e.key === ']' && currentIndex < lessons.length - 1) {
          e.preventDefault();
          onSetActive(lessons[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLessonId, lessons, onSetActive]);

  return (
    <div className="flex items-center gap-4 px-6 py-5 overflow-x-auto bg-gradient-to-r from-white via-indigo-50/30 to-white">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lessons.map(l => l.id)}
          strategy={horizontalListSortingStrategy}
          disabled={isReadOnly}
        >
          <div className="flex items-center gap-3">
            {lessons.map((lesson, index) => (
              <SortableStep
                key={lesson.id}
                lesson={lesson}
                index={index}
                isActive={lesson.id === activeLessonId}
                onClick={() => onSetActive(lesson.id)}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!isReadOnly && (
        <button
          onClick={onAddLesson}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Lesson
        </button>
      )}
    </div>
  );
}

function SortableStep({
  lesson,
  index,
  isActive,
  onClick,
  isReadOnly,
}: {
  lesson: Lesson;
  index: number;
  isActive: boolean;
  onClick: () => void;
  isReadOnly: boolean;
}) {
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

  const status = getLessonStatus(lesson.id);
  const statusConfig = {
    empty: { color: 'bg-gray-200 text-gray-500', label: 'Empty' },
    in_progress: { color: 'bg-yellow-100 text-yellow-700', label: 'In Progress' },
    ready: { color: 'bg-green-100 text-green-700', label: 'Ready' },
  };
  const config = statusConfig[status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 group relative
        ${isDragging ? 'opacity-50 scale-105 shadow-lg z-50' : ''}
      `}
    >
      {/* Drag Handle */}
      {!isReadOnly && (
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Step Button */}
      <button
        onClick={onClick}
        className={`
          flex flex-col items-center gap-2 px-5 py-4 rounded-xl transition-all min-w-[140px] shadow-sm
          ${isActive 
            ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-500 shadow-md shadow-indigo-200' 
            : 'border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md bg-white'
          }
        `}
      >
        {/* Number Circle */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all
          ${isActive 
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-300 scale-110' 
            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }
        `}>
          {index + 1}
        </div>

        {/* Title */}
        <div className={`text-sm font-semibold truncate max-w-[120px] transition-colors ${
          isActive ? 'text-indigo-900' : 'text-gray-700'
        }`}>
          {lesson.title}
        </div>

        {/* Status Chip */}
        <div className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm ${
          status === 'ready' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
          'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {config.label}
        </div>
      </button>
    </div>
  );
}

