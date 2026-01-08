set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <iterations>"
    exit 1
fi

for ((i=1; i<=$1; i++)); do
    echo "=== Iteration $i ==="
    echo "------------------------"
    result=$(docker sandbox run claude --dangerously-skip-permissions -p "@plans/prd.json @progress.txt \

    1. Find the highest-priority feature to work on and work only on that feature. \
    This should be the one YOU decide has the highest priority - not necessarily the first in the list.
    2. Check that the types check via bun typecheck, the lint passes with bun lint, and the tests pass via bun test. If any of these file, fix the issue before moving on. \
    3. (Optional) If you made UI changes, use the Playwright MCP to visually verify the changes are correct. \
    Navigate to the relevant page and take a snapshot to confirm the UI renders as expected. \
    4. Update the PRD with the work that was done. \
    5. After completing each task, append to progress.txt:
    - Task completed and PRD item reference
    - Key decisions made and reasoning
    - Files changed
    - Any blockers or notes for next iteration
    Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration.\
    6. Make a git commit of that feature. \
    ONLY WORK ON A SINGLE FEATURE. \
    If, while implementing the feature, you notice the PRD is complete, output <promise>COMPLETE</promise>
    ") || true

    echo "$result"

    if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
        echo "PRD complete, exiting."
        ./plans/notify.sh "Ralph is finished"
        exit 0
    fi
done

./plans/notify.sh "Ralph ran out of iterations"
