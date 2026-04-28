# Terraform AWS Account Setup Wizard

A browser-based tool that generates production-ready Terraform configuration files for AWS account setup — no Terraform experience required. Fill out a guided form, click **Generate Terraform Files**, and receive a complete, commented set of `.tf` files ready to hand off to your cloud or DevOps team.

---

## How It Works

The wizard walks you through five steps:

1. **Account** — Project name, primary region, environments (dev, staging, prod, etc.), default tagging strategy, and CI/CD platform
2. **Backend** — State backend type (S3 only, S3 + DynamoDB locking, or Terraform Cloud), with fields for bucket names, lock tables, or TFC org/workspace as appropriate
3. **Providers** — AWS provider version constraints and authentication method (IAM role assumption, environment variables, named profile, or OIDC)
4. **Security** — Security guardrails such as MFA requirements, IP restrictions, and password policy options
5. **Review** — A summary of all selected options before generation

On submit, the configuration is sent to the Anthropic API via a secure server-side proxy. The generated output is a set of named `.tf` files (`main.tf`, `versions.tf`, `backend.tf`, `providers.tf`, and others as applicable), each displayed in a syntax-highlighted panel with a one-click copy button. A zip file download link is also provided. 

---

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier is sufficient)
- An [Anthropic API key](https://console.anthropic.com/)
- [Node.js](https://nodejs.org/) installed locally
- [Git](https://git-scm.com/) installed locally

---

## Deploying to Vercel

### 1. Clone and prepare

```bash
git clone <your-repo-url>
cd <repo-directory>
```

### 2. Deploy

```bash
npm install -g vercel
vercel deploy --prod
```

### 3. Set the API key environment variable

The serverless function at `api/generate.js` requires `ANTHROPIC_API_KEY` to be set. Add it via the Vercel CLI:

```bash
vercel env add ANTHROPIC_API_KEY
```

Or in the Vercel dashboard: **Project → Settings → Environment Variables**.

The key is never exposed to the browser — all Anthropic API calls are proxied through the serverless function.

---

## Project Structure

```
.
├── terraform-setup-wizard.html   # Single-page frontend (no build step)
├── api/
│   └── generate.js               # Vercel serverless function — Anthropic API proxy
└── vercel.json                   # Routing config
```

---

## Security Notes

- **API key isolation** — `ANTHROPIC_API_KEY` lives only in Vercel's environment; the browser never sees it.
- **IP restriction** — To limit access to your corporate network or VPN, add an IP allowlist in your Vercel project settings or via a middleware function.
- **Rate limiting** — Vercel's Edge Middleware can be used to add per-IP rate limiting if you want to cap API usage for internal deployments.

---

## Generated Output

The wizard produces a multi-file Terraform layout following AWS best practices:

| File | Contents |
|---|---|
| `versions.tf` | `required_providers` block with source and version constraints |
| `backend.tf` | Partial backend config (key only; real values go in per-env backend config files) |
| `security.tf` | Security options when configured |
| `main.tf` | Core resources and `for_each` where appropriate |

All files include inline comments explaining each block so your team can review and modify them before applying.
