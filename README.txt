ZIP with changed files for copying into the project root.

Changed files:
- app/insulin/InsulinMiniApp.tsx
- app/globals.css
- lib/ai-prompts.ts

Changes:
- Renamed the main save button to "Записати назви та дози інсулінів".
- Extracts slow/fast insulin names from Grok API response and fills the editable name inputs.
- Keeps the newly created insulin name inputs editable.
- Prompt updated to ask Grok to return the visible insulin/pen name in insulin_items.name.
