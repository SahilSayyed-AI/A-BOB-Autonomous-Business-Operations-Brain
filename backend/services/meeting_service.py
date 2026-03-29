"""
services/meeting_service.py
Extracts tasks from meeting transcripts using pattern matching.
"""

import re
from models.store import create_task, add_log, publish_event, new_id

OWNER_PATTERN = re.compile(
    r"(?P<name>[A-Z][a-z]+(?: [A-Z][a-z]+)?)\s+(?:will|should|needs? to|must|has to|is going to)\s+(?P<action>[^.!?\n]{10,120})",
    re.IGNORECASE,
)
ACTION_PATTERN = re.compile(
    r"(?:action item|todo|follow-?up|task|next step)[:\-]\s*(?P<action>[^.!?\n]{10,120})",
    re.IGNORECASE,
)
WE_PATTERN = re.compile(
    r"(?:we need to|we should|let'?s|the team (?:needs?|should))\s+(?P<action>[^.!?\n]{10,120})",
    re.IGNORECASE,
)

PRIORITY_MAP = {
    "CRITICAL": ["urgent", "asap", "immediately", "critical", "blocker", "emergency"],
    "HIGH":     ["important", "priority", "must", "required", "soon"],
    "LOW":      ["eventually", "nice to have", "optional"],
}

SLA_MAP = {
    4:   ["today", "by eod", "end of day"],
    24:  ["tomorrow", "next day"],
    48:  ["this week", "48 hours"],
    168: ["next week"],
}

NOISE = {"I", "We", "Team", "Everyone", "Someone", "This", "That", "The"}


def _priority(text):
    t = text.lower()
    for level, kws in PRIORITY_MAP.items():
        if any(k in t for k in kws):
            return level
    return "MEDIUM"


def _sla(text):
    t = text.lower()
    for hours, hints in SLA_MAP.items():
        if any(h in t for h in hints):
            return hours
    return 48


def extract_tasks(transcript, meeting_title="Meeting", participants=None):
    participants = participants or []
    workflow_id = new_id("wf_meeting_")
    committed, ambiguous, seen = [], [], set()

    def add(action, owner, match_type):
        key = action[:40].lower()
        if key in seen or len(action) < 10:
            return
        seen.add(key)
        confidence = {"owner_action": 0.85, "action_item": 0.90, "we_action": 0.65}.get(match_type, 0.5)
        if owner == "Unassigned" and confidence < 0.75:
            ambiguous.append({"action": action, "reason": "No owner detected",
                               "suggestion": f"Assign to: {', '.join(participants) or 'team'}"})
            return
        task = create_task(title=action[:140], description=f"From meeting: '{meeting_title}'",
                           owner_name=owner, priority=_priority(transcript),
                           source="MEETING", sla_hours=_sla(transcript), workflow_id=workflow_id)
        task["status"] = "ACTIVE"
        committed.append(task)

    for m in OWNER_PATTERN.finditer(transcript):
        name = m.group("name").strip()
        if name not in NOISE:
            add(m.group("action").strip().rstrip(".,;:"), name, "owner_action")

    for m in ACTION_PATTERN.finditer(transcript):
        add(m.group("action").strip().rstrip(".,;:"), "Unassigned", "action_item")

    for m in WE_PATTERN.finditer(transcript):
        add(m.group("action").strip().rstrip(".,;:"), "Unassigned", "we_action")

    add_log("meeting_service", "MEETING_PROCESSED", status="OK",
            reason=f"Created {len(committed)} tasks, {len(ambiguous)} ambiguous")
    publish_event("MEETING_PROCESSED", {"workflow_id": workflow_id, "task_count": len(committed)}, "meeting_service")

    return {
        "workflow_id": workflow_id,
        "tasks": committed,
        "ambiguous": ambiguous,
        "summary": f"{len(committed)} tasks created, {len(ambiguous)} need clarification.",
    }
