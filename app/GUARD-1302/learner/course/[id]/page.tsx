"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Mic,
  CircleCheck,
  Trophy,
  Check,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Subtitles,
  FileText,
  Star,
} from "lucide-react";
import {
  getCourseById,
  getLessonsByCourseId,
  getResourcesByLessonId,
} from "@/lib/store-guard-1302";
import type { Slide, NarrationData, KnowledgeCheckData } from "@/types";

function SlidePlayer({ slides }: { slides: Slide[] }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (slides.length === 0) return null;

  const slide = slides[currentSlideIndex];
  const isFirst = currentSlideIndex === 0;
  const isLast = currentSlideIndex === slides.length - 1;

  return (
    <div>
      {/* Slide frame */}
      <div className="aspect-video bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
        <div className="flex-1 flex flex-col justify-center p-8 md:p-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {slide.title}
          </h3>
          <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
            {slide.body}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
          disabled={isFirst}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isFirst
              ? "opacity-40 cursor-not-allowed text-gray-400"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentSlideIndex ? "bg-purple-600" : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
        </div>

        {isLast ? (
          <button
            onClick={() => setCurrentSlideIndex(0)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            Done
            <Check className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

const SPEED_OPTIONS = ["0.75x", "1x", "1.25x", "1.5x", "2x"];

function NarrationPlayer({ narrationData }: { narrationData: NarrationData }) {
  const { slides, script, audioDurationSeconds } = narrationData;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const [showTranscript, setShowTranscript] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(true);

  if (slides.length === 0) return null;

  const slide = slides[currentSlideIndex];
  const isFirst = currentSlideIndex === 0;
  const isLast = currentSlideIndex === slides.length - 1;

  const totalMin = Math.floor(audioDurationSeconds / 60);
  const totalSec = audioDurationSeconds % 60;
  const totalTime = `${totalMin}:${totalSec.toString().padStart(2, "0")}`;

  const captionText = script
    .split(".")
    .slice(0, 2)
    .join(".")
    .trim() + ".";

  return (
    <div>
      {/* Slide frame */}
      <div className="aspect-video bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
        <div className="h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
        <div className="flex-1 flex flex-col justify-center p-8 md:p-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {slide.title}
          </h3>
          <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
            {slide.body}
          </p>
        </div>
      </div>

      {/* Slide navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
          disabled={isFirst}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isFirst
              ? "opacity-40 cursor-not-allowed text-gray-400"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentSlideIndex
                    ? "bg-purple-600"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
        </div>

        {isLast ? (
          <button
            onClick={() => setCurrentSlideIndex(0)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            Done
            <Check className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Audio control bar */}
      <div className="mt-4 bg-gray-900 rounded-lg p-3 flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-teal-500 hover:bg-teal-400 text-white transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full w-[30%] bg-teal-400 rounded-full" />
          </div>
          <span className="text-xs text-gray-400">
            2:15 / {totalTime}
          </span>
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-2 flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600" title="Skip back 10s">
            <SkipBack className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-600" title="Skip forward 10s">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(e.target.value)}
          className="text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer"
        >
          {SPEED_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <Volume2 className="w-4 h-4 text-gray-500" />
          <button
            onClick={() => setCcEnabled(!ccEnabled)}
            className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
              ccEnabled
                ? "bg-teal-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
            title="Toggle captions"
          >
            CC
          </button>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-1.5 rounded transition-colors ${
              showTranscript
                ? "bg-teal-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
            title="Toggle transcript"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Captions bar */}
      {ccEnabled && (
        <div className="mt-2 bg-gray-900/80 text-white text-sm p-3 rounded-lg">
          {captionText}
        </div>
      )}

      {/* Transcript panel */}
      {showTranscript && (
        <div className="mt-3 bg-white border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
          <p className="text-sm font-semibold text-gray-700 mb-2">Transcript</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {script}
          </p>
        </div>
      )}
    </div>
  );
}

function KnowledgeCheckPlayer({ data }: { data: KnowledgeCheckData }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const correctIndex = data.options.findIndex((opt) => opt.isCorrect);

  const getOptionClassName = (idx: number) => {
    const base =
      "w-full text-left rounded-lg p-3 text-sm transition-all border";

    if (isChecked) {
      if (data.options[idx].isCorrect) {
        return `${base} bg-green-50 border-green-500 text-green-800 font-medium`;
      }
      if (idx === selectedIndex && !data.options[idx].isCorrect) {
        return `${base} bg-red-50 border-red-500 text-red-800`;
      }
      return `${base} bg-white border-gray-200 text-gray-400`;
    }

    if (idx === selectedIndex) {
      return `${base} border-purple-500 bg-purple-50 font-medium text-gray-900`;
    }

    return `${base} bg-white border-gray-200 text-gray-700 hover:border-purple-300`;
  };

  return (
    <div className="bg-purple-50 rounded-xl p-6 shadow-sm">
      <p className="text-purple-700 font-semibold text-sm uppercase tracking-wide">
        ✋ Knowledge Check
      </p>

      <p className="text-lg font-medium text-gray-900 mt-3 mb-5">
        {data.question}
      </p>

      <div className="space-y-3">
        {data.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!isChecked) setSelectedIndex(idx);
            }}
            disabled={isChecked}
            className={getOptionClassName(idx)}
          >
            {option.text}
          </button>
        ))}
      </div>

      {selectedIndex !== null && !isChecked && (
        <button
          onClick={() => setIsChecked(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-lg px-5 py-2.5 mt-4 transition-colors"
        >
          Check Answer
        </button>
      )}

      {isChecked && (
        <>
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Explanation
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {data.explanation}
            </p>
          </div>

          <p className="text-center mt-4 text-sm text-purple-600 font-medium">
            Continue ↓
          </p>
        </>
      )}
    </div>
  );
}

export default function CoursePlayerPage() {
  const params = useParams();
  const id = params.id as string;

  const course = getCourseById(id);
  const lessons = useMemo(
    () => getLessonsByCourseId(id).sort((a, b) => a.order - b.order),
    [id]
  );

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(
    new Set()
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [courseFinished, setCourseFinished] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  if (!course || lessons.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Course not found
          </h1>
          <Link
            href="/GUARD-1302/learner"
            className="text-purple-600 hover:text-purple-700 underline"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentLesson = lessons[currentLessonIndex];
  const resources = getResourcesByLessonId(currentLesson.id).sort(
    (a, b) => a.order - b.order
  );
  const completedCount = completedLessons.size;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  const isLessonAccessible = (index: number) =>
    index === 0 ||
    completedLessons.has(index) ||
    completedLessons.has(index - 1);

  const handleMarkComplete = () => {
    const next = new Set(completedLessons);
    next.add(currentLessonIndex);
    setCompletedLessons(next);

    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else if (next.size === lessons.length) {
      setCourseFinished(true);
    }
  };

  const handlePrevious = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleNext = () => {
    if (
      currentLessonIndex < lessons.length - 1 &&
      isLessonAccessible(currentLessonIndex + 1)
    ) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else if (
      currentLessonIndex === lessons.length - 1 &&
      completedLessons.has(currentLessonIndex)
    ) {
      setCourseFinished(true);
    }
  };

  const isCurrentCompleted = completedLessons.has(currentLessonIndex);
  const isLastLesson = currentLessonIndex === lessons.length - 1;
  const nextAccessible =
    currentLessonIndex < lessons.length - 1 &&
    isLessonAccessible(currentLessonIndex + 1);

  // --- Course Complete screen ---
  if (courseFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white py-12 px-4">
        <div className="text-center max-w-lg w-full">
          <span className="text-6xl block mb-4">🎉</span>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Complete!
          </h1>
          <p className="text-gray-600">{course.title}</p>

          {/* Summary card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 w-full text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Score</p>
                <p className="text-2xl font-bold text-gray-900">92%</p>
                <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium mt-1">
                  <CheckCircle2 className="w-4 h-4" /> Passed
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time</p>
                <p className="text-2xl font-bold text-gray-900">2h 15m</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Lessons</p>
                <p className="text-2xl font-bold text-gray-900">{lessons.length}/{lessons.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Certificate</p>
                <p className="text-sm font-medium text-gray-900 mt-1">📜 Certificate Issued</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Skills Earned</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">LOTO Certified</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Lockout/Tagout</span>
              </div>
            </div>
          </div>

          {/* Star rating */}
          <div className="mt-8">
            <p className="text-sm font-medium text-gray-700 mb-3">How would you rate this course?</p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setStarRating(star)}
                  className="p-1 transition-colors"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= starRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment textarea */}
          <div className="mt-4 w-full">
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Any additional feedback? (optional)"
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Submit feedback */}
          <div className="mt-3">
            {feedbackSubmitted ? (
              <p className="text-green-600 font-medium text-sm">Thank you for your feedback!</p>
            ) : (
              <button
                onClick={() => setFeedbackSubmitted(true)}
                disabled={starRating === 0}
                className={`font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors ${
                  starRating === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                Submit Feedback
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-8 w-full">
            <button
              onClick={() => alert("Certificate viewer coming soon!")}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-5 py-2.5 transition-colors"
            >
              View Certificate
            </button>
            <Link
              href="/GUARD-1302/learner"
              className="flex-1 inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg px-5 py-2.5 transition-colors"
            >
              Back to My Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ── Header ── */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 z-20">
        <Link
          href="/GUARD-1302/learner"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Exit
        </Link>

        <div className="h-5 w-px bg-gray-200" />

        <h1 className="text-sm font-semibold text-gray-900 truncate flex-1">
          {course.title}
        </h1>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-500">
            Lesson {currentLessonIndex + 1} of {lessons.length}
          </span>
          <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* ── Body (sidebar + content) ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Lessons
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <nav className="flex-1 py-2">
              {lessons.map((lesson, idx) => {
                const isCompleted = completedLessons.has(idx);
                const isCurrent = idx === currentLessonIndex;
                const isAccessible = isLessonAccessible(idx);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      if (isAccessible) setCurrentLessonIndex(idx);
                    }}
                    disabled={!isAccessible}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      isCurrent
                        ? "bg-purple-50 border-l-4 border-purple-600 font-semibold text-purple-900"
                        : isCompleted
                        ? "hover:bg-gray-50 text-gray-700"
                        : isAccessible
                        ? "hover:bg-gray-50 text-gray-600"
                        : "opacity-50 cursor-not-allowed text-gray-400"
                    } ${!isCurrent ? "border-l-4 border-transparent" : ""}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <ChevronRight className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {idx + 1}. {lesson.title}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Sidebar collapsed toggle */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-0 top-20 z-10 bg-white border border-gray-200 border-l-0 rounded-r-lg p-2 shadow-sm hover:bg-gray-50 transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-gray-500" />
          </button>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="mb-6">
              <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">
                Lesson {currentLessonIndex + 1} of {lessons.length}
              </p>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentLesson.title}
              </h2>
              {currentLesson.estimatedMinutes && (
                <p className="text-sm text-gray-500 mt-1">
                  ~{currentLesson.estimatedMinutes} min
                </p>
              )}
            </div>

            {resources.map((resource) => {
              if (resource.type === "text" && resource.content) {
                return (
                  <div
                    key={resource.id}
                    className="mb-8 prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 prose-blockquote:bg-purple-50 prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:font-normal prose-blockquote:text-purple-900"
                    dangerouslySetInnerHTML={{ __html: resource.content }}
                  />
                );
              }

              if (resource.type === "slides") {
                return (
                  <div key={resource.id} className="mb-8">
                    <SlidePlayer slides={resource.slides || []} />
                  </div>
                );
              }

              if (resource.type === "narrated-walkthrough" && resource.narrationData) {
                return (
                  <div key={resource.id} className="mb-8">
                    <NarrationPlayer narrationData={resource.narrationData} />
                  </div>
                );
              }

              if (resource.type === "knowledge-check" && resource.knowledgeCheckData) {
                return (
                  <div key={resource.id} className="mb-8">
                    <KnowledgeCheckPlayer data={resource.knowledgeCheckData} />
                  </div>
                );
              }

              return null;
            })}

            {resources.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p>No content available for this lesson.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="h-16 bg-white border-t border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
        <button
          onClick={handlePrevious}
          disabled={currentLessonIndex === 0}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentLessonIndex === 0
              ? "opacity-40 cursor-not-allowed text-gray-400"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          onClick={handleMarkComplete}
          disabled={isCurrentCompleted}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            isCurrentCompleted
              ? "bg-green-100 text-green-700 cursor-default"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {isCurrentCompleted ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </>
          ) : (
            "Mark Complete"
          )}
        </button>

        <button
          onClick={handleNext}
          disabled={
            isLastLesson
              ? !completedLessons.has(currentLessonIndex)
              : !nextAccessible
          }
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            (isLastLesson && !completedLessons.has(currentLessonIndex)) ||
            (!isLastLesson && !nextAccessible)
              ? "opacity-40 cursor-not-allowed text-gray-400"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {isLastLesson ? "Finish Course" : "Next"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
