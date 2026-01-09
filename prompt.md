@plans/prd.json @progress.txt \

1. Find the highest-priority feature to work on and work only on that feature. \
   This should be the one YOU decide has the highest priority - not necessarily the first in the list.
2. Check that the type check via bun typecheck, lint passes via bun lint, unit tests pass via bun run test, and e2e tests pass via bun test:e2e. \
3. (Optional) If you made UI changes, use the Playwright MCP to visually verify the changes are correct. \
   Navigate to the relevant page and take a snapshot to confirm the UI renders as expected. \
4. Update the PRD with the work that was done. \
5. Append your progress to the progress.txt file. \
   Use this to leave a note for the next person working in the codebase. \
6. Make a git commit of that feature. \
   ONLY WORK ON A SINGLE FEATURE. \
   If, while implementing the feature, you notice the PRD is complete, output <promise>COMPLETE</promise>
