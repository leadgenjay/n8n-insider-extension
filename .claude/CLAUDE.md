# Jay's Claude Code Preferences

## My Development Workflow
1. **Brainstorm**: Use `/brainstorm` to explore ideas
2. **Plan**: Create PRD.md with `/prd` command
3. **Review**: Review plan with `/review`
4. **Execute**: Implement with `/execute`
5. **Code Review**: Final review with `/code-review`

## My Typical Architecture
- **Frontend**: Next.js on Vercel (UI + auth-protected pages)
- **Backend**: Supabase (Auth + Postgres + Storage)
- **Workflows**: n8n (backend brain for automations)

## Data Flow Pattern
- App → Supabase: Direct CRUD operations + authentication
- App → n8n: Webhooks/endpoints for actions (emails, invoices, jobs)

## Tech Stack Preferences
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Supabase JS Client
- Tailwind CSS
- n8n for workflow automation

## Code Conventions
- Use Server Components by default
- Client Components only when needed (interactivity)
- Supabase Row Level Security (RLS) for data protection
- Environment variables in `.env.local`

## Commands Reference
| Command | Purpose |
|---------|---------|
| `/brainstorm <topic>` | Explore ideas and approaches |
| `/prd <feature>` | Create Product Requirements Document |
| `/review <file>` | Review plan or code |
| `/execute <plan>` | Implement plan with subagent |
| `/code-review <path>` | Comprehensive code review |
| `/generate-tests <path>` | Generate test suites |
| `/design-database-schema` | Design database schemas |
