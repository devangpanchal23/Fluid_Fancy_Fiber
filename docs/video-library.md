# Video Library setup and acceptance tests

## Current configuration and deployment

The checked-out client `.env` contains only `VITE_API_URL`; the server `.env` has no Cloudinary variables. Vite was reading its variables correctly: the values were absent. Actual account values must be configured before local upload works. No live account/preset was modified by this implementation, and no production deployment was performed.

Images remain in MongoDB through the existing Image/Media Library. Videos upload directly to Cloudinary so large file bodies do not pass through Vercel functions. The server independently verifies metadata using Cloudinary's authenticated Admin API before registering a video. Content references reusable library assets. Deleting content does not delete video bytes; delete unused assets from Video Library. Existing video content keeps working without migration. Older content is not bulk-migrated. Saving an older content item through the form registers its URL in the library; retain its original hosted file while referenced.

## Unified library workflow

Open **Admin → Video Library** to upload a local file or expand **Add a Google Drive or video URL**, enter an optional video name, paste the link and press Enter/Add link to Video Library. Both sources are listed together with previews, names, dates and their source label. Drive files remain hosted on Drive; the library stores their reusable link.

When creating/editing a video, enter its title and description, then choose either an existing library item or Paste URL. Adding a link from the picker saves it to the library and selects it. Clicking Save draft/Publish directly after pasting also registers the link on the server before saving the content reference. Duplicate normalized links reuse an entry. Drive library creation/selection/deletion works without Cloudinary configuration; local uploads still require it.

Deleting a Drive/direct-link entry only removes the library record, never its original file. Both link and uploaded entries are protected while content uses them. Link records use an internal `link:SHA256` value in the existing unique public-ID index; the provider field distinguishes them from Cloudinary assets, and this internal key is never used for provider deletion or playback. No production index replacement is required.

Additional acceptance checks: add a named Drive link directly in Video Library, refresh/search, select it in two content items, and confirm it persists. Add the equivalent `/open?id=…` link and confirm no duplicate. Simulate failed link save and retry. Deletion must be blocked while either item references it; after removing both references, deletion must leave the original Drive file intact. Repeat with Cloudinary variables unset to confirm link management works independently.

## Cloudinary dashboard

In the correct product environment, open Settings → Upload → Upload presets → Add upload preset:

1. Preset name: **`fff_videos_unsigned`**.
2. Signing mode: **Unsigned**. Browser upload requires no signature. Server verification and deletion require API credentials.
3. Allowed formats: **mp4, webm, mov**. Use a dedicated preset; leave image presets unchanged.
4. Delivery type: **upload**, public access. Keep generated unique public IDs; enable “Disallow public ID” if available. Do not overwrite existing assets. An optional asset folder may be used for organization.
5. Do not apply image-only transformations. The application delivers H.264/AAC MP4 derivatives and JPEG posters. If strict transformations are enabled, allow these video and poster transformations in your account (or pre-generate equivalent derivatives). Ensure your plan supports video uploads/transcoding of the intended dimensions, duration and size.

The upload endpoint is `/v1_1/<cloud>/video/upload`: **resource_type is video**, selected by the endpoint, not by an image/video toggle on the preset. The application limit is **100 MiB = 104,857,600 bytes**, checked before upload and again against provider metadata before registration. Cloudinary account limits can be lower. Cloudinary documentation currently states that presets do not support per-preset file-size limits; do not rely on a nonexistent dashboard setting. An unsigned preset is public; its format restrictions and account quotas still apply. Files rejected during registration remain in Cloudinary for administrative cleanup.

References: [Upload presets](https://cloudinary.com/documentation/upload_presets), [Client-side uploading](https://cloudinary.com/documentation/client_side_uploading), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference).

Put these in `client/.env`, replacing the cloud name:

```dotenv
VITE_CLOUDINARY_CLOUD_NAME=YOUR_REAL_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET=fff_videos_unsigned
VITE_CLOUDINARY_VIDEO_UPLOAD_PRESET=fff_videos_unsigned
```

`VITE_CLOUDINARY_VIDEO_UPLOAD_PRESET` takes precedence over the legacy `VITE_CLOUDINARY_UPLOAD_PRESET`. Both are public configuration, not secrets. Keep the existing `VITE_API_URL` appropriate to your environment.

Put these in `server/.env`:

```dotenv
CLOUDINARY_CLOUD_NAME=YOUR_REAL_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_REAL_API_KEY
CLOUDINARY_API_SECRET=YOUR_REAL_API_SECRET
CLOUDINARY_VIDEO_UPLOAD_PRESET=fff_videos_unsigned
```

Get the key/secret from Cloudinary Settings → Access Keys. Never expose either in a VITE variable. The authenticated `/api/video-media/config` endpoint returns only cloud name and preset; it also verifies that server credential configuration is present. Missing Vite config falls back to these server values. Conflicting client/server cloud names are rejected before upload.

For production, set the same environment variables in the hosting project's production environment and rebuild/redeploy. Vite values are embedded at build time. Restart both local dev processes after editing `.env`. No real credentials or placeholders were written to the active `.env` files.

## URL support and playback

- Public HTTPS URLs ending in `.mp4`, `.webm`, or `.mov` (signed query strings allowed) use native HTML video controls. The hosting service must deliver actual video bytes and allow playback; a syntactically valid URL does not prove availability or browser codec support. Cloudinary uploads are delivered as H.264/AAC MP4 for compatibility.
- Drive `/file/d/ID/view`, `/file/d/ID/preview`, `/file/d/ID/edit`, `/open?id=ID`, and `/uc?id=ID` normalize to `/file/d/ID/preview`. Resource keys are preserved.
- Drive requires a video file shared with **Anyone with the link → Viewer**, with processing complete. Folder links and malformed IDs are rejected. Private access, quota and processing errors are displayed by Drive inside its player; a cross-origin iframe does not expose those failures to this app.
- Drive uses Google's iframe player with its own play/pause/seek/volume/fullscreen controls. A Drive share link cannot reliably provide native HTML `<video>` controls. If literal browser-native controls are required for every source, upload the file to Video Library instead. Do not use an unreliable Drive download URL workaround.
- Other webpage/embed providers, insecure HTTP URLs, and script/data URLs are rejected with a helpful message. There is no backend fetch/proxy of arbitrary pasted URLs.

## API

All `/api/video-media` routes require the existing admin cookie:

- `GET /config`: public upload configuration; missing server credentials return 503.
- `GET /?q=&page=1&limit=24`: filename search, newest-first pagination.
- `POST /`: `{ publicId, originalName }` verifies and registers a Cloudinary upload. `{ url, originalName? }` validates and registers a Drive/direct video link without Cloudinary credentials. Repeated normalized URLs reuse the existing library entry.
- `DELETE /:id`: refuses content references with 409; deletes the provider asset before removing the record. Provider failure keeps the record available for retry.

Existing `/api/videos` content routes accept either `videoMedia` or a valid `url`. Library selections resolve canonical metadata on the server. Pasted URLs are automatically registered in Video Library on Save/Publish, even without pressing Add link first. Switching sources assigns the new library ID, clears the old Cloudinary public ID and duration for links, and releases the previous reference. An atomic library claim prevents deletion racing a library selection. Source changes clear stale thumbnails in the picker; an optional image override can then be selected normally.

Upload progress reports transferred bytes; 100% changes to processing/saving until registration completes. Cancel aborts the active upload. Failed registration offers **Retry library save** using the same public ID. If that page is closed before registration succeeds, the uploaded file may need cleanup in Cloudinary. Interrupted provider requests can likewise leave an asset there; do not automatically delete potentially shared assets.

## Manual acceptance checklist (configured staging environment)

1. **Upload success:** Open Video Library, upload a small MP4, WEBM and MOV. Confirm visible progress, processing state, thumbnail/preview, original filename, upload date and size. Refresh and search by filename; entries persist. Choose one in a new video, publish, open the public site, and exercise play/pause, seek, volume and fullscreen on desktop and mobile. Verify MOV delivery is an MP4 derivative.
2. **Validation failures:** Select a TXT/JPG/AVI, a zero-byte file and a file larger than 100 MiB. Expect a clear error and no upload request. Select a valid file afterward to confirm recovery. Test exactly 100 MiB against the account's limit.
3. **Upload/provider failures:** Disconnect networking mid-upload, cancel an upload, use a nonexistent preset, and temporarily omit config in staging. Confirm visible errors, Save blocked only while busy, and retry recovery. Fail the library POST after Cloudinary succeeds, restore it, and use Retry library save; only one library entry should exist. Test provider timeout and lower account-size limits.
4. **Drive:** Use a real publicly shared video in `/file/d/ID/view` and `/open?id=ID` forms. Press Enter/Add link to Video Library, confirm preview, publish, and verify Drive controls including fullscreen. Test a resource-key URL. Test a private file and a still-processing video; the Drive player should explain the access/processing issue, and the Open in Google Drive link remains available.
5. **Invalid URLs:** Try random text, a folder URL, YouTube webpage, HTTP URL, JavaScript URL and malformed Drive link. Save must refuse them without replacing persisted content. Test an HTTPS `.mp4` URL returning HTML/404; preview must show a playback error and link.
6. **Editing/switching:** Open existing library content, paste Drive URL, save, reload, verify the Drive source and its new library reference. Switch back to another library item and verify playback, new poster and persistence. Clear selection and ensure Save refuses. Type an invalid replacement and click Publish directly without Add link; old source must not silently save. Change tabs without selecting: the clearly labeled current source stays selected. Verify drafts stay hidden publicly.
7. **Deletion:** Try deleting a used library video; expect 409 with guidance and unchanged playback. Delete one of two content items sharing a video; the other still plays. Remove all references, delete from library, and confirm disappearance after refresh and removal in Cloudinary. Simulate provider deletion failure; entry remains retryable.
8. **UI/access:** Inspect library cards and picker at narrow and wide widths. Exercise keyboard navigation, labels, Enter, disabled states during upload and thumbnail override. Visit library endpoints without an admin session; expect 401. Failed content load must not expose an editable empty form.
9. **Image regression:** Upload/select an image for a product and variant, save/reopen, change alt text, search library and test in-use deletion protection. Existing image endpoints, models, storage and upload components are unchanged. Confirm the optional video thumbnail ImageUploader still works.

The repeated `/api/admin/me` 401s and `.ff-admin-drawer` aria-hidden focus warning are outside this change and were not modified.

## Verification performed

- `npm test --prefix client`: 30 passed, zero failures/skips (URL, file/config validation and existing image selection tests).
- `npm test --prefix server`: 116 passed, zero failures/skips, including existing image API integration and a real local MongoDB video lifecycle test. Cloudinary calls in video tests use isolated doubles.
- `npm run build --prefix client`: passed.
- `git diff --check`: passed.
- `npm run lint --prefix client`: blocked by the repository's missing `eslint.config.*`; no lint result claimed.
- `client/tests/video-ui.spec.mjs`: passed with installed Brave via Playwright, mocked API/Cloudinary/Drive responses, and no JavaScript exceptions. Covers named Drive library creation, failed link-save recovery, duplicate reuse, refresh persistence, selection of a saved Drive link, invalid URL rejection, Drive Enter and Publish, persisted payloads when switching sources, library selection, bad file rejection, registration retry without a second upload, and mobile overflow. Mobile screenshot inspected. This does not test real provider playback.

Run browser checks with an installed Playwright module and Chromium browser:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
BROWSER_EXECUTABLE=/absolute/path/to/chromium \
node client/tests/video-ui.spec.mjs
```

The harness starts a private Vite server on port 5198, overrides the API origin and intercepts provider requests. It does not need or modify production credentials/data. Actual Cloudinary upload/transcoding/deletion and real Drive media controls remain acceptance checks requiring configured accounts/files.

## Targeted credential and responsive-layout fixes

Root causes: the actual `server/.env` lacked all three Cloudinary credentials; `dotenv/config` also depended on the startup working directory. Server startup now explicitly loads `server/.env` relative to the config module, without overriding deployment environment variables. The SDK initializer trims and validates all three values. The serverless entry continues to use hosting environment variables; local files are not a substitute for production hosting configuration.

In Cloudinary Console, choose the correct product environment. Copy **Cloud name** from Dashboard → Product Environment / Account Details. Open **Go to API Keys**, or **Settings → API Keys**, and copy the matching API key and API secret (not their display name). See [Cloudinary's credential instructions](https://cloudinary.com/documentation/api_key_secret_tutorial).

Set real values in `server/.env` (do not leave these placeholders):

```dotenv
CLOUDINARY_CLOUD_NAME=YOUR_ACTUAL_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_ACTUAL_API_KEY
CLOUDINARY_API_SECRET=YOUR_ACTUAL_API_SECRET
CLOUDINARY_VIDEO_UPLOAD_PRESET=fff_videos_unsigned
```

Keep the existing unsigned video preset. Restart the server after editing. These server credentials are separate from public `VITE_CLOUDINARY_*` configuration; client variables cannot authenticate backend verification or deletion. The existing runtime fallback supplies the cloud name and preset when Vite configuration is absent. Never copy the API secret to client variables.

The public gallery previously expanded `auto-fit` columns to fill all available space. It now reserves responsive grid tracks and caps each card at 28rem. The minimum track width shrinks on small screens. Native videos and Drive iframes use responsive 16:9 sizing; video content uses `contain`. Changes are scoped to public video selectors; admin previews, image styling, colors, fonts and unrelated sections are unchanged.

Manual release checklist:

- Configure real credentials, restart, then upload a small MP4 through Video Library. Confirm upload progress completes, the persisted entry appears after refresh, and playback works.
- Delete that unused test entry. Confirm it disappears after refresh and Cloudinary removes the asset. In-use entries must still be protected.
- Check public videos at 320/390px mobile, 768px tablet, 1024/1440px laptop/desktop, and 1920/2560/3840px large displays. Confirm controls remain usable, media is not cropped/stretched, and there is no horizontal overflow.
- Repeat with one video and six videos: equal card widths, even gaps, wrapping columns and bounded card sizes.
- Play an existing Drive/embed entry at each width; confirm fullscreen and provider controls remain usable.
- Smoke-test existing image upload/select/delete and another admin form. No image or unrelated admin code was changed for this fix.

Actual account upload/delete is blocked until real credentials are supplied. Mocked provider tests do not establish live Cloudinary success.

Targeted-fix validation: 30 client tests pass; 118 server tests pass with `node --test --test-concurrency=1 src/__tests__/*.test.js` using a fresh local test database. The original shared test database had stale product-migration fixtures; no migration code was changed. Production client build and whitespace checks pass. Browser layout tests cover one and six videos at 320, 390, 768, 1024, 1440, 1920, 2560 and 3840px with equal bounded cards, multiple columns, 16:9 native/Drive players and no overflow. Provider responses are mocked; real upload/delete and live media-control operation still require configured Cloudinary credentials and playable files.
