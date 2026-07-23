// Epic 1G.7: Style Audit Panel Component
"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Eye, Wand2, Clock, Zap } from "lucide-react";
import { StyleAuditIssue } from "@/types";
import { auditStyleConsistency, runAuditAcrossCourse } from "@/lib/ai/metadata";
import { getOrganization, collectCourseHtml, applyBulkStyleFixes } from "@/lib/store-guard-1302";
import Button from "@/components/Button";
import Card from "@/components/Card";
import BulkFixConfirmModal from "./BulkFixConfirmModal";
import Toast from "@/components/Toast";

interface StyleAuditPanelProps {
  courseId: string;
  isManager: boolean;
  onViewInContext: (lessonId: string, sectionId: string, text?: string) => void;
  onQuickFix: (issue: StyleAuditIssue) => void;
}

export default function StyleAuditPanel({
  courseId,
  isManager,
  onViewInContext,
  onQuickFix,
}: StyleAuditPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [issues, setIssues] = useState<StyleAuditIssue[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleRunCheck = async () => {
    setIsRunning(true);
    try {
      const org = getOrganization();
      const sourceHtml = collectCourseHtml(courseId);
      const result = await auditStyleConsistency({
        courseId,
        scope: 'course',
        sourceHtml,
        orgStyle: org.styleGuide,
      });
      setIssues(result);
      setLastRunAt(new Date().toISOString());
    } catch (error) {
      console.error('Failed to run style audit:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
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

  const getIssueIcon = (kind: StyleAuditIssue['kind']) => {
    switch (kind) {
      case 'bannedTerm':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'preferredTerm':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'readingLevel':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'tone':
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getIssueColor = (kind: StyleAuditIssue['kind']) => {
    switch (kind) {
      case 'bannedTerm':
        return 'bg-red-50 border-red-200';
      case 'preferredTerm':
        return 'bg-yellow-50 border-yellow-200';
      case 'readingLevel':
        return 'bg-orange-50 border-orange-200';
      case 'tone':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const groupedIssues = issues.reduce((acc, issue) => {
    if (!acc[issue.kind]) {
      acc[issue.kind] = [];
    }
    acc[issue.kind].push(issue);
    return acc;
  }, {} as Record<string, StyleAuditIssue[]>);

  const handleBulkApply = async () => {
    setIsBulkProcessing(true);
    try {
      // Run audit across course to get all issues
      const allIssues = await runAuditAcrossCourse(courseId);
      
      // Apply bulk fixes
      const result = applyBulkStyleFixes(courseId, allIssues);
      
      // Update local issues state (remove fixed ones)
      const safeFixes = allIssues.filter(
        issue => issue.suggestion && (issue.kind === 'bannedTerm' || issue.kind === 'preferredTerm')
      );
      const remainingIssues = issues.filter(
        issue => !safeFixes.some(
          fix => fix.location?.sectionId === issue.location?.sectionId &&
                 fix.kind === issue.kind &&
                 fix.message === issue.message
        )
      );
      setIssues(remainingIssues);
      
      // Show success toast
      setToast({
        message: `${result.fixesApplied} fixes applied across ${result.sectionsChanged} section${result.sectionsChanged !== 1 ? 's' : ''}`,
        type: 'success',
      });
      
      // Close modal
      setIsBulkModalOpen(false);
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => setToast(null), 5000);
    } catch (error) {
      console.error('Failed to apply bulk fixes:', error);
      setToast({
        message: 'Failed to apply bulk fixes. Please try again.',
        type: 'error',
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-orange-100 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">Style & Consistency Check</h3>
          <p className="text-xs text-gray-500 mt-1">Audit content against style guide</p>
        </div>
      </div>

      {lastRunAt && (
        <div className="mb-4 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
          <Clock className="w-3 h-3 inline mr-1" />
          Last run: {formatTimestamp(lastRunAt)}
        </div>
      )}

      {issues.length === 0 && !lastRunAt && (
        <Button
          variant="primary"
          onClick={handleRunCheck}
          disabled={isRunning || isManager}
          className="w-full"
        >
          {isRunning ? (
            <>
              <AlertTriangle className="w-4 h-4 mr-2 animate-spin" />
              Running check...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Run Check
            </>
          )}
        </Button>
      )}

      {issues.length === 0 && lastRunAt && (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">No style issues found</p>
          <p className="text-xs text-gray-500 mt-1">Content matches style guide requirements</p>
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-4">
          {/* Bulk Apply Button */}
          {!isManager && (
            <div className="mb-4">
              <Button
                variant="primary"
                onClick={() => setIsBulkModalOpen(true)}
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                Apply All Fixes (Current Course)
              </Button>
            </div>
          )}
          
          {Object.entries(groupedIssues).map(([kind, kindIssues]) => (
            <div key={kind} className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {kind === 'bannedTerm' && 'Banned Terms'}
                {kind === 'preferredTerm' && 'Preferred Terms'}
                {kind === 'readingLevel' && 'Reading Level'}
                {kind === 'tone' && 'Tone'}
              </h4>
              {kindIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${getIssueColor(issue.kind)}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {getIssueIcon(issue.kind)}
                    <p className="text-sm text-gray-700 flex-1">{issue.message}</p>
                  </div>
                  {issue.suggestion && (
                    <p className="text-xs text-gray-600 mb-2 ml-6">
                      <strong>Suggestion:</strong> {issue.suggestion}
                    </p>
                  )}
                  <div className="flex items-center gap-2 ml-6">
                    {issue.location && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (issue.location?.lessonId && issue.location?.sectionId) {
                            onViewInContext(
                              issue.location.lessonId,
                              issue.location.sectionId,
                              issue.suggestion
                            );
                          }
                        }}
                        className="text-xs px-2 py-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View in context
                      </Button>
                    )}
                    {issue.suggestion && !isManager && (
                      <Button
                        variant="primary"
                        onClick={() => onQuickFix(issue)}
                        className="text-xs px-2 py-1"
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        Quick Fix
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      
      {/* Bulk Fix Confirmation Modal */}
      <BulkFixConfirmModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={handleBulkApply}
        issues={issues}
        isProcessing={isBulkProcessing}
      />
      
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Card>
  );
}

