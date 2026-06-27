/**
 * Dynamic UI↔Aha parity route — ONE route serving every manifested Aha resource
 * (/api/aha/resource/story, /project, /sprint, …) via the parity manifest + route factory.
 * Replaces hand-built per-resource routes: add a resource to PARITY_MANIFEST and it gets a route here.
 * Reads open; writes gated by confirm:true (Worf). Crew unified-nav mission (RAG MEM 28).
 */
import { getResourceDef, makeAhaResourceRoute } from '@/lib/aha-parity';

function notFound(resource: string): Response {
  return new Response(JSON.stringify({ error: `unknown aha resource '${resource}'` }), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ resource: string }> }): Promise<Response> {
  const { resource } = await ctx.params;
  const def = getResourceDef(resource);
  if (!def) return notFound(resource);
  return makeAhaResourceRoute(def).GET(request);
}

export async function POST(request: Request, ctx: { params: Promise<{ resource: string }> }): Promise<Response> {
  const { resource } = await ctx.params;
  const def = getResourceDef(resource);
  if (!def) return notFound(resource);
  return makeAhaResourceRoute(def).POST(request);
}
