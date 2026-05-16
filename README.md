# Sibionics AI insulin files patch

This ZIP contains the changed/new source files for the insulin feature. It is not a `git apply` patch.

Copy the included files into the project root, preserving the directory structure.

Included changes:
- Adds Telegram Mini App route `/insulin`.
- Adds `InsulinMiniApp` and Telegram wrapper.
- Adds `InsulinPhotoAnalysisModal` for the website dashboard action.
- Adds AI mode `insulin_photo` and prompt/fallback handling.
- Hides the AI Doctor widget on `/insulin`.
