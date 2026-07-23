// Preview modal for section content
"use client";

import React from "react";
import { X } from "lucide-react";
import { Section } from "@/types";

interface PreviewSectionModalProps {
  section: Section | null;
  onClose: () => void;
}

export default function PreviewSectionModal({ section, onClose }: PreviewSectionModalProps) {
  if (!section) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-10 bg-white rounded-lg shadow-2xl z-50 flex flex-col max-w-4xl mx-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
            <div className="text-sm text-gray-600 mt-1 capitalize">
              {section.type} Section
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TEXT */}
          {section.type === "text" && section.content && (
            <div 
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}

          {/* VIDEO */}
          {section.type === "video" && section.url && (
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={section.url}
                controls
                className="w-full"
                style={{ maxHeight: '600px' }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* IMAGE */}
          {section.type === "image" && section.url && (
            <div className="flex justify-center">
              <img
                src={section.url}
                alt={section.title}
                className="max-w-full h-auto rounded-lg shadow-lg"
                style={{ maxHeight: '700px', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* PDF */}
          {section.type === "pdf" && section.url && (
            <div className="space-y-4">
              <iframe
                src={section.url}
                className="w-full rounded-lg border border-gray-300"
                style={{ height: '700px' }}
                title={section.title}
              />
              <div className="text-center">
                <a
                  href={section.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Open PDF in New Tab
                </a>
              </div>
            </div>
          )}

          {/* LINK */}
          {section.type === "link" && section.url && (
            <div className="bg-gray-50 rounded-lg p-8 text-center space-y-4">
              <div className="text-lg font-medium text-gray-900">External Link</div>
              <a
                href={section.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 hover:underline break-all text-lg"
              >
                {section.url}
              </a>
              <div>
                <a
                  href={section.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Open Link
                </a>
              </div>
            </div>
          )}

          {/* Fallback */}
          {!section.content && !section.url && (
            <div className="text-center py-12 text-gray-500">
              No preview available for this section.
            </div>
          )}
        </div>

        {/* Footer with metadata */}
        {(section.durationSec || section.fileName || section.fileSize) && (
          <div className="border-t p-4 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-6 text-sm text-gray-600">
              {section.durationSec && (
                <div>
                  <span className="font-medium">Duration:</span> {Math.floor(section.durationSec / 60)}:{(section.durationSec % 60).toString().padStart(2, '0')}
                </div>
              )}
              {section.fileName && (
                <div>
                  <span className="font-medium">File:</span> {section.fileName}
                </div>
              )}
              {section.fileSize && (
                <div>
                  <span className="font-medium">Size:</span> {(section.fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

