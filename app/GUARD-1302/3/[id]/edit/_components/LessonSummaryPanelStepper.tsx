// Epic 1E: Lesson summary — compact horizontal bar
"use client";

import React, { useState, useEffect } from "react";
import { FileText, Link as LinkIcon, FileImage, Video, File, Clock } from "lucide-react";
import { getLessonResourceCounts, estimateLessonDuration, subscribe } from "@/lib/store-guard-1302";

interface LessonSummaryPanelStepperProps {
  lessonId: string;
  isReadOnly: boolean;
}

export default function LessonSummaryPanelStepper({ lessonId }: LessonSummaryPanelStepperProps) {
  const [counts, setCounts] = useState(getLessonResourceCounts(lessonId));
  const [duration, setDuration] = useState(estimateLessonDuration(lessonId));

  useEffect(() => {
    const updateData = () => {
      setCounts(getLessonResourceCounts(lessonId));
      setDuration(estimateLessonDuration(lessonId));
    };

    updateData();
    const unsubscribe = subscribe(updateData);
    return unsubscribe;
  }, [lessonId]);

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const items: { icon: React.ReactNode; label: string; count: number }[] = [
    { icon: <FileText className="w-3.5 h-3.5" />, label: "Text", count: counts.text },
    { icon: <LinkIcon className="w-3.5 h-3.5" />, label: "Links", count: counts.link },
    { icon: <File className="w-3.5 h-3.5" />, label: "PDFs", count: counts.pdf },
    { icon: <FileImage className="w-3.5 h-3.5" />, label: "Images", count: counts.image },
    { icon: <Video className="w-3.5 h-3.5" />, label: "Videos", count: counts.video },
  ];

  // Only show types that have at least one item
  const activeItems = items.filter((i) => i.count > 0);

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
      {/* Section counts */}
      <div className="flex items-center gap-1 font-medium text-gray-900">
        <span className="text-indigo-600 font-bold">{counts.total}</span>
        <span>section{counts.total !== 1 ? "s" : ""}</span>
      </div>

      {activeItems.length > 0 && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-3">
            {activeItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1 text-gray-500">
                {item.icon}
                <span>{item.count} {item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {duration.totalSeconds > 0 && (
        <>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>~{formatDuration(duration.totalSeconds)}</span>
          </div>
        </>
      )}
    </div>
  );
}
