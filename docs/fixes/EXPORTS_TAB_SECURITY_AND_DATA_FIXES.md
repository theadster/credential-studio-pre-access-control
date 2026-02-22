---
title: ExportsTab Security and Data Fixes
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/components/ExportsTab.tsx
---

# ExportsTab Security and Data Fixes

Four bugs fixed in `src/components/ExportsTab.tsx`.

## 1. Reverse-Tabnabbing on Download Button

`window.open(job.pdfUrl, '_blank')` allowed the opened tab to access `window.opener`, enabling reverse-tabnabbing attacks.

Fixed by passing `'noopener,noreferrer'` and nulling `opener`, and validating the URL scheme before opening:

```ts
const url = job.pdfUrl ?? '';
if (!url.startsWith('https://') && !url.startsWith('http://')) return;
const w = window.open(url, '_blank', 'noopener,noreferrer');
if (w) w.opener = null;
```

## 2. URL Injection in handleDelete

`job.$id` was interpolated directly into the DELETE query string. IDs containing `&`, `=`, or other special characters would corrupt the URL.

Fixed with `encodeURIComponent`:

```ts
fetch(`/api/pdf-jobs/delete?jobId=${encodeURIComponent(job.$id)}`, { method: 'DELETE' })
```

## 3. Unsafe JSON.parse in parseNames

`JSON.parse(attendeeNames)` was returned directly without verifying the result was an array of strings. A non-array value (object, number, etc.) would cause downstream `.map()` to throw.

Fixed with `Array.isArray` guard, string filter, and an outer try/catch to handle any non-string or malformed input safely:

```ts
try {
  const parsed = JSON.parse(attendeeNames);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(item => typeof item === 'string');
} catch {
  return [];
}
```

## 4. "Total Exports" Stat Showed Page Size Instead of Server Total

`stats.total` was set to `jobs.length` (the current page, capped at 50) instead of the server-returned total. The "Total Exports" stat card showed an incorrect count when there were more than 50 exports.

Fixed to use the `total` state variable (populated from `data.total` in `fetchJobs`), falling back to `jobs.length`:

```ts
total: total ?? jobs.length,
```
