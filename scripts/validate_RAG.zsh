#!/usr/bin/env zsh
# RAG Validation Script v2.1
# --------------------------
# Exit on error, unset variables, and pipe failures
set -euo pipefail

# ANSI color codes for better error visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Enhanced logging function with colors
log() {
  local level=$1
  local message=$2
  local timestamp=$(date +%Y-%m-%dT%H:%M:%S%z)
  
  case $level in
    ERROR) echo -e "${RED}[${timestamp}] ERROR: ${message}${NC}" >&2 ;;
    WARN) echo -e "${YELLOW}[${timestamp}] WARN: ${message}${NC}" >&2 ;;
    *) echo -e "[${timestamp}] INFO: ${message}" ;;
  esac
}

# Suggest potential RAG directory locations
suggest_rag_dirs() {
  local candidates=(
    "/data/corpus"
    "/opt/rag/corpus"
    "${HOME}/rag_corpus"
    "${PWD}/corpus"
  )
  
  log "INFO" "Checking common RAG corpus locations:"
  for dir in "${candidates[@]}"; do
    if [[ -d "$dir" ]]; then
      log "INFO" "Found candidate directory: $dir"
      echo "export RAG_CORPUS_DIR=\"$dir\""
    fi
  done
}

# Main validation function
validate_rag() {
  log "INFO" "Starting RAG validation..."
  
  # Check if variable exists
  if [[ -z "${RAG_CORPUS_DIR:-}" ]]; then
    log "ERROR" "RAG_CORPUS_DIR environment variable not set"
    log "WARN" "Possible solutions:"
    log "WARN" "1. Set variable in your shell: export RAG_CORPUS_DIR=/path/to/corpus"
    log "WARN" "2. Add to .bashrc/.zshrc for persistence"
    log "WARN" "3. Common locations found:"
    suggest_rag_dirs
    return 1
  fi

  # Verify directory exists
  if [[ ! -d "$RAG_CORPUS_DIR" ]]; then
    log "ERROR" "Directory does not exist: $RAG_CORPUS_DIR"
    return 1
  fi

  # Validate directory contents
  if [[ ! -f "$RAG_CORPUS_DIR/metadata.json" ]]; then
    log "WARN" "Metadata file not found - corpus may be incomplete"
  fi

  log "INFO" "RAG corpus validated successfully at ${GREEN}${RAG_CORPUS_DIR}${NC}"
}

# Execute main function
validate_rag

# Advanced troubleshooting tip
log "INFO" "Debug tip: Run 'env | grep RAG_' to check related variables"
log "INFO" "For more help: see documentation in /docs/rag-setup.md"