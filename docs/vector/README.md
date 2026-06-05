# Vector Indexing for Documentation

This folder contains metadata to index docs into a vector store for agent retrieval.

## Files

- `doc_corpus_manifest.jsonl`: canonical list of docs to index with phase and tags.

## Recommended Indexing Model

- Collection: `sa_docs_knowledge_vectors`
- Embedding dimension: `64` (matches current deterministic embedding strategy in shared DB helpers)
- Chunking:
  - Split markdown by headings (`#`, `##`, `###`)
  - Max chunk size: 1200-1800 chars
  - Store `doc_id`, `doc_path`, `phase`, `tags`, `heading`, `chunk_index`

## Retrieval Strategy

- Primary filter by `phase` and `tags`
- Secondary vector similarity search (`cosine`)
- Return top 5 chunks with path and heading for traceability

## Usage Intent

- Improves agent accessibility for phased execution guidance
- Enables role-specific retrieval (PM, developer, lead)
- Keeps docs discoverable without cluttering project root
