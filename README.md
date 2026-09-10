# CEM Mastery v0.2

GitHub Pages-ready private PWA.

## Included
- 93 sequential tutor lessons
- 372 practice questions
- 186 flashcards
- iPad / Apple Pencil numerical notebook using Pointer Events
- Pen, stroke eraser, undo, redo, stroke selection, drag-to-move, duplicate, resize, delete, clear, save/autosave
- Multi-page notebook with add/delete/duplicate pages
- Blank/lined/grid backgrounds
- IndexedDB per-question handwriting persistence
- Full export/import including handwriting
- Read-aloud with pause/resume/stop using Web Speech API
- Offline service worker
- Dark/light mode
- Basic progress/readiness shell and mock placeholders

## Deploy
Upload every file/folder in this repository to the root of your GitHub Pages repository.
Your Pages site should serve `index.html` and preserve the `data/` and `icons/` folders.

## iPad
Open the HTTPS GitHub Pages URL in Safari, Share → Add to Home Screen. For best Apple Pencil behavior, use the installed standalone PWA. The canvas uses Pointer Events and pressure when available. Touch scrolling is disabled inside the writing canvas only.

## Important release note
The app is development-ready. Final exam-readiness scoring should remain conservative until the expanded fresh-variant/mock bank and final QA release gates are completed.

## Read aloud on iPad
Lesson read-aloud uses Safari/iOS Web Speech and supports play, pause/resume and stop after a user tap. iOS can suspend browser speech when the PWA is backgrounded or the screen is locked; that limitation is controlled by iOS.
