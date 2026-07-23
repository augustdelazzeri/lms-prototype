# GUARD Prototype Manifest - LMS

The following directories and files are part of isolated feature prototypes and must **NOT** be deleted or modified during project-wide updates.

## Isolated Routes (`app/`)
- `app/GUARD-1302/` - Multi-Language AI Course Generation

## "Frozen" Dependencies (Suffix `-guard-1302`)
These files are copies of shared logic/components, isolated specifically for the prototype to avoid breaking when the root files are updated.

### Components
- `components/learner/CoursePlayerHeader-guard-1302.tsx`
- `components/learner/CoursePlayerSidebar-guard-1302.tsx`
- `components/learner/LessonContentRenderer-guard-1302.tsx`
- `components/TranslatedLessonBody-guard-1302.tsx`

### Logic & Data
- `lib/store-guard-1302.ts`
- `lib/lessonI18n-guard-1302.ts`
- `data/seed-guard-1302.ts`

## Usage
To view the prototype, navigate to `/GUARD-1302`. The folder contains its own `README.md` with the numbered user flow.
