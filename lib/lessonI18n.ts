/** Prototype mock translations for multi-language course demo. */

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  pt: "Portuguese (Português)",
  zh: "Mandarin (中文)",
  ja: "Japanese (日本語)",
};

const LESSON_TITLE_I18N: Record<string, Record<string, string>> = {
  "Introduction to Workplace Safety": {
    es: "Introducción a la Seguridad en el Lugar de Trabajo",
    pt: "Introdução à Segurança no Local de Trabalho",
    fr: "Introduction à la sécurité au travail",
    de: "Einführung in die Arbeitssicherheit",
  },
  "Hazard Identification": {
    es: "Identificación de Peligros",
    pt: "Identificação de Perigos",
    fr: "Identification des dangers",
    de: "Gefahrenerkennung",
  },
  "Personal Protective Equipment (PPE)": {
    es: "Equipo de Protección Personal (EPP)",
    pt: "Equipamento de Proteção Individual (EPI)",
    fr: "Équipement de protection individuelle (EPI)",
    de: "Persönliche Schutzausrüstung (PSA)",
  },
};

export function translateLessonTitle(title: string, language: string): string {
  if (!language || language === "en") return title;
  return LESSON_TITLE_I18N[title]?.[language] || `[${language.toUpperCase()}] ${title}`;
}

export type LessonBodyContent = {
  introHtml: string;
  hazardousHeading: string;
  hazardousItems: string[];
  whenHeading: string;
  whenItems: string[];
  footer: string;
  imageAlt: string;
};

const LESSON_BODY_I18N: Record<string, LessonBodyContent> = {
  en: {
    introHtml:
      "<strong>Lockout/Tagout (LOTO)</strong> is the set of practices used to <strong>control hazardous energy</strong> so equipment cannot start or release energy while someone is working on it.",
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
    introHtml:
      "El <strong>bloqueo/etiquetado (LOTO)</strong> es el conjunto de prácticas usadas para <strong>controlar la energía peligrosa</strong> de modo que el equipo no pueda arrancar ni liberar energía mientras alguien trabaja en él.",
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
    introHtml:
      "O <strong>bloqueio/etiquetagem (LOTO)</strong> é o conjunto de práticas usadas para <strong>controlar energia perigosa</strong> para que o equipamento não possa ligar nem liberar energia enquanto alguém trabalha nele.",
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
    introHtml:
      "Le <strong>consignation/déconsignation (LOTO)</strong> est l'ensemble des pratiques utilisées pour <strong>maîtriser l'énergie dangereuse</strong> afin que l'équipement ne puisse pas démarrer ni libérer d'énergie pendant qu'une personne y travaille.",
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

export function getLessonBody(language: string): LessonBodyContent {
  return LESSON_BODY_I18N[language] || LESSON_BODY_I18N.en;
}

export const LEARNER_LANGUAGE_STORAGE_KEY = "lms_learner_language";

export function readStoredLearnerLanguage(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(LEARNER_LANGUAGE_STORAGE_KEY);
}

export function storeLearnerLanguage(code: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LEARNER_LANGUAGE_STORAGE_KEY, code);
}
