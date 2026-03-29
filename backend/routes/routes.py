"""
routes/routes.py — All API endpoints
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()

# ── Request models
class EmployeeIn(BaseModel):
    name: str
    role: str
    department: str
    email: str
    inject_jira_failure: bool = False

class TaskIn(BaseModel):
    title: str
    description: str = ""
    owner_name: str = "Unassigned"
    owner_id: Optional[str] = None
    priority: str = "MEDIUM"
    sla_hours: int = 48

class TaskStatusIn(BaseModel):
    status: str

class MeetingIn(BaseModel):
    transcript: str
    title: str = "Team Meeting"
    participants: list = []

class ChatIn(BaseModel):
    message: str

class AssignIn(BaseModel):
    task_id: str


# ──────────────────────────────────────────────
# EMPLOYEES
# ──────────────────────────────────────────────

@router.get("/employees")
def get_employees():
    from models.store import list_employees, tasks
    emps = list_employees()
    # Attach tasks to each employee
    for emp in emps:
        emp["tasks"] = [tasks[tid] for tid in emp.get("task_ids", []) if tid in tasks]
    return emps

@router.post("/employees")
def add_employee(data: EmployeeIn):
    from models.store import create_employee
    from services.onboarding_service import run_onboarding
    emp = create_employee(data.name, data.role, data.department, data.email)
    result = run_onboarding(emp, inject_jira_failure=data.inject_jira_failure)
    return {"employee": emp, "onboarding": result}

@router.get("/employees/{eid}")
def get_employee_detail(eid: str):
    from models.store import get_employee, tasks
    emp = get_employee(eid)
    if not emp:
        return {"error": "Employee not found"}
    emp["tasks"] = [tasks[tid] for tid in emp.get("task_ids", []) if tid in tasks]
    return emp


# ──────────────────────────────────────────────
# TASKS
# ──────────────────────────────────────────────

@router.get("/tasks")
def get_tasks():
    from models.store import list_tasks
    return list_tasks()

@router.post("/tasks")
def create_task_endpoint(data: TaskIn):
    from models.store import create_task, employees
    task = create_task(data.title, data.description, data.owner_name, data.owner_id,
                       data.priority, "MANUAL", data.sla_hours)
    if data.owner_id and data.owner_id in employees:
        if task["id"] not in employees[data.owner_id]["task_ids"]:
            employees[data.owner_id]["task_ids"].append(task["id"])
    return task

@router.patch("/tasks/{tid}/status")
def update_task_status(tid: str, data: TaskStatusIn):
    from models.store import update_task
    task = update_task(tid, status=data.status)
    if not task:
        return {"error": "Task not found"}
    return task

@router.post("/tasks/{tid}/simulate-failure")
def simulate_failure(tid: str):
    from agents.agents import RecoveryAgent
    recovery = RecoveryAgent()
    return recovery.run(task_id=tid, failure_type="SIMULATED_FAILURE")


# ──────────────────────────────────────────────
# MEETINGS
# ──────────────────────────────────────────────

@router.post("/meetings")
def process_meeting(data: MeetingIn):
    from services.meeting_service import extract_tasks
    return extract_tasks(data.transcript, data.title, data.participants)


# ──────────────────────────────────────────────
# HEALTH / AGENTS
# ──────────────────────────────────────────────

@router.get("/health")
def get_health():
    from agents.agents import MonitoringAgent
    return MonitoringAgent().run()

@router.get("/agents")
def get_agents():
    from agents.agents import (AuditAgent, ExecutionAgent, DecisionAgent,
                                MonitoringAgent, RecoveryAgent, IntelligenceAgent, PlannerAgent)
    return [
        AuditAgent().get_status(),
        ExecutionAgent().get_status(),
        DecisionAgent().get_status(),
        MonitoringAgent().get_status(),
        RecoveryAgent().get_status(),
        IntelligenceAgent().get_status(),
        PlannerAgent().get_status(),
    ]


# ──────────────────────────────────────────────
# LOGS & EVENTS
# ──────────────────────────────────────────────

@router.get("/logs")
def get_logs():
    from models.store import list_logs
    return list_logs()

@router.get("/events")
def get_events():
    from models.store import list_events
    return list_events()


# ──────────────────────────────────────────────
# INTELLIGENCE
# ──────────────────────────────────────────────

@router.get("/intelligence/predict")
def predict_delays():
    from agents.agents import IntelligenceAgent
    return IntelligenceAgent().predict_delays()

@router.post("/intelligence/assign")
def smart_assign(data: AssignIn):
    from agents.agents import IntelligenceAgent
    return IntelligenceAgent().smart_assign(data.task_id)


# ──────────────────────────────────────────────
# AI CHAT (Claude API)
# ──────────────────────────────────────────────

@router.post("/chat")
def chat(data: ChatIn):
    from models.store import list_tasks, list_employees, list_logs
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"reply": "No API key configured. Set ANTHROPIC_API_KEY in your .env file."}

    all_tasks = list_tasks()
    all_employees = list_employees()
    recent_logs = list_logs()[:20]

    system_context = f"""You are A-BOB, an AI operations assistant for enterprise workflow management.
Current system state:
- Total employees: {len(all_employees)}
- Total tasks: {len(all_tasks)}
- Active tasks: {sum(1 for t in all_tasks if t['status'] == 'ACTIVE')}
- Blocked tasks: {sum(1 for t in all_tasks if t['status'] == 'BLOCKED')}
- Done tasks: {sum(1 for t in all_tasks if t['status'] == 'DONE')}
- Employees: {[f"{e['name']} ({e['role']})" for e in all_employees]}
- Recent tasks: {[f"{t['title'][:40]} [{t['status']}] owner:{t['owner_name']}" for t in all_tasks[:10]]}
- Recent logs: {[f"{l['agent']}: {l['action']} [{l['status']}]" for l in recent_logs[:10]]}

Answer questions about the system concisely and helpfully. If asked about specific tasks or employees, reference the data above."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            system=system_context,
            messages=[{"role": "user", "content": data.message}]
        )
        reply = message.content[0].text
    except Exception as e:
        reply = f"Chat error: {str(e)}"

    return {"reply": reply}


# ──────────────────────────────────────────────
# LIVE DEMO
# ──────────────────────────────────────────────

@router.post("/demo/run")
def run_demo():
    from models.store import create_employee, employees, tasks, logs, events
    from services.onboarding_service import run_onboarding
    from agents.agents import RecoveryAgent, MonitoringAgent

    steps = []

    # Step 1: Add demo employee
    emp = create_employee("Jordan Taylor", "Software Engineer", "Engineering", "jordan@company.com")
    steps.append({"step": 1, "title": "New employee added", "detail": f"Jordan Taylor (Software Engineer) joined the company", "status": "OK"})

    # Step 2: Start onboarding WITH Jira failure
    result = run_onboarding(emp, inject_jira_failure=True)
    steps.append({"step": 2, "title": "Onboarding workflow started", "detail": f"7-step workflow launched. {result['tasks_created']} tasks created automatically.", "status": "OK"})

    # Step 3: Jira failure detected
    steps.append({"step": 3, "title": "Jira failure detected", "detail": "Jira API timeout on port 8080 — system detected failure automatically", "status": "FAIL"})

    # Step 4: Retry #1
    steps.append({"step": 4, "title": "Recovery Agent: Retry #1", "detail": "Automatic retry with 5s backoff — Jira still down", "status": "RETRY"})

    # Step 5: Retry #2
    steps.append({"step": 5, "title": "Recovery Agent: Retry #2", "detail": "Automatic retry with 15s backoff — Jira still down", "status": "RETRY"})

    # Step 6: Escalation
    steps.append({"step": 6, "title": "Escalated to IT Operations", "detail": "After 3 failed attempts — task BLOCKED, IT Operations Lead alerted with CRITICAL priority", "status": "ESCALATED"})

    # Step 7: Show audit trail
    recent_logs = logs[-10:]
    steps.append({"step": 7, "title": "Audit trail recorded", "detail": f"{len(recent_logs)} actions logged with full before/after state", "status": "OK"})

    # Step 8: Health check
    health = MonitoringAgent().run()
    steps.append({"step": 8, "title": "Health score updated", "detail": f"System health: {health['health_score']}/100 ({health['health_status']})", "status": "OK"})

    return {
        "demo": True,
        "steps": steps,
        "employee": emp,
        "onboarding_result": result,
        "health": health,
        "total_tasks": len(tasks),
        "total_logs": len(logs),
    }

@router.post("/demo/reset")
def reset_demo():
    from models.store import employees, tasks, logs, events
    employees.clear()
    tasks.clear()
    logs.clear()
    events.clear()
    from models.store import seed_demo_data
    seed_demo_data()
    return {"message": "Demo reset complete"}


# ──────────────────────────────────────────────
# AI CODE ASSISTANT (User Dashboard Feature)
# ──────────────────────────────────────────────

class CodeChatIn(BaseModel):
    code: str

@router.post("/code-assistant")
def code_assistant(data: CodeChatIn):
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "problem": "No API key configured.",
            "language": "unknown",
            "fixed": "",
            "explanation": "Please set ANTHROPIC_API_KEY in your .env file."
        }

    system_prompt = """You are an expert code assistant. When given code with bugs or problems, respond ONLY with a valid JSON object in this exact format (no markdown, no backticks):
{
  "problem": "Clear explanation of what is wrong (1-3 sentences)",
  "language": "javascript|python|css|html|sql|etc",
  "fixed": "The complete corrected code here",
  "explanation": "Simple explanation of what was fixed and why, in plain English"
}
Always return valid JSON. Never add any text outside the JSON."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Analyze and fix this code:\n\n{data.code}"}]
        )
        import json
        raw = message.content[0].text.strip()
        parsed = json.loads(raw)
        return parsed
    except Exception as e:
        return {
            "problem": f"AI service error: {str(e)}",
            "language": "unknown",
            "fixed": data.code,
            "explanation": "Could not analyze the code. Please try again."
        }


# ──────────────────────────────────────────────
# BUDDY SYSTEM - Get buddy list for user
# ──────────────────────────────────────────────

@router.get("/buddies")
def get_buddies():
    """Returns list of available buddies for the user dashboard."""
    return [
        {
            "id": "b1",
            "name": "Arjun Mehta",
            "role": "Senior Software Engineer",
            "department": "Engineering",
            "email": "arjun.mehta@company.com",
            "phone": "+91 98765 43210",
            "skills": ["React", "Node.js", "System Design", "Mentoring"],
            "status": "online",
        },
        {
            "id": "b2",
            "name": "Sneha Iyer",
            "role": "HR Business Partner",
            "department": "Human Resources",
            "email": "sneha.iyer@company.com",
            "phone": "+91 97654 32109",
            "skills": ["HR Policies", "Benefits", "Conflict Resolution", "Onboarding"],
            "status": "online",
        },
        {
            "id": "b3",
            "name": "Vikram Nair",
            "role": "DevOps Engineer",
            "department": "Infrastructure",
            "email": "vikram.nair@company.com",
            "phone": "+91 96543 21098",
            "skills": ["Kubernetes", "AWS", "CI/CD", "Docker"],
            "status": "away",
        },
        {
            "id": "b4",
            "name": "Priya Joshi",
            "role": "Product Manager",
            "department": "Product",
            "email": "priya.joshi@company.com",
            "phone": "+91 95432 10987",
            "skills": ["Roadmapping", "Agile", "User Research", "Jira"],
            "status": "offline",
        },
    ]
