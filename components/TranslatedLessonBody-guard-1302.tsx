"use client";

import React from "react";
import { getLessonBody } from "@/lib/lessonI18n";

export default function TranslatedLessonBody({ language }: { language: string }) {
  const body = getLessonBody(language);

  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <p dangerouslySetInnerHTML={{ __html: body.introHtml }} />
      <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{body.hazardousHeading}</h2>
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {body.hazardousItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">{body.whenHeading}</h2>
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {body.whenItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-sm italic text-gray-500 mt-4">{body.footer}</p>
    </div>
  );
}
