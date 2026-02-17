/**
 * Fuzzy issue resolution — resolve mixed references (numbers, URLs, title fragments)
 * to actual issues.
 *
 * When a text query doesn't find an exact match, searches for similar issues
 * and picks the best match.
 *
 * @internal
 */

import { NotFoundError } from "../errors.js";
import * as issueOps from "../operations/issues.js";
import type { GitHubIssue, ResolvedIssue } from "../types.js";

/** A single reference to an issue — can be a number, URL, or text query. */
export type IssueRef = number | string;

/**
 * Resolve a list of mixed issue references to actual issues.
 *
 * Each reference can be:
 * - A number (e.g. `142`) → direct lookup by issue number
 * - A string starting with `#` (e.g. `"#142"`) → direct lookup by number
 * - A URL (e.g. `"https://github.com/owner/repo/issues/142"`) → extract number, direct lookup
 * - A text query (e.g. `"rate limiting endpoint"`) → search, pick best match
 *
 * For text queries, if no exact match is found, searches for similar issues
 * and logs what it matched. Throws if nothing similar is found.
 */
export async function resolveIssues(
  owner: string,
  repo: string,
  refs: IssueRef[],
): Promise<ResolvedIssue[]> {
  const results: ResolvedIssue[] = [];

  for (const ref of refs) {
    const resolved = await resolveOne(owner, repo, ref);
    results.push(resolved);
  }

  return results;
}

async function resolveOne(
  owner: string,
  repo: string,
  ref: IssueRef,
): Promise<ResolvedIssue> {
  // Number → direct lookup
  if (typeof ref === "number") {
    const issue = await issueOps.getIssue(owner, repo, ref);
    return issue;
  }

  // String starting with # → parse number
  if (ref.startsWith("#")) {
    const num = Number.parseInt(ref.slice(1), 10);
    if (Number.isNaN(num)) {
      throw new NotFoundError("issue", ref);
    }
    const issue = await issueOps.getIssue(owner, repo, num);
    return issue;
  }

  // URL → extract number
  const urlMatch = ref.match(/\/issues\/(\d+)/);
  if (urlMatch?.[1]) {
    const num = Number.parseInt(urlMatch[1], 10);
    const issue = await issueOps.getIssue(owner, repo, num);
    return issue;
  }

  // Numeric string → direct lookup
  const maybeNum = Number.parseInt(ref, 10);
  if (!Number.isNaN(maybeNum) && String(maybeNum) === ref.trim()) {
    const issue = await issueOps.getIssue(owner, repo, maybeNum);
    return issue;
  }

  // Text query → search
  return searchAndMatch(owner, repo, ref);
}

/**
 * Search for issues matching a text query and pick the best match.
 *
 * Tries the GitHub search API first. If results come back, picks the
 * best match by title similarity. Logs what it matched.
 */
async function searchAndMatch(
  owner: string,
  repo: string,
  query: string,
): Promise<ResolvedIssue> {
  const results = await issueOps.searchIssues(owner, repo, query, { limit: 10 });

  if (results.length === 0) {
    // Try a broader search with individual words
    const words = query.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 1) {
      const broader = await issueOps.searchIssues(owner, repo, words.join(" OR "), {
        limit: 10,
      });
      if (broader.length > 0) {
        return pickBestMatch(broader, query);
      }
    }

    throw new NotFoundError(
      "issue",
      `No issues found matching "${query}" in ${owner}/${repo}`,
    );
  }

  return pickBestMatch(results, query);
}

/**
 * Pick the best match from search results using title similarity.
 *
 * Uses a simple word-overlap score — counts how many words from the query
 * appear in the issue title.
 */
function pickBestMatch(
  candidates: GitHubIssue[],
  query: string,
): ResolvedIssue {
  const queryWords = new Set(
    query.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
  );

  let bestScore = -1;
  let bestIssue = candidates[0]!;

  for (const issue of candidates) {
    const titleWords = issue.title.toLowerCase().split(/\s+/);
    let score = 0;

    for (const word of titleWords) {
      if (queryWords.has(word)) {
        score += 2; // Exact word match
      } else {
        // Partial match — query word is substring of title word or vice versa
        for (const qw of queryWords) {
          if (word.includes(qw) || qw.includes(word)) {
            score += 1;
          }
        }
      }
    }

    // Normalize by max possible score
    const maxScore = queryWords.size * 2;
    const normalizedScore = maxScore > 0 ? score / maxScore : 0;

    if (normalizedScore > bestScore) {
      bestScore = normalizedScore;
      bestIssue = issue;
    }
  }

  // Log the match if it's not perfect
  if (bestScore < 1 && candidates.length > 1) {
    console.warn(`⚠ No exact match for "${query}". Similar issues:`);
    for (const c of candidates.slice(0, 3)) {
      console.warn(`  #${c.number}: ${c.title}`);
    }
    console.warn(`Using #${bestIssue.number} (best match).`);
  }

  return {
    ...bestIssue,
    matchedFrom: query,
    matchScore: Math.min(bestScore, 1),
  };
}
