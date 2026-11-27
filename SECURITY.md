# Security policy

Please do not report potential vulnerabilities or credentials in public issues, discussions, pull requests, or workflow logs. Use GitHub's private vulnerability reporting feature when enabled. If it is unavailable, contact the repository owner privately.

Do not access other players' data, disrupt live games, generate load against production, or test outside systems without explicit permission. Use local or isolated test environments.

Maintainers: treat any confirmed committed secret as compromised. Revoke/rotate it with the provider before considering history remediation. Never publish raw scanner output. A clean scanner result is not proof that no secrets exist.

Security checks include dependency audits and a scan of fetched Git history. Before release, also verify hosting environment separation, branch protection, access controls and server-side authorization. Report suspected incidents privately.
