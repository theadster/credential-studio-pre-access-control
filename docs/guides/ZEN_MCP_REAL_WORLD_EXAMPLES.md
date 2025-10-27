# Zen MCP Server - Real World Examples

A practical guide to using the Zen MCP server for common development scenarios in CredentialStudio.

## Table of Contents

1. [Quick Collaboration with Chat](#1-quick-collaboration-with-chat)
2. [Debugging Production Issues](#2-debugging-production-issues)
3. [Code Review Before Merge](#3-code-review-before-merge)
4. [Architecture Analysis](#4-architecture-analysis)
5. [Refactoring Legacy Code](#5-refactoring-legacy-code)
6. [Security Audit](#6-security-audit)
7. [Test Generation](#7-test-generation)
8. [Pre-commit Validation](#8-pre-commit-validation)
9. [Complex Planning](#9-complex-planning)
10. [Multi-Model Consensus](#10-multi-model-consensus)

---

## 1. Quick Collaboration with Chat

### Scenario: Deciding on a New Feature Approach

**When to use:** You need quick architectural advice or want to brainstorm implementation strategies.

**Example:**

```
User: "Use Zen Chat to help me decide how to implement real-time notifications 
for when attendees are checked in at an event."

Kiro invokes:
- Tool: mcp_zen_chat
- Model: anthropic/claude-sonnet-4.5
- Prompt: "I'm building an event credential management system using Next.js 15 
  and Appwrite. We need real-time notifications when attendees check in. 
  
  Current stack:
  - Frontend: Next.js with React 19
  - Backend: Appwrite (has Realtime subscriptions)
  - Database: Appwrite Database
  
  Options I'm considering:
  1. Appwrite Realtime subscriptions
  2. Server-Sent Events (SSE)
  3. WebSockets
  4. Polling
  
  Which approach would you recommend and why? Consider scalability for 
  events with 500+ attendees."
```

**What you get:**
- Detailed comparison of approaches
- Pros/cons for your specific stack
- Code examples
- Performance considerations
- Implementation recommendations

**Follow-up conversation:**
```
User: "Continue with the same Zen conversation - what about offline support?"

Kiro uses the continuation_id to maintain context and asks about:
- Offline queue strategies
- Sync mechanisms
- Conflict resolution
```

---

## 2. Debugging Production Issues

### Scenario: Users Report Intermittent Photo Upload Failures

**When to use:** Complex bugs that require systematic investigation.

**Example:**

```
User: "Use Zen Debug to investigate why photo uploads sometimes fail silently"

Kiro invokes:
- Tool: mcp_zen_debug
- Step 1: Initial investigation
  - Hypothesis: "Might be Cloudinary rate limiting or timeout issues"
  - Files to check: Photo upload API routes, Cloudinary integration
  - Next steps: Examine error handling, check logs

After examining code:
- Step 2: Evidence gathering
  - Findings: "Found missing error handling in bulk upload endpoint"
  - Files checked: /src/pages/api/attendees/[id]/photo.ts
  - Confidence: medium → high
  
- Step 3: Root cause identified
  - Issue: Promise.all() fails entire batch if one upload fails
  - Solution: Use Promise.allSettled() instead
  - Confidence: very_high
```

**What you get:**
- Systematic investigation process
- Hypothesis testing
- Root cause analysis
- Recommended fixes
- Confidence levels at each step

---

## 3. Code Review Before Merge

### Scenario: Reviewing a New Custom Fields Feature

**When to use:** Before merging significant changes, especially security-sensitive code.

**Example:**

```
User: "Use Zen CodeReview to review the custom fields API implementation"

Kiro invokes:
- Tool: mcp_zen_codereview
- Review type: full
- Files: /src/pages/api/custom-fields/**
- Focus: security, performance, quality, architecture

Step 1: Review strategy
- Check input validation
- Verify RBAC integration
- Assess database query efficiency
- Review error handling

Step 2: Findings
- ✅ Good: Proper Zod validation
- ⚠️ Medium: Missing rate limiting on bulk operations
- ❌ High: SQL injection risk in dynamic field queries
- ✅ Good: Comprehensive error handling
```

**What you get:**
- Severity-rated issues (critical/high/medium/low)
- Security vulnerabilities
- Performance bottlenecks
- Code quality issues
- Architecture concerns
- Actionable recommendations

---

## 4. Architecture Analysis

### Scenario: Understanding the Authentication Flow

**When to use:** Onboarding new developers, planning refactors, or documenting systems.

**Example:**

```
User: "Use Zen Analyze to map out our entire authentication and authorization system"

Kiro invokes:
- Tool: mcp_zen_analyze
- Analysis type: architecture
- Files: /src/lib/permissions.ts, /src/contexts/AuthContext.tsx, 
        /src/pages/api/auth/**

Step 1: Architecture mapping
- Identify components: AuthContext, Appwrite Auth, Permission system
- Map data flow: Login → Token → Session → RBAC checks
- Document patterns: Context API for state, middleware for API protection

Step 2: Assessment
- Strengths: Clear separation of concerns, type-safe permissions
- Concerns: No token refresh mechanism, missing MFA support
- Opportunities: Could add OAuth providers, implement session management
```

**What you get:**
- Component relationship diagrams
- Data flow documentation
- Pattern identification
- Strengths and weaknesses
- Improvement opportunities
- Technical debt assessment

---

## 5. Refactoring Legacy Code

### Scenario: Modernizing the Attendee Management Module

**When to use:** Planning refactors, identifying code smells, modernizing old code.

**Example:**

```
User: "Use Zen Refactor to analyze the attendee CRUD operations for improvement opportunities"

Kiro invokes:
- Tool: mcp_zen_refactor
- Refactor type: codesmells
- Files: /src/pages/api/attendees/**
- Focus: decomposition, modernization

Findings:
- Code Smell: 500-line API route with mixed concerns
  - Severity: high
  - Recommendation: Extract validation, business logic, and data access layers
  
- Modernization: Using old fetch patterns
  - Severity: medium
  - Recommendation: Migrate to React Query for caching and state management
  
- Decomposition: Duplicate validation logic across routes
  - Severity: medium
  - Recommendation: Create shared validation schemas with Zod
```

**What you get:**
- Code smell identification
- Refactoring opportunities
- Modernization suggestions
- Decomposition strategies
- Priority-ranked improvements

---

## 6. Security Audit

### Scenario: Pre-Launch Security Review

**When to use:** Before production deployment, after security incidents, or periodic audits.

**Example:**

```
User: "Use Zen Secaudit to perform a comprehensive security audit of our API routes"

Kiro invokes:
- Tool: mcp_zen_secaudit
- Audit focus: comprehensive
- Threat level: high (handles PII and event credentials)
- Compliance: GDPR considerations
- Files: /src/pages/api/**

Step 1: OWASP Top 10 Analysis
- ✅ SQL Injection: Protected (using Appwrite ORM)
- ❌ Broken Authentication: Missing rate limiting on login
- ⚠️ Sensitive Data Exposure: Logs contain email addresses
- ❌ XML External Entities: Not applicable
- ✅ Broken Access Control: RBAC properly implemented
- ⚠️ Security Misconfiguration: CORS too permissive
- ✅ XSS: React escapes by default
- ❌ Insecure Deserialization: JSON.parse without validation
- ✅ Using Components with Known Vulnerabilities: Dependencies up to date
- ⚠️ Insufficient Logging: No failed login attempt tracking

Step 2: Compliance Check
- GDPR: Missing data retention policies
- GDPR: No user data export functionality
- GDPR: Proper consent mechanisms needed
```

**What you get:**
- OWASP Top 10 assessment
- Compliance gap analysis
- Vulnerability severity ratings
- Specific code locations
- Remediation recommendations
- Security best practices

---

## 7. Test Generation

### Scenario: Adding Tests for New Barcode Generation Feature

**When to use:** Creating comprehensive test suites for new or untested code.

**Example:**

```
User: "Use Zen Testgen to create tests for the barcode generation logic"

Kiro invokes:
- Tool: mcp_zen_testgen
- Files: /src/lib/barcodeGenerator.ts
- Test framework: Vitest (detected from project)

Step 1: Analysis
- Identify functions: generateBarcode(), validateBarcodeUniqueness()
- Critical paths: Uniqueness checking, format validation
- Edge cases: Max length, special characters, collision handling
- Error scenarios: Database failures, invalid formats

Step 2: Test plan
- Unit tests for generateBarcode()
  - Happy path: Valid numerical/alphanumerical codes
  - Edge cases: Minimum/maximum length, boundary conditions
  - Error cases: Invalid format, length out of range
  
- Integration tests for validateBarcodeUniqueness()
  - Database queries work correctly
  - Handles race conditions
  - Performance with large datasets
```

**What you get:**
- Comprehensive test plan
- Test case generation
- Edge case identification
- Mock/stub recommendations
- Coverage analysis
- Framework-specific code

---

## 8. Pre-commit Validation

### Scenario: Validating Changes Before Committing

**When to use:** Before committing significant changes, especially to critical paths.

**Example:**

```
User: "Use Zen Precommit to validate my changes to the authentication system"

Kiro invokes:
- Tool: mcp_zen_precommit
- Path: /Users/user/credentialstudio
- Include staged: true
- Include unstaged: true

Step 1: Change analysis
- Files modified: 
  - src/lib/permissions.ts (added new permission)
  - src/pages/api/auth/login.ts (added rate limiting)
  - src/components/RoleForm.tsx (UI for new permission)

Step 2: Impact assessment
- ✅ Tests updated: Yes (added permission tests)
- ⚠️ Documentation: Missing - new permission not documented
- ✅ Breaking changes: None
- ⚠️ Security: Rate limiting config should be environment variable
- ✅ Type safety: All TypeScript checks pass

Step 3: Recommendations
- Add documentation for new permission in README
- Move rate limit config to .env
- Consider adding integration test for rate limiting
```

**What you get:**
- Git diff analysis
- Breaking change detection
- Test coverage validation
- Security review
- Documentation gaps
- Commit readiness assessment

---

## 9. Complex Planning

### Scenario: Planning a Multi-Tenant Feature

**When to use:** Complex features requiring detailed planning and task breakdown.

**Example:**

```
User: "Use Zen Planner to create a plan for adding multi-tenant support"

Kiro invokes:
- Tool: mcp_zen_planner
- Initial scope: Add organization/tenant isolation to all data

Step 1: Problem definition
- Current state: Single-tenant application
- Goal: Support multiple organizations with data isolation
- Constraints: Maintain backward compatibility, minimal downtime

Step 2: Approach exploration
- Option A: Tenant ID in all tables (simpler, less isolation)
- Option B: Separate databases per tenant (complex, better isolation)
- Option C: Schema-based isolation (middle ground)
- Recommendation: Option A with row-level security

Step 3: Task breakdown
- Phase 1: Database schema changes
  - Add tenant_id to all tables
  - Create tenant management tables
  - Add foreign key constraints
  
- Phase 2: API layer changes
  - Add tenant context middleware
  - Update all queries with tenant filter
  - Add tenant switching for super admins
  
- Phase 3: UI changes
  - Tenant selector component
  - Update all forms with tenant context
  - Admin tenant management interface

Step 4: Risk assessment
- Data migration complexity: High
- Testing requirements: Extensive
- Rollback strategy: Feature flag + database backup
```

**What you get:**
- Structured planning process
- Multiple approach evaluation
- Detailed task breakdown
- Risk assessment
- Timeline estimation
- Dependency mapping

---

## 10. Multi-Model Consensus

### Scenario: Deciding on Database Migration Strategy

**When to use:** Critical decisions requiring multiple perspectives.

**Example:**

```
User: "Use Zen Consensus to decide whether we should migrate from Appwrite to Supabase"

Kiro invokes:
- Tool: mcp_zen_consensus
- Models: 
  - openai/gpt-5-pro (stance: for migration)
  - anthropic/claude-sonnet-4.5 (stance: against migration)
  - google/gemini-2.5-pro (stance: neutral)

Proposal: "Should we migrate from Appwrite to Supabase for our event 
credential management system? Consider: current Appwrite investment, 
team expertise, feature parity, migration cost, and long-term maintenance."

Model 1 (GPT-5 Pro - FOR):
- Supabase has better PostgreSQL ecosystem
- More mature auth system with better MFA support
- Larger community and more resources
- Better TypeScript support
- Cost: Migration would take 2-3 weeks

Model 2 (Claude Sonnet - AGAINST):
- Appwrite already working well
- Team familiar with current system
- Migration risk is high
- Appwrite Realtime is excellent
- Cost: Migration could introduce bugs

Model 3 (Gemini Pro - NEUTRAL):
- Both platforms are viable
- Decision should be based on specific pain points
- Consider: What problems are you trying to solve?
- Recommendation: Stay with Appwrite unless specific issues exist

Synthesis:
- Consensus: Don't migrate without clear problems
- If staying: Invest in Appwrite expertise
- If migrating: Plan 3-week migration with feature freeze
- Key factor: What specific issues are you facing?
```

**What you get:**
- Multiple expert perspectives
- Structured debate
- Pros and cons from different angles
- Synthesized recommendation
- Decision framework
- Risk assessment

---

## Best Practices

### 1. Choose the Right Tool

- **Chat**: Quick questions, brainstorming, design discussions
- **Debug**: Systematic bug investigation
- **CodeReview**: Pre-merge quality checks
- **Analyze**: Understanding architecture
- **Refactor**: Planning improvements
- **Secaudit**: Security assessments
- **Testgen**: Creating test suites
- **Precommit**: Validating changes
- **Planner**: Complex feature planning
- **Consensus**: Critical decisions

### 2. Use Continuation IDs

Always reuse continuation IDs to maintain context:

```
First call: Returns continuation_id: "abc-123"
Second call: Include continuation_id: "abc-123"
```

This preserves conversation history and findings.

### 3. Provide Context

Include relevant information:
- File paths (absolute paths)
- Current implementation details
- Constraints and requirements
- Tech stack specifics

### 4. Iterate Systematically

Don't skip steps:
- Let Debug guide investigation
- Let Analyze examine code before conclusions
- Let CodeReview complete all checks

### 5. Choose Appropriate Models

- **Fast responses**: `anthropic/claude-3.5-haiku`
- **Deep thinking**: `openai/gpt-5-pro`, `google/gemini-2.5-pro`
- **Code generation**: `openai/gpt-5-codex`
- **Balanced**: `anthropic/claude-sonnet-4.5`

---

## Common Workflows

### Workflow 1: Feature Development

1. **Plan** with Zen Planner
2. **Implement** the feature
3. **Test** with Zen Testgen
4. **Review** with Zen CodeReview
5. **Validate** with Zen Precommit
6. **Commit** changes

### Workflow 2: Bug Investigation

1. **Debug** with Zen Debug (systematic investigation)
2. **Analyze** with Zen Analyze (understand context)
3. **Fix** the issue
4. **Test** with Zen Testgen (prevent regression)
5. **Review** with Zen CodeReview (ensure quality)

### Workflow 3: Security Hardening

1. **Audit** with Zen Secaudit (find vulnerabilities)
2. **Analyze** with Zen Analyze (understand attack surface)
3. **Plan** fixes with Zen Planner
4. **Implement** security improvements
5. **Review** with Zen CodeReview (verify fixes)
6. **Audit** again with Zen Secaudit (confirm resolution)

### Workflow 4: Refactoring

1. **Analyze** with Zen Analyze (understand current state)
2. **Refactor** with Zen Refactor (identify opportunities)
3. **Plan** with Zen Planner (break down work)
4. **Implement** improvements
5. **Test** with Zen Testgen (ensure no regressions)
6. **Review** with Zen CodeReview (validate improvements)

---

## Troubleshooting

### Issue: "Model not available"

**Solution:** Use `mcp_zen_listmodels` to see available models, then use the exact name:

```
Available: google/gemini-2.5-pro
Use: google/gemini-2.5-pro (not gemini-2.5-pro)
```

### Issue: "Working directory doesn't exist"

**Solution:** Use absolute paths from your actual workspace:

```bash
pwd  # Get current directory
# Use that path in working_directory_absolute_path
```

### Issue: "Validation error - missing required field"

**Solution:** Check tool requirements:
- Analyze needs `relevant_files` in step 1
- Debug needs `hypothesis` and `findings`
- All tools need `step`, `step_number`, `total_steps`, `next_step_required`

### Issue: Tool asks me to investigate first

**Solution:** This is intentional! Tools guide you to:
1. Examine code with file reading tools
2. Gather evidence
3. Then continue with next step

Don't skip the investigation phase.

---

## Quick Reference

| Tool | Primary Use | Typical Steps | Model Recommendation |
|------|-------------|---------------|---------------------|
| Chat | Quick advice | 1 | claude-3.5-haiku |
| Debug | Bug investigation | 2-4 | gpt-5-pro |
| CodeReview | Quality review | 2 | gpt-5-pro |
| Analyze | Architecture | 2-3 | gemini-2.5-pro |
| Refactor | Improvement planning | 2-3 | gpt-5-codex |
| Secaudit | Security audit | 3-4 | gpt-5-pro |
| Testgen | Test creation | 2-3 | gpt-5-codex |
| Precommit | Change validation | 2-3 | claude-sonnet-4.5 |
| Planner | Feature planning | 3-5 | gpt-5-pro |
| Consensus | Decision making | 3+ | multiple models |

---

## Conclusion

The Zen MCP server provides powerful tools for systematic development workflows. Key principles:

1. **Choose the right tool** for your task
2. **Provide context** with file paths and details
3. **Follow the process** - don't skip investigation steps
4. **Use continuations** to maintain conversation context
5. **Iterate systematically** through multi-step workflows

Start with Chat for quick questions, then graduate to specialized tools as needs become more complex.

Happy coding! 🚀
