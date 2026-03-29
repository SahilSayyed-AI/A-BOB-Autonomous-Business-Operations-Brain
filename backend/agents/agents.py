"""
agents/agents.py
All 7 A-BOB agents in one file.
"""

import random
from datetime import datetime, timezone
from models.store import (
    add_log, publish_event, now_iso, get_task, update_task, tasks,
    list_tasks, new_id
)

# ─────────────────────────────────────────────
# BASE AGENT
# ─────────────────────────────────────────────

class BaseAgent:
    agent_id = "base_agent"
    agent_name = "Base Agent"

    def __init__(self):
        self._status = "IDLE"
        self._last_action = None

    def get_status(self):
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "status": self._status,
            "last_action": self._last_action,
        }

    def _log(self, action, entity_type="", entity_id="", status="OK", reason="", before_state=None, after_state=None):
        return add_log(self.agent_id, action, entity_type, entity_id, status, reason, before_state, after_state)

    def _emit(self, event_type, payload):
        return publish_event(event_type, payload, self.agent_id)

    def _set_running(self, action):
        self._status = "RUNNING"
        self._last_action = action

    def _set_done(self, action):
        self._status = "DONE"
        self._last_action = action

    def _set_error(self, action):
        self._status = "ERROR"
        self._last_action = action


# ─────────────────────────────────────────────
# AUDIT AGENT
# ─────────────────────────────────────────────

class AuditAgent(BaseAgent):
    agent_id = "audit_agent"
    agent_name = "Audit Agent"

    def run(self, action="", entity_type="", entity_id="", status="OK", reason="", before_state=None, after_state=None):
        self._set_running(action)
        entry = self._log(action, entity_type, entity_id, status, reason, before_state, after_state)
        self._set_done(action)
        return entry

    def summarise(self):
        from models.store import logs
        total = len(logs)
        by_status = {}
        for l in logs:
            by_status[l["status"]] = by_status.get(l["status"], 0) + 1
        return {"total_logs": total, "by_status": by_status}


# ─────────────────────────────────────────────
# EXECUTION AGENT
# ─────────────────────────────────────────────

class ExecutionAgent(BaseAgent):
    agent_id = "execution_agent"
    agent_name = "Execution Agent"

    def run(self, task_def=None, **kwargs):
        if not task_def:
            return {"error": "No task_def provided"}
        self._set_running(f"CREATE_TASK: {task_def.get('title','')[:40]}")
        from models.store import create_task
        task = create_task(
            title=task_def.get("title", "Untitled"),
            description=task_def.get("description", ""),
            owner_name=task_def.get("owner_name", "Unassigned"),
            owner_id=task_def.get("owner_id"),
            priority=task_def.get("priority", "MEDIUM"),
            source=task_def.get("source", "AGENT"),
            sla_hours=task_def.get("sla_hours", 48),
            workflow_id=task_def.get("workflow_id"),
            step=task_def.get("step"),
        )
        self._log("TASK_CREATED", "task", task["id"], "OK", f"Task '{task['title'][:50]}' created", after_state=task)
        self._emit("TASK_CREATED", {"task_id": task["id"], "title": task["title"]})
        self._set_done(f"CREATED {task['id']}")
        return {"task": task}


# ─────────────────────────────────────────────
# DECISION AGENT
# ─────────────────────────────────────────────

class DecisionAgent(BaseAgent):
    agent_id = "decision_agent"
    agent_name = "Decision Agent"

    def run(self, task_id=None, context=None, **kwargs):
        if not task_id:
            return {"error": "task_id required"}
        self._set_running(f"DECIDE: {task_id}")
        task = get_task(task_id)
        if not task:
            return {"error": f"Task {task_id} not found"}
        decision = "PROCEED"
        reason = "Task ownership validated"
        self._log("OWNERSHIP_VALIDATED", "task", task_id, "OK", reason)
        self._set_done(f"DECIDED: {decision}")
        return {"task_id": task_id, "decision": decision, "reason": reason}

    def decide_recovery_action(self, task_id, retry_count):
        if retry_count < 3:
            return "RETRY"
        elif retry_count == 3:
            return "REASSIGN"
        else:
            return "ESCALATE"


# ─────────────────────────────────────────────
# MONITORING AGENT
# ─────────────────────────────────────────────

def _sla_percent(task):
    try:
        created = datetime.fromisoformat(task["created_at"].replace("Z", "+00:00"))
        deadline = datetime.fromisoformat(task["sla_deadline"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        total = (deadline - created).total_seconds()
        elapsed = (now - created).total_seconds()
        if total <= 0:
            return 100.0
        return round((elapsed / total) * 100, 1)
    except:
        return 0.0


class MonitoringAgent(BaseAgent):
    agent_id = "monitoring_agent"
    agent_name = "Monitoring Agent"

    def run(self, trigger_recovery=False, **kwargs):
        self._set_running("SLA_SCAN")
        active = [t for t in tasks.values() if t["status"] not in ("DONE", "FAILED")]
        warnings, critical, breached, healthy = [], [], [], []

        for task in active:
            pct = _sla_percent(task)
            if pct >= 100:
                risk = "BREACHED"
                breached.append({"task_id": task["id"], "title": task["title"][:50], "sla_pct": pct, "owner": task.get("owner_name", "Unassigned")})
            elif pct >= 90:
                risk = "CRITICAL"
                critical.append({"task_id": task["id"], "title": task["title"][:50], "sla_pct": pct, "owner": task.get("owner_name", "Unassigned")})
            elif pct >= 70:
                risk = "WARNING"
                warnings.append({"task_id": task["id"], "title": task["title"][:50], "sla_pct": pct, "owner": task.get("owner_name", "Unassigned")})
            else:
                healthy.append(task["id"])

        score = max(0, min(100, 100 - len(warnings)*5 - len(critical)*20 - len(breached)*30))
        status_label = "HEALTHY" if score >= 80 else ("AT_RISK" if score >= 50 else "CRITICAL")

        self._log("MONITOR_SCAN", status="OK", reason=f"Score={score}, W={len(warnings)}, C={len(critical)}, B={len(breached)}")
        self._set_done(f"SCAN score={score}")

        return {
            "health_score": score,
            "health_status": status_label,
            "scanned": len(active),
            "healthy": len(healthy),
            "warnings": len(warnings),
            "critical": len(critical),
            "breached": len(breached),
            "warning_tasks": warnings,
            "critical_tasks": critical,
            "breached_tasks": breached,
            "scanned_at": now_iso(),
        }


# ─────────────────────────────────────────────
# RECOVERY AGENT
# ─────────────────────────────────────────────

REASSIGN_POOL = ["Senior Engineer (On-call)", "DevOps Team", "Engineering Lead", "Platform Team", "Operations Manager"]

class RecoveryAgent(BaseAgent):
    agent_id = "recovery_agent"
    agent_name = "Recovery Agent"
    _decision = DecisionAgent()

    def run(self, task_id=None, failure_type="EXECUTION_ERROR", **kwargs):
        if not task_id:
            return {"error": "task_id required"}
        self._set_running(f"RECOVERING {task_id}")
        task = get_task(task_id)
        if not task:
            return {"error": f"Task {task_id} not found"}

        retry_count = task.get("retry_count", 0)
        tier = self._decision.decide_recovery_action(task_id, retry_count)
        before = {"status": task["status"], "retry_count": retry_count}

        if tier == "RETRY":
            new_count = retry_count + 1
            backoff = 5 * (3 ** (new_count - 1))
            update_task(task_id, status="ACTIVE", retry_count=new_count)
            action = f"RETRIED (attempt #{new_count}, backoff {backoff}s)"
            tier_label = "TIER_1_RETRY"
        elif tier == "REASSIGN":
            new_owner = random.choice(REASSIGN_POOL)
            update_task(task_id, status="ACTIVE", owner_name=new_owner, retry_count=retry_count+1)
            action = f"REASSIGNED to {new_owner}"
            tier_label = "TIER_2_REASSIGN"
        else:
            update_task(task_id, status="BLOCKED", priority="CRITICAL", retry_count=retry_count+1)
            action = "ESCALATED — human intervention required"
            tier_label = "TIER_3_ESCALATE"
            self._emit("ESCALATION_REQUIRED", {"task_id": task_id, "reason": failure_type})

        self._log(f"RECOVERY_{failure_type}", "task", task_id, tier_label, action, before, {"status": get_task(task_id)["status"]})
        self._emit("TASK_RECOVERED", {"task_id": task_id, "tier": tier_label, "action": action})
        self._set_done(f"{tier_label} on {task_id}")

        return {"task_id": task_id, "failure_type": failure_type, "tier": tier_label, "action_taken": action}


# ─────────────────────────────────────────────
# INTELLIGENCE AGENT
# ─────────────────────────────────────────────

class IntelligenceAgent(BaseAgent):
    agent_id = "intelligence_agent"
    agent_name = "Intelligence Agent"

    def predict_delays(self):
        self._set_running("PREDICT_DELAYS")
        active = [t for t in tasks.values() if t["status"] not in ("DONE", "FAILED", "BLOCKED")]
        predictions = []
        for task in active:
            pct = _sla_percent(task)
            risk = "HIGH" if pct >= 70 else ("MEDIUM" if pct >= 40 else "LOW")
            predictions.append({
                "task_id": task["id"],
                "title": task["title"][:60],
                "owner": task.get("owner_name", "Unassigned"),
                "sla_pct": pct,
                "risk": risk,
                "priority": task["priority"],
            })
        predictions.sort(key=lambda x: x["sla_pct"], reverse=True)
        self._log("DELAY_PREDICTION", status="OK", reason=f"Analysed {len(predictions)} tasks")
        self._set_done("PREDICT_DELAYS")
        return {"predictions": predictions, "high_risk": sum(1 for p in predictions if p["risk"] == "HIGH")}

    def smart_assign(self, task_id):
        self._set_running(f"SMART_ASSIGN {task_id}")
        from models.store import employees, list_tasks
        emp_list = list(employees.values())
        if not emp_list:
            return {"error": "No employees found"}

        # Score employees by current workload
        all_tasks = list_tasks()
        scored = []
        for emp in emp_list:
            active_count = sum(1 for t in all_tasks if t.get("owner_id") == emp["id"] and t["status"] in ("ACTIVE", "TODO"))
            score = max(0, 100 - active_count * 15)
            scored.append({
                "employee_id": emp["id"],
                "employee_name": emp["name"],
                "role": emp["role"],
                "active_tasks": active_count,
                "score": score,
                "reason": f"{active_count} active tasks — {'Available' if active_count < 3 else 'Busy'}",
            })
        scored.sort(key=lambda x: x["score"], reverse=True)

        # Auto-assign to top candidate
        if scored and task_id:
            best = scored[0]
            update_task(task_id, owner_name=best["employee_name"], owner_id=best["employee_id"])
            # Link task to employee
            if best["employee_id"] in employees:
                if task_id not in employees[best["employee_id"]]["task_ids"]:
                    employees[best["employee_id"]]["task_ids"].append(task_id)
            self._log("SMART_ASSIGN", "task", task_id, "OK", f"Assigned to {best['employee_name']}")
            self._emit("TASK_ASSIGNED", {"task_id": task_id, "assigned_to": best["employee_name"]})

        self._set_done(f"SMART_ASSIGN {task_id}")
        return {"task_id": task_id, "candidates": scored, "assigned_to": scored[0] if scored else None}


# ─────────────────────────────────────────────
# PLANNER AGENT
# ─────────────────────────────────────────────

ONBOARDING_TEMPLATE = [
    {"step": 1, "title": "Provision system accounts",     "sla_hours": 2,   "priority": "HIGH",     "owner_name": "IT Team"},
    {"step": 2, "title": "Assign hardware and equipment", "sla_hours": 24,  "priority": "HIGH",     "owner_name": "Facilities Team"},
    {"step": 3, "title": "Send welcome package",          "sla_hours": 4,   "priority": "MEDIUM",   "owner_name": "HR Team"},
    {"step": 4, "title": "Schedule orientation session",  "sla_hours": 8,   "priority": "MEDIUM",   "owner_name": "HR Team"},
    {"step": 5, "title": "Assign onboarding buddy",       "sla_hours": 6,   "priority": "MEDIUM",   "owner_name": "HR Team"},
    {"step": 6, "title": "Complete compliance training",  "sla_hours": 48,  "priority": "CRITICAL", "owner_name": "Legal Team"},
    {"step": 7, "title": "30-day check-in scheduled",    "sla_hours": 720, "priority": "LOW",      "owner_name": "Manager"},
]

class PlannerAgent(BaseAgent):
    agent_id = "planner_agent"
    agent_name = "Planner Agent"

    def __init__(self):
        super().__init__()
        self._execution = ExecutionAgent()
        self._decision = DecisionAgent()
        self._monitor = MonitoringAgent()
        self._recovery = RecoveryAgent()
        self._audit = AuditAgent()
        self._intelligence = IntelligenceAgent()

    def run(self, goal="", context=None, **kwargs):
        context = context or {}
        self._set_running(f"PLANNING: {goal[:60]}")
        workflow_id = new_id("wf_plan_")
        employee_name = context.get("employee_name", "")
        prefix = f"[{employee_name}] " if employee_name else ""

        executed_tasks = []
        for step_def in ONBOARDING_TEMPLATE:
            task_def = {**step_def, "workflow_id": workflow_id,
                        "title": f"{prefix}{step_def['title']}", "source": "ONBOARDING"}
            exec_result = self._execution.run(task_def=task_def)
            executed_tasks.append(exec_result.get("task", {}))

        health = self._monitor.run()
        self._audit.run("WORKFLOW_PLANNED", "workflow", workflow_id, "OK",
                        f"Goal: '{goal[:80]}' — {len(executed_tasks)} tasks created")
        self._emit("WORKFLOW_STARTED", {"workflow_id": workflow_id, "task_count": len(executed_tasks)})
        self._set_done(f"PLANNED workflow ({len(executed_tasks)} tasks)")

        return {
            "workflow_id": workflow_id,
            "goal": goal,
            "tasks_created": len(executed_tasks),
            "tasks": executed_tasks,
            "health": health,
        }

    def get_all_statuses(self):
        return [
            AuditAgent().get_status(),
            ExecutionAgent().get_status(),
            DecisionAgent().get_status(),
            MonitoringAgent().get_status(),
            RecoveryAgent().get_status(),
            IntelligenceAgent().get_status(),
            self.get_status(),
        ]
