---
title: "Data Flow Mapping Essentials"
phase: "02-design"
topic: "data-flow-mapping"
depth: "surface"
reading_time: 8
prerequisites: []
related_topics: ["database-design", "api-design", "security-architecture"]
personas: ["new-developer", "yolo-dev"]
updated: "2025-11-15"
---

# Data Flow Mapping Essentials

Data flows through your application like water through pipes. If you don't know where it's going, you can't protect it, debug it, or explain to regulators what happens when someone deletes their account.

Data flow mapping answers three questions:
1. Where does data come from?
2. What happens to it along the way?
3. Where does it end up?

Most security breaches and compliance violations happen because nobody mapped these flows. You added a feature that emails receipts, and now customer credit card numbers are sitting in your email service provider's servers. You built a "share this document" feature, and suddenly your internal API keys are accessible to anyone with a link.

## Why Map Data Flows Before Writing Code

When you're building features, data flow feels obvious. "The user submits the form, we save it to the database, done." But that's not the actual flow.

The actual flow for a simple contact form might be:
- User types data in browser
- JavaScript validates before submit
- Data crosses network to your API
- API logs the request (full body?)
- API validates again
- Data gets written to database
- Database triggers a backup
- Backup syncs to cloud storage
- API sends email via third-party service
- Email service stores the data
- API returns success to browser
- Browser logs the response

That's twelve steps, and at least four places where the data persists somewhere. If that form collected passwords or credit card numbers, you just created four places they could leak.

You can't secure what you can't see. Data flow mapping makes the invisible visible.

## Map Critical User Journeys First

Start with three or four core flows that involve sensitive data or critical functionality. For most applications, that's:

**User Registration**
- Email and password from browser
- Password hashing happens where?
- Email verification token stored where?
- Welcome email sent through which service?
- User data synced to analytics platform?
- Profile data cached where?

**Payment Processing**
- Card number entered in browser
- Does it touch your servers?
- Third-party payment processor gets what data?
- Receipt generation happens where?
- Transaction logs stored where?
- Refund process flows backwards through which systems?

**File Upload**
- File selected in browser
- Size validation client-side or server-side?
- Virus scanning happens where?
- File stored in filesystem, S3, or database?
- File metadata stored separately?
- Download/preview flows through which services?

For each journey, write it out as a list. It doesn't need to be fancy - a numbered list works fine:

```
User Registration Flow:
1. User enters email + password in React form
2. Client-side validation (email format, password length)
3. POST to /api/register endpoint
4. Express middleware logs request (excludes password field)
5. Password hashed with bcrypt (12 rounds)
6. User record written to PostgreSQL users table
7. Verification token generated and written to tokens table
8. Email sent via SendGrid API (includes token in link)
9. Success response to client (no sensitive data)
10. Client redirects to "check your email" page
```

That simple list just revealed that your request logger needs to specifically exclude password fields, your database has two tables to consider for deletion requests, and SendGrid has user email addresses.

## Identify Data Entry and Exit Points

Entry points are where data enters your system. Exit points are where it leaves. Both are security boundaries.

**Common Entry Points:**
- HTML forms (contact, registration, checkout)
- File uploads
- API requests (from your mobile app, from third parties)
- Webhooks (Stripe sends you payment confirmations)
- Scheduled imports (pulling data from partner APIs)
- Admin tools (CSV imports, bulk operations)

**Common Exit Points:**
- API responses to clients
- Emails sent to users
- Third-party service integrations (analytics, monitoring, CRM)
- File exports or reports
- Webhooks you send to others
- Database backups
- Log aggregation services

Each entry point needs validation. Each exit point needs to be considered for data leakage.

The mistake people make: they validate user-submitted forms carefully, but forget that API requests and webhooks are also untrusted input. They protect database passwords, but send detailed error messages to the client that include SQL queries.

Make a table:

| Entry/Exit | Data Type | Validation | Destination |
|------------|-----------|------------|-------------|
| Login form | Email, password | Email format, password present | Database |
| Stripe webhook | Payment status | Signature verification | Database + email |
| User profile API | Any user fields | Schema validation | Database + Redis cache |
| Error logs | Stack traces, request data | PII scrubbing | CloudWatch |
| Analytics events | User ID, page views | ID format | Google Analytics |

That table just told you that error logs need PII scrubbing before they go to CloudWatch, and analytics events are sending user IDs to Google.

## Trust Boundaries: Where Validation Actually Matters

A trust boundary is anywhere data moves from a less-trusted to a more-trusted context, or vice versa.

**Less trusted → More trusted:**
- User input → Your database
- Third-party API response → Your business logic
- Uploaded file → Your file system
- URL parameter → SQL query

**More trusted → Less trusted:**
- Your database → Public API response
- Internal error details → User-facing error message
- Admin data → Regular user view
- Your API key → Client-side JavaScript

At each boundary, something needs to happen. Usually validation going in, sanitization going out.

The classic mistakes:

**Trusting Client-Side Validation**
The browser form validates that the email field contains an '@' symbol. Great. Someone can still craft a POST request directly to your API with `email: "robert'; DROP TABLE users;--"`. Validate server-side at the trust boundary.

**Exposing Internal Details**
Your database query fails. The error object includes the full SQL query with table names and column names. You return it to the client to help with debugging. You just gave an attacker your database schema.

**Assuming Third-Party Data is Safe**
You integrate with a vendor API that returns product data. You display it directly in your app. They get compromised and start returning JavaScript in product descriptions. Now you have XSS.

For each trust boundary in your data flow map, write down what happens there:

```
Trust Boundary: User Form Submit → API Handler
- Validation: Joi schema (email, password rules)
- Sanitization: Trim whitespace
- Rate limiting: 5 requests per minute per IP
- Logging: Request logged without password field

Trust Boundary: Database → API Response
- Filtering: Remove password hash, internal IDs
- Transform: Format timestamps as ISO8601
- Sanitization: HTML encode any user-generated content
```

## Create Simple Sequence Diagrams

You don't need UML tools. A text-based sequence diagram works fine for surface-level mapping.

Here's a simple format:

```
Password Reset Flow:

User → Client: Click "forgot password"
Client → API: POST /api/reset-password {email}
API → Database: Look up user by email
Database → API: Return user ID (or nothing if not found)
API → Database: Create reset token, expires in 1 hour
API → Email Service: Send reset link
Email Service → User: Email with reset link
User → Client: Click link with token
Client → API: POST /api/reset-password/confirm {token, newPassword}
API → Database: Verify token exists and not expired
API → API: Hash new password
API → Database: Update password, delete token
API → Client: Success
Client → User: "Password updated, please log in"
```

That diagram just revealed several important details:
- You return the same response whether the email exists or not (good for security)
- Tokens expire (you need a cleanup job)
- Tokens are single-use (deleted after successful reset)
- New password gets hashed before storage

For a YOLO dev trying to figure out where their user data is going, drawing this out for your login flow will show you if passwords are being logged, if tokens are expiring, and if you're accidentally sending sensitive data to analytics.

You can also draw this as simple boxes and arrows on paper. The medium doesn't matter - the thinking does.

## Red Flags to Spot While Mapping

As you map your data flows, watch for these warning signs:

**Sensitive Data in Logs**
If your data flow includes "log request to CloudWatch" and the request contains passwords, credit cards, or social security numbers, you have a problem. Logs are hard to delete, often retained for months or years, and accessible to more people than your production database.

**Unclear Data Ownership**
When data flows into a third-party service, who owns it? Can they use it for their own purposes? What happens when you want to delete it? If your flow is "send user email to Mailchimp" but you don't know their data retention policy, you can't comply with GDPR deletion requests.

**Missing Validation Steps**
If your flow goes straight from "user input" to "insert into database" without a validation step, that's SQL injection waiting to happen. Every trust boundary needs validation.

**Data Copied to Multiple Places**
"User uploads profile photo → S3 → thumbnail generated → cache in Redis → copied to CDN → backup to Glacier" means you have five copies of that photo. If the user deletes it, does your flow delete all five?

**Credentials Crossing Boundaries**
If your flow includes "send API key to client-side JavaScript" or "log request with Authorization header," you're leaking credentials. API keys belong server-side.

**Lack of Encryption**
If your flow moves sensitive data between services and doesn't explicitly mention TLS/HTTPS, verify that it's actually encrypted in transit. "Send user data to analytics service" should be "Send user data to analytics service via HTTPS POST."

**No Exit Strategy**
You can map data flowing in, but can you map it flowing out? If a user clicks "delete my account," can you trace all the places their data went and remove it? If not, you can't comply with privacy regulations.

## Example: E-commerce Checkout Flow

Let's map a realistic checkout flow to see these principles in practice:

```
1. User adds items to cart
   - Stored in browser localStorage (temporary, no PII)
   - Cart ID synced to database for logged-in users

2. User proceeds to checkout
   - Cart data sent to API: POST /api/checkout/session
   - API validates product IDs exist and prices match current catalog
   - API creates order record with status "pending"
   - Order ID returned to client

3. User enters shipping address
   - Form validation: required fields, zip code format
   - POST /api/checkout/shipping {orderId, address}
   - API validates order exists and belongs to current user
   - API validates address format
   - Address saved to database orders.shipping_address (JSON field)
   - Address sent to shipping calculator API (HTTPS)
   - Shipping options returned to client

4. User selects shipping method
   - POST /api/checkout/shipping-method {orderId, methodId}
   - API validates method is valid for user's address
   - Shipping cost calculated and saved to order

5. User enters payment details
   - Credit card form rendered by Stripe.js (never touches our server)
   - Stripe returns payment method token
   - Client sends token to our API: POST /api/checkout/payment {orderId, paymentToken}
   - API sends token to Stripe to create charge
   - Stripe returns charge ID and status
   - API updates order with charge ID and status "paid"

6. Order confirmation
   - API sends order details to fulfillment system webhook (HTTPS)
   - API sends receipt email via SendGrid (contains order summary, no payment details)
   - API sends conversion event to Google Analytics (order ID, total, no PII)
   - API returns order confirmation to client
```

This flow shows:
- Cart data starts client-side (low risk) before involving the server
- Address validation happens twice (client and server)
- Credit card data never touches our servers (Stripe.js handles it)
- Trust boundaries marked with validation steps
- External services listed with protocols (HTTPS)
- Clear separation between what data goes where (fulfillment gets order details, analytics gets aggregated data)

If you drew this out before implementing checkout, you'd know that you need Stripe integration, fulfillment webhook support, and SendGrid templates. You'd also know that Google Analytics shouldn't get customer addresses.

## What You Actually Need to Do

Before you build your next feature:

1. **List the data involved**: What fields? What sensitivity level? (Public, internal, confidential, restricted)

2. **Map the journey**: Where does it come from? What happens to it? Where does it end up? Use a numbered list or simple diagram.

3. **Mark trust boundaries**: Every time data crosses from untrusted to trusted (or vice versa), write down what validation or sanitization happens.

4. **Check exit points**: Where does data leave your system? Logs? Third-party services? Backups? Can you delete it later if needed?

5. **Look for red flags**: Credentials in client code? Sensitive data in logs? Missing validation? Unclear ownership?

That's it. You don't need specialized tools or formal training. A text file with a numbered list beats a beautiful diagram you never made.

The hard part isn't the mapping technique - it's remembering to do it before you're knee-deep in code and the data flows have already been decided by convenience rather than intention.

## Key Takeaways

- Data flow mapping shows where data comes from, what happens to it, and where it goes
- Map critical journeys first: registration, payment, file upload, password reset
- Entry points need validation, exit points need sanitization
- Trust boundaries are where data moves between security contexts
- Simple numbered lists or text diagrams work fine for surface-level mapping
- Red flags: sensitive data in logs, missing validation, credentials crossing boundaries, unclear third-party data ownership
- The goal is to see the whole path before building it, not to create perfect documentation

If you can draw the path from user input to database to third-party service to email, you can start asking the right questions about encryption, validation, retention, and compliance. That's the point.
