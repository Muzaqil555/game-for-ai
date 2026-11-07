# Security Policy

Only the `main` branch gets security fixes.

Please report security issues privately, not in a public issue: open the repository's **Security** tab and choose **Report a vulnerability**, or email mhesenli7@std.beu.edu.az with "game-for-ai security" in the subject. You will get a reply within 7 days.

Especially relevant: anything in the agents, skills or `tools/` scripts that could run untrusted code, leak secrets such as provider API keys used by `npm run delegate`, or load unpinned third-party scripts into the games.
