"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft, Check, ChevronLeft, ChevronRight, FileText, HelpCircle, Send, Loader2 } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import RouteGuard from "@/components/RouteGuard";
import Button from "@/components/Button";
import AIInsightPanel from "@/components/AIInsightPanel";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { AICourseDraft, AIPreviewInsights } from "@/types";
import { createCourseFromAIDraft, getCurrentUser } from "@/lib/store-guard-1302";
import { transformSectionWithPrompt } from "@/lib/ai/transformSection";
import { markdownToHtml } from "@/lib/markdownToHtml";

export default function AIPreviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<AICourseDraft | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedLessons, setEditedLessons] = useState<AICourseDraft['lessons']>([]);
  const [insights, setInsights] = useState<AIPreviewInsights | null>(null);
  
  // Navigation state
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'content' | 'quiz'>('content');
  
  // AI prompt state
  const [customPrompt, setCustomPrompt] = useState("");
  const [isTransforming, setIsTransforming] = useState(false);
  
  // Toast
  const [toast, setToast] = useState<{message: string; type: 'success'|'info'} | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('aiCourseDraft');
    
    if (stored) {
      try {
        const parsed: AICourseDraft = JSON.parse(stored);
        setDraft(parsed);
        setEditedTitle(parsed.title);
        setEditedDescription(parsed.description);
        // Convert markdown to HTML for the rich text editor
        const htmlLessons = parsed.lessons.map(lesson => ({
          ...lesson,
          sections: lesson.sections.map(section => ({
            ...section,
            content: markdownToHtml(section.content)
          }))
        }));
        setEditedLessons(htmlLessons);
        
        if (parsed.previewInsights) {
          setInsights(parsed.previewInsights);
        }
      } catch (error) {
        console.error('Failed to parse draft:', error);
        router.push('/admin/courses');
      }
    } else {
      router.push('/admin/courses');
    }
  }, [router]);

  const showToast = (message: string, type: 'success'|'info' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  const updateSectionContent = (lessonIndex: number, sectionIndex: number, newContent: string) => {
    const updated = [...editedLessons];
    updated[lessonIndex].sections[sectionIndex] = {
      ...updated[lessonIndex].sections[sectionIndex],
      content: newContent,
    };
    setEditedLessons(updated);
  };

  const handleCustomPrompt = async () => {
    if (!customPrompt.trim() || isTransforming) return;
    
    setIsTransforming(true);
    const currentContent = editedLessons[selectedLessonIdx].sections[selectedSectionIdx].content;
    
    try {
      // Transform returns markdown, so we need to convert to HTML
      const newContent = await transformSectionWithPrompt(currentContent, customPrompt, {
        lessonTitle: editedLessons[selectedLessonIdx].title,
        topic: editedTitle
      });
      
      // Convert the result to HTML for the rich text editor
      updateSectionContent(selectedLessonIdx, selectedSectionIdx, markdownToHtml(newContent));
      setCustomPrompt("");
      showToast('Content updated successfully');
    } catch (error) {
      console.error('Failed to transform:', error);
      showToast('Failed to update content', 'info');
    } finally {
      setIsTransforming(false);
    }
  };

  const handleAccept = () => {
    if (!draft) return;

    // Content is already in HTML format from the rich text editor
    const updatedDraft: AICourseDraft = {
      ...draft,
      title: editedTitle,
      description: editedDescription,
      lessons: editedLessons,
    };

    // Use the store function with contentIsHtml flag since content is already HTML from rich text editor
    const courseId = createCourseFromAIDraft(updatedDraft, getCurrentUser().id, { contentIsHtml: true });
    
    sessionStorage.removeItem('aiCourseDraft');
    sessionStorage.removeItem('aiCoursePrompt');
    sessionStorage.removeItem('aiCourseSourceFile');
    
    router.push(`/GUARD-1302/admin/courses/${courseId}/edit`);
  };

  const handleDiscard = () => {
    if (confirm('Discard this AI-generated draft? This cannot be undone.')) {
      sessionStorage.removeItem('aiCourseDraft');
      sessionStorage.removeItem('aiCoursePrompt');
      sessionStorage.removeItem('aiCourseSourceFile');
      router.push('/admin/courses');
    }
  };

  // Navigation handlers
  const goToNextSection = () => {
    const currentLesson = editedLessons[selectedLessonIdx];
    if (selectedSectionIdx < currentLesson.sections.length - 1) {
      setSelectedSectionIdx(selectedSectionIdx + 1);
    } else if (selectedLessonIdx < editedLessons.length - 1) {
      setSelectedLessonIdx(selectedLessonIdx + 1);
      setSelectedSectionIdx(0);
    }
  };

  const goToPrevSection = () => {
    if (selectedSectionIdx > 0) {
      setSelectedSectionIdx(selectedSectionIdx - 1);
    } else if (selectedLessonIdx > 0) {
      const prevLessonSections = editedLessons[selectedLessonIdx - 1].sections.length;
      setSelectedLessonIdx(selectedLessonIdx - 1);
      setSelectedSectionIdx(prevLessonSections - 1);
    }
  };

  const isFirstSection = selectedLessonIdx === 0 && selectedSectionIdx === 0;
  const isLastSection = selectedLessonIdx === editedLessons.length - 1 && 
    selectedSectionIdx === (editedLessons[selectedLessonIdx]?.sections.length || 1) - 1;

  const getTotalSections = () => editedLessons.reduce((acc, l) => acc + l.sections.length, 0);
  const getCurrentSectionNumber = () => {
    let count = 0;
    for (let i = 0; i < selectedLessonIdx; i++) {
      count += editedLessons[i].sections.length;
    }
    return count + selectedSectionIdx + 1;
  };

  if (!draft || !insights) {
    return (
      <RouteGuard allowedRoles={["ADMIN"]}>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading preview...</p>
            </div>
          </div>
        </AdminLayout>
      </RouteGuard>
    );
  }

  const currentLesson = editedLessons[selectedLessonIdx];
  const currentSection = currentLesson?.sections[selectedSectionIdx];

  return (
    <RouteGuard allowedRoles={["ADMIN"]}>
      <AdminLayout>
        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-top ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-indigo-500'
          } text-white font-medium`}>
            {toast.message}
          </div>
        )}

        <div className="max-w-[1800px] mx-auto pb-24">
          {/* Header */}
          <div className="flex items-center justify-between py-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">AI Course Preview</h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-medium rounded-full shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    AI Generated
                  </span>
                </div>
                <p className="text-gray-500 text-sm">Review and edit content section by section</p>
              </div>
            </div>
          </div>

          {/* Course Title & Description */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 my-4 border border-gray-200">
            <div className="mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Enter course title..."
                className="w-full text-lg font-semibold text-gray-900 bg-transparent focus:outline-none mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Add a brief description..."
                rows={2}
                className="w-full text-sm text-gray-600 bg-transparent focus:outline-none mt-0.5 resize-none"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex gap-6">
            {/* Left Sidebar - Lesson Navigator */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('content')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'content' 
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Lessons
                  </button>
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'quiz' 
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 inline mr-2" />
                    Quiz
                  </button>
                </div>

                {activeTab === 'content' && (
                  <div className="p-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                    <div className="space-y-2">
                      {editedLessons.map((lesson, lessonIdx) => (
                        <div key={lessonIdx}>
                          {/* Lesson Header */}
                          <div 
                            className={`px-3 py-2 rounded-lg font-medium text-sm cursor-pointer transition-colors ${
                              selectedLessonIdx === lessonIdx 
                                ? 'bg-indigo-100 text-indigo-800' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              setSelectedLessonIdx(lessonIdx);
                              setSelectedSectionIdx(0);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                selectedLessonIdx === lessonIdx 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {lessonIdx + 1}
                              </span>
                              <span className="truncate">{lesson.title}</span>
                            </div>
                          </div>
                          
                          {/* Section Tabs */}
                          {selectedLessonIdx === lessonIdx && lesson.sections.length > 1 && (
                            <div className="ml-8 mt-1 space-y-1">
                              {lesson.sections.map((_, sectionIdx) => (
                                <button
                                  key={sectionIdx}
                                  onClick={() => setSelectedSectionIdx(sectionIdx)}
                                  className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                                    selectedSectionIdx === sectionIdx 
                                      ? 'bg-indigo-50 text-indigo-700 font-medium' 
                                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                  }`}
                                >
                                  Section {sectionIdx + 1}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Progress Indicator */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>Progress</span>
                        <span>{getCurrentSectionNumber()} of {getTotalSections()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                          style={{ width: `${(getCurrentSectionNumber() / getTotalSections()) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'quiz' && draft.quiz && (
                  <div className="p-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                    <div className="text-sm text-gray-600 mb-4">
                      {draft.quiz.questions.length} questions ready for review
                    </div>
                    <div className="space-y-2">
                      {draft.quiz.questions.map((q, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-semibold">
                              {idx + 1}
                            </span>
                            <p className="text-xs text-gray-700 line-clamp-2">{q.question}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center - Content Editor */}
            <div className="flex-1 min-w-0">
              {activeTab === 'content' && currentSection && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Section Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            Lesson {selectedLessonIdx + 1}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">
                            Section {selectedSectionIdx + 1} of {currentLesson.sections.length}
                          </span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{currentLesson.title}</h2>
                      </div>
                      
                      {/* Section Navigation */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={goToPrevSection}
                          disabled={isFirstSection}
                          className={`p-2 rounded-lg transition-colors ${
                            isFirstSection 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-gray-500 min-w-[80px] text-center">
                          {getCurrentSectionNumber()} / {getTotalSections()}
                        </span>
                        <button
                          onClick={goToNextSection}
                          disabled={isLastSection}
                          className={`p-2 rounded-lg transition-colors ${
                            isLastSection 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rich Text Editor */}
                  <div className="p-6">
                    <RichTextEditor
                      value={currentSection.content}
                      onChange={(html) => updateSectionContent(selectedLessonIdx, selectedSectionIdx, html)}
                      ariaLabel="Section content editor"
                    />
                    
                    {/* AI Prompt Input */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">AI Assistant</span>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCustomPrompt()}
                          placeholder="e.g., Add more detail about safety procedures, Make it shorter, Add bullet points..."
                          className="flex-1 px-4 py-2.5 bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                          disabled={isTransforming}
                        />
                        <button
                          onClick={handleCustomPrompt}
                          disabled={!customPrompt.trim() || isTransforming}
                          className={`px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
                            !customPrompt.trim() || isTransforming
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {isTransforming ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Update
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-purple-600">
                        Tell the AI how you want to modify this section's content
                      </p>
                    </div>
                  </div>

                  {/* Section Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <button
                      onClick={goToPrevSection}
                      disabled={isFirstSection}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isFirstSection 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    
                    {!isLastSection ? (
                      <button
                        onClick={goToNextSection}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                      >
                        Next Section
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleAccept}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        Accept & Create Course
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Quiz Tab Content */}
              {activeTab === 'quiz' && draft.quiz && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Quiz Preview</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {draft.quiz.questions.length} questions will be added to the course quiz
                    </p>
                  </div>
                  <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                    {draft.quiz.questions.map((question, idx) => (
                      <div key={idx} className="p-5 bg-gray-50 rounded-xl">
                        <div className="flex items-start gap-3 mb-4">
                          <span className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-semibold">
                            {idx + 1}
                          </span>
                          <p className="font-medium text-gray-900 pt-1">{question.question}</p>
                        </div>
                        <div className="ml-11 space-y-2">
                          {question.options.map((option, optIdx) => (
                            <div
                              key={optIdx}
                              className={`px-4 py-2.5 rounded-lg text-sm ${
                                optIdx === question.correctIndex
                                  ? 'bg-green-100 text-green-800 font-medium border border-green-200'
                                  : 'bg-white text-gray-700 border border-gray-200'
                              }`}
                            >
                              <span className="font-medium mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                              {option}
                              {optIdx === question.correctIndex && (
                                <span className="ml-2 text-green-600">✓</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {question.rationale && (
                          <div className="ml-11 mt-3 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
                            <strong>Rationale:</strong> {question.rationale}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - AI Insights */}
            <div className="w-80 flex-shrink-0">
              <AIInsightPanel insights={insights} />
            </div>
          </div>
        </div>

        {/* Fixed Bottom Toolbar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg z-20">
          <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
            <Button variant="secondary" onClick={handleDiscard}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Discard Draft
            </Button>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium">{editedLessons.length}</span> lessons, {' '}
                <span className="font-medium">{getTotalSections()}</span> sections, {' '}
                <span className="font-medium">{draft.quiz?.questions.length || 0}</span> quiz questions
              </div>
              <Button variant="primary" onClick={handleAccept}>
                <Check className="w-4 h-4 mr-2" />
                Accept & Create Course
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
