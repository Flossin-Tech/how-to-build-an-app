---
title: "Infrastructure as Code"
phase: "05-deployment"
topic: "infrastructure-as-code"
depth: "mid-depth"
reading_time: 25
prerequisites: []
related_topics: ["deployment-strategy", "cicd-pipeline-security", "access-control"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Infrastructure as Code - Mid-Depth

## Terraform vs CloudFormation vs Pulumi: Real Trade-offs

### Terraform

**Strengths:**
- **Provider ecosystem:** 3,000+ providers. AWS, Azure, GCP, GitHub, Datadog, PagerDuty, your DNS provider, your monitoring. One tool.
- **State management:** Explicit state tracking. You know what Terraform created and can update or destroy it reliably.
- **Plan before apply:** Always shows what will change before making changes. Catches mistakes.
- **Community:** Huge. Every problem you hit, someone else solved and blogged about.

**Weaknesses:**
- **State file complexity:** You must manage state. Remote backends, locking, team coordination. It's overhead.
- **Learning curve:** HCL (HashiCorp Configuration Language) is another syntax to learn.
- **No rollback:** Destroyed something? Terraform won't undo it. You rebuild from code.
- **Eventual consistency:** Cloud APIs are async. Terraform polls until ready. Sometimes this breaks.

**When to choose Terraform:**
- Multi-cloud (AWS + Azure + GCP)
- Need to manage non-infrastructure (GitHub repos, DNS, monitoring configs)
- Want strong state tracking
- Team comfortable learning HCL

### AWS CloudFormation

**Strengths:**
- **Native AWS integration:** New AWS service? CloudFormation supports it day one.
- **Stack-based:** Create/update/delete entire stacks atomically. Clear ownership.
- **Rollback built-in:** If stack creation fails, CloudFormation automatically rolls back. Terraform doesn't.
- **No state file management:** CloudFormation tracks state internally. You don't manage files.
- **Free:** No separate tool cost.

**Weaknesses:**
- **AWS-only:** Can't manage Azure, GCP, or third-party services.
- **YAML/JSON:** Verbose. 100-line Terraform becomes 300-line CloudFormation.
- **No preview on CLI:** Stack drift detection exists but is separate from updates.
- **Slower:** Stack operations take 5-10 minutes even for small changes.

**When to choose CloudFormation:**
- All-in on AWS
- Want automatic rollback
- Prefer native AWS tooling
- Don't need third-party integrations

### Pulumi

**Strengths:**
- **Real programming languages:** TypeScript, Python, Go, C#, Java. Loops, functions, classes.
- **Type safety:** Catch errors at compile-time. Terraform catches at runtime.
- **Familiar tooling:** npm, pip, go modules. Not learning new package management.
- **Complex logic:** Conditionals, loops, reusable functions. CloudFormation can't do this. Terraform struggles.

**Weaknesses:**
- **Smaller community:** Fewer examples, less Stack Overflow content.
- **Pulumi service dependency:** Free tier exists but state management pushes toward paid service.
- **More complexity:** Real code means real bugs. Infinite loops, runtime errors, dependency hell.
- **Overkill for simple cases:** Spinning up 3 servers? TypeScript is more overhead than Terraform.

**When to choose Pulumi:**
- Complex infrastructure (100+ resources with shared logic)
- Team already expert in TypeScript/Python
- Need type safety
- Dynamic infrastructure (create N servers based on config)

## State Management Patterns

### The State File Problem

Terraform's state file stores the mapping between your code and real infrastructure:

```json
{
  "version": 4,
  "resources": [
    {
      "type": "aws_instance",
      "name": "web_server",
      "provider": "aws",
      "instances": [{
        "attributes": {
          "id": "i-0abcd1234",
          "public_ip": "54.23.45.67",
          "instance_type": "t2.micro"
        }
      }]
    }
  ]
}
```

If two people run `terraform apply` simultaneously:
1. Person A reads state (server is t2.micro)
2. Person B reads state (server is t2.micro)
3. Person A changes to t2.small, writes state
4. Person B changes to t2.medium, writes state (overwrites A's change)
5. State now says t2.medium but A thinks they made it t2.small

Result: Confusion, potential corruption, manual state surgery required.

### Remote State with Locking

Store state remotely with a locking mechanism:

```terraform
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"  # Prevents concurrent access
    encrypt        = true
  }
}
```

**How locking works:**
1. Engineer runs `terraform apply`
2. Terraform writes lock to DynamoDB
3. Second engineer tries `terraform apply`
4. Lock detected → "State is locked by Alice, wait or break lock"
5. First engineer finishes, releases lock
6. Second engineer can now proceed

**State backends:**
- **S3 + DynamoDB:** AWS-native, requires setup but reliable
- **Azure Blob Storage:** Azure-native
- **Terraform Cloud:** Managed service, free for small teams, automatic locking
- **Postgres:** Store state in database, requires self-hosting

### State File Security

State files contain sensitive data:
- Database passwords
- API keys
- Private IP addresses
- Security group configurations

**If your state file leaks, attackers know:**
- Exact infrastructure layout
- How to access systems
- What's running where

**Protection strategies:**
1. **Encrypt at rest:** S3 with server-side encryption, Terraform Cloud encrypts automatically
2. **Encrypt in transit:** HTTPS for remote state
3. **Access control:** Limit who can read state (S3 bucket policies, IAM roles)
4. **Never commit to git:** Add `*.tfstate` to .gitignore
5. **Rotate credentials:** Periodically rotate anything in state files

## Testing Infrastructure Code

### Plan Testing

Before applying changes, examine the plan:

```bash
$ terraform plan

Terraform will perform the following actions:

  # aws_instance.web_server will be updated in-place
  ~ resource "aws_instance" "web_server" {
      ~ instance_type = "t2.micro" -> "t2.small"
        # 15 unchanged attributes hidden
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

**Red flags in plan output:**
- `X to destroy` when you expected 0
- Creating resources you didn't intend
- Changing immutable attributes (forces replacement)

### Automated Testing with Terratest

Write tests that actually provision infrastructure:

```go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestTerraformWebServer(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/web-server",
    }

    // Clean up afterward
    defer terraform.Destroy(t, terraformOptions)

    // Run terraform init and apply
    terraform.InitAndApply(t, terraformOptions)

    // Verify outputs
    instanceID := terraform.Output(t, terraformOptions, "instance_id")
    assert.NotEmpty(t, instanceID)
}
```

**What this catches:**
- Syntax errors in your Terraform
- Invalid configurations (wrong region, unavailable instance type)
- Missing dependencies
- Incorrect outputs

**Cost:** Tests actually create infrastructure. Running this creates and destroys a real server. Budget $1-5 per test run.

### Static Analysis with tflint

Catch errors without deploying:

```bash
$ tflint

2 issue(s) found:

Error: instance_type "t2.micro" is deprecated in us-east-1 (aws_instance_deprecated_instance_type)

  on main.tf line 5:
   5:   instance_type = "t2.micro"

Warning: Missing required tag "Environment"
```

**What tflint catches:**
- Deprecated instance types
- Invalid regions
- Missing required tags
- Security misconfigurations
- Cost optimization opportunities

### Policy as Code

Prevent bad changes from being applied in the first place.

**Sentinel (HashiCorp - Terraform Cloud/Enterprise):**

```hcl
# Policy: All S3 buckets must have encryption enabled

import "tfplan/v2"

# Get all S3 buckets from plan
buckets = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_s3_bucket"
}

# Check each bucket for encryption
bucket_encryption_enabled = rule {
    all buckets as _, bucket {
        bucket.change.after.server_side_encryption_configuration is not null
    }
}

main = rule {
    bucket_encryption_enabled
}
```

If someone tries to create an S3 bucket without encryption, Sentinel blocks it.

**Open Policy Agent (OPA) / Conftest:**

```rego
package main

# Deny if S3 bucket doesn't have versioning
deny[msg] {
    resource := input.resource.aws_s3_bucket[name]
    not resource.versioning.enabled
    msg := sprintf("S3 bucket %v must have versioning enabled", [name])
}
```

Run before apply:
```bash
$ conftest test terraform.tfplan.json
FAIL - terraform.tfplan.json - S3 bucket 'data' must have versioning enabled
```

**What policies enforce:**
- Security (encryption, public access blocks)
- Compliance (tagging standards, approved regions)
- Cost control (no instances larger than c5.2xlarge)
- Naming conventions (all resources prefixed with project name)

## Drift Detection

**The problem:** Someone manually changes infrastructure outside Terraform. Your code says "instance type = t2.small" but actual instance is t2.medium.

### Detecting Drift

```bash
$ terraform plan

Note: Objects have changed outside of Terraform

  # aws_instance.web_server
  ~ resource "aws_instance" "web_server" {
        id            = "i-0abcd1234"
      ~ instance_type = "t2.small" -> "t2.medium" # changed outside Terraform
    }

Terraform will perform the following actions:

  # aws_instance.web_server will be updated in-place
  ~ resource "aws_instance" "web_server" {
      ~ instance_type = "t2.medium" -> "t2.small"
    }
```

Terraform detected drift and wants to fix it (revert to t2.small).

### Drift Strategies

**Option 1: Terraform is source of truth (recommended)**
- Run `terraform apply` regularly (daily via CI/CD)
- Any manual changes get reverted
- Clear policy: "If it's not in code, it doesn't belong"

**Option 2: Import drift into code**
```bash
$ terraform import aws_instance.web_server i-0abcd1234
```
- Update your Terraform code to match the manual change
- Preserves the change but now it's tracked

**Option 3: Ignore drift**
- Use `lifecycle { ignore_changes = [instance_type] }`
- Terraform stops caring about that attribute
- Dangerous - drift can accumulate

### Continuous Drift Detection

Run in CI/CD nightly:

```yaml
# .github/workflows/drift-detection.yml
name: Detect Infrastructure Drift
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
      - name: Terraform Init
        run: terraform init
      - name: Detect Drift
        run: |
          terraform plan -detailed-exitcode
          if [ $? -eq 2 ]; then
            echo "Drift detected! Infrastructure doesn't match code."
            # Send alert to Slack/email
            exit 1
          fi
```

If drift exists, `terraform plan -detailed-exitcode` returns exit code 2, which fails the job and alerts your team.

## Module Composition

Modules are reusable infrastructure components.

### Writing a Module

`modules/web-server/main.tf`:
```terraform
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

resource "aws_instance" "server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Name        = "${var.environment}-web-server"
    Environment = var.environment
  }
}

output "instance_id" {
  value = aws_instance.server.id
}

output "public_ip" {
  value = aws_instance.server.public_ip
}
```

### Using the Module

`environments/production/main.tf`:
```terraform
module "web_server" {
  source = "../../modules/web-server"

  environment   = "production"
  instance_type = "t2.medium"
}

output "prod_server_ip" {
  value = module.web_server.public_ip
}
```

`environments/dev/main.tf`:
```terraform
module "web_server" {
  source = "../../modules/web-server"

  environment   = "dev"
  instance_type = "t2.micro"  # Smaller for dev
}
```

**Benefits:**
- Dev and prod use the same tested module
- Changes to the module affect all environments
- No copy-paste configuration
- Clear separation of concerns

### Module Versioning

Pin module versions to prevent surprises:

```terraform
module "web_server" {
  source  = "git::https://github.com/company/terraform-modules.git//web-server?ref=v1.2.0"

  environment = "production"
}
```

When `v1.3.0` comes out, production stays on `v1.2.0` until you explicitly upgrade.

### Public Module Registry

Terraform Registry has thousands of community modules:

```terraform
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
}
```

Instead of writing 200 lines of VPC configuration, use a well-tested module.

**Caution:** Public modules can change. Always pin versions. Review code before trusting it with production.

## Secrets Management in IaC

Never hardcode secrets:

```terraform
# BAD - Secret in code
resource "aws_db_instance" "database" {
  username = "admin"
  password = "SuperSecret123!"  # This will end up in state file and git
}
```

### Using Environment Variables

```terraform
variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true  # Terraform won't print this in logs
}

resource "aws_db_instance" "database" {
  username = "admin"
  password = var.db_password
}
```

Run Terraform with:
```bash
export TF_VAR_db_password=$(aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text)
terraform apply
```

### Using Secrets Managers

Let cloud provider generate and store secrets:

```terraform
resource "random_password" "db_password" {
  length  = 20
  special = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "production-db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "aws_db_instance" "database" {
  username = "admin"
  password = random_password.db_password.result
}
```

Password is generated once, stored in Secrets Manager, used by database. If you lose the state file, the password still exists in Secrets Manager.

### HashiCorp Vault Integration

For multi-cloud or advanced needs:

```terraform
data "vault_generic_secret" "db_credentials" {
  path = "secret/database/production"
}

resource "aws_db_instance" "database" {
  username = data.vault_generic_secret.db_credentials.data["username"]
  password = data.vault_generic_secret.db_credentials.data["password"]
}
```

Vault manages rotation, access control, and audit logging.

## GitOps Workflow for IaC

Treat infrastructure changes like code changes:

1. **Feature branch:** Create branch `add-redis-cache`
2. **Write Terraform:** Add Redis cluster configuration
3. **Plan locally:** `terraform plan` to see changes
4. **Open PR:** Teammates review the Terraform code
5. **Automated checks:** CI runs `terraform validate`, `tflint`, policy checks
6. **Terraform plan in CI:** Bot comments on PR with plan output
7. **Review and approve:** Team sees "will create 1 redis cluster, cost estimate $50/month"
8. **Merge:** PR merged to main
9. **Automated apply:** CI/CD runs `terraform apply` in production
10. **Verify:** Monitor infrastructure, confirm Redis is working

### PR Automation Example

`.github/workflows/terraform-pr.yml`:
```yaml
name: Terraform PR Checks
on: pull_request

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Terraform Format
        run: terraform fmt -check

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: |
          terraform plan -out=tfplan
          terraform show -no-color tfplan > plan.txt

      - name: Comment Plan on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('plan.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Terraform Plan\n\n\`\`\`\n${plan}\n\`\`\``
            });
```

Team sees exactly what will change before merging.

## Cost Estimation

Infrastructure changes cost money. Know before you deploy.

### Infracost

```bash
$ infracost breakdown --path .

Name                              Quantity  Unit         Monthly Cost

aws_instance.web_server
 ├─ Instance usage                     730  hours              $8.47
 └─ EBS storage                         30  GB                 $3.00

aws_db_instance.database
 ├─ Database instance                  730  hours             $29.20
 └─ Storage                            100  GB                $11.50

OVERALL TOTAL                                                 $52.17
```

Integrate into CI/CD:
```yaml
- name: Run Infracost
  run: |
    infracost breakdown --path . --format json --out-file infracost.json

- name: Post cost estimate to PR
  run: |
    infracost comment github --path infracost.json \
      --repo $GITHUB_REPOSITORY \
      --pull-request ${{ github.event.number }}
```

PR now shows: "This change will increase monthly cost by $25 (+32%)"

## Common Pitfalls

### 1. Not Using `-target` Carefully

```bash
terraform apply -target=aws_instance.web_server
```

Only updates that one resource. Sounds convenient. Actually dangerous.

**Why:** Terraform loses track of dependencies. You update the server but not the security group. Server ends up in inconsistent state.

**When it's OK:** Emergency fixes. "Production is down, just fix this one thing now."

**Better approach:** Fix your code properly, apply everything.

### 2. Destroying Critical Resources

```bash
terraform destroy
```

Gone. All of it. Database, servers, networks. Hope you didn't need that production data.

**Prevention:**
- Require manual confirmation (default, don't bypass)
- Use `-target` to destroy specific resources
- Add lifecycle prevent_destroy for critical resources:

```terraform
resource "aws_db_instance" "production" {
  # ... config ...

  lifecycle {
    prevent_destroy = true  # Terraform refuses to destroy this
  }
}
```

### 3. Circular Dependencies

```terraform
resource "aws_security_group" "app" {
  # ... config ...
  depends_on = [aws_instance.web_server]  # App SG depends on server
}

resource "aws_instance" "web_server" {
  # ... config ...
  vpc_security_group_ids = [aws_security_group.app.id]  # Server depends on app SG
}
```

Terraform error: "Cycle: aws_security_group.app -> aws_instance.web_server -> aws_security_group.app"

Can't create either because each needs the other to exist first.

**Fix:** Remove the circular dependency. Security groups usually don't need to depend on instances.

## Key Takeaways

1. **Choose tools based on needs, not hype** - Terraform for multi-cloud, CloudFormation for all-AWS, Pulumi for complex logic
2. **Remote state with locking is mandatory for teams** - Local state files cause corruption and confusion
3. **Test before applying** - `terraform plan`, automated tests, policy checks, cost estimation
4. **Modules prevent copy-paste infrastructure** - Write once, reuse everywhere, version carefully
5. **Drift happens - detect and fix it** - Automated drift detection catches manual changes
6. **Never commit secrets** - Use Secrets Manager, Vault, or environment variables
7. **GitOps workflow prevents cowboy changes** - All infrastructure changes via PR, reviewed and automated

Infrastructure as Code is about reliability and repeatability, not perfection. Start with the basics, add complexity as you need it, and always have a rollback plan.

---

## Related Topics

- [Deployment Strategy](../../deployment-strategy/mid-depth/index.md) - Immutable infrastructure and GitOps
- [CI/CD Pipeline Security](../../cicd-pipeline-security/mid-depth/index.md) - Securing your IaC automation
- [Access Control](../../access-control/mid-depth/index.md) - RBAC for infrastructure changes
