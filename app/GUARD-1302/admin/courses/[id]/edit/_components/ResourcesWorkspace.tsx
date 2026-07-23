// Epic 1D: Main resources workspace with drag-drop, batch upload, and management
"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Library } from "lucide-react";
import Button from "@/components/Button";
import UploadDropzone from "@/components/UploadDropzone";
import ResourceCard from "@/components/ResourceCard";
import LibraryPicker from "@/components/library/LibraryPicker";
import LessonSummary from "./LessonSummary";
import PreviewLessonModal from "./PreviewLessonModal";
import Toast from "@/components/Toast";
import {
  getResourcesByLessonId,
  getLessonById,
  createResource,
  updateResourceInline,
  deleteResource,
  reorderResources,
  addResourcesBatch,
  subscribe,
  getLibraryItemById,
  getNewerVersion,
} from "@/lib/store-guard-1302";
import { Resource, ResourceType } from "@/types";
import { getFileAccept } from "@/lib/uploads";

interface ResourcesWorkspaceProps {
  lessonId: string;
  courseId: string;
  isManager: boolean;
}

type AddMode = 'upload' | 'link' | 'text';

export default function ResourcesWorkspace({
  lessonId,
  courseId,
  isManager,
}: ResourcesWorkspaceProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [addMode, setAddMode] = useState<AddMode>('upload');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
  
  // Link/Text form state
  const [linkForm, setLinkForm] = useState({ title: '', url: '' });
  const [textForm, setTextForm] = useState({ title: '', content: '' });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load resources
  useEffect(() => {
    const loadResources = () => {
      const lessonResources = getResourcesByLessonId(lessonId);
      setResources(lessonResources.sort((a, b) => a.order - b.order));
    };

    loadResources();
    const unsubscribe = subscribe(loadResources);
    return unsubscribe;
  }, [lessonId]);

  const lesson = getLessonById(lessonId);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = resources.findIndex((r) => r.id === active.id);
      const newIndex = resources.findIndex((r) => r.id === over.id);

      const reordered = arrayMove(resources, oldIndex, newIndex);
      setResources(reordered);
      
      const orderedIds = reordered.map((r) => r.id);
      reorderResources(lessonId, orderedIds);
    }
  };

  // Handle file upload
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const successfulUploads: Array<Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'courseId' | 'lessonId'>> = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Determine resource type from MIME type
        let resourceType: ResourceType = 'pdf';
        if (file.type.startsWith('image/')) resourceType = 'image';
        else if (file.type.startsWith('video/')) resourceType = 'video';
        else if (file.type === 'application/pdf') resourceType = 'pdf';

        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', resourceType);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.ok) {
          const titleWithoutExt = result.fileName.replace(/\.[^/.]+$/, '');
          successfulUploads.push({
            type: resourceType,
            title: titleWithoutExt,
            url: result.url,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
          });
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        } else {
          errors.push(`${file.name}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${file.name}: Upload failed`);
      }
    }

    // Batch create all successful uploads
    if (successfulUploads.length > 0) {
      addResourcesBatch(lessonId, successfulUploads);
      setToast({
        message: `${successfulUploads.length} file(s) uploaded successfully`,
        type: 'success',
      });
    }

    if (errors.length > 0) {
      setToast({
        message: `${errors.length} upload(s) failed`,
        type: 'error',
      });
    }

    setIsUploading(false);
    setUploadProgress({});
    setIsAddFormOpen(false);
  };

  // Handle link save
  const handleSaveLink = () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) {
      alert('Please enter both title and URL');
      return;
    }

    createResource({
      courseId,
      lessonId,
      type: 'link',
      title: linkForm.title,
      url: linkForm.url,
    });

    setLinkForm({ title: '', url: '' });
    setIsAddFormOpen(false);
    setToast({ message: 'Link added', type: 'success' });
  };

  // Handle text save
  const handleSaveText = () => {
    if (!textForm.title.trim() || !textForm.content.trim()) {
      alert('Please enter both title and content');
      return;
    }

    createResource({
      courseId,
      lessonId,
      type: 'text',
      title: textForm.title,
      content: textForm.content,
    });

    setTextForm({ title: '', content: '' });
    setIsAddFormOpen(false);
    setToast({ message: 'Text resource added', type: 'success' });
  };

  // Handle inline update
  const handleUpdate = (id: string, patch: Partial<Pick<Resource, 'title' | 'content'>>) => {
    setIsSaving(true);
    updateResourceInline(id, patch);
    setTimeout(() => setIsSaving(false), 500);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteResource(id);
    setToast({ message: 'Resource deleted', type: 'success' });
  };

  // Handle Library selection
  const handleLibrarySelect = (libraryItemIds: string[]) => {
    const libraryItems = libraryItemIds.map(id => getLibraryItemById(id)).filter(Boolean);
    
    const newResources: Array<Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'courseId' | 'lessonId'>> = [];
    
    libraryItems.forEach(libItem => {
      if (!libItem) return;
      
      // Determine resource type from library item
      let resourceType: ResourceType = 'link';
      if (libItem.type === 'file') {
        if (libItem.fileType === 'pdf') resourceType = 'pdf';
        else if (libItem.fileType === 'image') resourceType = 'image';
        else if (libItem.fileType === 'video') resourceType = 'video';
        else resourceType = 'link';
      }
      
      newResources.push({
        type: resourceType,
        title: libItem.title,
        url: libItem.url,
        content: libItem.description,
        durationSec: libItem.durationSec,
        fileName: libItem.fileName,
        fileSize: libItem.fileSize,
        mimeType: libItem.mimeType,
        libraryItemId: libItem.id,
      });
    });
    
    if (newResources.length > 0) {
      addResourcesBatch(lessonId, newResources);
      setToast({ message: `${newResources.length} item(s) added from Library`, type: 'success' });
    }
  };

  if (!lesson) {
    return <div className="text-center py-8 text-gray-500">Lesson not found</div>;
  }

  return (
    <div className="flex gap-6">
      {/* Main Workspace */}
      <div className="flex-1">
        {/* Manager Read-Only Banner */}
        {isManager && (
          <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700">
            <strong>Manager View:</strong> Read-only access. Contact an Admin to make changes.
          </div>
        )}

        {/* Add Controls */}
        {!isManager && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="primary"
                onClick={() => setIsAddFormOpen(!isAddFormOpen)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Resource
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsLibraryPickerOpen(true)}
                className="flex items-center gap-2"
              >
                <Library className="w-4 h-4" />
                Add from Library
              </Button>
            </div>

            {isAddFormOpen && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                {/* Mode Tabs */}
                <div className="flex gap-2 border-b border-gray-200 mb-4">
                  <button
                    onClick={() => setAddMode('upload')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      addMode === 'upload'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => setAddMode('link')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      addMode === 'link'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Link
                  </button>
                  <button
                    onClick={() => setAddMode('text')}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      addMode === 'text'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Text
                  </button>
                </div>

                {/* Upload Tab */}
                {addMode === 'upload' && (
                  <div>
                    <UploadDropzone
                      accept={getFileAccept('image') + ',' + getFileAccept('video') + ',' + getFileAccept('pdf')}
                      onFiles={handleFilesSelected}
                      multiple
                      disabled={isUploading}
                      maxFiles={10}
                    />
                    {isUploading && (
                      <div className="mt-4 space-y-2">
                        {Object.entries(uploadProgress).map(([fileName, progress]) => (
                          <div key={fileName} className="text-xs text-gray-600">
                            <div className="flex justify-between mb-1">
                              <span>{fileName}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Link Tab */}
                {addMode === 'link' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={linkForm.title}
                        onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                        placeholder="e.g., Company Safety Guidelines"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL *
                      </label>
                      <input
                        type="url"
                        value={linkForm.url}
                        onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                        placeholder="https://example.com/resource"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={handleSaveLink} className="flex-1">
                        Save Link
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setIsAddFormOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Text Tab */}
                {addMode === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={textForm.title}
                        onChange={(e) => setTextForm({ ...textForm, title: e.target.value })}
                        placeholder="e.g., Safety Procedures"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content *
                      </label>
                      <textarea
                        value={textForm.content}
                        onChange={(e) => setTextForm({ ...textForm, content: e.target.value })}
                        rows={6}
                        placeholder="Enter your content here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={handleSaveText} className="flex-1">
                        Save Text
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setIsAddFormOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resources Grid with Drag-Drop */}
        {resources.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 mb-2">No resources yet</p>
            {!isManager && <p className="text-sm text-gray-400">Click "Add Resource" to get started</p>}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={resources.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
              disabled={isManager}
            >
              <div className="space-y-3">
                {resources.map((resource) => (
                  <SortableResourceCard
                    key={resource.id}
                    resource={resource}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    isManager={isManager}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <LessonSummary
          lessonId={lessonId}
          onPreview={() => setIsPreviewOpen(true)}
          isSaving={isSaving}
        />
      </div>

      {/* Preview Modal */}
      <PreviewLessonModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        lessonTitle={lesson.title}
        resources={resources}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Library Picker Modal */}
      <LibraryPicker
        isOpen={isLibraryPickerOpen}
        onClose={() => setIsLibraryPickerOpen(false)}
        onSelect={handleLibrarySelect}
      />
    </div>
  );
}

// Sortable wrapper for ResourceCard
function SortableResourceCard({
  resource,
  onUpdate,
  onDelete,
  isManager,
}: {
  resource: Resource;
  onUpdate: (id: string, patch: Partial<Pick<Resource, 'title' | 'content'>>) => void;
  onDelete: (id: string) => void;
  isManager: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ResourceCard
        resource={resource}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isManager={isManager}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

