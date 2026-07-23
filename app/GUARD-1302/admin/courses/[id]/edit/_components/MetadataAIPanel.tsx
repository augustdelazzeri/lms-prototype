// Epic 1G.7: AI Metadata Panel Component
"use client";

import React, { useState } from "react";
import { Sparkles, Check, Clock } from "lucide-react";
import { CourseMetadata } from "@/types";
import { generateCourseMetadata, MetaGenOutput } from "@/lib/ai/metadata";
import { applyCourseMetadata, collectCourseHtml } from "@/lib/store-guard-1302";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Badge from "@/components/Badge";

interface MetadataAIPanelProps {
  courseId: string;
  currentMetadata?: CourseMetadata;
  isManager: boolean;
  onMetadataUpdated: () => void;
}

export default function MetadataAIPanel({
  courseId,
  currentMetadata,
  isManager,
  onMetadataUpdated,
}: MetadataAIPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<MetaGenOutput | null>(null);
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const sourceHtml = collectCourseHtml(courseId);
      const result = await generateCourseMetadata({
        courseId,
        scope: 'course',
        sourceHtml,
      });
      setGeneratedMetadata(result);
      setAppliedFields(new Set());
    } catch (error) {
      console.error('Failed to generate metadata:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAll = () => {
    if (!generatedMetadata) return;
    
    applyCourseMetadata(courseId, {
      objectives: generatedMetadata.objectives,
      tags: generatedMetadata.tags,
      estimatedMinutes: generatedMetadata.estimatedMinutes,
      difficulty: generatedMetadata.difficulty,
      language: generatedMetadata.language,
      readingLevel: generatedMetadata.readingLevel,
      standards: generatedMetadata.standards,
    });
    
    setAppliedFields(new Set(['all']));
    onMetadataUpdated();
  };

  const handleApplyField = (field: string, value: any) => {
    applyCourseMetadata(courseId, { [field]: value });
    setAppliedFields(new Set([...appliedFields, field]));
    onMetadataUpdated();
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">AI: Improve Metadata</h3>
          <p className="text-xs text-gray-500 mt-1">Generate metadata from course content</p>
        </div>
      </div>

      {currentMetadata?.lastAIReviewAt && (
        <div className="mb-4 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
          <Clock className="w-3 h-3 inline mr-1" />
          Last AI review: {formatTimestamp(currentMetadata.lastAIReviewAt)}
        </div>
      )}

      {!generatedMetadata && (
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={isGenerating || isManager}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate from Course Content
            </>
          )}
        </Button>
      )}

      {generatedMetadata && (
        <div className="space-y-4">
          {/* Objectives */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Objectives</label>
              {!isManager && (
                <Button
                  variant="secondary"
                  onClick={() => handleApplyField('objectives', generatedMetadata.objectives)}
                  disabled={appliedFields.has('objectives') || appliedFields.has('all')}
                  className="text-xs px-2 py-1"
                >
                  {appliedFields.has('objectives') || appliedFields.has('all') ? 'Applied' : 'Apply'}
                </Button>
              )}
            </div>
            <ul className="space-y-1 text-sm text-gray-600">
              {generatedMetadata.objectives.map((obj, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Tags</label>
              {!isManager && (
                <Button
                  variant="secondary"
                  onClick={() => handleApplyField('tags', generatedMetadata.tags)}
                  disabled={appliedFields.has('tags') || appliedFields.has('all')}
                  className="text-xs px-2 py-1"
                >
                  {appliedFields.has('tags') || appliedFields.has('all') ? 'Applied' : 'Apply'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {generatedMetadata.tags.map((tag) => (
                <Badge key={tag} variant="info">{tag}</Badge>
              ))}
            </div>
          </div>

          {/* Estimated Duration */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Estimated Duration</label>
              {!isManager && (
                <Button
                  variant="secondary"
                  onClick={() => handleApplyField('estimatedMinutes', generatedMetadata.estimatedMinutes)}
                  disabled={appliedFields.has('estimatedMinutes') || appliedFields.has('all')}
                  className="text-xs px-2 py-1"
                >
                  {appliedFields.has('estimatedMinutes') || appliedFields.has('all') ? 'Applied' : 'Apply'}
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600">{generatedMetadata.estimatedMinutes} minutes</p>
          </div>

          {/* Difficulty */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Difficulty</label>
              {!isManager && (
                <Button
                  variant="secondary"
                  onClick={() => handleApplyField('difficulty', generatedMetadata.difficulty)}
                  disabled={appliedFields.has('difficulty') || appliedFields.has('all')}
                  className="text-xs px-2 py-1"
                >
                  {appliedFields.has('difficulty') || appliedFields.has('all') ? 'Applied' : 'Apply'}
                </Button>
              )}
            </div>
            <Badge variant="default">{generatedMetadata.difficulty}</Badge>
          </div>

          {/* Language */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Language</label>
              {!isManager && (
                <Button
                  variant="secondary"
                  onClick={() => handleApplyField('language', generatedMetadata.language)}
                  disabled={appliedFields.has('language') || appliedFields.has('all')}
                  className="text-xs px-2 py-1"
                >
                  {appliedFields.has('language') || appliedFields.has('all') ? 'Applied' : 'Apply'}
                </Button>
              )}
            </div>
            <Badge variant="default">{generatedMetadata.language === 'en' ? 'English' : 'Spanish'}</Badge>
          </div>

          {/* Reading Level */}
          <div className="border-b border-gray-200 pb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Reading Level</label>
              {!isManager && (
                <Button
                  variant="secondary"
                  onClick={() => handleApplyField('readingLevel', generatedMetadata.readingLevel)}
                  disabled={appliedFields.has('readingLevel') || appliedFields.has('all')}
                  className="text-xs px-2 py-1"
                >
                  {appliedFields.has('readingLevel') || appliedFields.has('all') ? 'Applied' : 'Apply'}
                </Button>
              )}
            </div>
            <Badge variant="default">{generatedMetadata.readingLevel}</Badge>
          </div>

          {/* Standards */}
          {generatedMetadata.standards && (
            Object.keys(generatedMetadata.standards).length > 0 && (
              <div className="border-b border-gray-200 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Standards</label>
                  {!isManager && (
                    <Button
                      variant="secondary"
                      onClick={() => handleApplyField('standards', generatedMetadata.standards)}
                      disabled={appliedFields.has('standards') || appliedFields.has('all')}
                      className="text-xs px-2 py-1"
                    >
                      {appliedFields.has('standards') || appliedFields.has('all') ? 'Applied' : 'Apply'}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {generatedMetadata.standards.osha && generatedMetadata.standards.osha.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">OSHA:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedMetadata.standards.osha.map((code) => (
                          <Badge key={code} variant="error">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {generatedMetadata.standards.msha && generatedMetadata.standards.msha.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">MSHA:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedMetadata.standards.msha.map((code) => (
                          <Badge key={code} variant="warning">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {generatedMetadata.standards.epa && generatedMetadata.standards.epa.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">EPA:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedMetadata.standards.epa.map((code) => (
                          <Badge key={code} variant="success">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* Apply All Button */}
          {!isManager && (
            <Button
              variant="primary"
              onClick={handleApplyAll}
              disabled={appliedFields.has('all')}
              className="w-full"
            >
              {appliedFields.has('all') ? 'All Applied' : 'Apply All'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

