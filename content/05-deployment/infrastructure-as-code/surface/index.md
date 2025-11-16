---
title: "Infrastructure as Code"
phase: "05-deployment"
topic: "infrastructure-as-code"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["deployment-strategy", "cicd-pipeline-security", "access-control"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-16"
---

# Infrastructure as Code

## What Infrastructure as Code Actually Means

Infrastructure as Code (IaC) means writing configuration files that define your servers, databases, networks, and other infrastructure instead of clicking buttons in a web console.

Instead of this:
1. Log into AWS console
2. Click "Create Server"
3. Fill out 15 form fields
4. Click "Create Database"
5. Configure network settings manually
6. Write down what you did (maybe)

You do this:
```terraform
resource "aws_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "production-web-server"
  }
}

resource "aws_db_instance" "database" {
  engine         = "postgres"
  instance_class = "db.t3.micro"
  allocated_storage = 20
}
```

The code captures exactly what you built. Six months later, you or someone else can read it and know what's running.

## Why This Matters

**Version control for infrastructure:** You can git commit infrastructure changes, review them in pull requests, and roll back if something breaks. Try doing that with point-and-click.

**Reproducibility:** Build production once, use the same code to build staging and dev environments. They'll actually match.

**Disaster recovery:** Your datacenter catches fire? Rerun your IaC scripts in another region. You're back up in hours, not weeks.

**Documentation that doesn't lie:** Code can't drift from reality the way a wiki page can. The code defines what actually exists.

## The Three Main Tools

### Terraform (HashiCorp)
Works with everything - AWS, Azure, Google Cloud, GitHub, Datadog, even your coffee machine if it has an API.

**Best for:** Multi-cloud setups, or when you want one tool for everything.

```terraform
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"

  versioning {
    enabled = true
  }
}
```

### AWS CloudFormation
Built by AWS, only works with AWS services.

**Best for:** All-in on AWS and want native integration.

```yaml
Resources:
  DataBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-data-bucket
      VersioningConfiguration:
        Status: Enabled
```

### Pulumi
Uses real programming languages (TypeScript, Python, Go) instead of config files.

**Best for:** Complex logic, loops, conditionals. Or when your team already knows Python/TypeScript better than YAML.

```typescript
import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("data", {
    versioning: {
        enabled: true,
    },
});
```

## The Basic Pattern

1. **Write code** defining what infrastructure you want
2. **Plan** - Tool shows you what will change (creates 3 servers, deletes 1 database)
3. **Review** - Make sure it's doing what you expect
4. **Apply** - Tool makes the changes
5. **Commit** - Save the code to git

Later:
6. **Modify code** - Change instance type from t2.micro to t2.small
7. **Plan** again - Tool shows it will modify 1 server
8. **Apply** - Server gets resized
9. **Commit** the change

## What Can Go Wrong

**Deleting production by accident:** You run `terraform destroy` thinking you're in dev environment. You're not. Production is now gone.

**Prevention:** Use workspace names clearly, require manual confirmation for production, separate credentials by environment.

**Drift:** Someone manually changes something in the console. Now your code doesn't match reality.

**Prevention:** Run regular drift detection, block manual console changes, or accept that code is the source of truth and manual changes get overwritten.

**State file corruption:** Terraform stores current state in a file. Two people run it simultaneously, state file gets corrupted.

**Prevention:** Use remote state backends (S3, Terraform Cloud) with locking. Don't store state in git.

## Quick Decision Framework

| Situation | Tool | Reason |
|-----------|------|--------|
| All-in on AWS | CloudFormation | Native, free, well-supported |
| Multi-cloud or hybrid | Terraform | Works everywhere |
| Complex logic needed | Pulumi | Real programming language |
| Team knows YAML better than code | Terraform or CloudFormation | Config files, not code |
| Team knows TypeScript/Python | Pulumi | Use familiar language |

## Common First Mistake

Starting by trying to import all existing infrastructure into code. You have 50 servers running. You try to write Terraform for all of them. It's overwhelming and error-prone.

**Better approach:** Start with new infrastructure. Your next project, use IaC from day one. Slowly migrate existing stuff as you touch it, not all at once.

## The Critical Safety Net

**State Management:** Terraform and similar tools track what infrastructure exists in a "state file." This file is critical.

If you lose the state file, the tool doesn't know what it created. You can't update or destroy anything without manual surgery.

**Where to store state:**
- **Bad:** Your laptop (you reformat → state gone)
- **Bad:** Git repository (merge conflicts break state)
- **Good:** S3 bucket with versioning (recovery from mistakes)
- **Good:** Terraform Cloud (automatic backups, locking, collaboration)

Example Terraform remote state:
```terraform
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"

    # Prevents two people running simultaneously
    dynamodb_table = "terraform-locks"
  }
}
```

## What Success Looks Like

1. **New infrastructure takes minutes, not days** - Run script, infrastructure appears
2. **Environments actually match** - Dev, staging, prod use same code with different variables
3. **Changes are auditable** - Git history shows who changed what and why
4. **Disasters are recoverable** - Code can rebuild everything
5. **Onboarding is faster** - New engineer reads the code, understands the infrastructure

## Key Takeaway

Infrastructure as Code isn't about being clever with automation. It's about having a reliable, repeatable way to build and change infrastructure without drowning in clicking, documentation debt, and "how did we configure that server again?"

Start small. Automate one piece. Learn the tool. Expand gradually. Don't try to boil the ocean.

---

## Related Topics

- [Deployment Strategy](../../deployment-strategy/surface/index.md) - How IaC enables safe deployment patterns
- [CI/CD Pipeline Security](../../cicd-pipeline-security/surface/index.md) - Securing your IaC automation
- [Access Control](../../access-control/surface/index.md) - Who can change infrastructure
