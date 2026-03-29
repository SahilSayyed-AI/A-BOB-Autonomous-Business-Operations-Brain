"""
services/onboarding_service.py
Full 7-step onboarding workflow with Jira failure simulation.
"""

import random
from models.store import create_task, update_task, update_employee, add_log, publish_event, new_id, now_iso, employees

BUDDY_POOL = ["Alex Morgan (Senior Engineer)", "Priya Nair (Data Lead)", "Marcus Rivera (Product Lead)", "Chen Wei (Engineering Manager)"]

ROLE_TASKS = {
    "engineer":  ["Set up local dev environment", "Review architecture docs", "Complete first PR"],
    "designer":  ["Access Figma workspace",        "Review brand guidelines",  "Complete first design review"],
    "manager":   ["Meet with direct reports",      "Review team OKRs",         "Book 1-on-1 cadence"],
    "analyst":   ["Access data warehouse",         "Review analytics dashboard","Complete SQL onboarding module"],
    "default":   ["Complete compliance training",  "Review company handbook",  "Attend first all-hands"],
}


def _simulate_jira(name, fail):
    if fail:
        return {"ok": False, "error": "Jira API timeout — connection refused"}
    return {"ok": True, "account": f"{name.lower().replace(' ','.')}_jira"}


def run_onboarding(employee, inject_jira_failure=False):
    workflow_id = new_id("wf_onboard_")
    steps = {}
    all_tasks = []

    # Step 1 — Validate
    missing = [f for f in ["email", "role", "department"] if not employee.get(f)]
    if missing:
        add_log("onboarding", "VALIDATE_FAILED", "employee", employee["id"], "BLOCKED", f"Missing: {missing}")
        return {"status": "ABORTED", "reason": f"Missing fields: {missing}"}
    add_log("onboarding", "VALIDATE_OK", "employee", employee["id"], "OK", "Record validated")
    steps["step1"] = {"ok": True}

    # Step 2 — Provision accounts (Slack, Email always OK; Jira may fail)
    accounts = {
        "slack": {"ok": True, "handle": f"@{employee['name'].split()[0].lower()}"},
        "email": {"ok": True, "inbox": employee["email"]},
    }
    jira_result = None
    for attempt in range(1, 4):
        fail_this = inject_jira_failure and attempt <= 2
        jira_result = _simulate_jira(employee["name"], fail_this)
        if jira_result["ok"]:
            add_log("onboarding", "ACCOUNT_PROVISIONED", "employee", employee["id"], "OK", f"Jira OK attempt {attempt}")
            accounts["jira"] = jira_result
            break
        else:
            add_log("onboarding", "ACCOUNT_FAILED", "employee", employee["id"], f"RETRY_{attempt}", f"Jira failed attempt {attempt}: {jira_result['error']}")
            if attempt == 3:
                esc_task = create_task(f"[ESCALATED] Jira provisioning failed for {employee['name']}", "Manual fix needed",
                                       "IT Operations Lead", priority="CRITICAL", source="SYSTEM", sla_hours=2, workflow_id=workflow_id)
                update_task(esc_task["id"], status="BLOCKED")
                accounts["jira"] = {"ok": False, "escalated": True, "task_id": esc_task["id"]}
                all_tasks.append(esc_task)
    steps["step2"] = {"accounts": accounts}

    # Step 3 — Assign buddy
    buddy = random.choice(BUDDY_POOL)
    add_log("onboarding", "BUDDY_ASSIGNED", "employee", employee["id"], "OK", f"Buddy: {buddy}")
    steps["step3"] = {"buddy": buddy}

    # Step 4 — Orientation meetings
    meetings = [
        {"title": "HR Orientation", "sla_hours": 8, "owner": "HR Team"},
        {"title": "Security Briefing", "sla_hours": 16, "owner": "Legal Team"},
        {"title": "Team Intro Call", "sla_hours": 24, "owner": "Department Manager"},
        {"title": "IT Setup Walkthrough", "sla_hours": 12, "owner": "IT Team"},
    ]
    for m in meetings:
        t = create_task(f"[{employee['name']}] {m['title']}", owner_name=m["owner"],
                        priority="HIGH", source="ONBOARDING", sla_hours=m["sla_hours"],
                        workflow_id=workflow_id, owner_id=employee["id"])
        update_task(t["id"], status="ACTIVE")
        all_tasks.append(t)
        if t["id"] not in employees[employee["id"]]["task_ids"]:
            employees[employee["id"]]["task_ids"].append(t["id"])
    steps["step4"] = {"meeting_count": len(meetings)}

    # Step 5 — Role-specific tasks
    role_lower = employee.get("role", "").lower()
    template_key = next((k for k in ["engineer", "designer", "manager", "analyst"] if k in role_lower), "default")
    for i, title in enumerate(ROLE_TASKS[template_key], 1):
        t = create_task(f"[{employee['name']}] {title}", owner_name=employee["name"],
                        priority="MEDIUM", source="ONBOARDING", sla_hours=72 * i,
                        workflow_id=workflow_id, owner_id=employee["id"])
        update_task(t["id"], status="ACTIVE")
        all_tasks.append(t)
        if t["id"] not in employees[employee["id"]]["task_ids"]:
            employees[employee["id"]]["task_ids"].append(t["id"])
    steps["step5"] = {"role_tasks": template_key}

    # Step 6 — Welcome email
    welcome = {"to": employee["email"], "subject": f"Welcome {employee['name'].split()[0]}!", "sent_at": now_iso()}
    add_log("onboarding", "WELCOME_SENT", "employee", employee["id"], "OK", f"Email sent to {employee['email']}")
    steps["step6"] = welcome

    # Update employee status
    update_employee(employee["id"], status="ONBOARDING", onboarding_workflow_id=workflow_id)

    add_log("onboarding", "ONBOARDING_COMPLETED", "employee", employee["id"], "OK",
            f"All steps done. {len(all_tasks)} tasks created.", after_state={"workflow_id": workflow_id})
    publish_event("ONBOARDING_COMPLETED", {"employee_id": employee["id"], "workflow_id": workflow_id,
                                            "task_count": len(all_tasks)}, "onboarding_service")

    return {
        "status": "COMPLETED",
        "workflow_id": workflow_id,
        "employee_id": employee["id"],
        "steps": steps,
        "tasks_created": len(all_tasks),
        "tasks": all_tasks,
        "buddy": buddy,
        "accounts": accounts,
    }
