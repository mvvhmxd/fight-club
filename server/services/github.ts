/**
 * GitHub repository verification service.
 * Validates that a submitted GitHub URL points to a public repo with at least one commit.
 */

interface VerificationResult {
  valid: boolean;
  error?: string;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.replace(/^\//, "").replace(/\/$/, "").split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export async function verifyGitHubRepository(url: string): Promise<VerificationResult> {
  if (!url || !url.trim()) return { valid: false, error: "GitHub URL is required" };

  const parsed = parseGitHubUrl(url.trim());
  if (!parsed) return { valid: false, error: "Invalid GitHub URL. Must be https://github.com/owner/repo" };

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "FightClub-App",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers });

    if (repoRes.status === 404) return { valid: false, error: "Repository not found. Make sure it exists and is public." };
    if (repoRes.status === 403) return { valid: false, error: "GitHub API rate limit reached. Try again later." };
    if (!repoRes.ok) return { valid: false, error: `GitHub API error: ${repoRes.status}` };

    const repo = await repoRes.json() as { private: boolean; size: number };
    if (repo.private) return { valid: false, error: "Repository must be public." };

    // Check for at least one commit
    const commitsRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=1`,
      { headers }
    );
    if (!commitsRes.ok) return { valid: false, error: "Could not verify repository commits." };
    const commits = await commitsRes.json() as unknown[];
    if (!Array.isArray(commits) || commits.length === 0) {
      return { valid: false, error: "Repository must have at least one commit." };
    }

    return { valid: true };
  } catch (err) {
    console.error("[GitHub] Verification error:", err);
    return { valid: false, error: "Failed to reach GitHub API. Check your internet connection." };
  }
}
