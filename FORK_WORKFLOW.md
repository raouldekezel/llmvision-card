# Fork Workflow

This repository is a personal fork of [valentinfrlch/llmvision-card](https://github.com/valentinfrlch/llmvision-card). It exists to carry local fixes and improvements that are not (or not yet) addressed upstream, while staying easy to resynchronize with upstream. The companion integration fork is [raouldekezel/ha-llmvision](https://github.com/raouldekezel/ha-llmvision), run under the same workflow.

## Branch model

| Branch | Role | Rules |
|--------|------|-------|
| `main` | Pristine mirror of upstream `main` | Never commit here directly. Updated exclusively by syncing from upstream. |
| `deploy` | `main` + local pull requests | The branch actually deployed at home. All local work lands here through pull requests. |

Rationale: keeping `main` strictly identical to upstream makes synchronization trivial (fast-forward only, no conflicts on `main` itself) and provides a clean base both for comparing local changes (`main...deploy`) and for preparing upstream contributions.

Making `deploy` the repository's default branch is recommended: new pull requests then target it by default (instead of GitHub proposing the upstream repository as base), and HACS — which installs from the default branch when a fork has no releases — picks up the deployed version directly.

## Development process

The process is the one proven on [NavimowHA](https://github.com/raouldekezel/NavimowHA) and [dolphin-robot](https://github.com/raouldekezel/dolphin-robot).

### Issues

- **Every change starts as an issue**, systematically — bug fix, feature, hardening, chore or investigation alike. Issues carry a typed identifier in the title, numbered per family and local to this repository: `BUG-NN`, `HARD-NN`, `FEAT-NN`, `CHORE-NN`, `SPIKE-NN`.
- **Titles and problem statements take the user's perspective.** The title describes the problem as the user experiences it, in plain words — never the root cause, the mechanism, or the fix. The body opens the same way: a plain-words description of the symptoms from the user's point of view; root cause and internals come after, in their own sections. (Chores and spikes, which have no user-facing symptom, describe their goal instead.)
- **The issue body is the normative source of truth.** Settled design, root cause, discarded alternatives and arbitrated decisions are folded into the body *in place*, with a dated edit trailer. Comments carry only dated session reports and reviews — never normative additions stacked over an outdated body.
- **An issue is closed only by the operator, and only after on-site validation** on the live Home Assistant dashboards. A merge never closes an issue. If validation fails or reveals a new pathology, the issue reopens or a new `BUG` is filed.

### Branches, pull requests, merges

- Work branches are named `patches/<id>-<slug>` (e.g. `patches/bug-01-timeline-rendering`) and fork off `deploy`.
- One pull request per issue, targeting `deploy` **in this fork**. Double-check the base repository and branch when opening the PR: GitHub tends to preselect the upstream repository.
- Reference issues with `refs #NN` — never `Closes`, since closing is an operator act tied to on-site validation, not to a merge.
- Review verdicts are posted as PR comments. Merge happens only on the operator's explicit "ok merge". Work PRs are **squash-merged** — squash is the only merge method enabled on this repository.
- Deployed states are tracked with `raoul.NN` tags; a release bundles one or two issues, validated on site before their issues close.

### Diagnostics

Diag sessions for the LLM Vision pair live in the **integration fork's** `docs/diag/` tree ([raouldekezel/ha-llmvision](https://github.com/raouldekezel/ha-llmvision/tree/deploy/docs/diag)) — card issues reference sessions there rather than duplicating the scaffolding. Card-side evidence (browser console excerpts, rendered-card screenshots with PII reviewed) joins the session directory like any other evidence file.

### Tests

Upstream ships no test suite for the card. The rules below bind from the day tests are introduced:

- **Tests are black-box**: they exercise public behavior and never read internal fields or implementation details.
- Regression tests are pinned and named after their issue id; pinned assertions are never edited or weakened without an explicit, reviewed justification.
- A test built on mocked scheduling or mocked rendering must prove that the asserted path actually executed; a green that never ran the path is a defect, not a pass.

## Syncing with upstream

1. Update `main` from upstream: use the **Sync fork** button while on the `main` branch page, or `gh repo sync raouldekezel/llmvision-card -b main`.
2. Merge `main` into `deploy` **as a local merge pushed directly to `deploy`** — never through a pull request. Squash is the only PR merge method enabled here, and squashing a sync PR would collapse the upstream commits into a single synthetic commit: `deploy` would no longer contain upstream's commit objects, and every subsequent sync would re-conflict on history already integrated. A true merge commit pushed by hand is unaffected — the merge-method restriction only governs the PR merge buttons.

   ```
   git fetch origin
   git checkout deploy
   git merge origin/main
   git push origin deploy
   ```

3. During the merge, resolve conflicts in favor of preserving local changes — unless upstream has properly fixed the underlying issue, in which case drop the now-redundant local patch instead of keeping both variants.

## Contributing back upstream

When a local fix is worth proposing upstream, create a dedicated branch **from `main`** (not from `deploy`) and cherry-pick only the relevant commits onto it, so the upstream pull request contains nothing but the intended change.

## Continuous integration

GitHub disables Actions by default on newly created forks; they must be enabled once from the **Actions** tab before anything runs. The single workflow inherited from upstream then triggers on pushes and pull requests:

- `validate.yaml` — HACS validation (category `plugin`) only; upstream ships no test workflow for the card. The HACS job checks repository metadata (description, topics, issues enabled) that forks do not inherit from upstream.

Policy on this fork: workflow files are deliberately kept identical to upstream (no local edits) so that syncing never conflicts on them. Instead, the repository metadata the HACS job depends on is maintained manually in the repository settings — issues enabled, upstream topics copied — so it stays green.

## Note on this file

`FORK_WORKFLOW.md` and this process section exist only on `deploy` (and branches derived from it), keeping `main` byte-identical to upstream.
