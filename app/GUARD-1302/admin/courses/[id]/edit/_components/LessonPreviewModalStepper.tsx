// Epic 1E: Lesson preview modal for stepper layout
"use client";

import React from "react";
import { X } from "lucide-react";
import { Lesson, Resource } from "@/types";
import { estimateLessonDuration } from "@/lib/store-guard-1302";

interface LessonPreviewModalStepperProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson;
  resources: Resource[];
}

export default function LessonPreviewModalStepper({
  isOpen,
  onClose,
  lesson,
  resources,
}: LessonPreviewModalStepperProps) {
  const { totalSeconds } = estimateLessonDuration(lesson.id);

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-10 bg-white rounded-lg shadow-2xl z-50 flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{lesson.title}</h2>
            <div className="text-sm text-gray-600 mt-1">
              {resources.length} resource{resources.length !== 1 ? 's' : ''} • {formatDuration(totalSeconds)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {resources.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              This lesson has no resources to preview.
            </div>
          ) : (
            <div className="space-y-6">
              {resources.map((resource, index) => (
                <PreviewResourceCard key={resource.id} resource={resource} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function PreviewResourceCard({ resource, index }: { resource: Resource; index: number }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{resource.title}</h3>
            <div className="text-xs text-gray-600 capitalize flex items-center gap-2">
              <span>{resource.type}</span>
              {resource.durationSec && (
                <>
                  <span>•</span>
                  <span>{Math.floor(resource.durationSec / 60)}:{(resource.durationSec % 60).toString().padStart(2, '0')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* VIDEO */}
        {resource.type === 'video' && resource.url && (
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              src={resource.url}
              controls
              className="w-full"
              style={{ maxHeight: '400px' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* IMAGE */}
        {resource.type === 'image' && resource.url && (
          <div className="rounded-lg overflow-hidden">
            <img
              src={resource.url}
              alt={resource.title}
              className="w-full h-auto"
              style={{ maxHeight: '500px', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* PDF */}
        {resource.type === 'pdf' && resource.url && (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="text-gray-600 mb-4">
              PDF Document: {resource.fileName || 'Document'}
            </div>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Open PDF
            </a>
          </div>
        )}

        {/* LINK */}
        {resource.type === 'link' && resource.url && (
          <div className="bg-gray-50 rounded-lg p-6">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 hover:underline break-all"
            >
              {resource.url}
            </a>
          </div>
        )}

        {/* TEXT */}
        {resource.type === 'text' && resource.content && (
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
            {resource.content}
          </div>
        )}
      </div>
    </div>
  );
}

