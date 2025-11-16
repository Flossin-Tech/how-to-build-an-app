# Phase 4: Testing

Verifying it works, is accessible, won't break, and won't get hacked.

Testing isn't just about proving your code runs without crashing. It's about verifying that it does what users need, handles failure gracefully, doesn't lock out people with disabilities, and won't become the next security breach headline.

Most developers treat testing as an afterthought or a chore. That's backwards. Testing is how you sleep at night. It's how you refactor with confidence. It's how you know that the button you added didn't accidentally break checkout for mobile users or expose customer data to SQL injection.

Good testing isn't about hitting 100% code coverage—it's about testing the things that matter. The critical path through your application. The security boundaries. The edge cases that real users will hit and you didn't think about.

## Key Questions This Phase Answers

- How do we know our code actually works the way we think it does?
- What could an attacker do to this system, and how do we prevent it?
- Can people with disabilities actually use what we built?
- Are we meeting the compliance requirements for our industry or region?
- What breaks when things go wrong, and do we handle it gracefully?

## Topics

| Topic | Surface (5-10 min) | Mid-Depth (15-30 min) | Deep Water (30-60+ min) |
|-------|-------------------|---------------------|---------------------|
| Unit & Integration Testing | [Start Here](unit-integration-testing/surface/index.md) | [Read More](unit-integration-testing/mid-depth/index.md) | [Advanced](unit-integration-testing/deep-water/index.md) |
| Security Testing | [Start Here](security-testing/surface/index.md) | [Read More](security-testing/mid-depth/index.md) | [Advanced](security-testing/deep-water/index.md) |
| Accessibility Testing | [Start Here](accessibility-testing/surface/index.md) | [Read More](accessibility-testing/mid-depth/index.md) | [Advanced](accessibility-testing/deep-water/index.md) |
| Compliance Validation | [Start Here](compliance-validation/surface/index.md) | [Read More](compliance-validation/mid-depth/index.md) | [Advanced](compliance-validation/deep-water/index.md) |

## What Comes Next

Once you've verified your code works, is secure, and is accessible, you're ready to get it running in production. That's **[Deployment](../05-deployment/index.md)**—where you'll learn to release code reliably without breaking things.
