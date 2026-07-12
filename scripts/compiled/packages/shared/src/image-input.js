/**
 * Shared image input for multimodal (vision) tools — used by the MCP analyze_image tool AND the UI
 * /api/analyze-image route (single source, no duplication). An image is either inline base64 or a URL.
 *
 * SECURITY (Worf ruling): images are EGRESS to a 3rd-party vision provider (OpenRouter -> OpenAI/Google).
 * NEVER send controlled / sa_ / client data or secrets in a screenshot — non-controlled UI only. Base64
 * is capped; image data is never logged.
 */
import { z } from 'zod';
export const ImageInputSchema = z.union([
    z.object({
        type: z.literal('base64'),
        data: z.string(),
        mimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
    }),
    z.object({
        type: z.literal('url'),
        url: z.string().url(),
    }),
]);
/** Base64 payload cap (Worf) — ~8 MB of base64 (~6 MB image). Rejects oversized egress. */
export const MAX_IMAGE_BASE64_BYTES = 8 * 1024 * 1024;
/** Build the OpenAI-compatible image_url value (data URL for base64, or the url as-is). */
export function imageInputToUrl(img) {
    return img.type === 'url' ? img.url : `data:${img.mimeType};base64,${img.data}`;
}
/** Reject oversized base64 before it egresses. Returns an error string, or null if OK. */
export function checkImageSize(img) {
    if (img.type === 'base64' && img.data.length > MAX_IMAGE_BASE64_BYTES) {
        return `image exceeds the ${(MAX_IMAGE_BASE64_BYTES / 1024 / 1024).toFixed(0)}MB base64 cap`;
    }
    return null;
}
