---
title: "Secret Management: Enterprise Architecture"
phase: "03-development"
topic: "secret-management"
depth: "deep-water"
reading_time: 45
prerequisites: []
related_topics: ["secure-coding-practices", "supply-chain-security", "deployment-strategy", "incident-response"]
personas: ["specialist-expanding", "generalist-leveling-up"]
updated: "2025-11-15"
---

# Secret Management: Enterprise Architecture

Designing secret management systems that scale to hundreds of services and thousands of secrets.

## Introduction: Secret Management at Scale

At enterprise scale, secret management is infrastructure. Poor design creates security vulnerabilities, operational complexity, and developer friction.

This guide covers architecture patterns, implementation details, and trade-offs for organizations running:
- Microservices architectures (10+ services)
- Multi-cloud or hybrid cloud deployments
- Kubernetes at scale
- Compliance-regulated workloads (PCI-DSS, HIPAA, SOC 2)
- Teams with 20+ engineers

Topics include secret management platforms, encryption key hierarchies, Kubernetes integration, certificate lifecycle automation, compliance patterns, and building developer-friendly secret workflows.

## Secret Management Architecture Patterns

### Centralized Secret Store

All secrets stored in a single system of record.

**Architecture**:
```
                      ┌──────────────────────┐
                      │  Secret Management   │
                      │  Platform (Vault)    │
                      │  - Encrypted storage │
                      │  - Access control    │
                      │  - Audit logging     │
                      └──────────┬───────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
    ┌────────────┐        ┌────────────┐       ┌────────────┐
    │ Service A  │        │ Service B  │       │ Service C  │
    │ Fetches on │        │ Fetches on │       │ Fetches on │
    │ startup    │        │ startup    │       │ startup    │
    └────────────┘        └────────────┘       └────────────┘
```

**Advantages**:
- Single source of truth
- Centralized audit logging
- Consistent access control
- Secret rotation in one place

**Disadvantages**:
- Single point of failure (requires high availability)
- Network dependency for secret access
- Secrets management system becomes critical infrastructure

**When to use**: Multi-service architectures where secrets are shared across services.

### Distributed Secret Injection

Secrets injected into services before they start, no runtime dependency on secret manager.

**Architecture**:
```
    ┌─────────────────────┐
    │ Secret Management   │
    │ Platform            │
    └──────────┬──────────┘
               │
               │ 1. Deployment system fetches secrets
               │
               ▼
    ┌─────────────────────┐
    │ Deployment Pipeline │
    │ (Kubernetes, etc.)  │
    └──────────┬──────────┘
               │
               │ 2. Secrets injected as env vars or files
               │
               ▼
    ┌─────────────────────┐
    │ Service Container   │
    │ - Secrets available │
    │ - No runtime fetch  │
    └─────────────────────┘
```

**Advantages**:
- No runtime dependency on secret manager
- Faster startup (secrets already available)
- Simpler application code

**Disadvantages**:
- Secrets can't be rotated without redeployment
- Secrets may be visible in process environment
- Deployment system needs secret access

**When to use**: Stateless services with infrequent deployments, where runtime secret refresh isn't required.

### Dynamic Secret Generation

Secrets created on-demand, time-limited, automatically revoked.

**Architecture**:
```
    ┌─────────────────────┐
    │ Service             │
    │ Requests credentials│
    └──────────┬──────────┘
               │
               │ 1. "I need database access"
               │
               ▼
    ┌─────────────────────┐
    │ Vault               │
    │ - Verifies identity │
    │ - Generates creds   │
    └──────────┬──────────┘
               │
               │ 2. CREATE USER vault_gen_abc123
               │    VALID FOR 1 hour
               │
               ▼
    ┌─────────────────────┐
    │ Database            │
    │ - New user created  │
    │ - Auto-expires      │
    └─────────────────────┘
```

**Advantages**:
- Credentials are unique per service instance
- Short-lived (hours, not months)
- Automatic revocation
- No rotation needed (regenerate instead)

**Disadvantages**:
- Requires secret system integration with target systems
- More complex to implement
- Runtime dependency on secret manager
- Not all systems support dynamic credential generation

**When to use**: High-security environments, ephemeral workloads, systems supporting dynamic users (databases, AWS, PKI).

### Secret Hierarchy

Secrets organized by environment, team, and application.

**Path structure**:
```
secret/
├── shared/                          # Cross-cutting secrets
│   ├── monitoring/api-key
│   └── logging/api-key
├── platform/                        # Platform team secrets
│   ├── kubernetes/admin-token
│   └── terraform/aws-credentials
└── applications/
    ├── api-service/
    │   ├── development/
    │   │   ├── database-url
    │   │   └── stripe-key           # sk_test_...
    │   ├── staging/
    │   │   ├── database-url
    │   │   └── stripe-key           # sk_test_...
    │   └── production/
    │       ├── database-url
    │       └── stripe-key           # sk_live_...
    └── worker-service/
        └── production/
            └── queue-credentials
```

**Access policies**:
```hcl
# Vault policy: api-service-production
path "secret/data/applications/api-service/production/*" {
  capabilities = ["read"]
}

path "secret/data/shared/*" {
  capabilities = ["read"]
}
```

Services can only access secrets for their environment.

## HashiCorp Vault Deep Dive

Vault is the most feature-rich open-source secret management platform. Understanding Vault provides patterns applicable to other systems.

### Vault Architecture

**Core components**:
```
┌──────────────────────────────────────────────────┐
│                   Vault Cluster                  │
│                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ Node 1     │  │ Node 2     │  │ Node 3     │  │
│  │ (Active)   │  │ (Standby)  │  │ (Standby)  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  │
│        │                │                │       │
│        └────────────────┴────────────────┘       │
│                        │                         │
│                        ▼                         │
│              ┌──────────────────┐                │
│              │ Storage Backend  │                │
│              │ (Consul, etcd,   │                │
│              │  DynamoDB, etc.) │                │
│              └──────────────────┘                │
└──────────────────────────────────────────────────┘
```

**Storage backend**: Encrypted data persistence (Consul, etcd, AWS DynamoDB, Google Cloud Storage, Azure Storage, PostgreSQL, file system for dev)

**Barrier**: All data encrypted before writing to storage backend. Vault unsealed using master key shards (Shamir's Secret Sharing).

**Authentication methods**: How entities prove identity (token, AWS IAM, Kubernetes service account, LDAP, GitHub, etc.)

**Secret engines**: Generate or store secrets (KV for static secrets, database for dynamic, AWS for IAM credentials, PKI for certificates)

**Policies**: Define what secrets an authenticated entity can access

**Audit devices**: Log all requests to Vault for compliance

### Unsealing Vault

Vault starts sealed - encrypted storage is locked until unsealed with master key.

**Shamir's Secret Sharing** splits master key into 5 shards, any 3 required to unseal:

```bash
# Initialize Vault (first time only)
vault operator init
# Returns 5 unseal keys and 1 root token
# STORE THESE SECURELY (separate locations)

# Unseal (requires 3 of 5 keys)
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
# Vault now unsealed and operational
```

**Auto-unseal** using cloud KMS (AWS, GCP, Azure):
```hcl
# config.hcl
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:123456789:key/abc-123"
}
```

Vault automatically unseals using cloud KMS, no manual intervention needed. Trade-off: Dependency on cloud provider KMS availability.

### Secret Engines

Vault uses pluggable secret engines.

**KV (Key-Value) v2 - Static secrets with versioning**:
```bash
# Enable KV v2 engine at path "secret/"
vault secrets enable -path=secret kv-v2

# Write secret
vault kv put secret/applications/api/production \
  database_url="postgres://..." \
  api_key="abc123"

# Read secret
vault kv get secret/applications/api/production

# Read specific version
vault kv get -version=2 secret/applications/api/production

# Secret history
vault kv metadata get secret/applications/api/production
```

**Database - Dynamic credentials**:
```bash
# Enable database engine
vault secrets enable database

# Configure database connection
vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="readonly,readwrite" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/mydb" \
  username="vault" \
  password="vault-password"

# Create role (defines what Vault creates)
vault write database/roles/readonly \
  db_name=postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Application requests credentials
vault read database/creds/readonly
# Returns:
# username: v-token-readonly-abc123
# password: A1a-random-password
# lease_duration: 3600
```

Vault creates a PostgreSQL user, grants SELECT permissions, user expires in 1 hour.

**AWS - Dynamic IAM credentials**:
```bash
# Enable AWS engine
vault secrets enable aws

# Configure AWS root credentials (for Vault to create IAM users)
vault write aws/config/root \
  access_key=AKIAIOSFODNN7EXAMPLE \
  secret_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  region=us-east-1

# Create role
vault write aws/roles/deploy \
  credential_type=iam_user \
  policy_document=-<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "*"
    }
  ]
}
EOF

# Generate credentials
vault read aws/creds/deploy
# Returns temporary AWS access key and secret key
```

**PKI - X.509 certificates**:
```bash
# Enable PKI engine
vault secrets enable pki

# Configure CA
vault write pki/root/generate/internal \
  common_name="example.com" \
  ttl=87600h  # 10 years

# Create role
vault write pki/roles/example-dot-com \
  allowed_domains="example.com" \
  allow_subdomains=true \
  max_ttl="72h"

# Issue certificate
vault write pki/issue/example-dot-com \
  common_name="api.example.com"
# Returns certificate, private key, CA chain
```

### Authentication Methods

How services prove their identity to Vault.

**Token auth** (default, manual):
```bash
# Create token with specific policy
vault token create -policy=api-service-production
# Returns token: s.abc123xyz

# Use token
export VAULT_TOKEN=s.abc123xyz
vault kv get secret/applications/api/production
```

**Kubernetes auth** (automatic for pods):
```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure (from outside Kubernetes)
vault write auth/kubernetes/config \
  kubernetes_host="https://k8s.example.com:443" \
  kubernetes_ca_cert=@/path/to/ca.crt \
  token_reviewer_jwt="reviewer-token"

# Create role mapping Kubernetes service account to Vault policy
vault write auth/kubernetes/role/api-service \
  bound_service_account_names=api-service \
  bound_service_account_namespaces=production \
  policies=api-service-production \
  ttl=1h
```

**Application in Kubernetes**:
```go
// Go example
import (
    "github.com/hashicorp/vault/api"
    "github.com/hashicorp/vault/api/auth/kubernetes"
)

// Read Kubernetes service account token (mounted by K8s)
jwt, _ := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")

// Authenticate to Vault using Kubernetes token
k8sAuth, _ := kubernetes.NewKubernetesAuth(
    "api-service",  // role name
    kubernetes.WithServiceAccountToken(string(jwt)),
)

client, _ := api.NewClient(api.DefaultConfig())
authInfo, _ := client.Auth().Login(context.Background(), k8sAuth)

// Now authenticated, can read secrets
secret, _ := client.KVv2("secret").Get(context.Background(), "applications/api/production")
```

**AWS IAM auth** (automatic for EC2/ECS/Lambda):
```bash
# Enable AWS auth
vault auth enable aws

# Create role
vault write auth/aws/role/api-service \
  auth_type=iam \
  bound_iam_principal_arn=arn:aws:iam::123456789:role/ApiServiceRole \
  policies=api-service-production \
  ttl=1h
```

**Application in AWS**:
```python
import boto3
import hvac
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# Use AWS credentials (from instance role/ECS task role)
session = boto3.Session()
credentials = session.get_credentials()

# Create signed login request
vault_addr = "https://vault.example.com"
login_data = {
    "role": "api-service",
    "iam_http_request_method": "POST",
    "iam_request_url": boto3.Session().region_name,
    "iam_request_body": "",
    "iam_request_headers": ""
}

# Authenticate to Vault
client = hvac.Client(url=vault_addr)
client.auth.aws.iam_login(
    session.get_credentials().access_key,
    session.get_credentials().secret_key,
    session.get_credentials().token,
    role="api-service"
)

# Read secrets
secret = client.secrets.kv.v2.read_secret_version(path="applications/api/production")
```

No static credentials in application code - uses AWS IAM role.

### Encryption as a Service

Vault can encrypt/decrypt data without applications managing keys.

```bash
# Enable transit engine
vault secrets enable transit

# Create encryption key
vault write -f transit/keys/customer-data

# Encrypt data
vault write transit/encrypt/customer-data \
  plaintext=$(echo "sensitive data" | base64)
# Returns: vault:v1:ciphertext...

# Store ciphertext in database
# "vault:v1:8SDd3WHDOjf7mq69CyCqYjBXAiQQAVZRkFM13ok481zoCmHnSeDX9vyf7w=="

# Decrypt data
vault write transit/decrypt/customer-data \
  ciphertext="vault:v1:8SDd3WHDOjf7mq69CyCqYjBXAiQQAVZRkFM13ok481zoCmHnSeDX9vyf7w=="
# Returns: plaintext (base64)
```

**Use cases**:
- Encrypt PII before storing in database
- Encrypt application logs containing sensitive data
- Encrypt files in S3
- Compliance requirements for encryption at rest

**Advantages**:
- Centralized key management
- Key rotation without re-encrypting data (Vault re-wraps with new key version)
- Audit all encryption/decryption operations

**Disadvantages**:
- Network call for every encrypt/decrypt operation (latency)
- Vault becomes critical path for application
- Need caching strategy for performance

### Leasing and Renewal

Dynamic secrets have leases - time-limited validity.

```bash
# Generate database credentials
vault read database/creds/readonly
# Key            Value
# ---            -----
# lease_id       database/creds/readonly/abc123
# lease_duration 3600
# username       v-token-readonly-xyz789
# password       A1a-random
```

**Application must renew before lease expires**:
```python
import hvac
import time
import threading

client = hvac.Client(url='https://vault.example.com')
client.token = 'app-token'

# Generate credentials
creds = client.secrets.database.generate_credentials(name='readonly')
lease_id = creds['lease_id']
username = creds['data']['username']
password = creds['data']['password']

# Renew lease every 30 minutes (lease is 1 hour)
def renew_lease():
    while True:
        time.sleep(1800)  # 30 minutes
        try:
            client.sys.renew_lease(lease_id=lease_id, increment=3600)
            print("Lease renewed")
        except Exception as e:
            print(f"Failed to renew lease: {e}")
            # Lease expired, generate new credentials
            new_creds = client.secrets.database.generate_credentials(name='readonly')
            # Update application to use new credentials

threading.Thread(target=renew_lease, daemon=True).start()
```

**Or use Vault agent** for automatic renewal (see Kubernetes section).

### High Availability Setup

Production Vault must be highly available.

**Architecture**:
```
                      ┌──────────────┐
                      │ Load Balancer│
                      └───────┬──────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Vault Node 1 │  │ Vault Node 2 │  │ Vault Node 3 │
    │  (Active)    │  │  (Standby)   │  │  (Standby)   │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │
           └─────────────────┴─────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Consul Cluster   │
                    │ (Storage Backend)│
                    └──────────────────┘
```

**Configuration**:
```hcl
# vault-config.hcl
storage "consul" {
  address = "consul.example.com:8500"
  path    = "vault/"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file  = "/etc/vault/tls/vault.key"
}

api_addr = "https://vault-1.example.com:8200"
cluster_addr = "https://vault-1.example.com:8201"

ui = true
```

**Active-standby**: Only one node is active, standbys forward requests to active. Automatic failover if active fails.

**Performance replication** (Enterprise): Read replicas for geographically distributed deployments.

**Disaster recovery replication** (Enterprise): Full cluster replica for disaster recovery.

## Cloud Provider Secret Services

### AWS Secrets Manager + Parameter Store

AWS provides two secret storage services.

**AWS Secrets Manager**:
- Automatic rotation for RDS, Redshift, DocumentDB
- Encryption with AWS KMS
- Cross-region replication
- Resource policies for access control
- $0.40/secret/month + $0.05/10k API calls

**AWS Systems Manager Parameter Store**:
- Hierarchical storage (`/app/production/database/password`)
- Free for standard parameters, $0.05/advanced parameter/month
- No automatic rotation
- Encryption with AWS KMS (optional)
- Higher throughput than Secrets Manager

**When to use which**:
- **Secrets Manager**: Database credentials requiring automatic rotation
- **Parameter Store**: Configuration values, API keys, secrets not needing automatic rotation, high-throughput reads

**Usage patterns**:
```python
import boto3
import json

# Secrets Manager
secrets_client = boto3.client('secretsmanager')

def get_database_credentials():
    response = secrets_client.get_secret_value(SecretId='production/database')
    secret = json.loads(response['SecretString'])
    return {
        'host': secret['host'],
        'username': secret['username'],
        'password': secret['password'],
        'database': secret['database']
    }

# Parameter Store
ssm_client = boto3.client('ssm')

def get_api_key():
    response = ssm_client.get_parameter(
        Name='/production/api/stripe-key',
        WithDecryption=True  # Decrypt if encrypted
    )
    return response['Parameter']['Value']

# Batch get parameters (more efficient)
def get_all_config():
    response = ssm_client.get_parameters_by_path(
        Path='/production/api',
        Recursive=True,
        WithDecryption=True
    )
    return {p['Name']: p['Value'] for p in response['Parameters']}
```

**Automatic rotation with Lambda**:
```python
# Lambda function for RDS credential rotation
import boto3
import json
import pymysql

secrets_client = boto3.client('secretsmanager')

def lambda_handler(event, context):
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    # Get current and pending secret versions
    metadata = secrets_client.describe_secret(SecretId=secret_arn)

    if step == "createSecret":
        # Generate new password
        current = json.loads(secrets_client.get_secret_value(
            SecretId=secret_arn,
            VersionStage="AWSCURRENT"
        )['SecretString'])

        new_password = generate_random_password()
        current['password'] = new_password

        # Store as AWSPENDING
        secrets_client.put_secret_value(
            SecretId=secret_arn,
            ClientRequestToken=token,
            SecretString=json.dumps(current),
            VersionStages=['AWSPENDING']
        )

    elif step == "setSecret":
        # Update database with new password
        pending = json.loads(secrets_client.get_secret_value(
            SecretId=secret_arn,
            VersionId=token,
            VersionStage="AWSPENDING"
        )['SecretString'])

        current = json.loads(secrets_client.get_secret_value(
            SecretId=secret_arn,
            VersionStage="AWSCURRENT"
        )['SecretString'])

        # Connect with current credentials, change to pending password
        conn = pymysql.connect(
            host=current['host'],
            user=current['username'],
            password=current['password']
        )
        with conn.cursor() as cursor:
            cursor.execute(
                f"ALTER USER '{pending['username']}' IDENTIFIED BY '{pending['password']}'"
            )
        conn.commit()

    elif step == "testSecret":
        # Verify new credentials work
        pending = json.loads(secrets_client.get_secret_value(
            SecretId=secret_arn,
            VersionId=token,
            VersionStage="AWSPENDING"
        )['SecretString'])

        # Try to connect
        conn = pymysql.connect(
            host=pending['host'],
            user=pending['username'],
            password=pending['password']
        )
        conn.close()

    elif step == "finishSecret":
        # Move AWSCURRENT to AWSPREVIOUS
        # Move AWSPENDING to AWSCURRENT
        # Secrets Manager handles this automatically
        pass
```

**IAM roles for service authentication**:
```python
# Application running in EC2, ECS, Lambda, or EKS
# No AWS credentials in code or environment variables

import boto3

# boto3 automatically uses IAM role attached to instance/task/function
secrets_client = boto3.client('secretsmanager')
secret = secrets_client.get_secret_value(SecretId='production/database')

# IAM policy attached to role:
# {
#   "Version": "2012-10-17",
#   "Statement": [{
#     "Effect": "Allow",
#     "Action": "secretsmanager:GetSecretValue",
#     "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:production/database-*"
#   }]
# }
```

No static AWS credentials - instance/task/function authenticates using IAM role.

### Azure Key Vault with Managed Identity

**Architecture**:
```
┌─────────────────┐         ┌──────────────────┐
│ Azure VM/AKS    │         │ Azure Key Vault  │
│ with Managed    │────────▶│ - Secrets        │
│ Identity        │  Auth   │ - Keys           │
│                 │◀────────│ - Certificates   │
└─────────────────┘  Secret └──────────────────┘
```

**Setup**:
```bash
# Create Key Vault
az keyvault create \
  --name myapp-vault \
  --resource-group myapp-rg \
  --location eastus

# Store secret
az keyvault secret set \
  --vault-name myapp-vault \
  --name database-password \
  --value "super-secret-password"

# Enable Managed Identity on VM
az vm identity assign \
  --name myapp-vm \
  --resource-group myapp-rg

# Grant Managed Identity access to Key Vault
az keyvault set-policy \
  --name myapp-vault \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list
```

**Application code**:
```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Authenticates using Managed Identity (no credentials in code)
credential = DefaultAzureCredential()

vault_url = "https://myapp-vault.vault.azure.net/"
client = SecretClient(vault_url=vault_url, credential=credential)

# Get secret
secret = client.get_secret("database-password")
password = secret.value
```

**Key Vault with AKS**:
```yaml
# Using Azure Key Vault Provider for Secrets Store CSI Driver
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  serviceAccountName: myapp-sa  # Linked to Managed Identity
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: secrets-store
      mountPath: "/mnt/secrets"
      readOnly: true
  volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: "azure-keyvault-secrets"
```

Secrets mounted as files in `/mnt/secrets/database-password`.

### GCP Secret Manager with Workload Identity

**Architecture**:
```
┌──────────────────┐        ┌──────────────────────┐
│ GKE Pod with     │        │ GCP Secret Manager   │
│ Workload Identity│───────▶│ - Versioned secrets  │
│                  │  Auth  │ - IAM access control │
│                  │◀───────│ - Audit logging      │
└──────────────────┘ Secret └──────────────────────┘
```

**Setup**:
```bash
# Create secret
echo -n "super-secret-password" | \
  gcloud secrets create database-password --data-file=-

# Grant service account access
gcloud secrets add-iam-policy-binding database-password \
  --member="serviceAccount:myapp@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Configure Workload Identity (link K8s SA to GCP SA)
gcloud iam service-accounts add-iam-policy-binding \
  myapp@project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:project.svc.id.goog[namespace/myapp-sa]"
```

**Application code**:
```python
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()

# Access latest version
name = "projects/my-project/secrets/database-password/versions/latest"
response = client.access_secret_version(request={"name": name})
password = response.payload.data.decode('UTF-8')

# Access specific version
name = "projects/my-project/secrets/database-password/versions/3"
response = client.access_secret_version(request={"name": name})
```

**Workload Identity configuration**:
```yaml
# Kubernetes service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: myapp@project.iam.gserviceaccount.com

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      serviceAccountName: myapp-sa  # Uses Workload Identity
      containers:
      - name: myapp
        image: myapp:latest
```

Pod authenticates to GCP using Kubernetes service account linked to GCP service account. No static credentials.

### Cross-Cloud Secret Management

Running services across multiple cloud providers requires centralized secret management.

**Option 1: HashiCorp Vault** (cloud-agnostic):
- Deploy Vault in one cloud (or self-hosted)
- Services in all clouds authenticate to Vault
- Trade-off: Cross-cloud network latency, Vault availability dependency

**Option 2: Replicate secrets** across cloud-specific services:
- AWS Secrets Manager in AWS
- Azure Key Vault in Azure
- GCP Secret Manager in GCP
- Terraform/scripts replicate secrets to all services
- Trade-off: Eventual consistency, more complex rotation

**Option 3: Secret synchronization tools**:
- External Secrets Operator (Kubernetes)
- SOPS with multiple KMS keys
- Custom replication scripts

**Example: External Secrets Operator syncing from AWS to GCP**:
```yaml
# External Secrets Operator config
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: database-credentials  # Creates Kubernetes Secret
  data:
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
```

Kubernetes Secret in GKE automatically synced from AWS Secrets Manager.

## Kubernetes Secret Management

Kubernetes has built-in Secret resources, but they have significant limitations.

### Kubernetes Secrets (Limitations)

**Default Kubernetes Secrets**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
data:
  username: YWRtaW4=  # base64("admin")
  password: cGFzc3dvcmQ=  # base64("password")
```

**Limitations**:
1. **Base64 is not encryption** - Secrets are not encrypted in etcd by default
2. **No audit logging** - Can't track who accessed what secret
3. **No rotation** - Manual process to update secrets
4. **Wide access** - Anyone with access to namespace can read all secrets
5. **Stored in etcd** - etcd backups contain secrets in plaintext (unless encryption at rest configured)

**Enabling encryption at rest**:
```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
    - secrets
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: <32-byte base64 encoded key>
    - identity: {}  # Fallback to unencrypted
```

Pass `--encryption-provider-config=/etc/kubernetes/encryption-config.yaml` to kube-apiserver.

Even with encryption at rest, Kubernetes Secrets alone aren't sufficient for production.

### External Secrets Operator

Syncs secrets from external secret management systems into Kubernetes Secrets.

**Architecture**:
```
┌──────────────────────┐
│ External Secret      │
│ Manager (Vault, AWS, │
│ Azure, GCP, etc.)    │
└───────────┬──────────┘
            │
            │ 1. External Secrets Operator polls
            │
            ▼
┌──────────────────────┐
│ ExternalSecret CRD   │
│ Defines mapping      │
└───────────┬──────────┘
            │
            │ 2. Operator creates/updates
            │
            ▼
┌──────────────────────┐
│ Kubernetes Secret    │
│ (native resource)    │
└───────────┬──────────┘
            │
            │ 3. Pod mounts
            │
            ▼
┌──────────────────────┐
│ Application Pod      │
└──────────────────────┘
```

**Installation**:
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
```

**Example with AWS Secrets Manager**:
```yaml
# SecretStore - connection to AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa  # Uses IRSA for auth

---
# ExternalSecret - defines what to sync
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 15m  # Sync every 15 minutes
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: production/database  # AWS Secrets Manager secret name
      property: username  # JSON key
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
```

Operator creates Kubernetes Secret `database-credentials` with data from AWS Secrets Manager. Refreshes every 15 minutes to pick up rotated secrets.

**Use with Vault**:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "production-external-secrets"
          serviceAccountRef:
            name: external-secrets-sa

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault
    kind: SecretStore
  target:
    name: api-secrets
  data:
  - secretKey: stripe-key
    remoteRef:
      key: applications/api/production
      property: stripe_key
```

### Sealed Secrets

Encrypt secrets that can be committed to git, decrypted only in cluster.

**Architecture**:
```
Developer                    Git Repo               Kubernetes Cluster
    │                           │                          │
    │ 1. Create Secret          │                          │
    │ kubeseal (encrypt)        │                          │
    │──────────────────────────▶│                          │
    │                           │                          │
    │ 2. Commit SealedSecret    │                          │
    │                           │                          │
    │                           │ 3. GitOps sync           │
    │                           │─────────────────────────▶│
    │                           │                          │
    │                           │ 4. Sealed Secrets        │
    │                           │    Controller decrypts   │
    │                           │    (creates Secret)      │
```

**Installation**:
```bash
# Install controller in cluster
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
brew install kubeseal
```

**Usage**:
```bash
# Create normal Secret manifest
kubectl create secret generic database-credentials \
  --from-literal=username=admin \
  --from-literal=password=secret123 \
  --dry-run=client -o yaml > secret.yaml

# Encrypt with kubeseal
kubeseal -f secret.yaml -w sealed-secret.yaml

# sealed-secret.yaml can be committed to git
# Only the cluster with the private key can decrypt
git add sealed-secret.yaml
git commit -m "Add database credentials"
git push

# Apply to cluster
kubectl apply -f sealed-secret.yaml

# Controller decrypts and creates Secret
kubectl get secret database-credentials
```

**SealedSecret example**:
```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  encryptedData:
    username: AgBy8... (encrypted)
    password: AgBj3... (encrypted)
```

**Trade-offs**:
- **Pro**: Secrets in git (GitOps-friendly), encrypted at rest
- **Pro**: Cluster-specific encryption (can't decrypt outside cluster)
- **Con**: No secret rotation without re-encrypting and committing
- **Con**: Loses audit trail from external secret manager
- **Con**: Secrets still stored in etcd (same as regular Secrets)

### Vault Integration in Kubernetes

Two main patterns: sidecar injection and CSI driver.

**Vault Agent Sidecar Injection**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp-role"
        vault.hashicorp.com/agent-inject-secret-database: "secret/data/applications/myapp/production"
        vault.hashicorp.com/agent-inject-template-database: |
          {{- with secret "secret/data/applications/myapp/production" -}}
          export DATABASE_URL="{{ .Data.data.database_url }}"
          export DATABASE_PASSWORD="{{ .Data.data.password }}"
          {{- end }}
    spec:
      serviceAccountName: myapp
      containers:
      - name: myapp
        image: myapp:latest
        command: ["/bin/sh", "-c"]
        args:
        - source /vault/secrets/database && exec /app/start.sh
```

Vault Agent sidecar:
1. Authenticates to Vault using Kubernetes service account
2. Fetches secrets from Vault
3. Renders secrets to `/vault/secrets/database`
4. Keeps secrets fresh (renews leases)

**Vault CSI Driver**:
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  serviceAccountName: myapp
  containers:
  - name: myapp
    image: myapp:latest
    volumeMounts:
    - name: secrets
      mountPath: /mnt/secrets
      readOnly: true
    env:
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: vault-secrets
          key: password
  volumes:
  - name: secrets
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: "vault-database"
```

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-database
spec:
  provider: vault
  parameters:
    vaultAddress: "https://vault.example.com"
    roleName: "myapp-role"
    objects: |
      - objectName: "password"
        secretPath: "secret/data/applications/myapp/production"
        secretKey: "password"
```

CSI driver mounts secrets as files. Can optionally sync to Kubernetes Secret for env var usage.

**Comparison**:

| Feature | Sidecar Injection | CSI Driver |
|---------|------------------|------------|
| **Pod overhead** | Extra container per pod | No extra container |
| **Secret refresh** | Automatic | Manual rotation or TTL |
| **Template flexibility** | High (custom rendering) | Lower (static mapping) |
| **Compatibility** | Any workload | Requires CSI support |

### SOPS (Secrets OPerationS)

Encrypt YAML/JSON files with multiple KMS providers, commit encrypted files to git.

**Installation**:
```bash
brew install sops
```

**Encrypt file**:
```yaml
# secrets.yaml (plaintext)
database:
  username: admin
  password: super-secret

stripe:
  api_key: sk_live_abc123
```

```bash
# Encrypt with AWS KMS
sops --encrypt --kms arn:aws:kms:us-east-1:123456789:key/abc-123 secrets.yaml > secrets.enc.yaml

# Encrypt with multiple KMS (AWS + GCP + Azure)
sops --encrypt \
  --kms arn:aws:kms:us-east-1:123456789:key/abc-123 \
  --gcp-kms projects/myproject/locations/global/keyRings/sops/cryptoKeys/sops-key \
  --azure-kv https://myvault.vault.azure.net/keys/sops-key/abc123 \
  secrets.yaml > secrets.enc.yaml
```

**Encrypted file** (safe to commit):
```yaml
database:
  username: ENC[AES256_GCM,data:8xKjp...,iv:...,tag:...,type:str]
  password: ENC[AES256_GCM,data:m3Kq2...,iv:...,tag:...,type:str]

sops:
  kms:
  - arn: arn:aws:kms:us-east-1:123456789:key/abc-123
    created_at: "2025-11-15T10:00:00Z"
  gcp_kms:
  - resource_id: projects/myproject/locations/global/keyRings/sops/cryptoKeys/sops-key
  mac: ENC[AES256_GCM,data:abc...]
```

**Decrypt**:
```bash
# Decrypt to stdout
sops -d secrets.enc.yaml

# Edit encrypted file (decrypts, opens editor, re-encrypts on save)
sops secrets.enc.yaml

# Decrypt and apply to Kubernetes
sops -d secrets.enc.yaml | kubectl apply -f -
```

**Use in CI/CD**:
```yaml
# GitHub Actions
- name: Decrypt secrets
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: |
    sops -d secrets.enc.yaml > secrets.yaml
    kubectl apply -f secrets.yaml
```

**Trade-offs**:
- **Pro**: GitOps-friendly (encrypted files in git)
- **Pro**: Multi-cloud KMS support
- **Pro**: Fine-grained encryption (encrypts values, not keys)
- **Con**: Manual decrypt/encrypt workflow
- **Con**: No automatic secret rotation
- **Con**: KMS keys must be accessible where secrets are decrypted

## Encryption Key Management

Secrets protect data. Encryption keys protect secrets. Key management is critical.

### Key Hierarchy (KEK and DEK)

Don't use one key for everything. Use key hierarchy.

**Architecture**:
```
┌──────────────────────────┐
│ Master Key (KEK)         │  Rarely used, stored in HSM
│ Key Encryption Key       │
└────────────┬─────────────┘
             │ Encrypts
             ▼
┌──────────────────────────┐
│ Data Encryption Keys     │  Actually encrypt data
│ (DEKs)                   │  Rotated frequently
│ - Customer A key         │
│ - Customer B key         │
│ - Database encryption key│
└──────────────────────────┘
```

**Why hierarchy**:
- Master key rarely changes (changing it would require re-encrypting all DEKs)
- DEKs can be rotated without touching master key
- Different DEKs for different data types (isolation)
- Compromised DEK only affects subset of data

### Envelope Encryption

Encrypt data with data encryption key (DEK), encrypt DEK with key encryption key (KEK).

**Process**:
```
1. Generate random DEK (AES-256 key)
2. Encrypt data with DEK → ciphertext
3. Encrypt DEK with KEK → encrypted DEK
4. Store: encrypted DEK + ciphertext
5. Discard plaintext DEK

To decrypt:
1. Decrypt encrypted DEK with KEK → plaintext DEK
2. Decrypt ciphertext with plaintext DEK → data
3. Discard plaintext DEK
```

**Example with AWS KMS**:
```python
import boto3
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

kms_client = boto3.client('kms')

def encrypt_data(plaintext, kms_key_id):
    # 1. Generate random DEK
    dek_response = kms_client.generate_data_key(
        KeyId=kms_key_id,
        KeySpec='AES_256'
    )

    plaintext_dek = dek_response['Plaintext']
    encrypted_dek = dek_response['CiphertextBlob']

    # 2. Encrypt data with DEK
    iv = os.urandom(12)
    cipher = Cipher(
        algorithms.AES(plaintext_dek),
        modes.GCM(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(plaintext.encode()) + encryptor.finalize()

    # 3. Return encrypted DEK + IV + ciphertext + tag
    return {
        'encrypted_dek': encrypted_dek,
        'iv': iv,
        'ciphertext': ciphertext,
        'tag': encryptor.tag
    }

def decrypt_data(encrypted_data, kms_key_id):
    # 1. Decrypt DEK with KMS
    dek_response = kms_client.decrypt(
        CiphertextBlob=encrypted_data['encrypted_dek']
    )
    plaintext_dek = dek_response['Plaintext']

    # 2. Decrypt data with DEK
    cipher = Cipher(
        algorithms.AES(plaintext_dek),
        modes.GCM(encrypted_data['iv'], encrypted_data['tag']),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    plaintext = decryptor.update(encrypted_data['ciphertext']) + decryptor.finalize()

    return plaintext.decode()

# Usage
kms_key_id = 'arn:aws:kms:us-east-1:123456789:key/abc-123'
sensitive_data = "Credit card: 4111-1111-1111-1111"

encrypted = encrypt_data(sensitive_data, kms_key_id)
# Store encrypted['encrypted_dek'], encrypted['iv'], encrypted['ciphertext'], encrypted['tag'] in database

decrypted = decrypt_data(encrypted, kms_key_id)
print(decrypted)  # Credit card: 4111-1111-1111-1111
```

**Benefits**:
- DEK never stored in plaintext (only encrypted DEK is stored)
- Rotating KEK doesn't require re-encrypting data (only re-encrypt DEKs)
- Can encrypt large amounts of data (DEK used locally, no API call per record)

### Key Rotation Strategies

**Manual rotation** (BAD):
1. Generate new key
2. Re-encrypt all data with new key
3. Delete old key
4. Hope nothing breaks

Manual rotation is error-prone and requires downtime for large datasets.

**Versioned keys** (BETTER):
```
Key ID: database-encryption-key
├── Version 1 (created 2024-01-01, active until 2024-06-01)
├── Version 2 (created 2024-06-01, active until 2024-12-01)
└── Version 3 (created 2024-12-01, currently active)
```

- New data encrypted with current version
- Old data remains encrypted with previous version
- Decryption specifies version
- Background job re-encrypts old data to current version

**Example with Vault Transit**:
```bash
# Enable transit engine
vault secrets enable transit

# Create key with automatic rotation
vault write transit/keys/customer-data \
  auto_rotate_period=30d  # Rotate every 30 days

# Encrypt data (uses latest key version)
vault write transit/encrypt/customer-data \
  plaintext=$(echo "sensitive data" | base64)
# Returns: vault:v3:ciphertext...  (v3 indicates key version)

# Decrypt (automatically uses correct version)
vault write transit/decrypt/customer-data \
  ciphertext="vault:v3:ciphertext..."

# Rewrap (re-encrypt with latest version without decrypting)
vault write transit/rewrap/customer-data \
  ciphertext="vault:v1:old-ciphertext..."
# Returns: vault:v3:new-ciphertext...
```

**Background re-encryption job**:
```python
import hvac

client = hvac.Client(url='https://vault.example.com')
client.token = 'app-token'

# Fetch records encrypted with old key versions
old_records = db.query("SELECT id, encrypted_data FROM users WHERE key_version < 3")

for record in old_records:
    # Rewrap without decrypting (Vault does it internally)
    response = client.secrets.transit.rewrap_data(
        name='customer-data',
        ciphertext=record['encrypted_data']
    )

    new_ciphertext = response['data']['ciphertext']

    # Update database
    db.execute(
        "UPDATE users SET encrypted_data = ?, key_version = 3 WHERE id = ?",
        new_ciphertext, record['id']
    )
```

**Key retirement**:
```bash
# Set minimum decryption version (prevent decryption with old keys)
vault write transit/keys/customer-data/config \
  min_decryption_version=2

# Now attempts to decrypt with version 1 will fail
# Forces re-encryption to newer version
```

### Hardware Security Modules (HSM)

HSM: Tamper-resistant hardware device that stores and uses cryptographic keys without exposing them.

**Use cases**:
- Root keys for key hierarchy
- Payment processing (PCI-DSS Level 1 compliance)
- Certificate authorities
- Government/military applications

**AWS CloudHSM**:
```python
import boto3

# KMS key backed by CloudHSM
kms_client = boto3.client('kms')

response = kms_client.create_key(
    Description='Master encryption key',
    Origin='AWS_CLOUDHSM',  # Key material in HSM
    KeyUsage='ENCRYPT_DECRYPT'
)

# Use like normal KMS key, but key never leaves HSM
kms_key_id = response['KeyMetadata']['KeyId']
```

**Azure Key Vault HSM**:
```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.keys import KeyClient

credential = DefaultAzureCredential()
client = KeyClient(vault_url="https://myvault.vault.azure.net/", credential=credential)

# Create HSM-backed key
key = client.create_rsa_key(
    "master-key",
    hardware_protected=True  # HSM-backed
)
```

**Trade-offs**:
- **Pro**: Highest security (keys never leave HSM)
- **Pro**: Compliance requirements (PCI-DSS, FIPS 140-2)
- **Con**: Expensive ($1-5k/month)
- **Con**: Complex setup and management
- **Con**: Performance limitations (HSMs have throughput limits)

**When to use HSM**:
- Compliance mandates it
- Storing root keys for key hierarchy
- Very high-value data (financial, healthcare)

**When software keys are fine**:
- Most applications
- Non-regulated data
- Development/staging environments

## Certificate Management

TLS certificates are secrets with expiration dates. Automation prevents outages.

### TLS Certificate Lifecycle

**Manual process (DON'T DO THIS)**:
1. Generate CSR (Certificate Signing Request)
2. Submit to Certificate Authority
3. Wait for approval (days)
4. Download certificate
5. Install on server
6. Set calendar reminder for renewal in 1 year
7. Forget
8. Certificate expires, site goes down

**Automated process**:
1. cert-manager generates CSR
2. Automated ACME protocol (Let's Encrypt)
3. Certificate issued (minutes)
4. cert-manager installs certificate
5. cert-manager renews 30 days before expiration
6. No human intervention

### cert-manager in Kubernetes

**Installation**:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

**ClusterIssuer (Let's Encrypt)**:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

**Certificate resource**:
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-example-com
  namespace: production
spec:
  secretName: api-example-com-tls  # Kubernetes Secret name
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
  - www.api.example.com
```

cert-manager:
1. Generates private key and CSR
2. Requests certificate from Let's Encrypt
3. Proves domain ownership (HTTP-01 or DNS-01 challenge)
4. Receives certificate
5. Stores in Kubernetes Secret `api-example-com-tls`
6. Renews automatically 30 days before expiration

**Ingress using certificate**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-example-com-tls  # cert-manager creates this
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
```

### Let's Encrypt Automation

**HTTP-01 challenge** (proves you control domain by serving file at `/.well-known/acme-challenge/`):
```
1. cert-manager requests certificate for api.example.com
2. Let's Encrypt responds: "Serve file at http://api.example.com/.well-known/acme-challenge/abc123 with content xyz789"
3. cert-manager creates Ingress rule to serve the challenge
4. Let's Encrypt verifies file is served correctly
5. Let's Encrypt issues certificate
6. cert-manager stores certificate in Secret
```

**DNS-01 challenge** (proves you control domain by creating TXT record):
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-account-key
    solvers:
    - dns01:
        route53:  # AWS Route53
          region: us-east-1
          accessKeyID: AKIAIOSFODNN7EXAMPLE
          secretAccessKeySecretRef:
            name: route53-credentials
            key: secret-access-key
```

DNS-01 allows wildcard certificates (`*.example.com`).

### Certificate Rotation

**Automatic renewal** (cert-manager):
- Checks certificates daily
- Renews when less than 30 days remain
- Updates Secret with new certificate
- Ingress controller picks up new certificate (no restart needed with most controllers)

**Manual verification**:
```bash
# Check certificate expiration
kubectl get certificate -n production
# NAME                READY   SECRET                  AGE
# api-example-com     True    api-example-com-tls     45d

kubectl describe certificate api-example-com -n production
# Events:
#   Normal  Renewed   30m   cert-manager  Certificate renewed successfully

# Check actual certificate expiration
openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null | \
  openssl x509 -noout -dates
# notBefore=Nov 15 00:00:00 2025 GMT
# notAfter=Feb 13 23:59:59 2026 GMT  (90 days)
```

### mTLS for Service-to-Service Authentication

Mutual TLS: Both client and server present certificates.

**Use case**: Service A calling Service B needs to prove its identity.

**cert-manager for internal CA**:
```yaml
# Self-signed ClusterIssuer (root CA)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}

---
# Root CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: root-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: internal-ca
  secretName: root-ca-secret
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer

---
# CA ClusterIssuer (issues certificates for services)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: root-ca-secret

---
# Service certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-service-cert
  namespace: production
spec:
  secretName: api-service-tls
  commonName: api-service.production.svc.cluster.local
  dnsNames:
  - api-service
  - api-service.production.svc.cluster.local
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
```

**Application using mTLS**:
```python
import requests

# Client certificate
response = requests.get(
    'https://service-b.production.svc.cluster.local',
    cert=('/mnt/certs/tls.crt', '/mnt/certs/tls.key'),  # Client cert
    verify='/mnt/certs/ca.crt'  # Verify server cert
)
```

Service B verifies client certificate was issued by internal CA.

## Secret Injection Patterns

How secrets actually get into applications.

### Environment Variables

**Pros**:
- Simple, widely supported
- Works everywhere (containers, VMs, serverless)

**Cons**:
- Visible in process listings (`ps auxe`)
- Logged in error reports
- Can't update without restart

**Example**:
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    env:
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: password
```

### Volume Mounts

**Pros**:
- Not visible in process listings
- Can be updated without restart (if application watches files)
- Supports multiple secrets as separate files

**Cons**:
- Application must read files
- File permissions matter

**Example**:
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    volumeMounts:
    - name: secrets
      mountPath: /mnt/secrets
      readOnly: true
  volumes:
  - name: secrets
    secret:
      secretName: database-credentials
      items:
      - key: password
        path: database-password
        mode: 0400  # Read-only by owner
```

**Application reads file**:
```python
with open('/mnt/secrets/database-password', 'r') as f:
    db_password = f.read().strip()
```

**Watch for updates**:
```python
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class SecretWatcher(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path == '/mnt/secrets/database-password':
            print("Secret updated, reloading...")
            reload_database_connection()

observer = Observer()
observer.schedule(SecretWatcher(), '/mnt/secrets', recursive=False)
observer.start()
```

### Init Containers

Fetch secrets before main container starts.

**Example**:
```yaml
apiVersion: v1
kind: Pod
spec:
  initContainers:
  - name: fetch-secrets
    image: vault:latest
    command:
    - sh
    - -c
    - |
      vault login -method=kubernetes role=myapp
      vault kv get -field=password secret/database > /secrets/db-password
    volumeMounts:
    - name: secrets
      mountPath: /secrets
  containers:
  - name: app
    volumeMounts:
    - name: secrets
      mountPath: /mnt/secrets
      readOnly: true
  volumes:
  - name: secrets
    emptyDir:
      medium: Memory  # tmpfs (RAM, not disk)
```

**Pros**:
- Secrets fetched once at startup
- No sidecar overhead
- Can use complex secret retrieval logic

**Cons**:
- Secrets can't be rotated without pod restart
- Init container failure blocks pod startup

### Sidecar Pattern

Sidecar container continuously updates secrets.

**Example (Vault Agent)**:
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    volumeMounts:
    - name: secrets
      mountPath: /vault/secrets
  - name: vault-agent
    image: vault:latest
    args:
    - agent
    - -config=/vault/config/agent.hcl
    volumeMounts:
    - name: vault-config
      mountPath: /vault/config
    - name: secrets
      mountPath: /vault/secrets
  volumes:
  - name: secrets
    emptyDir:
      medium: Memory
  - name: vault-config
    configMap:
      name: vault-agent-config
```

**Vault Agent config**:
```hcl
# agent.hcl
vault {
  address = "https://vault.example.com"
}

auto_auth {
  method {
    type = "kubernetes"
    config = {
      role = "myapp"
    }
  }
}

template {
  source      = "/vault/config/database.tpl"
  destination = "/vault/secrets/database"
}
```

**Pros**:
- Automatic secret renewal
- Secrets refreshed without pod restart
- Handles lease renewal

**Cons**:
- Extra container per pod (memory/CPU overhead)
- More complex configuration

### Direct API Calls

Application fetches secrets via API.

**Example**:
```python
import hvac
import threading
import time

class SecretManager:
    def __init__(self, vault_addr):
        self.client = hvac.Client(url=vault_addr)
        self._authenticate()
        self._secrets = {}
        self._start_renewal_thread()

    def _authenticate(self):
        # Kubernetes auth
        with open('/var/run/secrets/kubernetes.io/serviceaccount/token') as f:
            jwt = f.read()
        self.client.auth.kubernetes.login(role='myapp', jwt=jwt)

    def get_secret(self, path, key):
        if path not in self._secrets:
            response = self.client.secrets.kv.v2.read_secret_version(path=path)
            self._secrets[path] = response['data']['data']
        return self._secrets[path][key]

    def _start_renewal_thread(self):
        def renew():
            while True:
                time.sleep(300)  # Every 5 minutes
                try:
                    self.client.auth.token.renew_self()
                except Exception as e:
                    print(f"Token renewal failed: {e}")
                    self._authenticate()

        threading.Thread(target=renew, daemon=True).start()

# Usage
secrets = SecretManager('https://vault.example.com')
db_password = secrets.get_secret('applications/myapp/production', 'database_password')
```

**Pros**:
- No sidecar overhead
- Full control over secret lifecycle
- Can implement custom caching

**Cons**:
- Application code complexity
- Runtime dependency on secret manager
- Must handle authentication, renewal, errors

## Compliance and Auditing

Regulations require demonstrating how secrets are managed.

### Audit Logging

Every secret access must be logged.

**Vault audit logs**:
```bash
# Enable audit logging to file
vault audit enable file file_path=/var/log/vault/audit.log

# Enable syslog
vault audit enable syslog tag="vault" facility="LOCAL7"
```

**Log entry example**:
```json
{
  "time": "2025-11-15T10:15:30.123Z",
  "type": "response",
  "auth": {
    "client_token": "hmac-sha256:abc123...",
    "policies": ["api-service-production"],
    "metadata": {
      "role": "api-service",
      "service_account_namespace": "production"
    }
  },
  "request": {
    "operation": "read",
    "path": "secret/data/applications/api/production",
    "remote_address": "10.0.1.50"
  },
  "response": {
    "data": {
      "data": {
        "database_password": "hmac-sha256:xyz789..."  # HMAC, not plaintext
      }
    }
  }
}
```

**AWS Secrets Manager auditing** (CloudTrail):
```json
{
  "eventTime": "2025-11-15T10:15:30Z",
  "eventName": "GetSecretValue",
  "userIdentity": {
    "type": "AssumedRole",
    "principalId": "AIDACKCEVSQ6C2EXAMPLE",
    "arn": "arn:aws:sts::123456789:assumed-role/ApiServiceRole/i-0abcd1234"
  },
  "requestParameters": {
    "secretId": "production/database"
  },
  "responseElements": null,
  "sourceIPAddress": "10.0.1.50"
}
```

**What to monitor**:
- Failed authentication attempts
- Access to high-value secrets (production database, encryption keys)
- Secret access from unexpected locations
- Secret retrieval outside business hours
- High volume of secret reads (potential exfiltration)

### Compliance Requirements

**PCI-DSS** (Payment Card Industry):
- Requirement 3.4: Encrypt cardholder data storage
- Requirement 3.5: Document and implement key management
- Requirement 3.6: Key management procedures (generation, distribution, rotation, destruction)
- Requirement 8.2: Multi-factor authentication for admin access to systems storing cardholder data

**Implications**:
- Encryption keys for cardholder data must be in HSM or equivalent
- Key rotation quarterly minimum
- Access to keys must be logged
- Keys must be separate from data

**HIPAA** (Healthcare):
- § 164.312(a)(2)(iv): Encryption and decryption
- § 164.308(a)(5)(ii)(D): Password management

**Implications**:
- PHI must be encrypted at rest and in transit
- Encryption keys managed separately from PHI
- Access controls on encryption keys
- Audit logs of key access

**SOC 2** (Service Organization Control):
- CC6.1: Logical and physical access controls
- CC6.6: Encryption of data at rest and in transit
- CC7.2: System monitoring

**Implications**:
- Documented secret management procedures
- Access reviews (who has access to what secrets)
- Audit logs of secret access
- Change management for secret rotation

### Secret Access Reviews

Periodic review of who/what has access to secrets.

**Quarterly review checklist**:
1. List all service accounts with secret access
2. Verify each service still exists and needs access
3. Remove access for decommissioned services
4. Verify principle of least privilege (no over-permissioned access)
5. Review audit logs for anomalies
6. Document review in compliance records

**Automated access review**:
```python
import hvac

client = hvac.Client(url='https://vault.example.com')
client.token = 'admin-token'

# List all policies
policies = client.sys.list_policies()['data']['policies']

report = []

for policy in policies:
    # Get policy details
    policy_data = client.sys.read_policy(name=policy)

    # List entities using this policy
    entities = client.identity.list_entities_by_name()
    policy_users = [
        e for e in entities['data']['keys']
        if policy in client.identity.read_entity_by_name(name=e)['data']['policies']
    ]

    report.append({
        'policy': policy,
        'permissions': policy_data['data']['rules'],
        'users': policy_users,
        'last_reviewed': 'TODO: Track this'
    })

# Generate report for compliance team
for item in report:
    print(f"Policy: {item['policy']}")
    print(f"Users: {', '.join(item['users'])}")
    print(f"Permissions: {item['permissions']}")
    print()
```

### Automated Compliance Checks

Continuous validation of secret management policies.

**Open Policy Agent (OPA)** for policy enforcement:
```rego
# secrets-policy.rego

package kubernetes.admission

# Deny pods with secrets in environment variables (require volume mounts)
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    env := container.env[_]
    env.valueFrom.secretKeyRef

    msg := sprintf("Container %v uses secret in environment variable. Use volume mount instead.", [container.name])
}

# Deny pods without secret volume read-only
deny[msg] {
    input.request.kind.kind == "Pod"
    volume := input.request.object.spec.volumes[_]
    volume.secret
    not is_read_only(input.request.object.spec.containers, volume.name)

    msg := sprintf("Secret volume %v is not mounted read-only", [volume.name])
}

is_read_only(containers, volume_name) {
    container := containers[_]
    mount := container.volumeMounts[_]
    mount.name == volume_name
    mount.readOnly == true
}
```

**git-secrets in CI/CD**:
```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  scan-secrets:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0  # Full history

    - name: Install git-secrets
      run: |
        git clone https://github.com/awslabs/git-secrets.git
        cd git-secrets
        make install

    - name: Scan for secrets
      run: |
        git secrets --register-aws
        git secrets --scan-history
```

## Zero-Trust Secret Access

Traditional security: Trust network location. Zero-trust: Trust identity.

### Identity-Based Access

Every request must prove identity, regardless of network location.

**Example**: Service in Kubernetes shouldn't access secret just because it's in the cluster. Must prove identity via service account.

**Vault with Kubernetes auth**:
```hcl
# Policy for api-service in production namespace
path "secret/data/applications/api/production/*" {
  capabilities = ["read"]
}

# Deny staging secrets
path "secret/data/applications/api/staging/*" {
  capabilities = ["deny"]
}
```

**Kubernetes role binding**:
```bash
vault write auth/kubernetes/role/api-service-production \
  bound_service_account_names=api-service \
  bound_service_account_namespaces=production \
  policies=api-service-production \
  ttl=1h
```

Only pod with service account `api-service` in namespace `production` can access production secrets.

### Short-Lived Tokens

Long-lived credentials increase breach impact. Use short-lived tokens.

**Vault tokens with TTL**:
```bash
# Create 1-hour token
vault token create -policy=api-service-production -ttl=1h

# Token expires after 1 hour, must renew or re-authenticate
```

**AWS STS temporary credentials**:
```python
import boto3

sts_client = boto3.client('sts')

# Assume role for 1 hour
credentials = sts_client.assume_role(
    RoleArn='arn:aws:iam::123456789:role/ApiServiceRole',
    RoleSessionName='api-service-session',
    DurationSeconds=3600
)

# Use temporary credentials
temp_access_key = credentials['Credentials']['AccessKeyId']
temp_secret_key = credentials['Credentials']['SecretAccessKey']
session_token = credentials['Credentials']['SessionToken']
expiration = credentials['Credentials']['Expiration']
```

### Just-in-Time Access

Grant access only when needed, revoke immediately after.

**Scenario**: Developer needs production database access to debug issue.

**Without JIT**:
- Developer has standing access to production database
- Access exists 24/7, whether needed or not
- Forgotten access = security risk

**With JIT**:
1. Developer requests access (Slack bot, web portal, etc.)
2. Request auto-approved (if policy allows) or requires manager approval
3. Temporary credentials generated (valid 2 hours)
4. Access automatically revoked after 2 hours
5. Access logged for audit

**Implementation with Vault**:
```python
# JIT access request
import hvac

client = hvac.Client(url='https://vault.example.com')
client.token = 'requester-token'

# Request production database access
response = client.secrets.database.generate_credentials(
    name='readonly-role',
    ttl='2h'  # Expires in 2 hours
)

username = response['data']['username']
password = response['data']['password']

# Use credentials...

# After 2 hours, Vault automatically revokes credentials
```

**Workflow automation**:
```python
# Slack bot for JIT access
@app.command("/request-db-access")
def request_db_access(ack, command, respond):
    ack()

    user = command['user_name']
    environment = command['text']  # "production" or "staging"

    # Check if user is allowed
    if not is_authorized(user, environment):
        respond(f"❌ You don't have permission for {environment} database access")
        return

    # Generate temporary credentials
    vault_client = get_vault_client()
    creds = vault_client.secrets.database.generate_credentials(
        name=f'{environment}-readonly',
        ttl='2h'
    )

    # Send credentials privately
    respond(f"✅ Access granted for 2 hours\n"
            f"Host: {environment}-db.example.com\n"
            f"Username: {creds['data']['username']}\n"
            f"Password: {creds['data']['password']}\n"
            f"Expires: {time.time() + 7200}")

    # Log access request
    audit_log(user, environment, creds['lease_id'])
```

### Multi-Factor Authentication

High-value secrets require MFA.

**Vault MFA**:
```bash
# Enable MFA for specific path
vault write sys/mfa/method/totp/myapp \
  issuer=Vault \
  period=30 \
  key_size=30 \
  algorithm=SHA256

# Enforce MFA for production secrets
vault write sys/mfa/login-enforcement/myapp \
  mfa_method_ids=myapp \
  auth_method_accessors=$(vault auth list -format=json | jq -r '.["kubernetes/"].accessor')
```

**Access flow**:
1. Service authenticates with Kubernetes service account
2. Vault requires MFA for production secret access
3. Service provides TOTP code
4. Vault grants access

For human access, MFA is standard. For service access, MFA is rare (services can't enter TOTP codes). Use strong identity verification instead.

## Incident Response for Secret Exposure

What to do when secrets are compromised.

### Detection

**Automated secret scanning**:
- GitHub secret scanning (built-in)
- GitGuardian (SaaS)
- TruffleHog (open source)
- git-secrets (AWS-focused)

**Alerts**:
- New secret committed to repository
- Secret accessed from unusual IP
- High volume secret access
- Failed authentication attempts spike

### Response Playbook

**Phase 1: Immediate containment (0-15 minutes)**

1. **Revoke the compromised secret**
   - Rotate API key
   - Change password
   - Revoke OAuth token
   - Disable service account

2. **Verify revocation worked**
   - Test old secret (should fail)
   - Check service dashboards for active sessions

3. **Generate and deploy new secret**
   - Create replacement secret
   - Update applications
   - Verify applications work with new secret

**Phase 2: Investigation (15 minutes - 4 hours)**

4. **Determine scope of exposure**
   - How long was secret exposed?
   - Who had access to exposed secret?
   - Was secret used by unauthorized parties?

5. **Review audit logs**
   - Check for unauthorized access
   - Identify affected systems/data
   - Determine if data was exfiltrated

6. **Assess damage**
   - What could an attacker do with this secret?
   - Was any data accessed/modified/deleted?
   - Are there signs of ongoing attack?

**Phase 3: Eradication and recovery (4-24 hours)**

7. **Remove secret from git history** (if applicable)
   ```bash
   # Use BFG Repo-Cleaner
   bfg --replace-text passwords.txt repo.git
   cd repo.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

8. **Notify affected parties**
   - Internal security team
   - Management
   - Customers (if their data was accessed)
   - Compliance/legal (if regulated data)

9. **Implement additional monitoring**
   - Watch for unusual activity
   - Set up alerts for affected systems
   - Monitor for 30+ days

**Phase 4: Post-incident review (1-7 days)**

10. **Root cause analysis**
    - Why was secret exposed?
    - What controls failed?
    - How can we prevent recurrence?

11. **Implement preventive measures**
    - Add pre-commit hooks
    - Improve secret scanning
    - Update training
    - Enhance access controls

12. **Document incident**
    - Timeline
    - Actions taken
    - Lessons learned
    - Process improvements

### Automated Revocation

Automatically revoke secrets when exposure detected.

**GitHub webhook for secret commits**:
```python
from flask import Flask, request
import hmac
import hashlib

app = Flask(__name__)

@app.route('/github-webhook', methods=['POST'])
def github_webhook():
    # Verify webhook signature
    signature = request.headers.get('X-Hub-Signature-256')
    body = request.data

    expected_sig = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected_sig):
        return 'Invalid signature', 403

    event = request.headers.get('X-GitHub-Event')

    if event == 'secret_scanning_alert':
        alert = request.json

        # Extract secret details
        secret_type = alert['alert']['secret_type']
        secret_location = alert['alert']['locations'][0]['details']['path']

        # Automatically revoke
        if secret_type == 'aws_access_key_id':
            revoke_aws_key(alert['alert']['secret'])
        elif secret_type == 'stripe_api_key':
            revoke_stripe_key(alert['alert']['secret'])

        # Notify team
        send_slack_alert(f"Secret exposed in {secret_location}, automatically revoked")

    return 'OK', 200
```

## Developer Experience

Security that breaks productivity gets circumvented. Make secrets easy to use.

### Secret Discovery

Developers need to know what secrets exist and how to use them.

**Documentation**:
```markdown
# Secret Reference

## Production Database
- **Location**: AWS Secrets Manager `production/database`
- **Format**: JSON with `username`, `password`, `host`, `port`, `database`
- **Access**: Production services only
- **Rotation**: Automatic every 30 days

## Stripe API Key
- **Location**: Vault `secret/applications/api/production/stripe`
- **Format**: String starting with `sk_live_`
- **Access**: API service in production namespace
- **Rotation**: Manual (quarterly)

## How to Add New Secret
1. Store in Vault: `vault kv put secret/applications/myapp/production my_secret=value`
2. Update access policy: Add to `myapp-production` policy
3. Update this documentation
4. Update `.env.example` with placeholder
```

**CLI tool for developers**:
```bash
# Custom CLI for secret access
$ myapp-secrets list
Available secrets for myapp in development:
- database (postgres connection)
- stripe (test API key)
- redis (connection URL)

$ myapp-secrets get database
postgres://localhost/myapp_dev

$ myapp-secrets get stripe
sk_test_abc123xyz789

# Production requires additional auth
$ myapp-secrets get --env=production database
❌ Production access requires approval. Request access: /request-prod-access
```

### Local Development Tooling

Developers need secrets locally without compromising security.

**Option 1: .env files with test credentials**
```bash
# .env (local only, not committed)
DATABASE_URL=postgres://localhost/myapp_dev
STRIPE_KEY=sk_test_abc123  # Stripe test key, safe to share
REDIS_URL=redis://localhost:6379
```

**Option 2: Vault CLI integration**
```bash
# vault-env.sh - source this in .bashrc/.zshrc
export VAULT_ADDR='https://vault.example.com'
vault login -method=oidc  # SSO login

# Fetch development secrets
eval $(vault kv get -format=json secret/applications/myapp/development | jq -r '.data.data | to_entries | .[] | "export \(.key)=\(.value)"')

# Now run application
python app.py
```

**Option 3: Docker Compose with secrets**
```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db/myapp
      - STRIPE_KEY=sk_test_abc123
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=myapp
```

Local environment uses local credentials, production uses Vault/AWS Secrets Manager.

### Secret Bootstrapping for New Services

New service needs secrets. How does it get initial credentials?

**Manual bootstrap** (acceptable for small teams):
1. Create Vault policy for new service
2. Create Kubernetes service account
3. Bind Vault policy to service account
4. Deploy service (automatically authenticates via service account)

**Automated bootstrap** (Terraform):
```hcl
# terraform/vault.tf

# Create policy for new service
resource "vault_policy" "myapp_production" {
  name = "myapp-production"

  policy = <<EOT
path "secret/data/applications/myapp/production/*" {
  capabilities = ["read"]
}
EOT
}

# Create Kubernetes auth role
resource "vault_kubernetes_auth_backend_role" "myapp_production" {
  backend                          = "kubernetes"
  role_name                        = "myapp-production"
  bound_service_account_names      = ["myapp"]
  bound_service_account_namespaces = ["production"]
  token_policies                   = ["myapp-production"]
  token_ttl                        = 3600
}

# Create secrets
resource "vault_generic_secret" "myapp_production" {
  path = "secret/applications/myapp/production"

  data_json = jsonencode({
    database_url = var.database_url
    stripe_key   = var.stripe_key
  })
}
```

```bash
# Deploy new service
terraform apply
kubectl apply -f myapp-deployment.yaml

# Service automatically has access to secrets
```

### Reducing Secret Sprawl

More secrets = more attack surface. Minimize secrets needed.

**Pattern 1: Service-to-service authentication without secrets**

Instead of:
- Service A has API key for Service B
- Service B has API key for Service C
- Service C has API key for Service D

Use mutual TLS (mTLS) or JWT-based authentication:
- Services prove identity with certificates (managed by cert-manager)
- No shared secrets

**Pattern 2: Federated identity**

Instead of:
- Service has AWS credentials
- Service has GCP credentials
- Service has Azure credentials

Use workload identity:
- Service authenticates using platform identity (Kubernetes service account)
- Platform provides short-lived credentials for cloud resources

**Pattern 3: Database connection pooling**

Instead of:
- 10 services × 3 environments = 30 database credentials

Use connection pooler (PgBouncer) with single credentials, authenticate services to pooler via mTLS.

## Common Mistakes at Scale

Patterns that fail at enterprise scale.

### Mistake 1: Shared Secrets Across Services

**Symptom**: One database credential used by all microservices.

**Problem**:
- Can't trace which service accessed what
- Compromise of one service compromises all
- Can't apply least privilege
- Rotation affects all services simultaneously

**Solution**: Per-service credentials with minimal necessary permissions.

### Mistake 2: Long-Lived Static Credentials

**Symptom**: Database password hasn't changed in 3 years.

**Problem**:
- Unknown number of copies exist
- Impossible to revoke without breaking everything
- Compromise goes undetected

**Solution**: Short-lived dynamic credentials or automated rotation.

### Mistake 3: No Secret Inventory

**Symptom**: Can't list all secrets in use.

**Problem**:
- Can't audit secret access
- Decommissioned services still have access
- Don't know what to rotate

**Solution**: Centralized secret management with inventory and access reviews.

### Mistake 4: Secrets in Container Images

**Symptom**: `docker history myapp:latest` shows secrets.

**Problem**:
- Anyone with image access has secrets
- Secrets persist in image registry
- Can't rotate without rebuilding image

**Solution**: Inject secrets at runtime (environment variables, volume mounts, secret manager).

### Mistake 5: No Rotation Procedure

**Symptom**: Secret compromise, no one knows how to rotate.

**Problem**:
- Panic during incident
- Extended downtime
- Mistakes during rotation

**Solution**: Document and test rotation procedures quarterly.

### Mistake 6: Over-Permissioned Access

**Symptom**: Application has access to all secrets "just in case."

**Problem**:
- Compromise gives attacker broad access
- Compliance violations
- Harder to audit

**Solution**: Least privilege - grant only necessary access.

### Mistake 7: Secrets in Logs

**Symptom**: `grep 'password' /var/log/app.log` returns secrets.

**Problem**:
- Logs shipped to multiple systems
- Log retention longer than secret rotation
- Log access often less controlled than secret access

**Solution**: Scrub secrets from logs, use structured logging with secret masking.

## Real-World Case Studies

### Case Study 1: Uber 2016 Breach

**What happened**:
- Engineer stored AWS credentials in private GitHub repo
- Attacker found credentials in repo (repo was private but had been forked)
- Attacker accessed Uber's AWS S3 bucket
- 57 million customer and driver records stolen

**Secret management failures**:
- Long-lived AWS access keys instead of IAM roles
- No detection of unusual S3 access
- Secrets in source code

**Lessons**:
- Use IAM roles instead of static access keys
- Monitor for unusual access patterns
- Never commit secrets to git (even private repos)

### Case Study 2: CircleCI Environment Variable Exposure

**What happened**:
- CircleCI allowed project environment variables to be readable by all org members
- Assumed "private" meant secure
- Developers stored production database credentials as project environment variables

**Secret management failures**:
- Misunderstood CircleCI permission model
- Production credentials accessible to entire org
- No audit logging of who accessed variables

**Lessons**:
- Understand platform security model
- Use dedicated secret managers, not platform environment variables for sensitive secrets
- Regular access reviews

### Case Study 3: Codecov Supply Chain Attack 2021

**What happened**:
- Attacker compromised Codecov Bash uploader script
- Modified script to exfiltrate environment variables
- Thousands of companies' CI/CD secrets stolen (including credentials for major tech companies)

**Secret management failures**:
- Secrets stored as environment variables in CI/CD
- No network egress filtering from CI/CD
- Third-party script executed with full access

**Lessons**:
- Minimize secrets in CI/CD (use OIDC for cloud access)
- Network egress filtering
- Verify integrity of third-party scripts

### Case Study 4: Tesla Kubernetes Cryptojacking 2018

**What happened**:
- Tesla's Kubernetes console exposed without password
- Attackers accessed Kubernetes
- Found AWS credentials in pod environment variables
- Used credentials to run cryptomining in Tesla's AWS account

**Secret management failures**:
- Kubernetes console unauthenticated
- AWS credentials in environment variables
- No detection of unusual AWS usage

**Lessons**:
- Secure all admin interfaces
- Use IAM roles for pods (kube2iam/IRSA), not static credentials
- Monitor cloud resource usage

## Decision Matrix: Choosing Secret Management Approach

| Scenario | Recommended Approach | Rationale |
|----------|---------------------|-----------|
| **Solo developer, MVP, < 10 secrets** | `.env` files + `.gitignore` | Simple, sufficient for non-production |
| **Small team (2-5), production app** | Platform secrets (Heroku Config Vars, Vercel Env Vars) | Managed, easy, cheap |
| **AWS-only, auto-rotation needed** | AWS Secrets Manager | Native RDS rotation |
| **Multi-cloud or hybrid** | HashiCorp Vault | Cloud-agnostic |
| **Kubernetes, < 50 secrets** | External Secrets Operator + cloud secret service | Leverages existing cloud infrastructure |
| **Kubernetes, > 50 secrets, complex policies** | Vault with Kubernetes auth | Dynamic secrets, fine-grained policies |
| **Compliance (PCI-DSS Level 1)** | Cloud HSM-backed secret service | HSM required for compliance |
| **GitOps workflow** | Sealed Secrets or SOPS | Encrypted secrets in git |
| **High-security, zero-trust** | Vault with dynamic secrets + short-lived tokens | Minimal credential lifetime |

---

## Navigation

**Current**: Deep Water Level - Enterprise secret management architecture

**Related Topics**:
- [Secure Coding Practices](../../secure-coding-practices/deep-water/index.md) - Security principles for writing code
- [Deployment Strategy](../../../05-deployment/deployment-strategy/deep-water/index.md) - Injecting secrets during deployment
- [Incident Response](../../../06-operations/incident-response/deep-water/index.md) - Responding to security incidents
- [Supply Chain Security](../../supply-chain-security/deep-water/index.md) - Managing secrets in dependencies and CI/CD
