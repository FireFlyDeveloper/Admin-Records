#!/usr/bin/env python3
"""
Kanban Orchestrator: Fix Frontend TypeScript Errors

This script creates an orchestrated task graph to fix all frontend TypeScript errors
as a multi-phase implementation with dependency chains across frontend and reviewer profiles.
"""

import subprocess
import shlex
import os
import sys

def create_kanban_task(title, assignee, body, parents=None, workspace=None):
    """Create a kanban task using hermes CLI and return task_id"""
    cmd = f'hermes kanban create "{title}" --assignee {assignee} --body {shlex.quote(body)}'
    
    if parents:
        if isinstance(parents, list):
            for parent in parents:
                cmd += f' --parent {parent}'
        else:
            cmd += f' --parent {parents}'
    
    if workspace:
        cmd += f' --workspace {workspace}'
    
    # Add tenant if set
    tenant = os.environ.get("HERMES_TENANT")
    if tenant:
        cmd += f' --tenant {tenant}'
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode == 0:
        # Parse task_id from "Created t_XXXXX" output
        lines = result.stdout.strip().split('\n')
        for line in lines:
            if 'Created' in line and 't_' in line:
                parts = line.split()
                for part in parts:
                    if part.startswith('t_'):
                        print(f"✓ Created {part}: {title}")
                        return part
    print(f"✗ Failed to create task: {title}")
    print(f"Error: {result.stderr}")
    return None

def main():
    print("=" * 60)
    print("Kanban Orchestrator: Frontend TypeScript Error Fixes")
    print("=" * 60)
    print()
    
    # Verify profiles exist
    print("Step 1: Verifying available profiles...")
    result = subprocess.run("hermes profile list", shell=True, capture_output=True, text=True)
    if "frontend" not in result.stdout or "reviewer" not in result.stdout:
        print("✗ Error: Required profiles 'frontend' and 'reviewer' not found!")
        print("Available profiles:", result.stdout)
        sys.exit(1)
    print("✓ Profiles verified: frontend, reviewer")
    print()
    
    print("Step 2: Creating orchestration task graph...")
    print()
    
    # Task T0: Orchestrator (self)
    orchestrator_body = """Frontend TypeScript Error Resolution - Orchestration Plan

This orchestrates the fix of 21 TypeScript compilation errors in the frontend codebase.

ERRORS IDENTIFIED:
1. Missing exports/hooks (useCheckDuplicate, useSearchDocuments, useRenameDocument, OnlyOfficeConfig, checkDocumentExists)
2. Type mismatches and duplicate identifiers (User type/value conflicts, string | null to string)
3. Implicit any types and unused variables

TASK GRAPH:
T0 (Orchestrator) → T1 (Fix Missing Exports) → T2 (Fix Type Errors) → T3 (Clean Up) → T4 (Validation)
                  frontend            frontend            frontend        reviewer
"""

    t0_id = create_kanban_task(
        title="Orchestrator: Frontend TypeScript Error Resolution",
        assignee="default",
        body=orchestrator_body
    )
    
    if not t0_id:
        print("✗ Failed to create orchestrator task")
        sys.exit(1)
    
    print()
    print("Step 3: Creating frontend worker tasks...")
    print()
    
    # Task T1: Fix missing exports and hooks
    t1_body = """Fix Missing TypeScript Exports and Hooks

**Location**: Frontend-app/src/

**Files to Fix**:
- `hooks/useDocuments.ts` - Add missing exports: useCheckDuplicate, useSearchDocuments, useRenameDocument, checkDocumentExists
- `api/documents.ts` - Add missing OnlyOfficeConfig export
- `hooks/useCheckout.ts` - Remove unused CheckoutTransaction import
- `hooks/useLots.ts` - Remove unused 'lot' variable
- `hooks/useUserStatus.ts` - Remove unused 'intervalMs' parameter
- `components/user/UserStatusIndicator.tsx` - Remove unused 'color' variables
- `components/requests/StatusUpdateDialog.tsx` - Remove unused Truck import and checkoutId variable

**Expected Changes**:
1. Add missing function exports to useDocuments.ts
2. Add missing type exports to documents.ts
3. Remove unused imports and variables
4. Ensure all hooks have proper TypeScript definitions

**Validation**:
Run `npm run build` to verify these specific errors are resolved.

**Next**: After this task completes, T2 will automatically start.
"""

    t1_id = create_kanban_task(
        title="T1: Fix Missing Exports and Hooks",
        assignee="frontend",
        body=t1_body,
        parents=[t0_id],
        workspace="dir:/root/tmp/Admin-Records"
    )
    
    # Task T2: Fix type mismatches and duplicate identifiers
    t2_body = """Fix Type Mismatches and Duplicate Identifiers

**Location**: Frontend-app/src/

**Files to Fix**:
- `components/documents/ActivityLog.tsx(22,63)` - Fix string | null to string assignment
- `components/documents/FileList.tsx(108,33)` - Fix incorrect parameter type (object passed where string expected)
- `components/documents/PermissionEditor.tsx`:
  - Line 2,11: Fix duplicate identifier 'User' (remove duplicate import)
  - Line 38,22: Fix User type/value conflict (use proper type annotation)
  - Line 187,33: Fix User type/value conflict
  - Line 188,29: Fix User type/value conflict
- `routes/pages/admin/UsersPage.tsx(253)` - Fix UserOnlineStatus comparison with string type mismatch

**Expected Changes**:
1. Add null checks or type guards for nullable values
2. Fix incorrect function call signatures
3. Resolve User identifier conflicts (likely mixing type and instance)
4. Fix enum/string comparison issues

**Validation**:
Run `npm run build` to verify TypeScript compilation succeeds.

**Next**: After this task completes, T3 will automatically start.
"""

    t2_id = create_kanban_task(
        title="T2: Fix Type Mismatches and Duplicate Identifiers",
        assignee="frontend",
        body=t2_body,
        parents=[t1_id],
        workspace="dir:/root/tmp/Admin-Records"
    )
    
    # Task T3: Fix implicit any types and clean up
    t3_body = """Clean Up Implicit Types and Remaining Issues

**Location**: Frontend-app/src/

**Files to Fix**:
- `routes/pages/documents/DocumentManagerPage.tsx(51,52)` - Fix parameter 'd' implicit any type by adding proper typing
- Any remaining TypeScript errors from previous steps
- Ensure all imports have proper types
- Verify no unused variables remain

**Expected Changes**:
1. Add explicit type annotations where TypeScript infers 'any'
2. Clean up any remaining linting issues
3. Verify DocumentManagerPage parameter types match expected interfaces

**Validation**:
Run `npm run build` - should complete with zero TypeScript errors.

**Next**: After this task completes, T4 (reviewer validation) will automatically start.
"""

    t3_id = create_kanban_task(
        title="T3: Clean Up Implicit Types",
        assignee="frontend",
        body=t3_body,
        parents=[t2_id],
        workspace="dir:/root/tmp/Admin-Records"
    )
    
    print()
    print("Step 4: Creating reviewer validation task...")
    print()
    
    # Task T4: Reviewer validation
    t4_body = """Validate Frontend TypeScript Fixes

**Parent Tasks**: T3 completed all TypeScript error fixes

**Validation Steps**:
1. Review all changes made in T1, T2, T3
2. Run `npm run build` in Frontend-app directory
3. Verify zero TypeScript compilation errors
4. Check for any new warnings or issues
5. Validate no breaking changes to existing functionality
6. Verify exports match expected API contracts

**Expected Results**:
- Build completes successfully with 0 errors
- All hooks and components have proper TypeScript types
- No unused variables or imports
- Proper null-safety guards in place

**Deliverable**: 
Run build and confirm success. Report any remaining issues or approve completion.
"""

    t4_id = create_kanban_task(
        title="T4: Validate Frontend TypeScript Fixes",
        assignee="reviewer",
        body=t4_body,
        parents=[t3_id],
        workspace="dir:/root/tmp/Admin-Records"
    )
    
    print()
    print("=" * 60)
    print("Orchestration Complete!")
    print("=" * 60)
    print()
    print(f"Created Task Graph:")
    print(f"  {t0_id} → {t1_id} → {t2_id} → {t3_id} → {t4_id}")
    print()
    print("Profile Assignment:")
    print("  T0: Orchestrator (default) - Planning phase")
    print("  T1: Frontend - Fix missing exports/hooks")
    print("  T2: Frontend - Fix type mismatches")
    print("  T3: Frontend - Clean up implicit types")
    print("  T4: Reviewer - Validation and approval")
    print()
    print("Workspaces:")
    print("  All tasks: dir:/root/tmp/Admin-Records")
    print()
    print("Task Execution Flow:")
    print("  1. T1 starts immediately (fixes exports)")
    print("  2. T2 auto-starts when T1 completes (fixes types)")
    print("  3. T3 auto-starts when T2 completes (cleans up)")
    print("  4. T4 auto-starts when T3 completes (validates)")
    print()
    print("Monitoring Commands:")
    for task_id in [t0_id, t1_id, t2_id, t3_id, t4_id]:
        print(f"  hermes kanban show {task_id}")
    print()
    print("Real-time monitoring:")
    print(f"  hermes kanban tail {t1_id}")
    print()
    print("When complete: Frontend Docker build should succeed")
    print()

if __name__ == "__main__":
    main()