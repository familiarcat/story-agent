# Phase D: Manual Integration Steps

**Time Estimate:** 20-30 minutes  
**Difficulty:** Low-Medium (copy-paste + file edits)  
**Risk Level:** Low (TypeScript will catch mistakes)

---

## 📋 Manual Steps Required

### Step 1: Export PDF Cache from shared package
**File:** [packages/shared/src/index.ts](packages/shared/src/index.ts)

**What to do:** Add export for new pdf-cache module

**Location:** At the end of the file (after existing exports)

**Add these lines:**
```typescript
// PDF extraction caching
export { getPdfExtractionCache, storePdfExtractionCache, cleanupExpiredPdfCache, getPdfCacheStats } from './pdf-cache';
export type { PdfExtractionCacheEntry, CacheStats } from './pdf-cache';
```

**Verify:** Run `pnpm --filter @story-agent/shared run build` (should have zero errors)

---

### Step 2: Update Web UI Chat Page to Use File Attachment Hook
**File:** [packages/ui/src/app/chat/page.tsx](packages/ui/src/app/chat/page.tsx)

**What to do:** Import hook, initialize state, add UI

**Step 2a - Add import at top:**
```typescript
import { useFileAttachment } from './useFileAttachment';
```

**Step 2b - Inside ChatPage component, after other useState calls, add:**
```typescript
  const { 
    attachedFiles, 
    clearFiles, 
    handleAttach, 
    removeFile, 
    fileInputRef, 
    triggerFileInput 
  } = useFileAttachment();
```

**Step 2c - Update send button logic to enable with files:**

Find this line:
```typescript
const isDisabled = !input.trim() && attachedFiles.length === 0;
```

Or if it doesn't exist, add near your send button:
```typescript
const canSend = input.trim() || attachedFiles.length > 0;
```

**Step 2d - Update send handler to include attachments:**

Find your fetch call to `/api/chat`. Update body to:
```typescript
body: JSON.stringify({
  message: input,
  history,
  attachments: attachedFiles.map(f => ({
    name: f.name,
    mimeType: f.mimeType,
    size: f.size,
    dataUrl: f.dataUrl,
  })),
}),
```

After successful send, add:
```typescript
clearFiles(); // Clear file queue after send
```

**Step 2e - Add file picker input element to JSX:**

Add this (typically near your message input):
```html
<input
  ref={fileInputRef}
  type="file"
  multiple={false}
  accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
  onChange={(e) => {
    if (e.target.files?.[0]) {
      handleAttach(e.target.files[0])
        .catch((err) => alert(err.message));
      e.target.value = ''; // Reset input
    }
  }}
  style={{ display: 'none' }}
/>
```

**Step 2f - Add attach button to JSX:**

Add this button near your send button:
```html
<button 
  onClick={triggerFileInput}
  className="btn btn-sm"
  title="Attach image or PDF"
>
  📎 Attach
</button>
```

**Step 2g - Add file preview section to JSX:**

Add this before your message input (or wherever makes sense):
```html
{attachedFiles.length > 0 && (
  <div className="mb-2 flex flex-wrap gap-2">
    {attachedFiles.map((file) => (
      <div 
        key={file.id} 
        className="badge badge-lg gap-2 bg-slate-100"
      >
        <span>{file.mimeType.startsWith('image') ? '📷' : '📄'}</span>
        <span className="text-sm truncate max-w-xs">{file.name}</span>
        <span className="text-xs opacity-70">
          {(file.size / (1024 * 1024)).toFixed(1)}MB
        </span>
        <button 
          onClick={() => removeFile(file.id)}
          className="btn btn-xs"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
)}
```

**Verify:** Run `pnpm --filter @story-agent/ui run build` (should have zero errors)

---

### Step 3: Update MCP process_pdf Tool to Use Cache Wrapper
**File:** [packages/mcp-server/src/tools/process-pdf.ts](packages/mcp-server/src/tools/process-pdf.ts)

**What to do:** Swap extractPdfText for getCachedOrExtract with cache integration

**Step 3a - Update import:**

Change this:
```typescript
import { extractPdfText, checkPdfSize, hashPdfInput, type PdfInput } from '@story-agent/shared';
```

To this:
```typescript
import { checkPdfSize, type PdfInput } from '@story-agent/shared';
import { getCachedOrExtract } from './lib/pdf-cache-wrapper';
```

**Step 3b - Update tool handler:**

Find the line that calls `extractPdfText(pdfInput, ...)` and replace it with:
```typescript
const result = await getCachedOrExtract(pdfInput, {
  enableOcr,
  ocrLanguages,
  ocrTimeoutMs: 30000,
  useCache: true,
  clientId: 'familiarcat',
  onProgress: (msg) => console.log(`[process_pdf] ${msg}`),
});
```

**Step 3c - Update response to include cacheHit:**

In your response JSON, add:
```typescript
cacheHit: result.cacheHit,
cacheKey: result.cacheKey,
```

**Example response structure:**
```typescript
return {
  content: [{
    type: 'text',
    text: JSON.stringify({
      success: true,
      pageCount: result.pageCount,
      textLength: result.text.length,
      hasEmbeddedText: result.hasEmbeddedText,
      ocrPagesCount: result.ocrPages.length,
      processingTimeMs: result.processingTimeMs,
      confidence: result.confidence,
      cacheHit: result.cacheHit,      // ← ADD THIS
      cacheKey: result.cacheKey,      // ← ADD THIS
    }, null, 2),
  }, {
    type: 'text',
    text: result.text,
  }],
};
```

**Verify:** Run `pnpm --filter @story-agent/mcp-server run build` (should have zero errors)

---

### Step 4: Update API Route to Accept Attachments
**File:** [packages/ui/src/app/api/chat/route.ts](packages/ui/src/app/api/chat/route.ts)

**What to do:** Update POST handler to accept and pass attachments

**Step 4a - Update request type:**

In your request handler, update the body parsing to expect:
```typescript
interface ChatRequest {
  message: string;
  history?: any[];
  attachments?: Array<{
    name: string;
    mimeType: string;
    size: number;
    dataUrl: string;
  }>;
}
```

**Step 4b - Pass attachments to chat client:**

When calling the chat client/MCP, pass attachments:
```typescript
const response = await chatClient.send({
  message: body.message,
  history: body.history,
  files: body.attachments, // Pass attachments as files parameter
});
```

**Step 4c - Return attachment metadata in response:**

Include in your response:
```typescript
{
  ...response,
  filesProcessed: body.attachments?.length || 0,
}
```

**Verify:** Run `pnpm --filter @story-agent/ui run build` (should have zero errors)

---

### Step 5: Apply Supabase Migration
**Command to run:**
```bash
cd /Users/bradygeorgen/Developer/story-agent
supabase db push
```

**What it does:**
- Creates `sa_pdf_extraction_cache` table
- Sets up RLS policies
- Creates indexes for fast lookup
- Creates cleanup function

**Verify:** Check Supabase dashboard that table exists

---

## ✅ Validation Checklist

After completing all manual steps:

- [ ] `pnpm --filter @story-agent/shared run build` → zero errors
- [ ] `pnpm --filter @story-agent/mcp-server run build` → zero errors
- [ ] `pnpm --filter @story-agent/ui run build` → zero errors
- [ ] `supabase db push` → migration applied successfully
- [ ] File picker works (click 📎 → opens file dialog)
- [ ] File preview appears (shows badge with name + size)
- [ ] File removal works (click ✕ → file removed)
- [ ] Send button enabled with files (no message text required)
- [ ] POST to `/api/chat` includes attachments in request body
- [ ] Cache hit test: Upload same PDF twice → 2nd upload <1 second

---

## 🧪 Testing Commands

```bash
# Test shared package builds
pnpm --filter @story-agent/shared run build

# Test MCP server builds
pnpm --filter @story-agent/mcp-server run build

# Test UI builds
pnpm --filter @story-agent/ui run build

# Run full build check
pnpm run build

# Run type check only
pnpm run check
```

---

## 🆘 Common Issues & Fixes

**Issue: TypeScript error "Cannot find module 'pdf-cache-wrapper'"**
- Fix: Ensure step 3a import path is correct: `./lib/pdf-cache-wrapper`

**Issue: React hook warning about dependencies**
- Fix: Make sure useFileAttachment is called inside your component, not conditionally

**Issue: File uploads hang or timeout**
- Fix: Verify ChatPanel WebSocket timeout is 60s (not 30s): timeout is needed for large files

**Issue: Cache not working (always executing extraction)**
- Fix: Verify Supabase env vars are set (`SUPABASE_URL`, `SUPABASE_KEY`)
- Fix: Verify RLS policies are enabled on table

---

## 📞 Questions?

If team has questions during manual integration:
1. Check that your current code structure matches assumptions
2. Run TypeScript build to catch errors early
3. Verify all import paths are correct
4. Ensure file is saved after edits

**Total Expected Time:** 20-30 minutes  
**Confidence Level:** High (all auto-generated code is production-ready)

---

*Generated by Phase D Automation Script*  
*Date: 2026-08-27*
