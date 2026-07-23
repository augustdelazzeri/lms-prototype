// Epic 1E: Focused lesson view with resources
"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { ArrowUp, ArrowDown, Plus, Eye, Save, Clock, FileDown, X, Upload, FileText, Presentation, Mic, CircleCheck, ImageIcon, Video, Link as LinkIcon, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, ChevronDown, Sparkles, Youtube, Minus } from "lucide-react";
import { Lesson, Resource, DownloadableResource } from "@/types";
import ResourceCardSimple from "./ResourceCardSimple";
import Button from "@/components/Button";
import { translateLessonTitle } from "@/lib/lessonI18n";

// Simple time ago formatter
function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return 'today';
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface LessonFocusedViewProps {
  lesson: Lesson;
  resources: Resource[];
  totalLessons: number;
  isReadOnly: boolean;
  language?: string;
  isAIDraft?: boolean;
  sourceLabels?: string[];  // Resolved source attribution labels for AI lessons
  onUpdateTitle: (title: string) => void;
  onUpdateEstimatedMinutes: (minutes: number | undefined) => void;
  onUpdateDownloadableResources: (resources: DownloadableResource[]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddResource: () => void;
  onEditResource: (resource: Resource) => void;
  onUpdateResource: (updatedResource: Resource) => void; // For inline editing (text sections)
  onPreviewResource: (resource: Resource) => void;
  onDeleteResource: (resourceId: string) => void;
  onReorderResources: (fromIndex: number, toIndex: number) => void;
  onPreviewLesson: () => void;
  onSave: () => void;
  onSaveAndNext: () => void;
}

type LessonBodyContent = {
  intro: React.ReactNode;
  hazardousHeading: string;
  hazardousItems: string[];
  whenHeading: string;
  whenItems: string[];
  footer: string;
  imageAlt: string;
};

const LESSON_BODY_I18N: Record<string, LessonBodyContent> = {
  en: {
    intro: (
      <p>
        <strong>Lockout/Tagout (LOTO)</strong> is the set of practices used to{" "}
        <strong>control hazardous energy</strong> so equipment cannot start or release energy while someone is
        working on it.
      </p>
    ),
    hazardousHeading: "What 'hazardous energy' means (in plain terms)",
    hazardousItems: [
      "Electrical energy from power sources",
      "Mechanical energy stored in springs or moving parts",
      "Hydraulic / pneumatic pressure",
      "Thermal energy (heat or cold)",
      "Gravity (suspended loads)",
    ],
    whenHeading: "When LOTO applies (typical triggers)",
    whenItems: [
      "Servicing or maintenance where unexpected startup could injure someone",
      "Clearing jams inside equipment",
      "Adjusting or replacing machine parts",
      "Any task where body parts enter a danger zone",
    ],
    footer: "If you are unsure whether LOTO is required, stop and ask your supervisor before beginning work.",
    imageAlt:
      'Simple diagram showing: machine -> energy sources -> isolation points with locks/tags -> verification ("try start" and test for stored energy)',
  },
  es: {
    intro: (
      <p>
        El <strong>bloqueo/etiquetado (LOTO)</strong> es el conjunto de prácticas usadas para{" "}
        <strong>controlar la energía peligrosa</strong> de modo que el equipo no pueda arrancar ni liberar energía
        mientras alguien trabaja en él.
      </p>
    ),
    hazardousHeading: "Qué significa «energía peligrosa» (en términos simples)",
    hazardousItems: [
      "Energía eléctrica de las fuentes de alimentación",
      "Energía mecánica almacenada en resortes o piezas en movimiento",
      "Presión hidráulica / neumática",
      "Energía térmica (calor o frío)",
      "Gravedad (cargas suspendidas)",
    ],
    whenHeading: "Cuándo aplica LOTO (disparadores típicos)",
    whenItems: [
      "Servicio o mantenimiento donde un arranque inesperado podría lesionarte",
      "Desatascar atascos dentro del equipo",
      "Ajustar o reemplazar piezas de la máquina",
      "Cualquier tarea en la que partes del cuerpo entren en una zona de peligro",
    ],
    footer:
      "Si no estás seguro de si se requiere LOTO, detente y pregunta a tu supervisor antes de comenzar el trabajo.",
    imageAlt:
      "Diagrama simple: máquina -> fuentes de energía -> puntos de aislamiento con candados/etiquetas -> verificación («intento de arranque» y prueba de energía almacenada)",
  },
  pt: {
    intro: (
      <p>
        O <strong>bloqueio/etiquetagem (LOTO)</strong> é o conjunto de práticas usadas para{" "}
        <strong>controlar energia perigosa</strong> para que o equipamento não possa ligar nem liberar energia
        enquanto alguém trabalha nele.
      </p>
    ),
    hazardousHeading: "O que significa «energia perigosa» (em termos simples)",
    hazardousItems: [
      "Energia elétrica das fontes de alimentação",
      "Energia mecânica armazenada em molas ou peças móveis",
      "Pressão hidráulica / pneumática",
      "Energia térmica (calor ou frio)",
      "Gravidade (cargas suspensas)",
    ],
    whenHeading: "Quando o LOTO se aplica (gatilhos típicos)",
    whenItems: [
      "Manutenção ou serviço em que uma partida inesperada poderia causar lesão",
      "Desobstrução de emperramentos dentro do equipamento",
      "Ajuste ou substituição de peças da máquina",
      "Qualquer tarefa em que partes do corpo entrem em uma zona de perigo",
    ],
    footer:
      "Se você não tiver certeza se o LOTO é necessário, pare e pergunte ao seu supervisor antes de começar o trabalho.",
    imageAlt:
      'Diagrama simples: máquina -> fontes de energia -> pontos de isolamento com cadeados/etiquetas -> verificação ("tentar ligar" e testar energia armazenada)',
  },
  fr: {
    intro: (
      <p>
        Le <strong>consignation/déconsignation (LOTO)</strong> est l&apos;ensemble des pratiques utilisées pour{" "}
        <strong>maîtriser l&apos;énergie dangereuse</strong> afin que l&apos;équipement ne puisse pas démarrer ni
        libérer d&apos;énergie pendant qu&apos;une personne y travaille.
      </p>
    ),
    hazardousHeading: "Ce que signifie « énergie dangereuse » (en termes simples)",
    hazardousItems: [
      "Énergie électrique des sources d'alimentation",
      "Énergie mécanique stockée dans des ressorts ou des pièces mobiles",
      "Pression hydraulique / pneumatique",
      "Énergie thermique (chaleur ou froid)",
      "Gravité (charges suspendues)",
    ],
    whenHeading: "Quand le LOTO s'applique (déclencheurs typiques)",
    whenItems: [
      "Entretien ou maintenance où un démarrage inattendu pourrait blesser quelqu'un",
      "Dégagement de blocages à l'intérieur de l'équipement",
      "Réglage ou remplacement de pièces de machine",
      "Toute tâche où des parties du corps entrent dans une zone de danger",
    ],
    footer:
      "Si vous n'êtes pas sûr que le LOTO est requis, arrêtez-vous et demandez à votre superviseur avant de commencer le travail.",
    imageAlt:
      "Schéma simple : machine -> sources d'énergie -> points d'isolation avec cadenas/étiquettes -> vérification (« essai de démarrage » et test d'énergie stockée)",
  },
};

const insertMenuSections = [
  {
    label: "Media",
    items: [
      { id: "ai-image", label: "AI Image", icon: Sparkles },
      { id: "image-upload", label: "Image - Upload", icon: Upload },
      { id: "image-url", label: "Image - From URL", icon: ImageIcon },
    ],
  },
  {
    label: "Embed",
    items: [
      { id: "youtube", label: "YouTube Embed", icon: Youtube },
      { id: "loom", label: "Loom Embed", icon: Video },
    ],
  },
  {
    label: "Layout",
    items: [
      { id: "hr", label: "Horizontal Rule", icon: Minus },
    ],
  },
] as const;

function InsertDropdown({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md border border-transparent hover:border-blue-100"
      >
        <Plus className="w-3.5 h-3.5" />
        Insert
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 right-0">
          {insertMenuSections.map((section) => (
            <div key={section.label}>
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {section.label}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelect(item.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <item.icon className="w-4 h-4 text-gray-500" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const addSectionMenuItems = [
  { type: 'text', label: 'Text', icon: FileText, color: 'text-indigo-600' },
  { type: 'slides', label: 'Slides', icon: Presentation, color: 'text-violet-600' },
  { type: 'narrated-walkthrough', label: 'Narrated Walkthrough', icon: Mic, color: 'text-teal-600' },
  { type: 'knowledge-check', label: 'Knowledge Check', icon: CircleCheck, color: 'text-purple-600' },
  { type: 'separator' },
  { type: 'image', label: 'Image', icon: ImageIcon, color: 'text-sky-600' },
  { type: 'video', label: 'Video', icon: Video, color: 'text-rose-600' },
  { type: 'pdf', label: 'PDF', icon: FileText, color: 'text-amber-600' },
  { type: 'link', label: 'Link', icon: LinkIcon, color: 'text-emerald-600' },
] as const;

function AddSectionDropdown({ variant }: { variant: 'button' | 'dashed' | 'empty' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {variant === 'dashed' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </button>
      ) : (
        <Button variant="primary" onClick={() => setIsOpen(!isOpen)} className="!text-xs !py-1.5 !px-3">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {variant === 'empty' ? 'Add First Section' : 'Add Section'}
        </Button>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 right-0">
          {addSectionMenuItems.map((item, idx) =>
            item.type === 'separator' ? (
              <div key={idx} className="my-1 border-t border-gray-100" />
            ) : (
              <button
                key={item.type}
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <item.icon className={`w-4 h-4 ${item.color}`} />
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function LessonFocusedView({
  lesson,
  resources,
  totalLessons,
  isReadOnly,
  isAIDraft,
  sourceLabels,
  onUpdateTitle,
  onUpdateEstimatedMinutes,
  onUpdateDownloadableResources,
  onMoveUp,
  onMoveDown,
  onAddResource,
  onEditResource,
  onUpdateResource,
  onPreviewResource,
  onDeleteResource,
  onReorderResources,
  onPreviewLesson,
  onSave,
  onSaveAndNext,
  language = "en",
}: LessonFocusedViewProps) {
  const [title, setTitle] = useState(lesson.title);
  const body = LESSON_BODY_I18N[language] || LESSON_BODY_I18N.en;
  const displayTitle =
    language === "en" ? title : translateLessonTitle(lesson.title, language);
  const [estMinutes, setEstMinutes] = useState<string>(lesson.estimatedMinutes?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResTitle, setNewResTitle] = useState("");
  const [newResUrl, setNewResUrl] = useState("");
  const [newResFileType, setNewResFileType] = useState("pdf");
  const [deliveryMode, setDeliveryMode] = useState<"text" | "video">("text");
  const [showAiImageModal, setShowAiImageModal] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState(
    'Simple diagram showing: machine -> energy sources -> isolation points with locks/tags -> verification ("try start" and test for stored energy)'
  );

  useEffect(() => {
    setTitle(lesson.title);
    setEstMinutes(lesson.estimatedMinutes?.toString() || "");
    if (lesson.updatedAt) {
      setLastSaved(new Date(lesson.updatedAt));
    }
  }, [lesson.id, lesson.title, lesson.updatedAt, lesson.estimatedMinutes]);

  useEffect(() => {
    setAiImagePrompt(body.imageAlt);
  }, [language, body.imageAlt]);

  // Debounced save
  const debouncedSave = useMemo(
    () =>
      debounce((newTitle: string) => {
        if (newTitle.trim() && newTitle !== lesson.title) {
          console.log('🔄 Autosave triggered:', newTitle);
          setIsSaving(true);
          onUpdateTitle(newTitle);
          setTimeout(() => {
            console.log('✅ Autosave complete');
            setIsSaving(false);
            setLastSaved(new Date());
          }, 800); // Slightly longer to show the indicator
        }
      }, 1500),
    [lesson.title, onUpdateTitle]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isReadOnly) {
      debouncedSave(newTitle);
    }
  };

  const handleTitleBlur = () => {
    if (!isReadOnly && title.trim() && title !== lesson.title) {
      onUpdateTitle(title);
    }
  };

  const handleEstMinutesBlur = () => {
    if (isReadOnly) return;
    const parsed = parseInt(estMinutes, 10);
    const newVal = isNaN(parsed) || parsed <= 0 ? undefined : parsed;
    if (newVal !== lesson.estimatedMinutes) {
      onUpdateEstimatedMinutes(newVal);
    }
  };

  const handleAddDownloadableResource = () => {
    if (!newResTitle.trim()) return;
    const updated = [
      ...(lesson.downloadableResources || []),
      { title: newResTitle.trim(), url: newResUrl.trim() || "#", fileType: newResFileType },
    ];
    onUpdateDownloadableResources(updated);
    setNewResTitle("");
    setNewResUrl("");
    setNewResFileType("pdf");
    setShowAddResource(false);
  };

  const handleRemoveDownloadableResource = (index: number) => {
    const updated = (lesson.downloadableResources || []).filter((_, i) => i !== index);
    onUpdateDownloadableResources(updated);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = resources.findIndex((r) => r.id === active.id);
      const newIndex = resources.findIndex((r) => r.id === over.id);

      onReorderResources(oldIndex, newIndex);
    }
  };

  const currentIndex = lesson.order;
  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < totalLessons - 1;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* AI Image Modal (mock — clickable only) */}
      {showAiImageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Generate image</h3>
              <button
                type="button"
                onClick={() => setShowAiImageModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Image description</label>
              <textarea
                value={aiImagePrompt}
                onChange={(e) => setAiImagePrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">Used as both the generation prompt and the image alt text.</p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAiImageModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowAiImageModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="mx-6 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <strong className="text-yellow-900">Read only</strong>
            <span className="text-yellow-700">— content cannot be edited in this view</span>
          </div>
        </div>
      )}

      {/* Title + Lesson delivery */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Lesson Title</label>
          <input
            type="text"
            value={displayTitle}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            disabled={isReadOnly}
            className={`
              w-full text-base font-medium px-3 py-2 border border-gray-300 rounded-md bg-white
              ${isReadOnly
                ? "cursor-not-allowed text-gray-600 bg-gray-50"
                : "focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              }
            `}
            placeholder="Untitled Lesson"
          />
        </div>
        <div className="flex-shrink-0 pt-0.5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5 text-right">Lesson delivery</label>
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setDeliveryMode("text")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 ${
                deliveryMode === "text"
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Text
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMode("video")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 border-l border-gray-300 ${
                deliveryMode === "video"
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Video
            </button>
          </div>
        </div>
      </div>

      {/* Rich text toolbar */}
      {!isReadOnly && (
        <div className="mx-6 px-2 py-1.5 border border-gray-200 rounded-t-md flex flex-wrap items-center gap-0.5 bg-white">
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Redo">
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button type="button" className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1">
            Paragraph <ChevronDown className="w-3 h-3" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Bold">
            <Bold className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Italic">
            <Italic className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Underline">
            <Underline className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Link">
            <LinkIcon className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded font-mono text-xs" title="Code">
            {"</>"}
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Align left">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Align center">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button type="button" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Align right">
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <InsertDropdown
            onSelect={(id) => {
              if (id === "ai-image") setShowAiImageModal(true);
            }}
          />
        </div>
      )}

      {/* Document content area */}
      <div className={`flex-1 overflow-auto px-6 ${!isReadOnly ? "pb-6" : "pb-6"}`}>
        <div className={`min-h-[320px] border border-gray-200 ${!isReadOnly ? "border-t-0 rounded-b-md" : "rounded-md"} px-5 py-4`}>
          {/* Sample document content — swaps by language for prototype demo */}
          <div className="prose prose-sm max-w-none text-gray-800">
            {body.intro}
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              {body.hazardousHeading}
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {body.hazardousItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
              {body.whenHeading}
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {body.whenItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-sm italic text-gray-500 mt-4">
              {body.footer}
            </p>
          </div>

          {/* AI Image placeholder */}
          <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-start gap-3">
              <ImageIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  {body.imageAlt}
                </p>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setShowAiImageModal(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Existing resources still available below for prototype fidelity */}
          {resources.length > 0 && (
            <div className="mt-8 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Attached sections</h3>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={resources.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={isReadOnly}
                >
                  <div className="space-y-3">
                    {resources.map((resource) => (
                      <div key={resource.id} className="relative">
                        <SortableResourceCard
                          resource={resource}
                          isReadOnly={isReadOnly}
                          isAIDraft={isAIDraft}
                          onEdit={() => onEditResource(resource)}
                          onUpdate={onUpdateResource}
                          onPreview={() => onPreviewResource(resource)}
                          onDelete={() => onDeleteResource(resource.id)}
                        />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {!isReadOnly && <AddSectionDropdown variant="dashed" />}
            </div>
          )}

          {resources.length === 0 && !isReadOnly && (
            <div className="mt-6">
              <AddSectionDropdown variant="dashed" />
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="text-xs text-gray-400">
          {!isReadOnly && isSaving
            ? "Saving…"
            : !isReadOnly && lastSaved
            ? `Saved ${timeAgo(lastSaved.toISOString())}`
            : `Updated ${timeAgo(lesson.updatedAt)}`}
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPreviewLesson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-white"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <Button variant="primary" onClick={onSave} className="!text-sm !py-1.5 !px-3">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableResourceCard({
  resource,
  isReadOnly,
  isAIDraft,
  onEdit,
  onUpdate,
  onPreview,
  onDelete,
}: {
  resource: Resource;
  isReadOnly: boolean;
  isAIDraft?: boolean;
  onEdit: () => void;
  onUpdate: (updatedResource: Resource) => void;
  onPreview: () => void;
  onDelete: () => void;
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

  // For text sections, use inline update; for others, open sidebar
  const handleEdit = (updatedResource: Resource) => {
    if (resource.type === 'text') {
      // Text sections are inline-editable, update directly
      onUpdate(updatedResource);
    } else {
      // Other types open the sidebar
      onEdit();
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ResourceCardSimple
        resource={resource}
        isReadOnly={isReadOnly}
        isAIDraft={isAIDraft}
        onEdit={handleEdit}
        onPreview={onPreview}
        onDelete={onDelete}
        dragHandleProps={isReadOnly ? undefined : { ...attributes, ...listeners }}
      />
    </div>
  );
}

