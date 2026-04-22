# How to Push to This Repo from Any Manus Session

At the end of any Manus session, run these commands to push all built files here:

```bash
# 1. Clone the archive repo
git clone https://github.com/tywade1980/manus-master-archive.git
cd manus-master-archive

# 2. Copy your files into the appropriate folder:
#    skills/        → Manus skill files
#    webapps/       → Full webapp builds
#    scripts/       → Scripts and automation
#    systems/       → Full system architectures
#    agents/        → Agent configs and prompts
#    configs/       → Config and JSON state files
#    data/          → Data exports and reports
#    misc/          → Everything else

# 3. Commit and push
git add -A
git commit -m "Session dump: [describe what was built]"
git push origin main
```

## Tell Manus This at the End of Every Session:
> "Push everything you built this session to tywade1980/manus-master-archive"

---
*This repo is the single source of truth for all Manus-built assets for Wade.*
