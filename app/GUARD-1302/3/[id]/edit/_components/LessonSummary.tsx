// Epic 1D: Lesson summary sidebar
"use client";

import React, { useState, useEffect } from "react";
import { Eye, FileImage, Video, FileText, Link as LinkIcon, File } from "lucide-react";
import Button from "@/components/Button";
import { getLessonResourceCounts, estimateLessonDuration, subscribe } from "@/lib/store-guard-1302";

interface LessonSummaryProps {
  lessonId: string;
  onPreview: () => void;
  isSaving?: boolean;
}

export default function LessonSummary({ lessonId, onPreview, isSaving = false }: LessonSummaryProps) {
  const [counts, setCounts] = useState(getLessonResourceCounts(lessonId));
  const [duration, setDuration] = useState(estimateLessonDuration(lessonId));

  useEffect(() => {
    // Update counts when resources change
    const updateCounts = () => {
      setCounts(getLessonResourceCounts(lessonId));
      setDuration(estimateLessonDuration(lessonId));
    };

    updateCounts();
    const unsubscribe = subscribe(updateCounts);
    return unsubscribe;
  }, [lessonId]);

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm sticky top-4">
      <h3 className="font-semibold text-gray-900 mb-4">Lesson Summary</h3>

      {/* Resource Counts */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <FileImage className="w-4 h-4" />
            <span>Images</span>
          </div>
          <span className="font-medium text-gray-900">{counts.image}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Video className="w-4 h-4" />
            <span>Videos</span>
          </div>
          <span className="font-medium text-gray-900">{counts.video}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <File className="w-4 h-4" />
            <span>PDFs</span>
          </div>
          <span className="font-medium text-gray-900">{counts.pdf}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <LinkIcon className="w-4 h-4" />
            <span>Links</span>
          </div>
          <span className="font-medium text-gray-900">{counts.link}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <FileText className="w-4 h-4" />
            <span>Text</span>
          </div>
          <span className="font-medium text-gray-900">{counts.text}</span>
        </div>
        
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-900">Total Resources</span>
            <span className="text-indigo-600">{counts.total}</span>
          </div>
        </div>
      </div>

      {/* Estimated Duration */}
      {duration.totalSeconds > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-600 mb-1">Estimated Duration</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDuration(duration.totalSeconds)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            (video content only)
          </div>
        </div>
      )}

      {/* Preview Button */}
      <Button
        variant="secondary"
        onClick={onPreview}
        className="w-full"
        disabled={counts.total === 0}
      >
        <Eye className="w-4 h-4 mr-2" />
        Preview Lesson
      </Button>

      {/* Save Indicator */}
      {isSaving ? (
        <div className="mt-3 text-xs text-gray-500 text-center">Saving...</div>
      ) : (
        <div className="mt-3 text-xs text-green-600 text-center">Saved</div>
      )}
    </div>
  );
}

