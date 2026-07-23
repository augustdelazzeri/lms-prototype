// Epic 1G.8: Bulk Fix Confirmation Modal
"use client";

import React from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { StyleAuditIssue } from "@/types";
import Modal from "@/components/Modal";
import Button from "@/components/Button";

interface BulkFixConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  issues: StyleAuditIssue[];
  isProcessing?: boolean;
}

export default function BulkFixConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  issues,
  isProcessing = false,
}: BulkFixConfirmModalProps) {
  // Filter to safe fixes only (bannedTerm and preferredTerm)
  const safeFixes = issues.filter(
    issue => issue.suggestion && (issue.kind === 'bannedTerm' || issue.kind === 'preferredTerm')
  );
  
  const toneIssues = issues.filter(issue => issue.kind === 'tone');
  const readingIssues = issues.filter(issue => issue.kind === 'readingLevel');
  
  // Count unique sections that will be changed
  const sectionsAffected = new Set(
    safeFixes
      .map(issue => issue.location?.sectionId)
      .filter((id): id is string => !!id)
  );
  
  // Group by issue type
  const bannedTermCount = safeFixes.filter(f => f.kind === 'bannedTerm').length;
  const preferredTermCount = safeFixes.filter(f => f.kind === 'preferredTerm').length;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply All Fixes" size="medium">
      <div className="p-6">
        {/* Summary */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Bulk Style Fix Preview
              </h3>
              <p className="text-sm text-gray-600">
                Review the fixes that will be applied automatically:
              </p>
            </div>
          </div>
          
          {/* Fixes Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Banned Terms</span>
              <span className="text-sm font-bold text-red-600">{bannedTermCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Preferred Terms</span>
              <span className="text-sm font-bold text-yellow-600">{preferredTermCount}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total Fixes</span>
                <span className="text-base font-bold text-indigo-600">{safeFixes.length}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-gray-900">Sections Affected</span>
                <span className="text-base font-bold text-indigo-600">{sectionsAffected.size}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Excluded Issues */}
        {(toneIssues.length > 0 || readingIssues.length > 0) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Not included in bulk fix:
                </p>
                <ul className="text-xs text-amber-800 space-y-1 ml-5">
                  {toneIssues.length > 0 && (
                    <li>• {toneIssues.length} tone issue(s) — manual review recommended</li>
                  )}
                  {readingIssues.length > 0 && (
                    <li>• {readingIssues.length} reading level issue(s) — manual review recommended</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Warning */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> This will create a version snapshot and individual audit events for each changed section. 
                You can undo these changes using the Undo button in the editor.
              </p>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isProcessing || safeFixes.length === 0}
          >
            {isProcessing ? (
              <>
                <AlertTriangle className="w-4 h-4 mr-2 animate-spin" />
                Applying fixes...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply {safeFixes.length} Fix{safeFixes.length !== 1 ? 'es' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}




