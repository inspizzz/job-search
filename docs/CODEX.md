# Using this workspace with Codex

Open this repository in Codex, or launch the CLI from its root:

```bash
cd "/path/to/job-search"  # use your own checkout path
codex
```

The root `AGENTS.md` loads the existing `CLAUDE.md` rules and translates the
Claude-specific tool names. Ten workflow skills in `.agents/skills/` reuse the
procedures in `.claude/`; the seven existing portal CLI skills work in both
assistants. Keep those directories together when copying the workspace.

Codex reads project instructions at session start. Start a fresh session after
adding `AGENTS.md`; if new skills do not appear, restart Codex. See the official
[project instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
and [local skill discovery](https://learn.chatgpt.com/docs/build-skills) documentation.

## Commands

Type these in the Codex conversation, **not in your shell**. Text after the skill
name supplies the workflow arguments. Natural-language requests also work.

| Claude Code | Codex | Purpose |
| --- | --- | --- |
| `/profile --list` | `$job-profile --list` | Show the candidate roster |
| `/profile my-profile` | `$job-profile my-profile` | Select an existing local profile |
| `/profile --new my-profile` | `$job-profile --new my-profile` | Create a local profile from the blank scaffold |
| `/setup` | `$job-setup` | Import documents, import a CV, or interview |
| `/setup --section search` | `$job-setup --section search` | Update only search preferences |
| `/scrape` | `$job-scraper` | Find new matching jobs |
| `/scrape broad` | `$job-scraper broad` | Search all configured categories |
| `/apply <URL or text>` | `$job-apply <URL or text>` | Evaluate and prepare an application |
| `/expand` | `$job-expand` | Propose source-backed profile additions |
| `/upskill` | `$job-upskill` | Learning plan from tracked jobs |
| `/upskill <URL>` | `$job-upskill <URL>` | Learning plan for one posting |
| `/add-template` | `$job-add-template` | Register a custom LaTeX template |
| `/add-portal` | `$job-add-portal` | Develop a portal search CLI |
| `/reset profile` | `$job-reset profile` | Preview a profile reset, then require `RESET` |

`$job-application-assistant` handles individual fit assessments, CVs, letters,
interview preparation, and career advice. The full `$job-apply` workflow adds
review, revision, compilation, and PDF verification.

Create a local profile with `$job-profile --new my-profile` before onboarding.
Real profiles are ignored by Git; the tracked `profiles/example/` is a blank
template and must never become an active person. Available people are discovered
from local manifests. A request naming a person selects that profile; otherwise
establish the active profile before accessing candidate data. Development work
needs no profile, and there is no persisted last-used profile.

## Configuration and prerequisites

`.codex/config.toml` sets only `web_search = "live"` because job openings and
company information change. Codex loads project configuration in trusted projects;
see [configuration basics](https://learn.chatgpt.com/docs/config-file/config-basic).
If your client does not load that setting, `codex --search` requests live search
for the CLI session. Your existing model, login, sandbox, and approval settings
remain in effect. Claude permission strings do not configure Codex permissions.

The tools are the same as for Claude Code: Bun for portal CLIs, Python for the
optional salary tool, LuaLaTeX for the stock CV, and XeLaTeX for the stock letter.
For visual PDF verification, install Poppler (`pdfinfo`, `pdftoppm`, `pdftotext`)
unless the Codex client already provides a PDF renderer. Codex can render every
page to images and inspect them; extracting text alone does not verify layout.
Missing compilation or visual inspection is reported as incomplete work.

Check local prerequisites without searching for jobs or reading profiles:

```bash
codex --version
bun --version
python3 --version
lualatex --version
xelatex --version
pdfinfo -v
pdftoppm -v
pdftotext -v
bun run .agents/skills/linkedin-search/cli/src/cli.ts search --help
```

See [SETUP.md](../SETUP.md) for installation and portal credentials. Adzuna uses
`ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in the existing local `.env`; do not put keys
in skills or Codex configuration. A CLI still needs network permission under
the current Codex sandbox. Report an unavailable source accurately and use
available web search when appropriate.

## How the existing workflow maps to Codex

- **Instructions:** `AGENTS.md` supplies Codex adaptations; `CLAUDE.md` remains
  the shared source for profile routing and the verification checklist.
- **Commands and skills:** thin Codex adapters link to all seven Claude commands
  and all three Claude workflow skills. Changes to those source procedures carry
  through without copying their full text.
- **Review:** `$job-apply` uses a Codex reviewer subagent when the runtime supports
  and permits it. Otherwise it labels a separate self-review; it does not claim
  an independent review occurred.
- **Research agent:** `.claude/agents/gemini-research-expert.md` is optional.
  Codex uses native web research by default. Gemini is needed only if explicitly
  requested, installed, and authenticated.
- **Permissions:** `.claude/settings.json` continues to serve Claude Code.
  Codex uses its own session permissions; no broad execution allowlist is added.
- **Candidate data:** onboarding stores personal statements and style notes
  inside the active profile. Shared guides contain formatting rules. Existing
  Claude Code experience remains a candidate fact; running Codex does not
  automatically add Codex experience to a CV.
- **Templates:** active template overrides take precedence over stock format,
  compiler, and page-count rules in both adapters. Template activation is shared
  across profiles, as in the existing Claude workflow.

## Maintaining both assistants

Edit shared workflow behavior in `.claude/commands/` or `.claude/skills/` and
update the corresponding adapter only when Codex needs a different tool or
invocation. Keep core workspace requirements in `CLAUDE.md`. New Codex adapters
need `name` and `description` YAML frontmatter and links to existing source files.

The adapters deliberately use names such as `job-setup` and `job-reset` so normal
software setup or git work does not select candidate-data workflows. Listing
portal integrations filters for skills with a CLI and `url-reference.md`, since
`.agents/skills/` now also contains workflow entry points.

After changing an adapter, check that Codex discovers it, its workflow and shared
reference links resolve, and a simple read-only invocation routes correctly.
Live job searches and application generation additionally require network access,
the active person's information, and successful document verification.
