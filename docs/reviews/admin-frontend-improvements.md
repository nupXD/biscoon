# Admin frontend improvements

Implemented the seven recommendations from the admin review:

- Editing dialogs protect unsaved changes; refresh, navigation, Escape, backdrop clicks, and sign-out respect the guard. Existing news recovery remains in place. Announcement and spotlight composers also warn before leaving. Generic forms warn rather than storing sensitive staff inputs in browser storage.
- Editing and confirmation dialogs contain keyboard focus and restore it when closed. Background content is inert; destructive confirmation starts on Cancel. Pending saves block closing and edits.
- The URL stores the section, filters, search, date range, and pagination. Reload restores the workspace; browser Back restores previous sections. Filter changes replace the current history entry to avoid an entry for every search keystroke.
- Publish News and Start Discussion open their composers directly.
- Navigation is grouped into Content, Community & Moderation, and Administration. Empty groups are hidden for limited-permission accounts. The reports badge counts open plus reviewing reports.
- A Needs attention area uses existing permission-checked APIs to show open reports, reviewing reports, and unpublished drafts, each opening the corresponding filtered section. Failed counts are shown as unavailable rather than zero.
- Search and filter controls have explicit accessible names. Navigation and main statistics use matching SVG icons; action sizing, focus indicators, secondary colors, and the skip link are consistent.

Validation: 92 regression tests; server and client TypeScript checks; client build; Chromium workflow checks at 390px and 1440px. The browser suite uses mocked APIs and does not modify real records. Run `node scripts/checks/admin-workflows.cjs` with the repository served on localhost:4173.

## Visual refinement

Added `assets/css/pages/admin/workspace.css`, shared by the dashboard and admin login. The light navigation, restrained borders, clearer type hierarchy, consistent controls, and compact mobile statistics keep content and moderation tasks prominent. The Community desk groups attention queues; Publish News is the primary dashboard action. News actions use text labels, narrow filters and thumbnail layouts fit mobile screens, and editor action footers stay available while scrolling.

Reviewed rendered dashboard, populated news list, and editing dialogs at 390px and 1440px. All admin browser workflows and 31 frontend regression tests passed; client TypeScript and build passed. Fixtures are mocked and are not production counts.
