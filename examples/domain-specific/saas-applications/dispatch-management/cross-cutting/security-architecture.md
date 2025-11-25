# Security Architecture

## Security Philosophy

Security is not optional at any maturity level. The dispatch application handles sensitive operational data, and any breach could expose:
- Driver personal information
- Customer work order details
- Equipment location data
- Business operational patterns

**Core Principle**: Build security in from day one, enhance it progressively, never retrofit it.

## Threat Model

### Threats by Maturity Level

**Surface Level Primary Threats**:
- Unauthorized access to dispatcher functions
- Session hijacking
- SQL injection
- Cross-site scripting (XSS)
- Unencrypted data transmission
- Weak password policies

**Mid-Depth Additional Threats**:
- Multi-tenant data leakage
- Insider threats (malicious admin)
- API abuse and rate limiting bypass
- Certificate expiration causing service outage
- Third-party IdP compromise

**Deep-Water Additional Threats**:
- DDoS attacks on public endpoints
- Advanced persistent threats (APT)
- Supply chain attacks (compromised dependencies)
- Multi-region data synchronization vulnerabilities
- Sophisticated social engineering targeting ops team

### Assets Requiring Protection

**Critical Assets**:
- User credentials and session tokens
- Work order data (may contain sensitive customer info)
- Equipment location and availability data
- Driver personal information
- Audit logs
- Keycloak realm configuration
- Database credentials
- API keys and service tokens

**Sensitivity Levels**:
- Public: Equipment types, available features
- Internal: Work order descriptions, equipment identifiers
- Confidential: Driver names, user email addresses
- Restricted: Authentication credentials, API keys, database passwords

## Authentication Architecture

### Surface Level: Self-Hosted Keycloak

**Deployment Model**:
- Keycloak as Docker container on same host as application
- Dedicated PostgreSQL database for Keycloak backend
- Self-signed certificates for internal communication

**Realm Configuration**:
```
Realm: dispatch-app
├── Clients
│   ├── dispatch-frontend (public, OIDC)
│   │   ├── Redirect URIs: https://yourdomain.com/*
│   │   ├── Web Origins: https://yourdomain.com
│   │   └── Access Type: public
│   └── dispatch-backend (confidential, for validation)
│       ├── Access Type: confidential
│       └── Service Accounts Enabled: true
├── Roles
│   ├── admin (full access)
│   ├── dispatcher (dispatch operations)
│   ├── driver (view own assignments)
│   └── viewer (read-only reports)
└── Users
    ├── Test users created manually
    └── Password policy: min 8 chars, 1 uppercase, 1 number
```

**Token Configuration**:
- Access token lifespan: 5 minutes
- Refresh token lifespan: 30 minutes
- SSO session idle: 30 minutes
- SSO session max: 10 hours

**Authentication Flow**:
1. User visits app → @react-keycloak/web detects no token
2. User redirected to Keycloak login page (HTTPS)
3. User enters credentials → Keycloak validates
4. Keycloak redirects back with authorization code
5. Frontend exchanges code for tokens (access + refresh)
6. Tokens stored in memory (React state, not localStorage)
7. Access token attached to all API calls as Bearer header
8. Backend validates token with Keycloak on every request

**Token Validation (Backend)**:
```python
# Pseudocode
from keycloak import KeycloakOpenID

keycloak_client = KeycloakOpenID(
    server_url="https://keycloak:8443/",
    realm_name="dispatch-app",
    client_id="dispatch-backend",
    client_secret_key="...",
    verify=True  # Validate Keycloak's SSL cert
)

def validate_token(token):
    try:
        # Validates signature, expiry, issuer
        user_info = keycloak_client.introspect(token)
        if not user_info['active']:
            raise Unauthorized()
        return user_info
    except Exception:
        raise Unauthorized()
```

**Security Measures**:
- Keycloak admin console only accessible from localhost (firewall rule)
- Keycloak admin password stored in Docker secret
- No default admin user (created during setup, documented password in secure location)
- Failed login attempts tracked (brute force detection)
- Password reset requires email confirmation (SMTP configured)

**Limitations at Surface Level**:
- No MFA (multi-factor authentication)
- Self-signed certificates require manual trust
- Single Keycloak instance (no HA)
- Manual user provisioning
- Basic password policy only

---

### Mid-Depth: Enterprise Integration & Professional Certificates

**Two Deployment Scenarios**:

#### Scenario A: Self-Hosted Keycloak (Continued)
- Upgrade to Keycloak cluster (2-3 nodes behind load balancer)
- PostgreSQL replication for Keycloak database
- Professional certificates from Let's Encrypt (automated renewal)
- MFA enforcement for admin and dispatcher roles
- LDAP/Active Directory sync for user provisioning
- Advanced password policy (password history, rotation requirements)

#### Scenario B: External Keycloak Integration
**Situation**: Customer already has Keycloak or wants managed SSO

**Customer Responsibilities**:
1. Create realm for dispatch application (or provide dedicated realm)
2. Create client credentials:
   - Public client for frontend (OIDC)
   - Confidential client for backend (token validation)
3. Define roles: `dispatch-admin`, `dispatch-dispatcher`, `dispatch-driver`, `dispatch-viewer`
4. Map their users to these roles
5. Provide:
   - Keycloak URL
   - Realm name
   - Client IDs and secrets
   - Public key for token validation (or JWKS endpoint)

**Dispatch App Configuration**:
```yaml
# Environment variables
KEYCLOAK_URL=https://customer-sso.company.com/
KEYCLOAK_REALM=dispatch-production
KEYCLOAK_FRONTEND_CLIENT_ID=dispatch-web-client
KEYCLOAK_BACKEND_CLIENT_ID=dispatch-api-client
KEYCLOAK_CLIENT_SECRET=<provided-by-customer>
KEYCLOAK_JWKS_URL=https://customer-sso.company.com/realms/dispatch-production/protocol/openid-connect/certs
```

**Token Validation (External Keycloak)**:
- Backend fetches JWKS (JSON Web Key Set) from customer's Keycloak
- Validates token signature using public keys from JWKS
- No need to call customer's Keycloak on every request (can cache JWKS for 1 hour)
- Faster and reduces dependency on customer's Keycloak availability

**Fallback Mechanism**:
- Cache last known JWKS
- If customer Keycloak unreachable, continue validating with cached keys
- Grace period: 15 minutes before rejecting all requests
- Alert ops team if customer Keycloak down >5 minutes

**Multi-Tenancy with External Keycloak**:
- Each customer has their own realm in their Keycloak (or separate Keycloak)
- Dispatch app backend identifies tenant by:
  - Subdomain (acme.dispatchapp.com → Acme Corp tenant)
  - Or JWT claim (`tenant_id` in token)
- Backend routes to correct database schema based on tenant

**Certificate Management (Mid-Depth)**:
- **Public-facing services**: Let's Encrypt (free, automated via certbot)
  - nginx, public API endpoints
  - Auto-renewal every 60 days
  - Monitoring for renewal failures
  
- **Internal services**: Private CA using Vault or AWS Certificate Manager
  - Backend ↔ Database
  - Backend ↔ Redis
  - Backend ↔ S3
  - 90-day validity, automated rotation
  
- **Keycloak**: Let's Encrypt for public endpoints, private CA for database connection

**Let's Encrypt Setup**:
```bash
# Automated via certbot in nginx container
certbot certonly --webroot \
  -w /var/www/certbot \
  -d dispatchapp.com \
  -d www.dispatchapp.com \
  --email ops@dispatchapp.com \
  --agree-tos \
  --non-interactive

# Renewal check runs daily via cron
certbot renew --quiet --deploy-hook "nginx -s reload"
```

**MFA Enforcement**:
- Keycloak OTP (one-time password) via Google Authenticator or similar
- Required for admin and dispatcher roles
- Optional for driver and viewer roles
- Recovery codes provided on MFA setup

**Session Management**:
- Concurrent session limits (max 3 sessions per user)
- "Log out all sessions" function
- Admin can force logout of any user
- Session activity logged for audit

---

### Deep-Water: Zero-Trust Architecture

**Identity Federation**:
- Customers connect their corporate IdP (Okta, Azure AD, Google Workspace) via SAML
- Dispatch app acts as SAML service provider
- Keycloak acts as broker between SAML and OIDC
- Users log in with their corporate credentials (no separate password)

**Advanced Authentication**:
- Adaptive MFA: Risk-based requirement (new device, unusual location → require MFA)
- WebAuthn support (hardware security keys like YubiKey)
- Biometric authentication for mobile app
- Certificate-based authentication for service accounts

**Zero-Trust Principles**:
- No implicit trust based on network location
- Every request authenticated and authorized
- Principle of least privilege (users get minimum required permissions)
- Continuous verification (not just login, but ongoing)

**Service Mesh for mTLS**:
- Istio or Linkerd deployed in Kubernetes
- Automatic mutual TLS between all microservices
- Service-to-service authorization policies
- Traffic encryption without code changes

**Short-Lived Credentials**:
- Access tokens valid for 2 minutes (down from 5)
- Database credentials generated dynamically by Vault (valid 1 hour)
- API keys rotated automatically every 30 days
- Service account credentials rotated every 7 days

**Hardware Security Modules (HSM)**:
- Root CA private keys stored in FIPS 140-2 Level 3 HSM
- Keycloak signing keys in HSM
- Database encryption keys in HSM (TDE - Transparent Data Encryption)

---

## Authorization Architecture

### Role-Based Access Control (RBAC)

**All Maturity Levels Use Same Roles**:

| Role | Permissions |
|------|------------|
| **admin** | Full access to all modules, user management, system configuration |
| **dispatcher** | Create/edit work orders, dispatch equipment, recall, view all reports |
| **driver** | View own assignments, update status, view own reports |
| **viewer** | Read-only access to reports and dashboard |

**Implementation**:

**Surface Level**:
```python
# Flask decorator approach
from functools import wraps
from flask import request, abort

def require_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = extract_token(request)
            user_info = validate_token(token)
            
            user_roles = user_info.get('realm_access', {}).get('roles', [])
            
            if required_role not in user_roles:
                abort(403)  # Forbidden
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Usage
@app.route('/api/dispatch', methods=['POST'])
@require_role('dispatcher')
def create_dispatch():
    # Only dispatchers can access
    pass
```

**Mid-Depth Enhancement**:
- Attribute-Based Access Control (ABAC) for fine-grained permissions
- Example: Dispatcher can only dispatch equipment in their region
- Token includes custom claims: `{"region": "west-coast"}`
- Backend checks: user region matches equipment region

**Deep-Water Enhancement**:
- Dynamic policy evaluation (Open Policy Agent)
- Policies as code in Git repository
- Real-time policy updates without deployment
- Complex rules: "Admin can modify work orders created <24 hours ago in their region during business hours"

### Data Isolation (Multi-Tenancy)

**Not Applicable at Surface Level** (single organization)

**Mid-Depth: Schema-Per-Tenant**:
- PostgreSQL schemas: `tenant_acme`, `tenant_contoso`
- Connection pool routes to correct schema based on JWT tenant claim
- Row-level security as backup (tenant_id column on all tables)
- Prevents cross-tenant data leakage

**Deep-Water: Database-Per-Tenant** (for large customers):
- Largest tenants get dedicated PostgreSQL instance
- Smaller tenants share instance with schema isolation
- Completely separate data stores eliminate cross-tenant risk
- Compliance benefit: Can deploy tenant database in their required region

---

## Encryption Architecture

### Encryption in Transit (SSL/TLS)

#### Surface Level: Self-Signed Certificates

**Certificate Generation**:
```bash
# Create root CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt

# Create service certificates (Keycloak, PostgreSQL, Flask)
# For each service:
openssl genrsa -out service.key 2048
openssl req -new -key service.key -out service.csr
openssl x509 -req -in service.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out service.crt -days 365 -sha256
```

**Distribution**:
- CA certificate distributed to all services
- Each service validates peer using CA
- Clients (browsers) must manually trust CA (warning on first visit acceptable for internal tool)

**TLS Configuration**:
- Minimum TLS 1.2 (prefer TLS 1.3)
- Cipher suites: Strong only (ECDHE, AES-GCM)
- HSTS enabled (Strict-Transport-Security header)
- Certificate pinning in mobile app (Deep-Water)

**Services Using SSL**:
- nginx → Client browsers (HTTPS)
- Flask → Keycloak (HTTPS with cert validation)
- Flask → PostgreSQL (sslmode=require)
- Keycloak → PostgreSQL (JDBC SSL connection)

**What's Not Encrypted** (acceptable at Surface Level):
- Flask → Redis (if added, plain text on localhost)
- Docker internal network (services on same host)

**Risk Acceptance**: Within Docker network on single host, unencrypted is acceptable for Surface Level since no external exposure. Address in Mid-Depth.

---

#### Mid-Depth: Professional Certificates

**Let's Encrypt for Public Services**:
- Automated renewal via certbot or cert-manager (if Kubernetes)
- Challenges: HTTP-01 (webroot) or DNS-01 (for wildcard certs)
- Monitoring: Alert 30 days before expiration
- Fallback: Manual renewal process documented

**AWS Certificate Manager** (if on AWS):
- Free certificates for ELB/ALB
- Automatic renewal (no manual intervention)
- Can't export private keys (managed entirely by AWS)
- Use for: Load balancers, CloudFront

**Internal Services**:
- HashiCorp Vault as internal CA
- Short-lived certificates (90 days)
- Automated rotation via Vault agent or init containers
- Redis TLS enabled
- S3 connections via HTTPS

**Vault PKI Setup**:
```bash
# Enable PKI secrets engine
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write pki/root/generate/internal \
    common_name="Dispatch App Internal CA" \
    ttl=87600h

# Create role for service certificates
vault write pki/roles/dispatch-services \
    allowed_domains="*.dispatch.internal" \
    allow_subdomains=true \
    max_ttl=2160h  # 90 days

# Services request certificates on startup
vault write pki/issue/dispatch-services \
    common_name="postgres.dispatch.internal" \
    ttl=2160h
```

**Certificate Rotation Strategy**:
- Check for expiration at service startup
- Renew if <30 days remaining
- Graceful reload (no downtime)
- Alert if renewal fails

---

#### Deep-Water: Automated Certificate Management

**Service Mesh (Istio)**:
- Automatic mTLS between all microservices
- Certificates issued by Istio CA
- 24-hour certificate lifespan (auto-renewed)
- No application code changes needed

**cert-manager in Kubernetes**:
- Automates Let's Encrypt certificate lifecycle
- Custom resources: Certificate, Issuer, ClusterIssuer
- Integrates with Istio for service mesh certificates
- DNS-01 challenges for wildcard certs

**Example**:
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dispatch-tls
spec:
  secretName: dispatch-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - dispatchapp.com
    - "*.dispatchapp.com"
  renewBefore: 720h  # 30 days
```

**HSM for Root Keys**:
- Root CA private key never leaves HSM
- FIPS 140-2 Level 3 compliance
- Options: AWS CloudHSM, Azure Dedicated HSM, Thales Luna
- Expensive ($1,500+/month) but required for certain compliance frameworks

---

### Encryption at Rest

**Surface Level**: Not implemented
- PostgreSQL data on disk unencrypted
- Risk accepted: Physical server security relies on cloud provider
- File uploads on filesystem unencrypted

**Mid-Depth**: Database-Level Encryption
- PostgreSQL TDE (Transparent Data Encryption) via pgcrypto or external tools
- Encrypts data files, WAL logs, backups
- Key stored in Vault, rotated annually
- S3 server-side encryption (SSE-S3 or SSE-KMS)

**Deep-Water**: Application-Level Encryption
- Sensitive fields encrypted before writing to database (e.g., driver phone numbers)
- Encryption keys in HSM
- Field-level encryption allows for granular access control
- Encrypted backups with separate key
- Encrypted EBS volumes for all databases

---

## API Security

### Surface Level

**Basic Protection**:
- All endpoints require valid JWT (except health check)
- CORS configured (only allow frontend domain)
- Input validation on all endpoints (reject malformed requests)
- SQL injection prevention (use parameterized queries, ORM)
- XSS prevention (escape output, Content-Security-Policy header)

**Rate Limiting**: None (acceptable at small scale)

**Example CORS**:
```python
from flask_cors import CORS

CORS(app, origins=["https://yourdomain.com"], supports_credentials=True)
```

---

### Mid-Depth

**Enhanced Protection**:
- Rate limiting per user: 1000 requests/hour
- Rate limiting per IP: 100 requests/minute (prevents brute force)
- API versioning (/api/v1/...) for backward compatibility
- Request signing for sensitive operations (optional)
- Logging all API calls (user, endpoint, timestamp, response code)

**Rate Limiting Implementation**:
- Redis-backed (tracks request counts)
- Returns `429 Too Many Requests` when limit exceeded
- Different limits per role (admin: 5000/hour, viewer: 500/hour)

**OWASP Top 10 Mitigation**:
- A01 Broken Access Control: RBAC on every endpoint
- A02 Cryptographic Failures: TLS everywhere, encryption at rest
- A03 Injection: Parameterized queries, input validation
- A04 Insecure Design: Security review in design phase
- A05 Security Misconfiguration: Security headers, disable debug mode
- A06 Vulnerable Components: Dependency scanning (Snyk, Dependabot)
- A07 Identification & Auth Failures: Keycloak, MFA, strong passwords
- A08 Software & Data Integrity: Code signing, verified images
- A09 Logging Failures: Centralized logging, alert on anomalies
- A10 SSRF: Validate URLs, whitelist allowed domains

---

### Deep-Water

**API Gateway**:
- Kong, AWS API Gateway, or similar
- Centralized authentication/authorization
- Request transformation
- Analytics and monitoring
- DDoS protection

**Advanced Rate Limiting**:
- Per-tenant limits (based on subscription tier)
- Burst allowances
- Exponential backoff for failed requests
- IP reputation scoring (block known bad actors)

**Web Application Firewall (WAF)**:
- AWS WAF, Cloudflare, or ModSecurity
- Blocks common attack patterns (SQL injection, XSS)
- Geo-blocking (if only operating in certain countries)
- Bot detection and mitigation

---

## Secrets Management

### Surface Level: Docker Secrets

**Approach**:
- Secrets stored in files: `/secrets/postgres_password.txt`
- Mounted as Docker secrets (encrypted in Swarm, not in Compose)
- Never committed to Git (`.gitignore`)
- Documented in secure location (password manager, encrypted wiki)

**Limitations**:
- Manual secret creation
- No rotation automation
- Secrets visible to anyone with Docker host access

---

### Mid-Depth: HashiCorp Vault

**Centralized Secrets**:
- All secrets stored in Vault (database creds, API keys, certificates)
- Services authenticate to Vault on startup (AppRole or Kubernetes auth)
- Secrets fetched dynamically, not hardcoded

**Dynamic Database Credentials**:
```python
# Service requests DB credentials from Vault
vault_client = hvac.Client(url='https://vault.internal')
vault_client.auth.approle.login(role_id='...', secret_id='...')

# Vault generates new PostgreSQL user with 1-hour TTL
db_creds = vault_client.secrets.database.generate_credentials(name='dispatch-db')
username = db_creds['data']['username']  # e.g., v-token-12345
password = db_creds['data']['password']

# Connect to database with temporary credentials
conn = psycopg2.connect(
    host='postgres.internal',
    database='dispatch',
    user=username,
    password=password
)
```

**Benefits**:
- Credentials never long-lived
- Automatic revocation on lease expiry
- Audit trail of all secret access
- Centralized rotation

**Vault High Availability**:
- 3-node Vault cluster (HA mode)
- Integrated storage (Raft) or Consul backend
- Auto-unseal using AWS KMS or similar

---

### Deep-Water: Enterprise Secrets Management

**Options**:
- AWS Secrets Manager (if fully on AWS)
- Azure Key Vault (if on Azure)
- Google Secret Manager (if on GCP)
- CyberArk, 1Password for infrastructure secrets

**Kubernetes Secrets External Secrets Operator**:
- Syncs secrets from external store (Vault, AWS) into K8s secrets
- Application code reads from K8s secrets (simple)
- Secrets updated automatically when source changes

**Secret Scanning**:
- GitHub secret scanning (prevent accidental commits)
- Scheduled scans of containers and repos for leaked secrets
- Immediate rotation if secret exposed

---

## Security Monitoring & Incident Response

### Surface Level: Basic Logging

**What to Log**:
- All authentication events (login, logout, failed attempts)
- Authorization failures (user tried to access forbidden resource)
- Dispatch operations (create, complete, recall)
- Admin actions (user creation, role changes)

**Log Format**: JSON structured logs
**Log Storage**: Local files, rotated daily, retained 30 days

**Alerting**: Manual review of logs (no automated alerts)

---

### Mid-Depth: Centralized Logging & Alerting

**ELK Stack** (Elasticsearch, Logstash, Kibana):
- All services ship logs to Logstash
- Elasticsearch indexes for search
- Kibana dashboards for visualization

**Alert Rules**:
- Failed login rate >10/minute → Possible brute force
- Authorization failure rate spike → Possible privilege escalation attempt
- Unusual dispatch volume (>3x normal) → Data exfiltration?
- Certificate expiring in <7 days → Ops team notified
- Database connection failures → Service degradation alert

**Security Information & Event Management (SIEM)**:
- Splunk, Sumo Logic, or open-source alternatives
- Correlates events across services
- Threat intelligence integration
- Automated incident creation

---

### Deep-Water: Advanced Threat Detection

**Anomaly Detection**:
- ML models detect unusual user behavior
  - User logs in from new country
  - Dispatcher creates 100 work orders in 5 minutes (normal: 10/day)
  - Driver views reports they've never accessed before
- Automated response: Force re-authentication, alert security team

**Intrusion Detection System (IDS)**:
- Snort, Suricata, or cloud-native (AWS GuardDuty)
- Network traffic analysis
- Signature-based and behavior-based detection

**Incident Response Plan**:
- Documented playbooks for common scenarios
- On-call rotation (24/7 coverage)
- Communication templates (customer notification)
- Regular tabletop exercises (simulate breach)

**Disaster Recovery**:
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 5 minutes
- Automated backups every 15 minutes
- Cross-region replication
- Quarterly DR drills

---

## Compliance Frameworks

### ISO 27001 Alignment (Mid-Depth & Deep-Water)

**Relevant Controls**:

**A.9 Access Control**:
- Keycloak provides identity management
- RBAC enforces least privilege
- MFA for privileged accounts

**A.10 Cryptography**:
- TLS for data in transit
- Encryption at rest for sensitive data
- Key management via Vault or HSM

**A.12 Operations Security**:
- Automated security patching
- Vulnerability scanning (weekly)
- Change management process

**A.14 System Acquisition, Development, Maintenance**:
- Security requirements in design phase
- Code review process (security focus)
- Penetration testing before major releases

**A.16 Incident Management**:
- Incident response plan documented
- Security event logging
- Post-incident reviews

**A.18 Compliance**:
- Regular audits (internal and external)
- Documentation of all security controls
- Gap analysis against ISO 27001 requirements

---

### SOC 2 Considerations (Mid-Depth)

**Trust Service Criteria**:

**Security**:
- Access controls (Keycloak RBAC)
- Logical and physical access restrictions
- System monitoring

**Availability**:
- Uptime monitoring (99%+ target)
- Disaster recovery plan
- Incident response

**Processing Integrity**:
- Data validation on input
- Error handling and logging
- Backup and recovery testing

**Confidentiality**:
- Encryption in transit and at rest
- Access logging
- Data classification

**Privacy** (if handling PII):
- Data retention policies
- User consent management
- Right to deletion (GDPR compliance)

---

## Security Testing

### Surface Level
- **Manual Testing**: Before each release
  - Test login/logout flows
  - Verify role-based access works
  - Check HTTPS enforcement
  - Try SQL injection on forms (should fail)

- **Dependency Scanning**: Monthly
  - `pip audit` for Python dependencies
  - `npm audit` for JavaScript dependencies
  - Update vulnerable packages

---

### Mid-Depth
- **Automated Security Testing**: In CI/CD pipeline
  - Static Application Security Testing (SAST): Bandit (Python), ESLint security plugins (JS)
  - Dependency scanning: Snyk, Dependabot
  - Container scanning: Trivy, Clair

- **Penetration Testing**: Quarterly
  - External firm performs manual testing
  - Focus on OWASP Top 10
  - Remediate findings within 30 days

- **Vulnerability Disclosure Program**: Responsible disclosure policy published

---

### Deep-Water
- **Bug Bounty Program**: Public or private
  - Rewards for security researchers
  - Managed via HackerOne, Bugcrowd

- **Red Team Exercises**: Annually
  - Simulated attack by internal or external team
  - Test detection and response capabilities

- **Chaos Engineering**: Include security scenarios
  - Simulate credential leakage
  - Test secret rotation procedures

---

## Security Checklist by Maturity Level

### Surface Level Launch Checklist
- [ ] Keycloak deployed with strong admin password
- [ ] Self-signed certificates generated for all services
- [ ] PostgreSQL requires SSL connections
- [ ] All API endpoints require valid JWT
- [ ] CORS configured (no wildcard origins)
- [ ] Input validation on all forms
- [ ] Passwords meet minimum requirements (8 chars, mixed case, number)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Keycloak admin console not publicly accessible
- [ ] Database credentials in Docker secrets (not environment variables)
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

### Mid-Depth Launch Checklist
- [ ] Let's Encrypt certificates configured with auto-renewal
- [ ] MFA enabled for admin and dispatcher roles
- [ ] Vault deployed for secrets management
- [ ] Redis TLS enabled
- [ ] S3 server-side encryption enabled
- [ ] Rate limiting implemented (per-user and per-IP)
- [ ] Centralized logging (ELK stack or similar)
- [ ] Alert rules configured for security events
- [ ] Dependency scanning in CI/CD pipeline
- [ ] External penetration test completed
- [ ] Multi-tenant data isolation tested
- [ ] Backup encryption enabled
- [ ] Incident response plan documented

### Deep-Water Launch Checklist
- [ ] Service mesh with automatic mTLS deployed
- [ ] HSM for root certificate private keys
- [ ] Identity federation with customer IdPs tested
- [ ] WAF configured with OWASP ruleset
- [ ] DDoS protection enabled
- [ ] Anomaly detection models trained
- [ ] ISO 27001 audit completed
- [ ] SOC 2 Type II report obtained
- [ ] Bug bounty program launched
- [ ] Disaster recovery drills conducted quarterly
- [ ] Zero-trust network policies enforced
- [ ] Certificate pinning in mobile apps
- [ ] Security training for all engineers (annual)

---

## Conclusion

Security evolves with each maturity level, but the fundamentals remain constant:
1. **Authenticate** - Prove who you are (Keycloak)
2. **Authorize** - Prove what you can do (RBAC)
3. **Encrypt** - Protect data in motion and at rest (TLS, encryption at rest)
4. **Audit** - Know what happened and when (logging)
5. **Respond** - Handle incidents quickly and effectively (monitoring, alerting, IR plan)

Start with Surface Level's solid foundation, enhance systematically at Mid-Depth, and achieve enterprise-grade security at Deep-Water. Never compromise on authentication, authorization, or encryption—these are table stakes for any business application.
