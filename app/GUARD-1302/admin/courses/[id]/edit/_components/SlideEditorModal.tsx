"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { Slide } from "@/types";

interface SlideEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: Slide[];
  resourceTitle: string;
}

export const LAYOUT_OPTIONS: { value: Slide["layoutType"]; label: string }[] = [
  { value: "title", label: "Title Slide" },
  { value: "content", label: "Content" },
  { value: "two-column", label: "Two-Column" },
  { value: "image-focus", label: "Image Focus" },
  { value: "key-point", label: "Key Point" },
  { value: "comparison", label: "Comparison" },
  { value: "quote", label: "Quote" },
];

export function renderSlidePreview(slide: Slide) {
  switch (slide.layoutType) {
    case "title":
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{slide.title}</h2>
          <p className="text-lg text-gray-500 whitespace-pre-line">{slide.body}</p>
        </div>
      );

    case "two-column": {
      const parts = slide.body.split("\n\n");
      const left = parts[0] || "";
      const right = parts.slice(1).join("\n\n") || "";
      return (
        <div className="flex flex-col h-full px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">{slide.title}</h2>
          <div className="flex-1 grid grid-cols-2 gap-6">
            <div className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">{left}</div>
            <div className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">{right}</div>
          </div>
        </div>
      );
    }

    case "comparison": {
      const parts = slide.body.split("\n\n");
      const left = parts[0] || "";
      const right = parts.slice(1).join("\n\n") || "";
      return (
        <div className="flex flex-col h-full px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">{slide.title}</h2>
          <div className="flex-1 grid grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 whitespace-pre-line text-sm text-gray-700 leading-relaxed">
              {left}
            </div>
            <div className="bg-amber-50 rounded-lg p-4 whitespace-pre-line text-sm text-gray-700 leading-relaxed">
              {right}
            </div>
          </div>
        </div>
      );
    }

    case "quote":
      return (
        <div className="flex flex-col items-center justify-center h-full px-12 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{slide.title}</h2>
          <blockquote className="text-2xl italic text-gray-600 leading-relaxed max-w-xl">
            &ldquo;{slide.body}&rdquo;
          </blockquote>
        </div>
      );

    case "key-point":
      return (
        <div className="flex flex-col h-full px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">{slide.title}</h2>
          <div className="flex-1 whitespace-pre-line text-sm text-gray-700 leading-relaxed">
            {slide.body}
          </div>
        </div>
      );

    case "image-focus":
      return (
        <div className="flex flex-col h-full px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{slide.title}</h2>
          {slide.imageUrl ? (
            <div className="flex-1 flex items-center justify-center">
              <img src={slide.imageUrl} alt={slide.title} className="max-h-full max-w-full rounded-lg" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <span className="text-gray-400 text-sm">No image — placeholder</span>
            </div>
          )}
          {slide.body && (
            <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">{slide.body}</p>
          )}
        </div>
      );

    default:
      return (
        <div className="flex flex-col h-full px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">{slide.title}</h2>
          <div className="flex-1 whitespace-pre-line text-sm text-gray-700 leading-relaxed">
            {slide.body}
          </div>
        </div>
      );
  }
}

export default function SlideEditorModal({
  isOpen,
  onClose,
  slides,
  resourceTitle,
}: SlideEditorModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localSlides, setLocalSlides] = useState<Slide[]>([]);
  const thumbStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalSlides(slides.map((s) => ({ ...s })));
      setCurrentIndex(0);
    }
  }, [isOpen, slides]);

  if (!isOpen || localSlides.length === 0) return null;

  const current = localSlides[currentIndex];

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
      {/* ═══ Header ═══ */}
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

      {/* ═══ Main Area ═══ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Slide Preview */}
        <div className="w-3/5 p-6 flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-3xl aspect-video bg-white rounded-xl shadow-lg border border-gray-200 border-t-4 border-t-purple-500 overflow-hidden">
            {renderSlidePreview(current)}
          </div>
        </div>

        {/* Right: Form Fields */}
        <div className="w-2/5 border-l border-gray-200 bg-white overflow-y-auto p-6">
          <div className="space-y-5">
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
                rows={7}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-y"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Speaker Notes</label>
              <textarea
                value={current.speakerNotes || ""}
                onChange={(e) => updateCurrentSlide({ speakerNotes: e.target.value })}
                rows={4}
                placeholder="Optional notes for the presenter..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Bottom Bar ═══ */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        {/* Prev button */}
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        {/* Thumbnail strip */}
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

        {/* Add / Delete */}
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

        {/* Next button */}
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
