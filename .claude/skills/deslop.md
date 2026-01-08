---
name: deslop
description: Remove AI-generated code slop from a branch. Use when cleaning up AI-generated code, removing unnecessary comments, defensive checks, or type casts. Checks diff against main and fixes style inconsistencies.
---

# Remove AI Code Slop

Check the diff against main and remove all AI-generated slop introduced in this branch.

## What to Remove

- Extra comments that a human wouldn't add or are inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks that are abnormal for that area of the codebase (especially if called by trusted/validated codepaths)
- Casts to `any` or `unknown` to get around type issues (fix the types properly instead)
- Inline imports in TypeScript (move to top of file with other imports)
- Unnecessary null checks when TypeScript already guarantees the value exists
- Over-engineered error handling for simple operations
- Verbose JSDoc comments where the code is self-explanatory
- Console.log statements left from debugging
- Any other style that is inconsistent with the file

## Process

1. Get the diff against main: `git diff main...HEAD`
2. Review each changed file for slop patterns
3. Remove identified slop while preserving legitimate changes
4. Ensure code still passes lint and type checks: `npm run lint && npm run build`
5. Report a 1-3 sentence summary of what was changed
