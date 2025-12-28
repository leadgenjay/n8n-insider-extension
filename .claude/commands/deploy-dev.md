---
description: Deploy project to Unraid server (zeus.local) for development with hot-reloading
allowed-tools: Bash
argument-hint: <project-name> <port>
---

# Deploy to Unraid Dev Server

Deploy **$1** to zeus.local on port **$2** for development.

## Steps

1. First, stop and remove any existing container with the same name:
```bash
ssh zeus.local "docker stop $1-dev 2>/dev/null; docker rm $1-dev 2>/dev/null"
```

2. Then launch the dev container with hot-reloading:
```bash
ssh zeus.local "docker run -d --name $1-dev -p $2:$2 \
  -v /mnt/user/data/GITHUB/$1:/app \
  -w /app \
  node:20-alpine sh -c 'npm install && npm run dev -- --host 0.0.0.0 --port $2'"
```

3. Show the container logs to confirm it's running:
```bash
ssh zeus.local "docker logs -f $1-dev" &
```

4. Report the access URL: `http://zeus.local:$2`

## Notes
- Project must exist at `/mnt/user/data/GITHUB/$1` on the Unraid server
- Uses Node 20 Alpine image
- Hot-reloading enabled via `--host 0.0.0.0`
- Container runs in detached mode (-d)

## Example Usage
```
/deploy-dev my-new-app 3000
/deploy-dev dashboard 3050
/deploy-dev landing-page 5173
```
