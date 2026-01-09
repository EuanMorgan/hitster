set -e

trap './plans/notify.sh "Ralph errored"' ERR

if [ -z "$1" ]; then
    echo "Usage: $0 <iterations>"
    exit 1
fi

for ((i=1; i<=$1; i++)); do
    echo "=== Iteration $i ==="
    echo "------------------------"
    # docker sandbox run --template claude-with-bun
    result=$(claude --dangerously-skip-permissions -p "@plans/prd.json @progress.txt \

    1. Find the highest-priority feature to work on and work only on that feature. \
    This should be the one YOU decide has the highest priority - not necessarily the first in the list.
    2. Check that the types check via bun run typecheck, the lint passes with bun run lint, the unit tests pass via bun run test, and e2e tests pass via bun run test:e2e. If any of these fail, fix the issue before moving on. \
    3. If you made UI changes, you MUST use the Playwright MCP to visually verify the changes render correctly. \
    Navigate to the relevant page and take a snapshot. If it looks wrong, fix it before proceeding. \
    If Playwright fails to connect, restart the dev server and retry. \
    IMPORTANT: If you need to visually verify a protected page (anything requiring login), first check if .auth/storage-state.json exists. \
    If it does not exist, output <auth-required/> and stop working immediately. Do not attempt visual verification without auth. \
    4. Update the PRD with the work that was done. \
    IMPORTANT: Only set 'passes': true if ALL steps in the PRD are fully implemented. \
    If some steps are done but others remain, keep 'passes': false and note partial progress in progress.txt. \
    A PRD with 4 steps where only 2 are done is NOT complete - do not mark it as passing. \
    5. After completing each task, append to progress.txt:
    - Task completed and PRD item reference
    - Key decisions made and reasoning
    - Files changed
    - Any blockers or notes for next iteration
    Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration.\
    6. Make a git commit of that feature. \
    ONLY WORK ON A SINGLE FEATURE. \
    After completing your feature, check if every item in the PRD now has 'passes': true. If so, output <promise>COMPLETE</promise>. If any items still have 'passes': false, do not output that marker. \
    IMPORTANT: Never type <promise>COMPLETE</promise> anywhere in your response unless ALL PRD items have 'passes': true. Do not quote it, reference it, or explain why you are not outputting it.
    ") || true

    echo "$result"

    if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
        echo "PRD complete, exiting."
        ./plans/notify.sh "Ralph is finished"
        exit 0
    fi

    if [[ "$result" == *"<auth-required/>"* ]]; then
        echo "Auth required for Playwright. Run: bun run scripts/export-auth.ts"
        ./plans/notify.sh "Ralph needs auth - run export-auth.ts"
        exit 1
    fi

    if [[ "$result" == *"You've hit your limit"* ]]; then
        echo "Rate limit hit, waiting 1 hour..."
        ./plans/notify.sh "Ralph hit rate limit, waiting 1 hour"
        sleep 3600
    fi
done

./plans/notify.sh "Ralph ran out of iterations"
