---
title: "Infrastructure as Code"
phase: "05-deployment"
topic: "infrastructure-as-code"
depth: "deep-water"
reading_time: 45
prerequisites: []
related_topics: ["deployment-strategy", "cicd-pipeline-security", "access-control"]
personas: ["specialist-expanding"]
updated: "2025-11-16"
---

# Infrastructure as Code - Deep Water

## Advanced State Management Architectures

### Multi-Account State Strategy

Large organizations don't put all infrastructure in one AWS account or state file. They split by blast radius.

**Pattern: Account per environment + workload**
```
organization/
├── terraform-state-production/
│   ├── compute/
│   │   └── terraform.tfstate (web servers, workers)
│   ├── data/
│   │   └── terraform.tfstate (databases, caches)
│   └── network/
│       └── terraform.tfstate (VPC, subnets, routing)
├── terraform-state-staging/
│   └── ... (same structure)
└── terraform-state-dev/
    └── ... (same structure)
```

**Why split state:**
1. **Blast radius containment** - Corrupted state in compute doesn't affect databases
2. **Parallel operations** - Different teams work on different state files simultaneously
3. **Different update cadence** - Network changes monthly, compute changes daily
4. **Access control** - Database team can't accidentally destroy compute infrastructure

**Trade-offs:**
- More complexity (multiple backends to configure)
- Cross-state dependencies require data sources or manual coordination
- More state files to backup and monitor

### State Locking at Scale

When 50 engineers might run Terraform simultaneously, DynamoDB locking isn't enough.

**Enhanced locking with Terraform Cloud:**
```terraform
terraform {
  cloud {
    organization = "acme-corp"

    workspaces {
      name = "production-compute"
    }
  }
}
```

Terraform Cloud provides:
- **Queue-based locking** - Runs wait in queue rather than failing
- **Speculative plans** - Run plans without locking (read-only)
- **Run history** - See who ran what and when
- **State rollback** - Restore previous state versions
- **Team-based access** - Fine-grained permissions per workspace

**Alternative: Atlantis for self-hosted**

Atlantis runs Terraform in response to PR comments:

1. Engineer opens PR with Terraform changes
2. Comment `atlantis plan` on PR
3. Atlantis acquires lock, runs plan, comments output
4. Team reviews plan in PR
5. Comment `atlantis apply` to execute
6. Atlantis applies, releases lock, comments results

**Configuration (.atlantis.yaml):**
```yaml
version: 3
projects:
- name: production-compute
  dir: environments/production/compute
  workspace: production
  apply_requirements: [approved, mergeable]
  workflow: production

workflows:
  production:
    plan:
      steps:
      - init
      - plan:
          extra_args: ["-lock-timeout=10m"]
    apply:
      steps:
      - apply:
          extra_args: ["-lock-timeout=10m"]
```

Atlantis enforces:
- PR must be approved before apply
- PR must be mergeable (passes CI)
- Only one apply runs at a time per workspace
- Full audit trail in PR comments

### State Migration and Versioning

**Challenge:** Moving from local state to S3, or changing state structure.

**Migration process:**

1. **Backup current state:**
```bash
cp terraform.tfstate terraform.tfstate.backup
```

2. **Configure new backend:**
```terraform
terraform {
  backend "s3" {
    bucket = "new-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}
```

3. **Initialize and migrate:**
```bash
terraform init -migrate-state
```

Terraform prompts: "Do you want to copy existing state to the new backend?"

4. **Verify migration:**
```bash
terraform plan  # Should show no changes
```

**State version conflicts:**

Terraform state format changes between versions. State created with Terraform 1.5 might not work with 1.3.

**Solution: Version pinning**
```terraform
terraform {
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

Team uses same Terraform version → no state format incompatibilities.

**State versioning in S3:**
```terraform
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

Corrupt state? Restore previous version:
```bash
aws s3api list-object-versions --bucket terraform-state --prefix prod/terraform.tfstate

# Get version ID from output
aws s3api get-object --bucket terraform-state \
  --key prod/terraform.tfstate \
  --version-id <version-id> \
  terraform.tfstate
```

## Advanced Module Patterns

### Dynamic Module Composition

**Pattern: Conditional resource creation**

Some environments need a bastion host, others don't:

```terraform
# modules/network/main.tf
variable "create_bastion" {
  type    = bool
  default = false
}

resource "aws_instance" "bastion" {
  count = var.create_bastion ? 1 : 0

  ami           = data.aws_ami.ubuntu.id
  instance_type = "t2.micro"
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "bastion"
  }
}

output "bastion_ip" {
  value = var.create_bastion ? aws_instance.bastion[0].public_ip : null
}
```

Usage:
```terraform
module "production_network" {
  source = "../../modules/network"

  create_bastion = false  # Production uses VPN, not bastion
}

module "dev_network" {
  source = "../../modules/network"

  create_bastion = true  # Dev uses bastion for convenience
}
```

### Module Dependency Injection

**Pattern: Externalize dependencies**

Instead of hardcoding which VPC to use, inject it:

```terraform
# modules/app/main.tf
variable "vpc_id" {
  description = "VPC to deploy into"
  type        = string
}

variable "subnet_ids" {
  description = "Subnets for load balancer"
  type        = list(string)
}

resource "aws_lb" "app" {
  name               = "app-lb"
  subnets            = var.subnet_ids
  load_balancer_type = "application"

  # ... config ...
}
```

Usage with different VPC modules:
```terraform
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  # ... VPC config ...
}

module "app" {
  source = "../../modules/app"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets
}
```

**Benefits:**
- App module works with any VPC implementation
- Easy to test (inject mock VPC for testing)
- Reusable across different network architectures

### Module Testing with Terratest

**Real infrastructure testing:**

```go
package test

import (
    "testing"
    "time"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/http-helper"
    "github.com/stretchr/testify/assert"
)

func TestWebServerModule(t *testing.T) {
    t.Parallel()

    awsRegion := "us-east-1"

    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/web-server",
        Vars: map[string]interface{}{
            "region":        awsRegion,
            "instance_type": "t2.micro",
        },
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },
    }

    defer terraform.Destroy(t, terraformOptions)

    terraform.InitAndApply(t, terraformOptions)

    // Get outputs
    instanceID := terraform.Output(t, terraformOptions, "instance_id")
    publicIP := terraform.Output(t, terraformOptions, "public_ip")

    // Verify instance exists
    assert.NotEmpty(t, instanceID)

    // Verify instance is running
    instanceState := aws.GetEc2InstanceState(t, awsRegion, instanceID)
    assert.Equal(t, "running", instanceState)

    // Verify HTTP endpoint responds
    url := fmt.Sprintf("http://%s", publicIP)
    http_helper.HttpGetWithRetry(t, url, nil, 200, "Hello World", 30, 5*time.Second)
}
```

**What this test validates:**
- Terraform code is syntactically valid
- Infrastructure actually deploys
- Resources are configured correctly (instance running)
- Application is functional (HTTP endpoint responds)

**CI/CD integration:**
```yaml
name: Module Tests
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run Terratest
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          cd test
          go test -v -timeout 30m
```

**Cost control:** Tests create real infrastructure. Costs add up.

Solutions:
- Run tests in separate AWS account with billing alerts
- Use t2.micro/smallest instances
- Destroy immediately after tests (automated in defer)
- Run on PR only, not every commit
- Use spot instances where possible

## Policy as Code: Advanced Patterns

### Sentinel: Complex Policy Logic

**Pattern: Environment-specific policies**

```hcl
# policies/instance-size.sentinel
import "tfplan/v2" as tfplan
import "strings"

# Get environment from workspace name
env = strings.split(tfplan.workspace, "-")[0]

# Instance size limits by environment
size_limits = {
  "prod":    ["t3.medium", "t3.large", "m5.large"],
  "staging": ["t3.small", "t3.medium"],
  "dev":     ["t2.micro", "t2.small"],
}

# Find all EC2 instances
instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check each instance
instance_size_valid = rule {
  all instances as _, instance {
    instance.change.after.instance_type in size_limits[env]
  }
}

main = rule {
  instance_size_valid
}
```

**Result:**
- Dev environment can only create t2.micro/small (cost control)
- Staging limited to t3.small/medium (realistic but not expensive)
- Production can use larger instances (performance matters)

### OPA: Advanced Compliance

**Pattern: Multi-cloud compliance**

```rego
package terraform.compliance

import future.keywords

# All S3 buckets must have encryption, versioning, and logging
deny[msg] {
    resource := input.resource.aws_s3_bucket[name]
    not resource.server_side_encryption_configuration
    msg := sprintf("S3 bucket %s must have encryption enabled", [name])
}

deny[msg] {
    resource := input.resource.aws_s3_bucket[name]
    not resource.versioning[_].enabled
    msg := sprintf("S3 bucket %s must have versioning enabled", [name])
}

# All databases must be in private subnets
deny[msg] {
    resource := input.resource.aws_db_instance[name]
    subnet_group := input.resource.aws_db_subnet_group[resource.db_subnet_group_name]
    subnet := input.resource.aws_subnet[subnet_group.subnet_ids[_]]
    subnet.map_public_ip_on_launch == true
    msg := sprintf("Database %s must not be in public subnet", [name])
}

# Require specific tags
required_tags := ["Environment", "Owner", "CostCenter"]

deny[msg] {
    resource := input.resource[type][name]
    resource_types := ["aws_instance", "aws_db_instance", "aws_s3_bucket"]
    type in resource_types
    tag := required_tags[_]
    not resource.tags[tag]
    msg := sprintf("%s %s missing required tag: %s", [type, name, tag])
}
```

**Testing policies:**

```bash
# Create test Terraform plan
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json

# Test policies
conftest test tfplan.json

FAIL - tfplan.json
  S3 bucket 'logs' must have versioning enabled
  Database 'primary' must not be in public subnet
  aws_instance 'web' missing required tag: CostCenter

3 tests, 0 passed, 3 failed
```

**CI/CD enforcement:**
```yaml
- name: Policy Check
  run: |
    terraform plan -out=tfplan.binary
    terraform show -json tfplan.binary > tfplan.json
    conftest test tfplan.json
    if [ $? -ne 0 ]; then
      echo "Policy violations detected. Fix before merge."
      exit 1
    fi
```

### CloudFormation Guard

**Pattern: AWS-specific compliance**

```guard
# All S3 buckets must block public access
AWS::S3::Bucket {
  Properties.PublicAccessBlockConfiguration.BlockPublicAcls == true
  Properties.PublicAccessBlockConfiguration.BlockPublicPolicy == true
  Properties.PublicAccessBlockConfiguration.IgnorePublicAcls == true
  Properties.PublicAccessBlockConfiguration.RestrictPublicBuckets == true
}

# RDS instances must be encrypted
AWS::RDS::DBInstance {
  Properties.StorageEncrypted == true
  Properties.KmsKeyId exists
}

# Security groups must not allow 0.0.0.0/0 on port 22 (SSH)
AWS::EC2::SecurityGroup {
  Properties.SecurityGroupIngress[*] {
    when IpProtocol == "tcp" and (FromPort <= 22 and ToPort >= 22) {
      CidrIp != "0.0.0.0/0"
      CidrIpv6 != "::/0"
    }
  }
}
```

**Running Guard:**
```bash
cfn-guard validate --data template.yaml --rules rules.guard

Summary Report for template.yaml
  FAILED: 2 rules failed
  SKIPPED: 0 rules skipped

  Rule [AWS::EC2::SecurityGroup]
    Status: FAIL
    Location: Resources/WebServerSecurityGroup/Properties/SecurityGroupIngress/0/CidrIp
    Message: Expected "0.0.0.0/0" to not equal "0.0.0.0/0"
```

## Multi-Cloud and Hybrid Infrastructure

### Cross-Cloud Resource Management

**Pattern: Application in AWS, observability in GCP, CI/CD in Azure**

```terraform
# providers.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azuredevops = {
      source  = "microsoft/azuredevops"
      version = "~> 0.11"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "google" {
  project = "my-project"
  region  = "us-central1"
}

provider "azuredevops" {
  org_service_url = "https://dev.azure.com/myorg"
}

# Application infrastructure in AWS
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  # ... config ...
}

# Logs sent to Google Cloud Logging
resource "google_logging_sink" "aws_logs" {
  name        = "aws-application-logs"
  destination = "bigquery.googleapis.com/projects/my-project/datasets/aws_logs"

  filter = "resource.type=aws_instance"
}

# CI/CD pipeline in Azure DevOps
resource "azuredevops_build_definition" "app_pipeline" {
  project_id = azuredevops_project.project.id
  name       = "app-deployment-pipeline"

  repository {
    repo_type   = "GitHub"
    repo_id     = "myorg/myapp"
    branch_name = "main"
  }

  ci_trigger {
    use_yaml = true
  }
}
```

**Challenge: Cross-cloud networking**

AWS VPC can't directly peer with GCP VPC. Solutions:

1. **VPN connections:**
```terraform
resource "aws_vpn_gateway" "aws_gateway" {
  vpc_id = aws_vpc.main.id
}

resource "google_compute_vpn_gateway" "gcp_gateway" {
  name    = "aws-vpn"
  network = google_compute_network.main.id
}

resource "google_compute_vpn_tunnel" "tunnel" {
  name          = "aws-tunnel"
  peer_ip       = aws_vpn_connection.main.tunnel1_address
  shared_secret = random_string.vpn_secret.result

  target_vpn_gateway = google_compute_vpn_gateway.gcp_gateway.id
  # ... routing ...
}
```

2. **Cloud interconnect (expensive but fast):**
- AWS Direct Connect + Google Cloud Interconnect
- Dedicated physical connection between clouds
- $1,000+ monthly, but < 10ms latency

3. **Public internet with service mesh:**
- No VPN needed
- Services communicate over HTTPS
- mTLS for authentication and encryption
- Istio or Linkerd handle routing

### Hybrid Cloud (On-Prem + Cloud)

**Pattern: Gradual cloud migration**

```terraform
# On-prem data center (managed via custom provider or API)
resource "vmware_virtual_machine" "legacy_database" {
  name     = "legacy-db-01"
  # ... on-prem config ...
}

# Cloud-based application servers
resource "aws_instance" "app_server" {
  count = 3

  ami           = data.aws_ami.app.id
  instance_type = "t3.medium"

  # Connect to on-prem database via VPN
  user_data = templatefile("${path.module}/user-data.sh", {
    db_host = vmware_virtual_machine.legacy_database.default_ip_address
    db_port = 5432
  })
}

# VPN connection between AWS and on-prem
resource "aws_vpn_connection" "onprem" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.onprem.id
  type                = "ipsec.1"

  static_routes_only = true
}
```

**Migration phases:**
1. **Phase 1:** On-prem database, cloud app servers (connected via VPN)
2. **Phase 2:** Cloud database (replica), on-prem database (primary), cloud app servers
3. **Phase 3:** Cloud database (primary), on-prem database (retired), cloud app servers

Terraform manages all three phases with same code, different variable values.

## Large-Scale Terraform: 10,000+ Resources

### Workspace and Directory Structure

**Anti-pattern: Monolithic state**

One Terraform directory with 10,000 resources:
- `terraform plan` takes 30 minutes
- One typo risks destroying everything
- 50 engineers fighting over state locks

**Solution: Hierarchical workspaces**

```
infrastructure/
├── global/                    # Resources shared across regions
│   ├── route53/              # DNS (global)
│   ├── iam/                  # IAM roles (global)
│   └── cloudfront/           # CDN (global)
├── us-east-1/
│   ├── network/              # VPC, subnets, routing
│   ├── compute/
│   │   ├── web/             # Web servers
│   │   ├── api/             # API servers
│   │   └── workers/         # Background workers
│   ├── data/
│   │   ├── rds/             # Databases
│   │   ├── elasticache/     # Redis
│   │   └── s3/              # Object storage
│   └── observability/       # CloudWatch, logs
└── eu-west-1/
    └── ... (same structure)
```

Each directory = separate state file:
- `network` state: 50 resources, plan takes 30 seconds
- `compute/web` state: 100 resources, plan takes 1 minute
- Teams work independently

**Cross-directory dependencies:**

`compute/web/main.tf`:
```terraform
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "us-east-1/network/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  # Use VPC from network state
  subnet_id = data.terraform_remote_state.network.outputs.public_subnets[0]
  vpc_security_group_ids = [
    data.terraform_remote_state.network.outputs.web_security_group_id
  ]
  # ... config ...
}
```

**Trade-off:** More complex (explicit dependencies) but faster and safer.

### Terragrunt for DRY Configuration

Problem: Each environment duplicates backend config:

```terraform
# environments/dev/main.tf
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "dev/terraform.tfstate"
    region = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}

# environments/prod/main.tf
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "prod/terraform.tfstate"  # Only difference
    region = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

Terragrunt solution:

```hcl
# terragrunt.hcl (root)
remote_state {
  backend = "s3"
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite"
  }
  config = {
    bucket         = "terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# environments/dev/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

# environments/prod/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}
```

Run `terragrunt plan` instead of `terraform plan`. Backend configured automatically.

**Terragrunt for dependencies:**

```hcl
# compute/terragrunt.hcl
dependency "network" {
  config_path = "../network"
}

inputs = {
  vpc_id     = dependency.network.outputs.vpc_id
  subnet_ids = dependency.network.outputs.private_subnets
}
```

`terragrunt run-all apply` automatically:
1. Applies network first
2. Waits for network to complete
3. Applies compute using network outputs

### Parallelization and Performance

**Terraform parallelism:**

```bash
terraform apply -parallelism=20  # Default is 10
```

Creates/updates 20 resources simultaneously. Faster but riskier (harder to rollback).

**For large deployments:**
```bash
terraform apply -parallelism=50  # Aggressive
```

Monitor for API rate limits (AWS, GCP, Azure all have limits).

**Targeted applies for speed:**

Only updating web servers:
```bash
terraform apply -target=module.web_servers
```

Runs in seconds instead of minutes. But loses dependency tracking temporarily.

**Plan file caching:**

Generate plan once, apply multiple times:
```bash
terraform plan -out=tfplan
# Review tfplan
terraform apply tfplan  # No need to re-plan
```

## Drift Detection and Reconciliation at Scale

### Continuous Drift Detection

**Challenge:** 10,000 resources, drift happens daily.

**Solution: Scheduled drift detection per workspace**

```yaml
# .github/workflows/drift-detection.yml
name: Nightly Drift Detection
on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM daily

jobs:
  detect-drift:
    strategy:
      matrix:
        workspace:
          - global/route53
          - us-east-1/network
          - us-east-1/compute/web
          - us-east-1/compute/api
          - us-east-1/data/rds
          # ... all workspaces

    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2

      - name: Detect Drift in ${{ matrix.workspace }}
        working-directory: infrastructure/${{ matrix.workspace }}
        run: |
          terraform init
          terraform plan -detailed-exitcode > plan.txt || true

          if grep -q "will be" plan.txt; then
            echo "::error::Drift detected in ${{ matrix.workspace }}"
            cat plan.txt
            # Send to Slack
            curl -X POST $SLACK_WEBHOOK -H 'Content-Type: application/json' \
              -d "{\"text\":\"Drift detected in ${{ matrix.workspace }}\"}"
          fi
```

Each workspace checked independently. Drifted workspaces alert team via Slack.

### Automated Drift Reconciliation

**Pattern: Auto-fix approved drift types**

```python
# drift-reconciliation.py
import subprocess
import json

def detect_drift(workspace):
    result = subprocess.run([
        'terraform', 'plan', '-json', '-detailed-exitcode'
    ], cwd=f'infrastructure/{workspace}', capture_output=True)

    if result.returncode == 2:  # Drift detected
        return json.loads(result.stdout)
    return None

def is_safe_to_auto_fix(change):
    """Only auto-fix tag changes, not resource deletion"""
    if change['type'] == 'update':
        # Check what changed
        for attr in change['change']['after']:
            if not attr.startswith('tag'):
                return False  # Non-tag change, require human review
        return True
    return False  # Creates/deletes need human approval

def reconcile_workspace(workspace):
    drift = detect_drift(workspace)
    if not drift:
        return  # No drift

    for resource_change in drift['resource_changes']:
        if is_safe_to_auto_fix(resource_change):
            print(f"Auto-fixing drift in {resource_change['address']}")
            subprocess.run([
                'terraform', 'apply', '-auto-approve',
                f'-target={resource_change["address"]}'
            ], cwd=f'infrastructure/{workspace}')
        else:
            print(f"Manual review required for {resource_change['address']}")
            # Create GitHub issue or Jira ticket

workspaces = [
    'us-east-1/network',
    'us-east-1/compute/web',
    # ... all workspaces
]

for workspace in workspaces:
    reconcile_workspace(workspace)
```

**Safety guardrails:**
- Only auto-fix tag changes
- Resource updates require human review
- Deletions always blocked (manual approval required)
- Drift exceeding threshold triggers incident

## Cost Optimization via IaC

### FinOps Integration

**Pattern: Cost tagging and allocation**

```terraform
locals {
  common_tags = {
    Environment  = var.environment
    Owner        = var.owner
    CostCenter   = var.cost_center
    ManagedBy    = "terraform"
    Project      = var.project_name
  }
}

resource "aws_instance" "web" {
  # ... config ...

  tags = merge(local.common_tags, {
    Name = "web-server-${var.environment}"
    Role = "web"
  })
}

resource "aws_db_instance" "database" {
  # ... config ...

  tags = merge(local.common_tags, {
    Name = "database-${var.environment}"
    Role = "data"
  })
}
```

AWS Cost Explorer can now break down costs by:
- Environment (dev vs prod)
- Owner (team1 vs team2)
- CostCenter (engineering vs marketing)
- Project (project-alpha vs project-beta)

**Policy enforcement:**

```rego
# Require cost tags
required_cost_tags := ["CostCenter", "Owner", "Project"]

deny[msg] {
    resource := input.resource[type][name]
    tag := required_cost_tags[_]
    not resource.tags[tag]
    msg := sprintf("Resource %s missing cost tag: %s", [name, tag])
}
```

### Scheduled Resource Management

**Pattern: Auto-shutdown dev environments at night**

```terraform
resource "aws_instance" "dev_server" {
  count = var.environment == "dev" ? var.instance_count : 0

  # ... config ...

  tags = merge(local.common_tags, {
    AutoShutdown = "true"
    ShutdownTime = "19:00"
    StartupTime  = "08:00"
  })
}
```

Lambda function reads tags, stops instances at 7 PM, starts at 8 AM:

```python
import boto3
from datetime import datetime

ec2 = boto3.client('ec2')

def lambda_handler(event, context):
    now = datetime.now()
    current_hour = now.hour

    # Find instances with AutoShutdown tag
    instances = ec2.describe_instances(Filters=[
        {'Name': 'tag:AutoShutdown', 'Values': ['true']}
    ])

    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            shutdown_hour = int(instance['Tags']['ShutdownTime'].split(':')[0])
            startup_hour = int(instance['Tags']['StartupTime'].split(':')[0])

            if current_hour == shutdown_hour:
                ec2.stop_instances(InstanceIds=[instance['InstanceId']])
            elif current_hour == startup_hour:
                ec2.start_instances(InstanceIds=[instance['InstanceId']])
```

**Savings:** Dev/staging environments run 50 hours/week instead of 168 hours/week → 70% cost reduction.

### Right-Sizing Analysis

**Pattern: Terraform + CloudWatch metrics**

```terraform
resource "aws_instance" "web" {
  instance_type = var.instance_type

  # Enable detailed monitoring for right-sizing
  monitoring = true

  tags = merge(local.common_tags, {
    RightSizingCandidate = "true"
  })
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "web-server-underutilized"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "24"  # 24 hours
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "3600"  # 1 hour
  statistic           = "Average"
  threshold           = "10"  # Less than 10% CPU

  dimensions = {
    InstanceId = aws_instance.web.id
  }

  alarm_actions = [aws_sns_topic.rightsizing_alerts.arn]
}
```

When CPU < 10% for 24 hours, alert triggers → investigate downgrading from t3.medium to t3.small.

## Advanced Secrets Management

### Dynamic Secrets with Vault

**Pattern: Terraform creates infrastructure, Vault manages secrets**

```terraform
# Create database
resource "aws_db_instance" "app_db" {
  # ... config ...
  username = "vaultadmin"
  password = random_password.vault_master.result
}

# Configure Vault to manage database credentials
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = vault_mount.db.path
  name          = "app-database"
  allowed_roles = ["app-role"]

  postgresql {
    connection_url = "postgresql://{{username}}:{{password}}@${aws_db_instance.app_db.endpoint}/app"
    username       = "vaultadmin"
    password       = random_password.vault_master.result
  }
}

resource "vault_database_secret_backend_role" "app" {
  backend             = vault_mount.db.path
  name                = "app-role"
  db_name             = vault_database_secret_backend_connection.postgres.name
  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]
  default_ttl         = 3600   # 1 hour
  max_ttl             = 86400  # 24 hours
}
```

Application retrieves database credentials from Vault:
- Credentials are unique per instance
- Expire after 1 hour
- Automatically rotated
- Compromised credentials limited blast radius

### Secrets Rotation with Terraform

**Challenge:** Rotating secrets without downtime.

**Pattern: Blue-green secret rotation**

```terraform
resource "random_password" "db_password_v1" {
  length  = 32
  special = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "random_password" "db_password_v2" {
  length  = 32
  special = true
  keepers = {
    rotation_date = var.rotation_date  # Change to trigger rotation
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.use_password_v2 ? random_password.db_password_v2.result : random_password.db_password_v1.result
}

resource "aws_db_instance" "database" {
  # ... config ...
  password = var.use_password_v2 ? random_password.db_password_v2.result : random_password.db_password_v1.result
}
```

**Rotation process:**
1. `var.use_password_v2 = false` (using v1)
2. Create v2 secret
3. Update application to read v2 from Secrets Manager
4. Deploy application (gradual rollout)
5. Once all instances use v2: `var.use_password_v2 = true`
6. Database password updated to v2
7. v1 can be destroyed

No downtime. Both secrets valid during transition.

## Compliance and Audit

### Terraform Cloud Audit Logs

Every Terraform operation logged:

```json
{
  "timestamp": "2025-11-16T14:23:01Z",
  "user": "alice@example.com",
  "action": "apply",
  "workspace": "production-compute",
  "resources_changed": 3,
  "resources_created": 0,
  "resources_destroyed": 0,
  "resources_updated": 3,
  "plan_id": "plan-abc123",
  "apply_id": "run-def456",
  "status": "applied",
  "duration_seconds": 47
}
```

**Compliance questions answered:**
- Who made this change? (user)
- When? (timestamp)
- What changed? (plan_id links to detailed diff)
- Was it reviewed? (approval workflow)
- Did it succeed? (status)

### Git-Based Audit Trail

Every infrastructure change = git commit:

```bash
$ git log --oneline infrastructure/

a1b2c3d (HEAD -> main) Increase web server instance type to t3.large
d4e5f6g Add Redis cache to production
g7h8i9j Update RDS to db.t3.medium for better performance
j1k2l3m Initial production infrastructure
```

Each commit shows:
- What changed (`git diff a1b2c3d`)
- Who changed it (`git log --format="%an <%ae>" a1b2c3d`)
- Why (`git log --format="%B" a1b2c3d` - commit message)
- When (`git log --format="%ai" a1b2c3d`)

**For SOC 2 / ISO 27001:**
- Auditors can review complete change history
- Every change tied to person and reason
- No undocumented infrastructure modifications
- Rollback history preserved

## Summary: When to Use Advanced Patterns

| Pattern | Use When | Overkill If |
|---------|----------|------------|
| **Multi-account state** | 100+ resources, multiple teams | < 50 resources, single team |
| **Terragrunt** | Lots of duplication across environments | Simple, single environment |
| **Policy as code** | Compliance requirements, large team | Small team with code review |
| **Module testing** | Reusable modules shared across org | One-off infrastructure |
| **Drift reconciliation** | Resources frequently modified manually | Strict IaC-only policy |
| **Cost optimization** | $10k+/month cloud bill | < $1k/month |
| **Vault dynamic secrets** | High-security requirements | Static credentials acceptable |

The goal isn't using every advanced pattern. It's using the right patterns for your scale, security requirements, and team maturity. Start simple, add complexity only when you feel the pain it solves.

---

## Related Topics

- [Deployment Strategy](../../deployment-strategy/deep-water/index.md) - Immutable infrastructure and GitOps at scale
- [CI/CD Pipeline Security](../../cicd-pipeline-security/deep-water/index.md) - Securing IaC in automated pipelines
- [Access Control](../../access-control/deep-water/index.md) - Fine-grained infrastructure permissions
