# CEM Mastery — GitHub Pages PWA

This is a free, installable, offline-first CEM study app.

## Publish on GitHub Pages

1. Create a new GitHub repository, e.g. `cem-mastery`.
2. Upload **all files and folders from this package to the repository root**.
3. Commit the files.
4. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**.
5. Choose branch `main` and folder `/ (root)`, then Save.
6. Open the Pages URL shown by GitHub.

### iPhone / iPad
Open the GitHub Pages URL in Safari → Share → **Add to Home Screen**.

### Laptop
Open the same URL in a modern browser. Chrome/Edge may also offer an Install option.

## Important current limitation
This GitHub-only build stores study progress locally on each browser/device. Automatic iPhone ↔ iPad ↔ laptop sync is not included yet because GitHub Pages does not provide a secure personal database.

Backup/export is included so progress is not trapped in the app. The data model is sync-ready for a later cloud layer.

## Included in this build
- Dashboard and readiness score
- 14 current CEM sections
- Initial validated lesson content
- Theory/Numerical separation
- Randomized approved starter practice bank
- Timed question tracking
- Flashcards with simple spaced repetition
- 70-day / 10-week study calendar
- Full/half mock interface
- Formula/reference search
- iPad/Apple Pencil-compatible canvas via Pointer Events
- Local backup/import
- Dark/light mode
- Offline service worker cache
- Read-aloud through browser speech synthesis

## Content QA note
This is the first app build. The content bank is intentionally smaller than the final planned bank because only verified/approved items should enter scored practice. The repository is structured so validated lessons/questions can be expanded without changing the app engine.

## Local test
Service workers require HTTP/HTTPS, not `file://`.

Example:
```bash
python -m http.server 8080
```
Then open:
`http://localhost:8080`
