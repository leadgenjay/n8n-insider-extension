---
description: Stop a dev container running on Unraid server (zeus.local)
allowed-tools: Bash
argument-hint: <project-name>
---

# Stop Dev Server on Unraid

Stop the dev container for **$1** on zeus.local.

```bash
ssh zeus.local "docker stop $1-dev && docker rm $1-dev"
```

Confirm the container has been stopped.
