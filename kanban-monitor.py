#!/usr/bin/env python3
"""
Kanban Frontend Fix - Quick Monitor

Shows the current status of all frontend TypeScript fix tasks
"""

import subprocess
import sys

def run_cmd(cmd):
    """Run command and return output"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"

def main():
    print("=" * 70)
    print("FRONTEND TYPESCRIPT FIX - KANBAN MONITOR")
    print("=" * 70)
    print()
    
    print("📊 Task Status Summary:")
    print("-" * 70)
    print()
    
    # Get all tasks
    tasks_output = run_cmd("hermes kanban list")
    
    # Extract our tasks
    task_ids = ["t_ee80daaa", "t_ffc9f81e", "t_9791123d", "t_4a35c236", "t_5ad44358"]
    task_info = {
        "t_ee80daaa": {"name": "Orchestrator Planning", "profile": "default", "emoji": "🎯"},
        "t_ffc9f81e": {"name": "Fix Missing Exports", "profile": "frontend", "emoji": "🔧"},
        "t_9791123d": {"name": "Fix Type Mismatches", "profile": "frontend", "emoji": "⚡"},
        "t_4a35c236": {"name": "Clean Up Types", "profile": "frontend", "emoji": "✨"},
        "t_5ad44358": {"name": "Validate Fixes", "profile": "reviewer", "emoji": "✅"}
    }
    
    for task_id in task_ids:
        # Check if task exists in output
        task_line = None
        for line in tasks_output.split('\n'):
            if task_id in line:
                task_line = line
                break
        
        info = task_info[task_id]
        emoji = info["emoji"]
        name = info["name"]
        profile = info["profile"]
        
        if task_line:
            # Parse status from line
            if "running" in task_line:
                status = "🏃 RUNNING"
                status_icon = "▶"
            elif "done" in task_line:
                status = "✅ DONE"
                status_icon = "✓"
            elif "ready" in task_line:
                status = "⏳ READY"
                status_icon = "◻"
            elif "todo" in task_line:
                status = "⏸️  WAITING"
                status_icon = "◼"
            elif "blocked" in task_line:
                status = "🚫 BLOCKED"
                status_icon = "⚠"
            else:
                status = "❓ UNKNOWN"
                status_icon = "?"
            
            print(f"  {emoji} {status_icon} {task_id}  {status:<12}  {profile:<8}  {name}")
        else:
            print(f"  ❓ ?   {task_id}  NOT FOUND      {profile:<8}  {name}")
    
    print()
    print("-" * 70)
    print()
    
    # Show next steps
    print("🎯 Next Actions:")
    print()
    
    # Check if orchestrator is done
    if "t_ee80daaa.*done" in tasks_output:
        print("  ✅ Orchestration complete - workers executing now")
        
        if "t_ffc9f81e.*running" in tasks_output:
            print("  ⏳ Frontend worker running T1 (Fix Missing Exports)")
            print("  📊 Monitor: hermes kanban tail t_ffc9f81e")
        elif "t_ffc9f81e.*done" in tasks_output:
            print("  ✅ T1 complete - T2 should be running or ready")
        else:
            print("  ⏳ Waiting for frontend worker to pick up T1")
    else:
        print("  ⏳ Waiting for orchestrator to complete")
    
    print()
    
    # Show useful commands
    print("🔧 Useful Commands:")
    print()
    print("  # Watch T1 execution in real-time:")
    print("  hermes kanban tail t_ffc9f81e")
    print()
    print("  # View all task details:")
    print("  hermes kanban show t_ee80daaa")
    print()
    print("  # List all tasks:")
    print("  hermes kanban list")
    print()
    print("  # View frontend worker logs:")
    print("  hermes kanban log t_ffc9f81e")
    print()
    
    # Show completion criteria
    print("✅ Completion Criteria:")
    print()
    print("  When t_5ad44358 shows 'done':")
    print("  • All TypeScript errors fixed")
    print("  • Frontend build succeeds: docker build -t frontend-app Frontend-app")
    print("  • Zero compilation errors")
    print()
    
    print("=" * 70)

if __name__ == "__main__":
    main()