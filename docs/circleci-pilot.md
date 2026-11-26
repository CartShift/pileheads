# CircleCI fallback

The primary CI is GitHub Actions on Blacksmith. CircleCI is optional. Connect `CartShift/pileheads`, disable automatic triggers as appropriate, and trigger a pipeline on the intended commit with `run_fallback=true`. Default `full_acceptance=false` runs fast checks; true runs full core and React browser acceptance instead. Both use the commands in [CI.md](CI.md). Verify actual credits, test results and GitHub check reporting before considering cutover. No CircleCI execution has been verified yet. Keep deployment on the existing Render workflow.
