# Security Best Practices

This document outlines architectural and implementation standards to satisfy the OWASP Top 10 vulnerabilities list.

---

## 1. Input Validation & Output Encoding

- **Sanitize Inputs**: Validate all request parameters, path tokens, headers, and request bodies at the entrance layer.
- **Output Encoding**: Encode any data outputted to the browser/client to avoid Cross-Site Scripting (XSS) injections.
- **No SQL Injection**: Always utilize parameterized queries via Prisma client. Never write raw string concatenation queries inside database blocks.

---

## 2. API Protection

Our backend must implement:

- **Helmet**: Set secure HTTP response headers via `@fastify/helmet` to block clickjacking, MIME sniffing, and script sources.
- **CORS**: Configure strict Cross-Origin Resource Sharing rules. Avoid open wildcards (`*`) in production configurations.
- **Rate Limiting**: Protect endpoints against abuse and brute force by applying rate limiting rules to both public and authenticated APIs.

---

## 3. Secret Management

- **No Plaintext Credentials**: Never commit API keys, database connection strings, passwords, or JWT secrets to the repository.
- **Environment Variables**: Configure secrets solely via environment files (`.env` locally) and access them using typed configurations.
- **Password Hashing**: Use secure hashing algorithms (such as Argon2 or Bcrypt) to hash credentials before storage. Never store plaintext credentials.
- **Cookie Security**: If using cookies for session/authentication management, declare them with `HttpOnly`, `Secure`, and `SameSite` options.
- **Least Privilege**: Configure database access users with only the permissions required to run the application queries.
