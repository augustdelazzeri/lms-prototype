# GUARD-1302: Multi-Language AI Course Generation

This folder contains the isolated prototype for the `GUARD-1302` Jira ticket. It demonstrates the ability to define, generate, and consume LMS courses in multiple languages.

## Routes & User Flow

The prototype is organized sequentially to make testing easier:

1. **`/GUARD-1302/1?tab=organization` (Learning Model Settings)**
   - **Context:** Admin defines the available languages for the organization.
   - **Feature:** "Additional Languages" (Spanish, Portuguese, etc.) are set here and populate the `getAvailableCourseLanguages()` helper.

2. **`/GUARD-1302/2` (Course Creation Wizard)**
   - **Context:** Admin creates a new course via AI.
   - **Feature:** Step 2 of the generation wizard dynamically reads the available languages from the Learning Model and pre-selects them for generation.

3. **`/GUARD-1302/3/crs_001/edit` (Course Editor - Admin)**
   - **Context:** Admin reviews and edits the generated course content.
   - **Feature:** The "Lessons" tab contains a Language Switcher. When switching to a secondary language (e.g., Spanish), the text is translated via a mock, but the content is strictly **Read-Only** to prevent divergence from the English master content.

4. **`/GUARD-1302/4/crs_001` (Course Overview - Learner)**
   - **Context:** Learner visits the course before starting a lesson.
   - **Feature:** A Language Switcher in the header allows the learner to pick their preferred language. The selection is saved in `sessionStorage`.

5. **`/GUARD-1302/5/lsn_001_01` (Lesson Player - Learner)**
   - **Context:** The actual lesson learning experience.
   - **Feature:** The lesson content, titles, and sidebar are displayed in the selected language. A globe icon in the top right allows language switching directly inside the lesson.

## Important Note for AI Agents
Do **NOT** alter the root `/app/admin/courses` or `/app/learner/courses` files for this feature anymore. They have been reverted to a clean state. Any new work or modifications related to `GUARD-1302` multi-language support must be done strictly within this `app/GUARD-1302` directory.
