// Epic 1E: Resource editor drawer with type-specific forms
"use client";

import React, { useState, useEffect } from "react";
import { X, Upload as UploadIcon, Loader } from "lucide-react";
import { Resource, ResourceType } from "@/types";
import Button from "@/components/Button";
import UploadDropzone from "@/components/UploadDropzone";
import { getFileAccept } from "@/lib/uploads";

interface ResourceEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: Resource; // undefined = create, defined = edit
  lessonId: string;
  onSave: (resourceData: Partial<Resource>) => Promise<void>;
}

export default function ResourceEditorDrawer({
  isOpen,
  onClose,
  resource,
  lessonId,
  onSave,
}: ResourceEditorDrawerProps) {
  const isEditMode = !!resource;
  const [resourceType, setResourceType] = useState<ResourceType>(resource?.type || 'text');
  const [title, setTitle] = useState(resource?.title || '');
  const [url, setUrl] = useState(resource?.url || '');
  const [content, setContent] = useState(resource?.content || '');
  const [durationMin, setDurationMin] = useState('0');
  const [durationSec, setDurationSec] = useState('0');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);

  // Reset form when resource changes
  useEffect(() => {
    if (resource) {
      setResourceType(resource.type);
      setTitle(resource.title);
      setUrl(resource.url || '');
      setContent(resource.content || '');
      if (resource.durationSec) {
        setDurationMin(Math.floor(resource.durationSec / 60).toString());
        setDurationSec((resource.durationSec % 60).toString());
      }
      if (resource.url && resource.fileName) {
        setUploadedFile({
          url: resource.url,
          fileName: resource.fileName,
          fileSize: resource.fileSize || 0,
          mimeType: resource.mimeType || '',
        });
      }
    } else {
      // Reset for new resource
      setTitle('');
      setUrl('');
      setContent('');
      setDurationMin('0');
      setDurationSec('0');
      setUploadedFile(null);
    }
  }, [resource, isOpen]);

  const handleFileUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', resourceType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.ok) {
        setUploadedFile({
          url: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          mimeType: result.mimeType,
        });
        
        // Auto-set title from filename if empty
        if (!title) {
          const titleWithoutExtension = result.fileName.replace(/\.[^/.]+$/, '');
          setTitle(titleWithoutExtension);
        }
      } else {
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    if (resourceType === 'link' && !url.trim()) {
      alert('URL is required for link sections');
      return;
    }

    if (resourceType === 'text' && !content.trim()) {
      alert('Content is required for text sections');
      return;
    }

    if (['image', 'video', 'pdf'].includes(resourceType) && !uploadedFile && !resource) {
      alert('Please upload a file');
      return;
    }

    setIsSaving(true);

    try {
      const resourceData: Partial<Resource> = {
        type: resourceType,
        title: title.trim(),
      };

      // Type-specific data
      if (resourceType === 'link') {
        resourceData.url = url.trim();
      }

      if (resourceType === 'text') {
        resourceData.content = content.trim();
      }

      if (resourceType === 'video') {
        const mins = parseInt(durationMin) || 0;
        const secs = parseInt(durationSec) || 0;
        resourceData.durationSec = mins * 60 + secs;

        if (uploadedFile) {
          resourceData.url = uploadedFile.url;
          resourceData.fileName = uploadedFile.fileName;
          resourceData.fileSize = uploadedFile.fileSize;
          resourceData.mimeType = uploadedFile.mimeType;
        } else if (url.trim()) {
          resourceData.url = url.trim();
        }
      }

      if (['image', 'pdf'].includes(resourceType) && uploadedFile) {
        resourceData.url = uploadedFile.url;
        resourceData.fileName = uploadedFile.fileName;
        resourceData.fileSize = uploadedFile.fileSize;
        resourceData.mimeType = uploadedFile.mimeType;
      }

      await onSave(resourceData);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save section. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Section' : 'Add Section'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Type Selector (only for new resources) */}
          {!isEditMode && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Type
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['text', 'link', 'pdf', 'image', 'video'] as ResourceType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setResourceType(type);
                      setUploadedFile(null);
                    }}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm capitalize transition-colors
                      ${resourceType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Common Fields */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="Enter section title"
            />
          </div>

          {/* Type-Specific Forms */}
          
          {/* TEXT */}
          {resourceType === 'text' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="Enter text content (markdown supported)"
              />
            </div>
          )}

          {/* LINK */}
          {resourceType === 'link' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="https://example.com"
              />
            </div>
          )}

          {/* PDF, IMAGE (File Upload) */}
          {['pdf', 'image'].includes(resourceType) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File {isEditMode ? '' : '*'}
              </label>
              
              {uploadedFile ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{uploadedFile.fileName}</span>
                    {!isEditMode && (
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {resourceType === 'image' && (
                    <img
                      src={uploadedFile.url}
                      alt="Preview"
                      className="mt-2 w-full max-h-48 object-contain rounded border"
                    />
                  )}
                </div>
              ) : (
                <UploadDropzone
                  onFiles={handleFileUpload}
                  accept={getFileAccept(resourceType as 'image' | 'video' | 'pdf')}
                  disabled={isUploading}
                />
              )}

              {isUploading && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </div>
              )}
            </div>
          )}

          {/* VIDEO (Upload or URL) */}
          {resourceType === 'video' && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Source
                </label>
                
                {uploadedFile ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{uploadedFile.fileName}</span>
                      {!isEditMode && (
                        <button
                          onClick={() => setUploadedFile(null)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <UploadDropzone
                        onFiles={handleFileUpload}
                        accept={getFileAccept('video')}
                        disabled={isUploading}
                      />
                    </div>
                    
                    <div className="text-center text-sm text-gray-500 mb-3">OR</div>
                    
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                    />
                  </>
                )}

                {isUploading && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (mm:ss)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    min="0"
                    className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-gray-600">:</span>
                  <input
                    type="number"
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    min="0"
                    max="59"
                    className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving || isUploading}>
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Section'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

