# Phase 6: Image + PDF Chat Integration — Crew Implementation Plan

**Mission:** Enable paste of images (PNG, JPG, WebP, GIF) and PDFs into Story Agent chat (VSCode extension + web UI), auto-process, and include in context — feature parity with Claude Code and Copilot Chat.

**Timeline:** Aug 27 - Sept 6 (Week 1 of Phase 6 UI/UX)  
**Effort:** 20-30 crew-hours (distributed across Riker, Data, Geordi, Troi)  
**Risk Level:** Low (extends existing image system, no new external dependencies)  
**Cost Impact:** ~$0.15 crew deliberation + ~$0.05-0.10 OCR inference (Tesseract.js on-device)

---

## CREW SELF-ORGANIZED RESEARCH FINDINGS

### What Exists (Current State)

**Image System (✅ Ready to Extend)**
- `analyze_image` MCP tool: multimodal vision + OCR intent
- `crew_analyze_image` MCP tool: crew deliberation on images
- `image-input.ts`: Base64/URL input schema (ImageInput type)
- Schema: MIME types = [image/png, image/jpeg, image/gif, image/webp]
- Size cap: 8 MB base64 (~6 MB image)
- Security: Egress to OpenRouter vision provider (Worf-controlled, non-sensitive only)

**Chat Architecture**
- VSCode extension: Webview-based UI (can intercept paste events)
- Web UI: React components, Ctrl+V paste handler
- MCP server: Already routes image analysis to crew

### What's Missing (Research Findings)

| Item | Current | Needed | Complexity |
|------|---------|--------|-----------|
| **PDF Support** | ❌ No | Paste + extract text | Medium |
| **PDF Input Schema** | ❌ No | PdfInput type (file + validation) | Low |
| **PDF Text Extraction** | ❌ No | pdf-parse or pdfjs | Low |
| **OCR for Scanned PDFs** | ⚠️ Partial | Tesseract.js on-device | Medium |
| **Paste Event Handling** | ⚠️ Images only | Handle File API for PDFs | Low |
| **Chat UI: File Preview** | ❌ No | Show uploaded file as badge/thumbnail | Low |
| **Chat UI: Processing Status** | ⚠️ Images only | Extend to show PDF extraction progress | Low |
| **Unified Code Path** | ⚠️ Images only | Share PDF + image processors | Low |

---

## IMPLEMENTATION PLAN (Crew Roadmap)

### Phase A: Foundation (2-4 hours) — Data + Geordi

**Goal:** Extend shared types + evaluate OCR libraries

#### A1: PDF Input Schema (`packages/shared/src/pdf-input.ts`)
```typescript
// New file
export const PdfInputSchema = z.union([
  z.object({
    type: z.literal('base64'),
    data: z.string(),
    fileName: z.string().optional(),
  }),
  z.object({
    type: z.literal('file'),
    path: z.string(), // For server-side processing
    fileName: z.string().optional(),
  }),
]);

export type PdfInput = z.infer<typeof PdfInputSchema>;
export const MAX_PDF_BASE64_BYTES = 50 * 1024 * 1024; // 50 MB (larger than images)
export function checkPdfSize(pdf: PdfInput): string | null { ... }
```

#### A2: Library Evaluation (Geordi Research)
| Library | Size | On-Device | Pros | Cons |
|---------|------|-----------|------|------|
| **pdfjs** | 800 KB | ✅ Yes | Mozilla standard, battle-tested | Big, slow on old PDFs |
| **pdf-parse** | 150 KB | ✅ Yes | Fast, Node.js native, good API | Less robust on scanned PDFs |
| **Tesseract.js** | 650 KB | ✅ Yes | State-of-the-art OCR, WASM | Slow (5-30s per page), CPU-heavy |
| **pdfjs + Tesseract** | 1.45 MB | ✅ Yes | Best coverage (text + OCR fallback) | Largest bundle |

**Decision:** Use pdfjs + Tesseract.js fallback
- pdfjs extracts embedded text (fast)
- Tesseract.js for scanned PDFs (slow but accurate)
- Add feature flag: `PDF_OCR_ENABLED` (default: true)
- VSCode extension: Ship with feature off by default (save 650 KB), enable on demand

#### A3: Dependencies to Add
```json
{
  "dependencies": {
    "pdfjs-dist": "^4.0.0",
    "tesseract.js": "^5.0.0"
  }
}
```

Bundle impact: +1.45 MB (uncompressed) → +400 KB (minified) to VSCode extension (1.05 MB → 1.45 MB)  
Mitigation: Lazy-load Tesseract.js only when user enables OCR for a scanned PDF

---

### Phase B: Core PDF Processing (4-6 hours) — Riker (Execution) + Geordi (Infrastructure)

**Goal:** Implement PDF extraction and OCR pipeline

#### B1: PDF Extraction Utility (`packages/shared/src/pdf-processor.ts`)
```typescript
export interface PdfExtractionResult {
  text: string; // Full extracted text
  pageCount: number;
  hasEmbeddedText: boolean; // Was text embedded vs OCR'd?
  ocrPages: number[]; // Pages that fell back to OCR
  processingTimeMs: number;
  confidence?: number; // OCR confidence (0-1) if used
}

export async function extractPdfText(
  pdf: PdfInput,
  options?: { enableOcr?: boolean; ocrLanguages?: string[] }
): Promise<PdfExtractionResult> {
  // 1. Validate size
  // 2. Load PDF via pdfjs
  // 3. For each page:
  //    a. Try to extract embedded text
  //    b. If no text & enableOcr: run Tesseract.js
  // 4. Return consolidated result
}
```

#### B2: MCP Tool: `process_pdf` (Geordi owns)
```typescript
// Register in MCP server
server.tool(
  'process_pdf',
  'Extract text from PDF (embedded or OCR). Returns full text + page count + extraction metadata.',
  {
    pdf: PdfInputSchema,
    enableOcr: z.boolean().optional().default(true),
    ocrLanguages: z.array(z.string()).optional(),
  },
  async ({ pdf, enableOcr, ocrLanguages }) => {
    const sizeErr = checkPdfSize(pdf);
    if (sizeErr) return { isError: true, content: [...] };
    
    const result = await extractPdfText(pdf, { enableOcr, ocrLanguages });
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);
```

#### B3: Unified File Input Type (`packages/shared/src/file-input.ts`)
```typescript
export const FileInputSchema = z.union([
  z.object({ type: z.literal('image'), image: ImageInputSchema }),
  z.object({ type: z.literal('pdf'), pdf: PdfInputSchema }),
]);

export type FileInput = z.infer<typeof FileInputSchema>;

export async function processFileInput(file: FileInput): Promise<string> {
  // Unified processor: delegates to analyze_image or process_pdf
  if (file.type === 'image') return await analyzeImage(file.image);
  if (file.type === 'pdf') return await extractPdfText(file.pdf);
  throw new Error(`unknown file type: ${file.type}`);
}
```

---

### Phase C: VSCode Extension UI (3-4 hours) — Troi (UX) + Riker

**Goal:** Add paste event handling + file preview

#### C1: Chat Paste Handler (`packages/vscode-extension/src/chat/paste-handler.ts`)
```typescript
export function setupChatPasteHandler(webviewPanel: vscode.WebviewPanel) {
  webviewPanel.webview.onDidReceiveMessage((message) => {
    if (message.command === 'paste') {
      const { files } = message; // [{ type: 'image'|'pdf', data: base64, name: string }]
      
      for (const file of files) {
        if (file.type === 'image') {
          insertImageReference(file.data, file.name);
        } else if (file.type === 'pdf') {
          insertPdfReference(file.data, file.name);
          triggerPdfExtraction(file.data, file.name); // Async
        }
      }
    }
  });
}

async function insertPdfReference(data: string, fileName: string) {
  // Add to chat: "📄 Uploaded: contract.pdf"
  // Store in local cache for MCP tool to reference
}

async function triggerPdfExtraction(data: string, fileName: string) {
  // Call MCP tool: process_pdf
  // Show progress: "Extracting text... 10%"
  // Display extraction status: "✅ Extracted 15 pages (3 via OCR)"
}
```

#### C2: Webview Paste Listener (`packages/vscode-extension/src/webview/chat-input.tsx`)
```typescript
// In the chat input React component
function ChatInputComponent() {
  const handlePaste = (event: React.ClipboardEvent) => {
    const files = Array.from(event.clipboardData?.files ?? [])
      .filter(f => isImageOrPdf(f));
    
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string).split(',')[1];
        vscode.postMessage({
          command: 'paste',
          files: [{ type: getFileType(file), data: base64, name: file.name }],
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  return (
    <textarea
      onPaste={handlePaste}
      placeholder="Paste images/PDFs or type your question..."
    />
  );
}
```

#### C3: File Preview Badge (`packages/vscode-extension/src/components/FilePreview.tsx`)
```typescript
// New component
export function FilePreview({ file }: { file: { type: string; name: string; size: number } }) {
  return (
    <div className="file-preview">
      {file.type === 'image' && <img src={...} alt={file.name} />}
      {file.type === 'pdf' && <span>📄 {file.name} ({formatBytes(file.size)})</span>}
    </div>
  );
}
```

---

### Phase D: Web UI Parity (2-3 hours) — Troi + Riker

**Goal:** Add same paste support to web UI (Next.js)

#### D1: Chat Input Component (`packages/ui/app/chat/input.tsx`)
```typescript
// Extend existing chat input
// Add onPaste event handler (same logic as extension)
// Use Next.js API route: /api/chat/process-file
```

#### D2: API Route (`packages/ui/app/api/chat/process-file/route.ts`)
```typescript
export async function POST(req: Request) {
  const { file, type } = await req.json(); // base64 file
  
  if (type === 'pdf') {
    // Call MCP tool: process_pdf (via fetch to MCP server)
    const result = await invokeMcpTool('process_pdf', { pdf: { type: 'base64', data: file } });
    return Response.json(result);
  }
  
  if (type === 'image') {
    // Call existing analyze_image
    return Response.json(...);
  }
}
```

#### D3: Storage Consideration (Geordi)
- PDF extraction results: Cache in Supabase `sa_file_cache` table
  - `file_hash` (SHA256 of PDF base64)
  - `extracted_text` (full text)
  - `page_count`
  - `ocr_pages`
  - `ttl` (24 hours)
- Benefit: Avoid re-processing the same PDF multiple times

---

### Phase E: Testing + Refinement (2-3 hours) — Yar (QA) + Troi

**Goal:** Validation and UX polish

#### E1: Unit Tests
- `pdf-processor.test.ts`: Extract text from various PDF types
- `file-input.test.ts`: Type validation
- `paste-handler.test.ts`: Paste event routing

#### E2: Integration Tests
- Extension + MCP: Paste → MCP call → result display
- Web + API: Paste → API route → response in chat

#### E3: UX Refinement
- [ ] Progress indicator for OCR (slow, 5-30s per page)
- [ ] "Paste an image or PDF" placeholder text
- [ ] Error handling: "PDF too large (>50 MB)"
- [ ] Success message: "✅ Extracted 12 pages"

#### E4: Performance Testing
- Tesseract.js CPU load (ensure <100% on slow machines)
- Bundle size impact (target <1.5 MB VSCode extension)
- Extraction time (P95 <10s for typical 5-page PDF)

---

## SUCCESS CRITERIA

### By End of Week 1 (Sept 6, same Go/No-Go as UI/UX Week 3)

| Criterion | Target | Owner | Status |
|-----------|--------|-------|--------|
| **Image Paste Works** | VSCode + Web | Riker | 🟢 Ready (existing) |
| **PDF Paste Works** | VSCode + Web | Riker | 🟡 In Progress |
| **PDF Text Extraction** | 95%+ on digital PDFs | Geordi | 🟡 In Progress |
| **Scanned PDF OCR** | Fallback on detection | Geordi | 🟡 In Progress |
| **File Preview** | Badge + thumbnail | Troi | 🟡 In Progress |
| **Processing Status** | Progress bar + result | Troi | 🟡 In Progress |
| **Bundle Size** | VSCode <1.5 MB | Geordi | 🟡 In Progress |
| **Test Coverage** | >90% file handling | Yar | 🟡 In Progress |
| **Feature Parity** | Claude Code / Copilot | Picard | 🟡 In Progress |

---

## CREW ASSIGNMENTS

| Role | Owner | Hours | Responsibility |
|------|-------|-------|-----------------|
| **Riker** | Execution | 8 | VSCode extension paste handler + MCP integration |
| **Data** | Architecture | 4 | PDF input schema + type system design |
| **Geordi** | Infrastructure | 8 | pdf-parse/pdfjs + Tesseract.js integration + bundle optimization |
| **Troi** | UX | 4 | File preview component + progress UI + chat input refinement |
| **Yar** | QA | 3 | Unit + integration tests + performance validation |
| **Quark** | Optimization | 1 | Cost analysis (Tesseract.js CPU vs accuracy) |
| **Picard** | Synthesis | 1 | Mission review + crew coordination |

**Total Crew-Hours:** ~29 (distributed, low-cost deliberation cost)

---

## DEPENDENCIES TO ADD

```json
{
  "dependencies": {
    "pdfjs-dist": "^4.0.0",
    "tesseract.js": "^5.0.0"
  }
}
```

Add to `packages/shared/package.json` (then re-export in `packages/vscode-extension` + `packages/ui`)

**Bundle Impact:**
- pdfjs-dist: ~800 KB (uncompressed) → ~200 KB (minified)
- tesseract.js: ~650 KB (WASM + language data) → lazy-loaded on demand
- Net: +400 KB to VSCode extension minified size (1.05 MB → 1.45 MB)

**Mitigation:** Lazy-load Tesseract only when user requests OCR

---

## DEPLOYMENT PHASES

### Phase 6 Week 1 (Aug 27 - Sept 3)
- ✅ Crew deliberation complete (this plan)
- ✅ Core PDF processor + MCP tool
- ✅ VSCode extension paste handler
- ✅ Initial testing

### Phase 6 Week 2 (Sept 3 - Sept 6)
- ✅ Web UI parity
- ✅ File cache layer (Supabase)
- ✅ Full test coverage
- ✅ Performance tuning

### Sept 6 Go/No-Go Criteria
- 6/6 success criteria met
- Zero bundle size regressions (VSCode <1.5 MB)
- >90% test coverage
- <5s extraction time (P95) for typical PDFs

---

## RISK ANALYSIS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Tesseract.js too slow for large PDFs | Medium | High | Lazy-load, show progress, allow skip OCR |
| Bundle size exceeds limit | Low | High | Lazy-load Tesseract, tree-shake pdfjs |
| Scanned PDF quality varies | High | Medium | Graceful OCR fallback, user feedback |
| Cross-browser compatibility (web) | Low | Low | Test in Chrome, Firefox, Safari |

---

## KNOWLEDGE FOR CREW

### Key Files to Study
- `packages/shared/src/image-input.ts` — Model for FileInput type
- `packages/mcp-server/src/tools/analyze-image.ts` — Model for MCP tool registration
- `packages/vscode-extension/src/chat/` — Existing chat infrastructure
- `packages/ui/app/chat/` — Web chat components

### External References
- pdfjs: https://mozilla.github.io/pdf.js/
- Tesseract.js: https://tesseract.projectnaphtali.com/
- File API: https://developer.mozilla.org/en-US/docs/Web/API/File

---

## NEXT STEPS (Crew Autonomous Execution)

1. **Immediate:** Crew reviews this plan, identifies gaps, proposes refinements (Observation Lounge debate, ~20 min)
2. **Day 1:** Implement Phase A (schema + dependencies)
3. **Day 2:** Implement Phase B (PDF processor + MCP tool)
4. **Day 3:** Implement Phase C (VSCode extension UI)
5. **Day 4:** Implement Phase D (Web UI parity)
6. **Day 5:** Testing + refinement (Phase E)
7. **Day 6:** Go/No-Go review + deployment

**Timeline:** Aug 27 → Sept 3 (1 week, Phase 6 Week 1)

---

## CREW MISSION PARAMETERS

- **Autonomy Level:** Semi-autonomous (crew self-organizes, Admiral reviews Go/No-Go on Sept 6)
- **Cost Budget:** ~$0.20 total (deliberation + OCR inference)
- **Risk Gate:** Worf approval on dependency security scan
- **Approval Gate:** Admiral approval to deploy to production after Go/No-Go
- **Memory:** Store plan + findings to RAG for Phase 7+ feature additions (DataDog, advanced analytics, etc)

🖖 **Make it so. Crew self-organize and execute.**
