"""
Story Agent sync infrastructure with conflict resolution.

Implements Last-Write-Wins (LWW) resolution for multi-tool syncs.
"""
from datetime import datetime
from typing import Dict, List, Optional, TypedDict


class PendingChange(TypedDict):
    """A pending change to be synchronized."""
    id: str
    story_id: str
    change_type: str
    payload: Dict[str, Any]
    timestamp: str  # ISO 8601 format


class SyncConflict(TypedDict):
    """A detected conflict between local and remote changes."""
    id: str
    pending_change_id: str
    remote_change_id: str
    field: str
    local_value: Dict[str, Any]
    remote_value: Dict[str, Any]
    resolved: bool
    resolved_value: Optional[Dict[str, Any]]
    timestamp: str


def detect_collision(local: PendingChange, remote: Optional[PendingChange]) -> Optional[SyncConflict]:
    """
    Detect a collision between local and remote changes.
    Returns None if no collision, otherwise returns conflict details.
    """
    if not remote:
        return None

    # Check for same story and field
    if local["story_id"] != remote["story_id"] or local["change_type"] != remote["change_type"]:
        return None

    # Check timestamp proximity (1-second window)
    local_ts = datetime.fromisoformat(local["timestamp"]).timestamp()
    remote_ts = datetime.fromisoformat(remote["timestamp"]).timestamp()
    if abs(local_ts - remote_ts) > 1:
        return None

    # Collision detected
    return {
        "id": f"conflict-{datetime.now().isoformat()}",
        "pending_change_id": local["id"],
        "remote_change_id": remote["id"],
        "field": local["change_type"],
        "local_value": local["payload"],
        "remote_value": remote["payload"],
        "resolved": False,
        "resolved_value": None,
        "timestamp": datetime.now().isoformat(),
    }


def resolve_conflict(conflict: SyncConflict) -> SyncConflict:
    """
    Resolve a conflict using Last-Write-Wins (LWW).
    Always picks the remote value as the resolution (conservative).
    """
    if conflict["resolved"]:
        return conflict

    return {
        **conflict,
        "resolved_value": conflict["remote_value"],
        "resolved": True,
    }


def batch_detect_conflicts(changes: List[PendingChange]) -> List[SyncConflict]:
    """
    Batch detect collisions across a list of pending changes.
    Returns list of detected conflicts (unresolved).
    """
    conflicts: List[SyncConflict] = []

    for i in range(len(changes)):
        for j in range(i + 1, len(changes)):
            conflict = detect_collision(changes[i], changes[j])
            if conflict:
                conflicts.append(conflict)

    return conflicts


def auto_resolve_conflicts(conflicts: List[SyncConflict]) -> List[SyncConflict]:
    """
    Automatically resolve all conflicts using LWW.
    Returns list of resolved conflicts.
    """
    return [resolve_conflict(conflict) for conflict in conflicts]
