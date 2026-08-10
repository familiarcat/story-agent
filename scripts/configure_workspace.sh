#!/bin/zsh
# Enable workspace file operations with sudo fallback
function safe_crud() {
  # Set workspace path (modify as needed)
  WORKSPACE="/Users/bradygeorgen/Developer/story-agent"
  
  # Check access
  if [[ ! -w "$WORKSPACE" ]]; then
    echo "Insufficient permissions. Attempting with sudo..."
    sudo chmod -R u+rwX "$WORKSPACE"
  fi

  # Verify
  if [[ -w "$WORKSPACE" ]]; then
    echo "Workspace ready for CRUD operations at: $WORKSPACE"
    return 0
  else
    echo "Failed to configure workspace permissions"
    return 1
  fi
}

safe_crud && echo "Ready for file operations" || echo "Configuration failed"