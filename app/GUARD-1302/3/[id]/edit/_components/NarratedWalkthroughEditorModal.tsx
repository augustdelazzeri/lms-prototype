"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, RefreshCw } from "lucide-react";
import type { Slide, NarrationData } from "@/types";
import { renderSlidePreview, LAYOUT_OPTIONS } from "./SlideEditorModal";

interface NarratedWalkthroughEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  narrationData: NarrationData | undefined;
  resourceTitle: string;
}

function formatDuration(totalSeconds: number): string {
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function NarratedWalkthroughEditorModal({
  isOpen,
  onClose,
  narrationData,
  resourceTitle,
}: NarratedWalkthroughEditorModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localSlides, setLocalSlides] = useState<Slide[]>([]);
  const [localScript, setLocalScript] = useState("");
  const thumbStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && narrationData) {
      setLocalSlides(narrationData.slides.map((s) => ({ ...s })));
      setLocalScript(narrationData.script);
      setCurrentIndex(0);
    }
  }, [isOpen, narrationData]);

  if (!isOpen || !narrationData || localSlides.length === 0) return null;

  const current = localSlides[currentIndex];
  const totalDuration = formatDuration(narrationData.audioDurationSeconds);

  const updateCurrentSlide = (patch: Partial<Slide>) => {
    setLocalSlides((prev) =>
      prev.map((s, i) => (i === currentIndex ? { ...s, ...patch } : s))
    );
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: `sld_new_${Date.now()}`,
      layoutType: "content",
      title: "New Slide",
      body: "",
    };
    setLocalSlides((prev) => [...prev, newSlide]);
    setCurrentIndex(localSlides.length);
  };

  const handleDeleteSlide = () => {
    if (localSlides.length <= 1) return;
    setLocalSlides((prev) => prev.filter((_, i) => i !== currentIndex));
    setCurrentIndex((prev) => Math.min(prev, localSlides.length - 2));
  };

  const goToPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goToNext = () => setCurrentIndex((i) => Math.min(localSlides.length - 1, i + 1));

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lesson
        </button>
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-900">
            Slide {currentIndex + 1} of {localSlides.length}
          </span>
          <span className="text-sm text-gray-400 ml-3">{resourceTitle}</span>
        </div>
        <div className="w-32" />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Slide Preview + Audio Bar */}
        <div className="w-3/5 p-6 flex flex-col items-center bg-gray-50 overflow-y-auto">
          <div className="w-full max-w-3xl aspect-video bg-white rounded-xl shadow-lg border border-gray-200 border-t-4 border-t-purple-500 overflow-hidden flex-shrink-0">
            {renderSlidePreview(current)}
          </div>

          {/* Static Audio Bar */}
          <div className="w-full max-w-3xl mt-4 flex items-center gap-3 px-4 py-2.5 bg-gray-100 rounded-lg flex-shrink-0">
            <button className="text-lg text-teal-600 hover:text-teal-700 flex-shrink-0 leading-none">
              &#9654;
            </button>
            <div className="flex-1 h-1.5 bg-gray-300 rounded-full relative">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: "30%" }} />
              <div className="absolute left-[30%] top-1/2 -translate-y-1/2 w-3 h-3 bg-teal-500 rounded-full shadow-sm" />
            </div>
            <span className="text-xs text-gray-500 font-mono flex-shrink-0">
              2:15 / {totalDuration}
            </span>
          </div>
        </div>

        {/* Right: Narration Script + Slide Fields */}
        <div className="w-2/5 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
          {/* Top: Narration Script */}
          <div className="p-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Narration Script
            </label>
            <textarea
              value={localScript}
              onChange={(e) => setLocalScript(e.target.value)}
              rows={9}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 resize-y"
            />
            <button
              onClick={() => {}}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-render Audio
            </button>
          </div>

          {/* Bottom: Slide Fields */}
          <div className="p-6 space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Layout</label>
              <select
                value={current.layoutType}
                onChange={(e) =>
                  updateCurrentSlide({ layoutType: e.target.value as Slide["layoutType"] })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
              >
                {LAYOUT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input
                type="text"
                value={current.title}
                onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Body</label>
              <textarea
                value={current.body}
                onChange={(e) => updateCurrentSlide({ body: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Speaker Notes</label>
              <textarea
                value={current.speakerNotes || ""}
                onChange={(e) => updateCurrentSlide({ speakerNotes: e.target.value })}
                rows={3}
                placeholder="Optional notes for the presenter..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        <div
          ref={thumbStripRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-1"
        >
          {localSlides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-20 h-12 rounded-md border-2 flex flex-col items-center justify-center transition-all ${
                idx === currentIndex
                  ? "border-purple-500 bg-purple-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
              title={slide.title}
            >
              <span className={`text-[10px] font-bold ${idx === currentIndex ? "text-purple-700" : "text-gray-500"}`}>
                {idx + 1}
              </span>
              <span className={`text-[9px] truncate max-w-[68px] ${idx === currentIndex ? "text-purple-600" : "text-gray-400"}`}>
                {slide.title}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleAddSlide}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          title="Add slide"
        >
          <Plus className="w-4 h-4" />
          Add Slide
        </button>

        <button
          onClick={handleDeleteSlide}
          disabled={localSlides.length <= 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Delete current slide"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>

        <button
          onClick={goToNext}
          disabled={currentIndex === localSlides.length - 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Next slide"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
