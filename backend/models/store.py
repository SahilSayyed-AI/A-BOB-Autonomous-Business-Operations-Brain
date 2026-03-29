"""
models/store.py
Shared in-memory data store for all agents.
"""

import uuid
from datetime import datetime, timezone, timedelta

# ── In-memory stores
employees = {}
tasks = {}
logs = []
events = []

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def new_id(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:8]}"

# ── Employee helpers
def create_employee(name, role, department, email):
    eid = new_id("emp_")
    emp = {
        "id": eid,
        "name": name,
        "role": role,
        "department": department,
        "email": email,
        "status": "ACTIVE",
        "onboarding_workflow_id": None,
        "created_at": now_iso(),
        "task_ids": [],
    }
    employees[eid] = emp
    return emp

def get_employee(eid):
    return employees.get(eid)

def update_employee(eid, **kwargs):
    if eid in employees:
        employees[eid].update(kwargs)
    return employees.get(eid)

def list_employees():
    return list(employees.values())

# ── Task helpers
def create_task(title, description="", owner_name="Unassigned", owner_id=None,
                priority="MEDIUM", source="MANUAL", sla_hours=48,
                workflow_id=None, step=None):
    tid = new_id("task_")
    deadline = datetime.now(timezone.utc) + timedelta(hours=sla_hours)
    task = {
        "id": tid,
        "title": title,
        "description": description,
        "owner_name": owner_name,
        "owner_id": owner_id,
        "priority": priority,
        "status": "TODO",
        "source": source,
        "sla_hours": sla_hours,
        "sla_deadline": deadline.isoformat(),
        "workflow_id": workflow_id,
        "step": step,
        "retry_count": 0,
        "notes": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    tasks[tid] = task
    # Link task to employee if owner_id provided
    if owner_id and owner_id in employees:
        employees[owner_id]["task_ids"].append(tid)
    return task

def get_task(tid):
    return tasks.get(tid)

def update_task(tid, **kwargs):
    if tid in tasks:
        tasks[tid].update(kwargs)
        tasks[tid]["updated_at"] = now_iso()
    return tasks.get(tid)

def list_tasks():
    return list(tasks.values())

# ── Log helpers
def add_log(agent, action, entity_type="", entity_id="",
            status="OK", reason="", before_state=None, after_state=None):
    entry = {
        "id": new_id("log_"),
        "agent": agent,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "status": status,
        "reason": reason,
        "before_state": before_state or {},
        "after_state": after_state or {},
        "timestamp": now_iso(),
    }
    logs.append(entry)
    return entry

def list_logs():
    return list(reversed(logs))

# ── Event helpers
def publish_event(event_type, payload, agent_id="system"):
    event = {
        "id": new_id("evt_"),
        "event_type": event_type,
        "payload": payload,
        "agent_id": agent_id,
        "timestamp": now_iso(),
    }
    events.append(event)
    return event

def list_events():
    return list(reversed(events))

# ── Seed demo data
def seed_demo_data():
    if employees:
        return

    # Use fixed IDs that match the frontend AuthContext demo accounts (emp_001, emp_002)
    # so MyTasks and other views correctly link logged-in users to their backend data
    def create_employee_with_id(eid, name, role, department, email):
        emp = {
            "id": eid,
            "name": name,
            "role": role,
            "department": department,
            "email": email,
            "status": "ACTIVE",
            "onboarding_workflow_id": None,
            "created_at": now_iso(),
            "task_ids": [],
        }
        employees[eid] = emp
        return emp

    e1 = create_employee_with_id("emp_001", "Priya Sharma", "Software Engineer", "Engineering", "priya@company.com")
    e2 = create_employee_with_id("emp_002", "Rahul Verma", "Product Manager", "Product", "rahul@company.com")
    e3 = create_employee_with_id("emp_003", "Anita Desai", "UI Designer", "Design", "anita@company.com")

    # Create some tasks and link to employees
    t1 = create_task("Set up CI/CD pipeline", "Configure GitHub Actions", owner_name=e1["name"], owner_id=e1["id"], priority="HIGH", sla_hours=24)
    update_task(t1["id"], status="ACTIVE")

    t2 = create_task("Write Q2 product roadmap", "Define features for Q2", owner_name=e2["name"], owner_id=e2["id"], priority="HIGH", sla_hours=48)
    update_task(t2["id"], status="ACTIVE")

    t3 = create_task("Design new dashboard mockups", "Figma designs for v2", owner_name=e3["name"], owner_id=e3["id"], priority="MEDIUM", sla_hours=72)
    update_task(t3["id"], status="TODO")

    t4 = create_task("Fix login page bug", "Auth token expiry issue", owner_name=e1["name"], owner_id=e1["id"], priority="CRITICAL", sla_hours=8)
    update_task(t4["id"], status="ACTIVE")

    t5 = create_task("Prepare investor deck", "Slides for Series A", owner_name=e2["name"], owner_id=e2["id"], priority="HIGH", sla_hours=96)
    update_task(t5["id"], status="TODO")

    add_log("system", "SEED_DATA", status="OK", reason="Demo data seeded: 3 employees, 5 tasks")
    print(f"[A-BOB] Demo data seeded: {len(employees)} employees, {len(tasks)} tasks")
