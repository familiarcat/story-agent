# Embeddings — provider choice & activation (crew-evaluated)

RAG recall uses `embed()` ([packages/shared/src/embedding.ts](../packages/shared/src/embedding.ts)):
a real model when a key is set, else a deterministic SHA-hash fallback. 64-dim (Matryoshka) so no DB
change. Recall is client-side cosine on a ~40-candidate pool.

## Crew recommendation (RAG: `embeddings-choice`)

**Default: OpenAI `text-embedding-3-small`.** At Story Agent's scale (hundreds–low-thousands of short
RAG texts) it is the cheapest *viable* option: ~$0.02/1M tokens ≈ pennies, reliable, **zero infra/ops**.
A local model is "$0 marginal" only on paper — it needs a running service (another Fargate task +
memory) to deploy and maintain, which costs more than the API at this scale.

**No new key needed — it reuses your OpenRouter key.** OpenRouter serves `/embeddings`, so `embed()`
reuses `CREW_LLM_APPROVED_KEY` (model `openai/text-embedding-3-small`) when no dedicated embeddings
key is set. Real RAG is therefore **already active with zero new secret** — `embeddingSource()`=`api`.

Provider precedence: `EMBEDDING_API_KEY` → `OPENAI_API_KEY` → **OpenRouter crew key** (default) → hash.
Secrets stay single-source in `~/.alexai-secrets/api-keys.env` (sourced by `~/.zshrc`, read from
`process.env` by WorfGate — never pasted into `~/.zshrc`, never copied).

```bash
# OPTIONAL overrides only (add to ~/.alexai-secrets/api-keys.env) — none required, OpenRouter is default:
# export EMBEDDING_API_KEY=sk-...            # use a dedicated provider (e.g. an OpenAI key)
# export EMBEDDING_API_URL=https://api.openai.com/v1
# export EMBEDDING_MODEL=text-embedding-3-small
# export EMBEDDING_DISABLE=true              # force the free SHA hash (zero embedding API cost)
```
Each RAG store/recall now makes one small embeddings call (~pennies/1M); `EMBEDDING_DISABLE=true`
reverts to the free hash.

## When to switch to a local model

Go local (e.g. `nomic-embed-text` via Ollama, or `BGE-small` behind an OpenAI-compatible shim) when:
1. **Scale** exceeds ~50M tokens/month (API cost finally beats infra cost), **or**
2. **Data sensitivity** forbids a hosted API. *(Worf)* — a **regulated/defense client's controlled
   data must not be sent to OpenAI**: that is controlled-data egress, which the WorfGate hard block
   exists to prevent. For such content, use a local endpoint or leave the hash fallback.

```bash
export EMBEDDING_API_URL=http://localhost:11434/v1     # local OpenAI-compatible endpoint
export EMBEDDING_API_KEY=local                          # any non-empty value
export EMBEDDING_MODEL=nomic-embed-text
```

## Ops (O'Brien)
Monitor embeddings latency + error rate; the code already falls back to the hash on any failure, so a
provider outage degrades recall quality but never breaks a write or recall.

## Open follow-up (security)
A **per-client data-classification gate** — route a regulated client's controlled content to a local
embedder (or hash) instead of the hosted API — is the right long-term tie-in to the WorfGate
controlled-data hard block. Not yet implemented; tracked here.
