# Embeddings — provider choice & activation (crew-evaluated)

RAG recall uses `embed()` ([packages/shared/src/embedding.ts](../packages/shared/src/embedding.ts)):
a real model when a key is set, else a deterministic SHA-hash fallback. 64-dim (Matryoshka) so no DB
change. Recall is client-side cosine on a ~40-candidate pool.

## Crew recommendation (RAG: `embeddings-choice`)

**Default: OpenAI `text-embedding-3-small`.** At Story Agent's scale (hundreds–low-thousands of short
RAG texts) it is the cheapest *viable* option: ~$0.02/1M tokens ≈ pennies, reliable, **zero infra/ops**.
A local model is "$0 marginal" only on paper — it needs a running service (another Fargate task +
memory) to deploy and maintain, which costs more than the API at this scale.

**Secrets are single-source** (WorfGate principle): the value lives ONCE in
`~/.alexai-secrets/api-keys.env`; `~/.zshrc` `source`s that file into your env; WorfGate *reads* it
from `process.env` (governed, audited, never copied). Set it in the secrets file only — never paste
raw secrets into `~/.zshrc` itself.

```bash
# add to ~/.alexai-secrets/api-keys.env  (gitignored; ~/.zshrc sources it — do NOT duplicate in ~/.zshrc)
export EMBEDDING_API_KEY=sk-...                         # from https://platform.openai.com/api-keys
# defaults (override only to change provider):
# export EMBEDDING_API_URL=https://api.openai.com/v1
# export EMBEDDING_MODEL=text-embedding-3-small
```
Then open a new shell (so `~/.zshrc` reloads) and `pnpm activation:status` flips RAG embeddings ❌ → ✅.

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
