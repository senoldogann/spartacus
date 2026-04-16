# Incident Response

## Severity Levels

| Level         | Description                                         | Response Time |
| ------------- | --------------------------------------------------- | ------------- |
| P1 - Critical | Security breach, data loss, complete service outage | Immediate     |
| P2 - High     | Benchmark runs producing incorrect results          | < 4 hours     |
| P3 - Medium   | Performance degradation, non-blocking bugs          | < 24 hours    |
| P4 - Low      | UI issues, documentation gaps                       | Next sprint   |

## Security Incidents

1. **Identify**: Determine scope (sandbox escape, secret leak, unauthorized access)
2. **Contain**: Stop affected benchmark runs, rotate compromised credentials
3. **Investigate**: Review logs, artifact store, Docker events
4. **Remediate**: Patch vulnerability, update security controls
5. **Communicate**: Notify affected users per SECURITY.md disclosure policy

## Data Integrity Incidents

1. **Identify**: Which runs/tasks are affected
2. **Contain**: Mark affected runs as invalid
3. **Investigate**: Root cause in evaluator, sandbox, or storage layer
4. **Remediate**: Fix logic, re-run affected benchmarks
5. **Communicate**: Update benchmark reports with corrected data
