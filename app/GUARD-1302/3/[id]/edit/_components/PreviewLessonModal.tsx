// Epic 1D: Preview lesson modal (read-only)
"use client";

import React from "react";
import { X } from "lucide-react";
import Modal from "@/components/Modal";
import ResourcePreview from "@/components/ResourcePreview";
import Badge from "@/components/Badge";
import { Resource } from "@/types";
import { formatFileSize } from "@/lib/uploads";

interface PreviewLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  resources: Resource[];
}

export default function PreviewLessonModal({
  isOpen,
  onClose,
  lessonTitle,
  resources,
}: PreviewLessonModalProps) {
  // Sort by order
  const sortedResources = [...resources].sort((a, b) => a.order - b.order);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${lessonTitle}`}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {sortedResources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No resources in this lesson yet.
          </div>
        ) : (
          sortedResources.map((resource, index) => (
            <div
              key={resource.id}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                    <Badge className="text-xs capitalize">{resource.type}</Badge>
                  </div>
                  <h4 className="font-semibold text-gray-900">{resource.title}</h4>
                </div>
              </div>

              {/* Metadata */}
              {(resource.fileName || resource.fileSize || resource.durationSec) && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 flex-wrap">
                  {resource.fileName && <span>{resource.fileName}</span>}
                  {resource.fileSize && (
                    <>
                      {resource.fileName && <span>•</span>}
                      <span>{formatFileSize(resource.fileSize)}</span>
                    </>
                  )}
                  {resource.durationSec && resource.durationSec > 0 && (
                    <>
                      {(resource.fileName || resource.fileSize) && <span>•</span>}
                      <span>
                        {Math.floor(resource.durationSec / 60)}:{(resource.durationSec % 60).toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Preview/Content */}
              <div className="mt-3">
                {resource.type === 'text' ? (
                  <div className="prose prose-sm max-w-none">
                    <div
                      className="text-sm text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: resource.content || '' }}
                    />
                  </div>
                ) : (
                  <ResourcePreview resource={resource} size="medium" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Close Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

