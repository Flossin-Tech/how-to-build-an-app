---
title: "Code Quality in Practice"
phase: "03-development"
topic: "code-quality"
depth: "mid-depth"
reading_time: 25
prerequisites: []
related_topics: ["refactoring", "code-review-process", "secure-coding-practices"]
personas: ["generalist-leveling-up", "busy-developer", "specialist-expanding"]
updated: "2025-11-15"
---

# Code Quality in Practice

You know the basics - clear names, single responsibility, don't duplicate code. But knowing principles and applying them consistently in real projects are different challenges. This guide focuses on practical application: what to do, what to measure, what trade-offs you'll face, and what red flags signal trouble.

Code quality principles exist because codebases grow. What works in a 500-line script becomes unmaintainable at 50,000 lines. The question isn't whether to follow these principles, but how rigorously to apply them for your context.

## Clean Code Principles

Clean code is code that clearly communicates its intent. Robert Martin's definition: "Clean code reads like well-written prose." This isn't about elegance for its own sake - it's about reducing the cognitive load on every developer who touches this code.

### Naming: The Foundation

Naming is the most immediate signal of code quality. Bad names create confusion. Good names eliminate the need for comments.

#### Action: Choose Names That Reveal Intent

Your names should answer three questions:
- Why does this exist?
- What does it do?
- How is it used?

**What to measure:**
- Can you understand the code without reading the implementation?
- Do you need comments to explain what variables mean?
- Are abbreviations clear to someone unfamiliar with the domain?

**Examples:**

```python
# Bad - requires mental translation
def calc(d, r, t):
    return d * (1 + r) ** t

# Good - self-documenting
def calculate_compound_interest(principal, annual_rate, years):
    return principal * (1 + annual_rate) ** years
```

```javascript
// Bad - what does 's' mean in different contexts?
const s = getStatus();
const s2 = calculateSum();
const s3 = userSettings;

// Good - context is clear
const orderStatus = getOrderStatus();
const totalAmount = calculateSum();
const userSettings = getUserSettings();
```

**For classes and modules:**

```java
// Bad - too generic
class DataManager { }
class Handler { }
class Utility { }

// Good - specific purpose
class CustomerRepository { }
class OrderValidationService { }
class CurrencyFormatter { }
```

**Red flags:**
- Variables named `data`, `info`, `temp`, `x`, `val`
- Functions named `doStuff`, `process`, `handle`, `manage`
- Classes named with `Manager`, `Handler`, `Utility`, `Helper` (often signals unclear responsibility)
- Abbreviations that aren't universally known (`usr`, `pwd` are common; `clr`, `svc`, `mgr` are not)
- Hungarian notation or type prefixes (`strName`, `iCount`) - the compiler knows the type

**Trade-off: Domain Language vs Clarity**

Sometimes domain experts use jargon that's cryptic to outsiders but precise to practitioners. In a healthcare app, `DRG` (Diagnosis-Related Group) is standard terminology. Spelling it out might actually confuse domain experts.

Use domain language when your team and codebase work in that domain. Add comments or documentation to onboard new developers.

### Function Structure: Size and Scope

Functions should be small and focused. "Small" is subjective, but there are practical guidelines.

#### Action: Keep Functions Short and Single-Purpose

A function should do one thing, do it well, and do only that thing. Kent Beck's test: "Can I understand what this function does without reading its implementation?"

**What to measure:**
- Lines of code (target: 10-20 lines; acceptable: up to 50; concerning: over 100)
- Cyclomatic complexity (target: 1-4; acceptable: up to 10; concerning: over 15)
- Number of responsibilities (target: 1)
- Depth of nesting (target: 1-2 levels; problematic: 4+ levels)

**Examples:**

```python
# Bad - function does too much (validation, transformation, persistence, notification)
def process_user_registration(user_data):
    if not user_data.get('email'):
        raise ValueError("Email required")
    if not user_data.get('password'):
        raise ValueError("Password required")
    if len(user_data['password']) < 8:
        raise ValueError("Password too short")

    user_data['email'] = user_data['email'].lower()
    user_data['created_at'] = datetime.now()
    user_data['password_hash'] = hash_password(user_data['password'])
    del user_data['password']

    user_id = database.insert('users', user_data)

    send_welcome_email(user_data['email'])
    log_new_user(user_id)

    return user_id

# Good - each function has one job
def validate_registration_data(user_data):
    required_fields = ['email', 'password']
    for field in required_fields:
        if not user_data.get(field):
            raise ValueError(f"{field} is required")

    if len(user_data['password']) < MIN_PASSWORD_LENGTH:
        raise ValueError("Password too short")

def prepare_user_for_storage(user_data):
    return {
        'email': user_data['email'].lower(),
        'password_hash': hash_password(user_data['password']),
        'created_at': datetime.now()
    }

def save_new_user(user_record):
    return database.insert('users', user_record)

def notify_new_user(user_id, email):
    send_welcome_email(email)
    log_new_user(user_id)

def register_user(user_data):
    validate_registration_data(user_data)
    user_record = prepare_user_for_storage(user_data)
    user_id = save_new_user(user_record)
    notify_new_user(user_id, user_data['email'])
    return user_id
```

The refactored version is longer, but each function is testable independently. When email validation logic changes, you modify one function. When you add SMS notifications, you modify `notify_new_user` without touching validation or storage.

**Red flags:**
- Function has multiple reasons to change
- You need to scroll to see the whole function
- More than 3 levels of indentation
- Function name includes "and" (e.g., `validateAndSave`)
- You can't describe what it does in one simple sentence

**Trade-off: Abstraction Overhead**

Creating tiny functions everywhere creates its own cognitive load. Jumping through 10 function calls to understand a simple process is exhausting.

**Guideline:** Extract functions when:
- The code block has a clear, nameable purpose
- You need to reuse the logic elsewhere
- The extraction reduces nesting or complexity
- Testing the piece independently adds value

Don't extract when:
- The abstraction is harder to understand than the original code
- The function would only be called once and is tightly coupled to one caller
- The name would just restate the code (`getUserId()` for `return user.id`)

### Comments: When and Why

Comments are a tool, not a requirement. Good code explains itself. Comments explain why, not what.

#### Action: Write Comments That Add Information

**Good comments:**
- Explain business rules: "Per GDPR, we must delete after 90 days"
- Clarify non-obvious decisions: "Using binary search here because datasets exceed 10k items"
- Warn about consequences: "Changing this value affects billing calculation - see finance team"
- Document complex algorithms: "Implementing Dijkstra's algorithm for route optimization"

**Bad comments:**
- Restating code: `// increment i` for `i++`
- Out-of-date information: comment says one thing, code does another
- Commented-out code: delete it (it's in version control)
- TODO without a ticket reference or date

**Examples:**

```go
// Bad - comment just repeats the code
// Get the user
user := getUser(id)
// Check if user is admin
if user.Role == "admin" {
    // Grant access
    grantAccess()
}

// Good - comment explains the business rule
// Only admins can access payroll data due to SOX compliance requirements
user := getUser(id)
if user.Role == "admin" {
    grantAccess()
}
```

```javascript
// Bad - comment is outdated
// Returns array of user IDs
function getActiveUsers() {
    // Code was changed to return full user objects, comment wasn't updated
    return users.filter(u => u.active);
}

// Good - no comment needed, function name and code are clear
function getActiveUsers() {
    return users.filter(user => user.active);
}
```

**Red flags:**
- Comments explaining what the code does (rewrite the code to be clearer)
- Comments contradicting the code
- Large blocks of commented-out code
- TODOs without owner or context

## Single Responsibility Principle (SRP)

SRP is the most practical SOLID principle: each module, class, or function should have one reason to change.

### Understanding "Responsibility"

A responsibility is a reason to change. If two different stakeholders can request changes to the same piece of code, it has multiple responsibilities.

**Example:** An `Employee` class that calculates pay, generates reports, and saves to the database has three responsibilities:
- **Accounting** might request changes to pay calculation
- **HR** might request changes to report format
- **DBA** might request changes to database schema

Each responsibility should be its own class or module.

#### Action: Identify and Separate Concerns

**What to measure:**
- How many different reasons could this code change?
- How many different stakeholders care about this code?
- Does this class/module do data access AND business logic?
- Does this function do validation AND transformation?

**Examples:**

```java
// Bad - multiple responsibilities
public class Employee {
    private String name;
    private double salary;

    // Responsibility 1: Calculate pay (Accounting)
    public double calculatePay() {
        return salary * getWorkHours() * (1 + getBonusRate());
    }

    // Responsibility 2: Generate reports (HR)
    public String generateReport() {
        return String.format("Employee: %s, Salary: %.2f", name, salary);
    }

    // Responsibility 3: Database persistence (DBA)
    public void save() {
        String sql = "INSERT INTO employees (name, salary) VALUES (?, ?)";
        database.execute(sql, name, salary);
    }
}

// Good - single responsibility per class
public class Employee {
    private String name;
    private double salary;

    // Only data and basic getters/setters
    public String getName() { return name; }
    public double getSalary() { return salary; }
}

public class PayrollCalculator {
    public double calculatePay(Employee employee) {
        return employee.getSalary() * getWorkHours(employee) * (1 + getBonusRate(employee));
    }
}

public class EmployeeReportGenerator {
    public String generateReport(Employee employee) {
        return String.format("Employee: %s, Salary: %.2f",
                           employee.getName(),
                           employee.getSalary());
    }
}

public class EmployeeRepository {
    public void save(Employee employee) {
        String sql = "INSERT INTO employees (name, salary) VALUES (?, ?)";
        database.execute(sql, employee.getName(), employee.getSalary());
    }
}
```

**Red flags:**
- Class or module has more than one reason to change
- Name includes "and" or "Manager" (often a sign of multiple responsibilities)
- Changes in UI require changes in database code
- Business logic embedded in controllers or API handlers

**Trade-off: Over-Application Creates Complexity**

Taken to extremes, SRP creates an explosion of tiny classes that are hard to navigate. A class with three small, related methods doesn't need to be split into three classes.

**Guideline:** Apply SRP when:
- Different stakeholders have authority over different parts of the code
- Changes in one area regularly break unrelated functionality
- Testing requires mocking unrelated dependencies
- The module has grown beyond 200-300 lines

Don't split when:
- Responsibilities are tightly coupled and always change together
- Splitting creates more indirection than clarity
- The "separate" classes would only be used together

## DRY, WET, and AHA

Don't Repeat Yourself (DRY) is fundamental, but like all principles, it can be misapplied. Understanding when to apply DRY and when to accept duplication is a key skill.

### DRY: Don't Repeat Yourself

Every piece of knowledge should have a single, authoritative representation in your codebase.

#### Action: Eliminate Duplication of Logic

**What to measure:**
- Is the same logic copy-pasted in multiple places?
- If you need to fix a bug, do you need to fix it in multiple places?
- If a business rule changes, how many places need updates?

**Examples:**

```python
# Bad - calculation duplicated
def calculate_employee_tax(employee):
    gross_pay = employee.salary
    federal_tax = gross_pay * 0.22
    state_tax = gross_pay * 0.05
    total_tax = federal_tax + state_tax
    return gross_pay - total_tax

def calculate_contractor_tax(contractor):
    gross_pay = contractor.hourly_rate * contractor.hours
    federal_tax = gross_pay * 0.22
    state_tax = gross_pay * 0.05
    total_tax = federal_tax + state_tax
    return gross_pay - total_tax

# Good - logic extracted
FEDERAL_TAX_RATE = 0.22
STATE_TAX_RATE = 0.05

def calculate_total_tax(gross_pay):
    federal_tax = gross_pay * FEDERAL_TAX_RATE
    state_tax = gross_pay * STATE_TAX_RATE
    return federal_tax + state_tax

def calculate_net_pay(gross_pay):
    return gross_pay - calculate_total_tax(gross_pay)

def calculate_employee_net_pay(employee):
    return calculate_net_pay(employee.salary)

def calculate_contractor_net_pay(contractor):
    gross_pay = contractor.hourly_rate * contractor.hours
    return calculate_net_pay(gross_pay)
```

### WET: Write Everything Twice

Sometimes duplication is acceptable, especially early in development when you don't yet understand the domain well enough to abstract correctly.

#### Action: Accept Strategic Duplication

Duplication is better than premature abstraction. If you're not sure if two similar pieces of code will evolve together, it's fine to duplicate initially.

**Examples:**

```javascript
// These look similar but serve different business purposes
function validateOrderQuantity(quantity) {
    if (quantity < 1 || quantity > 100) {
        throw new Error("Order quantity must be between 1 and 100");
    }
}

function validateInventoryQuantity(quantity) {
    if (quantity < 1 || quantity > 100) {
        throw new Error("Inventory quantity must be between 1 and 100");
    }
}

// Don't abstract yet - these might diverge
// Order limits might change based on customer type
// Inventory limits might change based on warehouse capacity
// Wait until you're sure they'll evolve together
```

**When to accept duplication:**
- You've only written it twice (rule of three: refactor on the third duplication)
- The similar code serves different business purposes
- The code is in different bounded contexts or modules that should be independent
- You're experimenting and requirements aren't stable

### AHA: Avoid Hasty Abstractions

Kent Dodds popularized this: prefer duplication over the wrong abstraction. Bad abstractions are harder to fix than duplicated code.

#### Action: Wait for the Right Abstraction

**Red flags of bad abstractions:**
- Boolean flags to switch behavior (`calculateTax(amount, isContractor=false)`)
- Many parameters, most optional (`processPayment(amount, type, fee=0, tax=0, discount=0, ...)`)
- Conditional logic choosing between different behaviors
- Abstraction used in only one or two places

**Examples:**

```python
# Bad abstraction - trying to handle too many cases
def process_payment(amount, payment_type, is_refund=False, is_international=False,
                   apply_discount=False, discount_rate=0, requires_approval=False):
    if is_refund:
        amount = -amount

    if apply_discount:
        amount = amount * (1 - discount_rate)

    if is_international:
        amount = convert_currency(amount)
        fee = amount * 0.03
    else:
        fee = amount * 0.01

    total = amount + fee

    if requires_approval and total > 1000:
        return send_for_approval(total)

    return charge_customer(total, payment_type)

# Better - separate functions for different use cases
def process_domestic_payment(amount, payment_type):
    fee = amount * DOMESTIC_FEE_RATE
    total = amount + fee
    return charge_customer(total, payment_type)

def process_international_payment(amount, payment_type):
    converted_amount = convert_currency(amount)
    fee = converted_amount * INTERNATIONAL_FEE_RATE
    total = converted_amount + fee
    return charge_customer(total, payment_type)

def process_refund(original_amount, payment_type):
    return charge_customer(-original_amount, payment_type)

def process_payment_with_approval(amount, payment_type):
    if amount > APPROVAL_THRESHOLD:
        return send_for_approval(amount, payment_type)
    return process_domestic_payment(amount, payment_type)
```

**Trade-off framework:**

| Signal | Favor Duplication | Favor Abstraction |
|--------|------------------|-------------------|
| Occurrences | 2 instances | 3+ instances |
| Stability | Requirements changing | Requirements stable |
| Similarity | Surface-level similar | Deeply identical |
| Domain | Different contexts | Same context |
| Tests | Easy to test separately | Tests are duplicated |

## Module, Class, and Function Sizing

Size matters. Small, focused units are easier to understand, test, and modify than large, sprawling ones.

### Functions: 10-50 Lines

**Target:** Most functions under 20 lines
**Acceptable:** Up to 50 lines
**Concerning:** Over 100 lines

#### Action: Extract Functions When They Grow

**What to measure:**
- Lines of code in the function
- Levels of indentation (over 3 is a smell)
- Number of local variables (over 5-7 suggests too much happening)

**Examples:**

```go
// Bad - 80+ line function doing too much
func ProcessOrder(order Order) error {
    // Validation (15 lines)
    if order.Items == nil || len(order.Items) == 0 {
        return errors.New("order has no items")
    }
    for _, item := range order.Items {
        if item.Quantity <= 0 {
            return errors.New("invalid quantity")
        }
        if item.Price < 0 {
            return errors.New("invalid price")
        }
    }

    // Price calculation (20 lines)
    var subtotal float64
    for _, item := range order.Items {
        subtotal += item.Price * float64(item.Quantity)
    }
    tax := subtotal * 0.08
    shipping := calculateShipping(order)
    total := subtotal + tax + shipping

    // Inventory check (15 lines)
    for _, item := range order.Items {
        available, err := inventory.Check(item.ProductID)
        if err != nil {
            return err
        }
        if available < item.Quantity {
            return errors.New("insufficient inventory")
        }
    }

    // Payment processing (20 lines)
    payment := Payment{
        Amount: total,
        Method: order.PaymentMethod,
    }
    if err := ProcessPayment(payment); err != nil {
        return err
    }

    // Database save (10 lines)
    order.Status = "confirmed"
    order.Total = total
    if err := db.Save(order); err != nil {
        return err
    }

    return nil
}

// Good - orchestrator with focused helper functions
func ProcessOrder(order Order) error {
    if err := ValidateOrder(order); err != nil {
        return err
    }

    total, err := CalculateOrderTotal(order)
    if err != nil {
        return err
    }

    if err := CheckInventory(order); err != nil {
        return err
    }

    if err := ProcessPayment(total, order.PaymentMethod); err != nil {
        return err
    }

    return SaveOrder(order, total)
}

// Each helper function is 10-20 lines, focused, testable
```

### Classes: 200-500 Lines

**Target:** Most classes under 200 lines
**Acceptable:** Up to 500 lines
**Concerning:** Over 1000 lines

#### Action: Split Classes by Responsibility

**What to measure:**
- Total lines of code
- Number of methods (over 20 is concerning)
- Number of instance variables (over 10 suggests multiple responsibilities)
- How many methods use each instance variable (low cohesion suggests split opportunity)

**Red flags:**
- Class name ends in "Manager", "Handler", "Utility"
- Class does data access and business logic
- Multiple unrelated public methods
- Instance variables only used by subset of methods

### Modules/Files: 500-1000 Lines

**Target:** Most modules under 500 lines
**Acceptable:** Up to 1000 lines
**Concerning:** Over 2000 lines

#### Action: Split by Feature or Responsibility

Large modules are hard to navigate and often signal mixed responsibilities.

**Examples:**

```
# Bad - everything in one file
user_management.py (2500 lines)
  - User model
  - Authentication logic
  - Authorization logic
  - User CRUD operations
  - Password reset flow
  - Email verification
  - User profile management
  - User preferences

# Good - split by responsibility
models/user.py (150 lines)
services/authentication.py (200 lines)
services/authorization.py (180 lines)
repositories/user_repository.py (150 lines)
controllers/user_profile_controller.py (200 lines)
controllers/user_preferences_controller.py (120 lines)
```

## SOLID Principles in Practice

SOLID is five design principles for object-oriented code. Here we focus on practical application and when to bend the rules.

### S: Single Responsibility Principle

(Covered in detail above)

### O: Open/Closed Principle

Software entities should be open for extension but closed for modification.

#### Action: Design for Extension Points

When you anticipate change, design so new behavior can be added without modifying existing code.

**Examples:**

```python
# Bad - modifying the class for each new payment type
class PaymentProcessor:
    def process(self, payment_type, amount):
        if payment_type == "credit_card":
            return self.process_credit_card(amount)
        elif payment_type == "paypal":
            return self.process_paypal(amount)
        elif payment_type == "crypto":  # modification required
            return self.process_crypto(amount)

# Good - new payment types extend without modifying
class PaymentProcessor:
    def process(self, amount):
        raise NotImplementedError

class CreditCardProcessor(PaymentProcessor):
    def process(self, amount):
        # credit card logic
        pass

class PayPalProcessor(PaymentProcessor):
    def process(self, amount):
        # PayPal logic
        pass

class CryptoProcessor(PaymentProcessor):  # extension, not modification
    def process(self, amount):
        # crypto logic
        pass
```

**Trade-off:** Don't over-engineer for hypothetical future requirements. Apply O/C when:
- You have evidence that this area changes frequently
- Multiple teams need to extend behavior independently
- You're building a library or framework

Don't apply when:
- Requirements are stable
- The abstraction is more complex than the alternatives
- You're in application code that's unlikely to need extension

### L: Liskov Substitution Principle

Objects of a subclass should be replaceable with objects of the superclass without breaking the application.

#### Action: Ensure Subclasses Honor Contracts

If your code works with a `Bird`, it should work with any subclass of `Bird`. Subclasses should strengthen, not weaken, the contracts of their superclasses.

**Examples:**

```java
// Bad - violates LSP
class Bird {
    public void fly() {
        // flying logic
    }
}

class Penguin extends Bird {
    @Override
    public void fly() {
        throw new UnsupportedOperationException("Penguins can't fly");
    }
}

// Code that expects any Bird to fly will break
void migrateBirds(List<Bird> birds) {
    for (Bird bird : birds) {
        bird.fly();  // Breaks when bird is a Penguin
    }
}

// Good - redesigned hierarchy
interface Bird {
    void eat();
    void sleep();
}

interface FlyingBird extends Bird {
    void fly();
}

class Sparrow implements FlyingBird {
    public void fly() { /* flying logic */ }
    public void eat() { /* eating logic */ }
    public void sleep() { /* sleeping logic */ }
}

class Penguin implements Bird {
    public void eat() { /* eating logic */ }
    public void sleep() { /* sleeping logic */ }
    // No fly method - doesn't claim to be a FlyingBird
}
```

**Trade-off:** LSP is easier to violate than you think. Pay attention when:
- Subclass throws exceptions the parent doesn't
- Subclass has stricter input requirements
- Subclass has weaker output guarantees
- Subclass has different side effects

### I: Interface Segregation Principle

Clients shouldn't be forced to depend on interfaces they don't use.

#### Action: Create Focused Interfaces

Better to have multiple small, focused interfaces than one large interface where clients only use a subset.

**Examples:**

```typescript
// Bad - fat interface
interface Worker {
    work(): void;
    eat(): void;
    sleep(): void;
    attendMeeting(): void;
    submitExpenseReport(): void;
}

// Robot implements Worker but doesn't eat or sleep
class Robot implements Worker {
    work() { /* ... */ }
    eat() { throw new Error("Robots don't eat"); }
    sleep() { throw new Error("Robots don't sleep"); }
    attendMeeting() { /* ... */ }
    submitExpenseReport() { /* ... */ }
}

// Good - segregated interfaces
interface Workable {
    work(): void;
}

interface Eatable {
    eat(): void;
}

interface Sleepable {
    sleep(): void;
}

interface MeetingParticipant {
    attendMeeting(): void;
}

interface ExpenseReporter {
    submitExpenseReport(): void;
}

class HumanWorker implements Workable, Eatable, Sleepable, MeetingParticipant {
    work() { /* ... */ }
    eat() { /* ... */ }
    sleep() { /* ... */ }
    attendMeeting() { /* ... */ }
}

class Robot implements Workable, MeetingParticipant {
    work() { /* ... */ }
    attendMeeting() { /* ... */ }
}
```

### D: Dependency Inversion Principle

High-level modules shouldn't depend on low-level modules. Both should depend on abstractions.

#### Action: Depend on Interfaces, Not Concrete Classes

This enables testing, swapping implementations, and reducing coupling.

**Examples:**

```python
# Bad - high-level code depends on low-level implementation
class EmailService:
    def send(self, to, subject, body):
        # SMTP implementation
        pass

class UserRegistration:
    def __init__(self):
        self.email_service = EmailService()  # direct dependency

    def register(self, user):
        self.save_user(user)
        self.email_service.send(user.email, "Welcome", "Thanks for registering")

# Good - both depend on abstraction
class NotificationService(ABC):
    @abstractmethod
    def send(self, to, subject, body):
        pass

class EmailNotificationService(NotificationService):
    def send(self, to, subject, body):
        # SMTP implementation
        pass

class SMSNotificationService(NotificationService):
    def send(self, to, subject, body):
        # SMS implementation
        pass

class UserRegistration:
    def __init__(self, notification_service: NotificationService):
        self.notification_service = notification_service  # depends on abstraction

    def register(self, user):
        self.save_user(user)
        self.notification_service.send(user.email, "Welcome", "Thanks for registering")

# Can now easily test with mock, switch to SMS, etc.
```

**Trade-off:** Dependency inversion adds indirection. Apply when:
- You need to swap implementations (testing, A/B testing, multi-tenancy)
- You're building reusable components
- The concrete implementation is likely to change

Don't apply when:
- The dependency is stable and unlikely to change (e.g., standard library)
- You're building a simple script or prototype
- The abstraction doesn't simplify anything

## Cohesion and Coupling

Cohesion and coupling are complementary concepts that govern how you organize code.

### High Cohesion: Things That Change Together

Cohesion measures how closely related the responsibilities within a module are. High cohesion means everything in the module belongs together.

#### Action: Group Related Functionality

**What to measure:**
- Do changes in one part of the module require changes in other parts?
- Do methods use the same instance variables?
- Could you describe the module's purpose in one sentence?

**Examples:**

```java
// Low cohesion - unrelated responsibilities
class Utility {
    public double calculateTax(double amount) { }
    public String formatDate(Date date) { }
    public void sendEmail(String to, String subject) { }
    public int[] sortArray(int[] arr) { }
}

// High cohesion - each class has a focused purpose
class TaxCalculator {
    public double calculateTax(double amount) { }
    public double calculateTaxWithExemptions(double amount, List<Exemption> exemptions) { }
}

class DateFormatter {
    public String formatDate(Date date) { }
    public String formatDateTime(Date date) { }
    public String formatDateRange(Date start, Date end) { }
}
```

### Low Coupling: Minimize Dependencies

Coupling measures how much one module depends on another. Low coupling means modules can change independently.

#### Action: Minimize Inter-Module Dependencies

**What to measure:**
- How many other modules does this one import or reference?
- If you change this module, how many other modules might break?
- Can you test this module without instantiating half your codebase?

**Examples:**

```javascript
// High coupling - UserService depends on concrete implementations
class UserService {
    constructor() {
        this.database = new MySQLDatabase();
        this.emailer = new SendGridEmailer();
        this.logger = new FileLogger();
        this.cache = new RedisCache();
    }

    createUser(userData) {
        const user = this.database.insert(userData);
        this.cache.set(`user:${user.id}`, user);
        this.emailer.send(user.email, "Welcome");
        this.logger.log(`User created: ${user.id}`);
        return user;
    }
}

// Low coupling - depends on interfaces
class UserService {
    constructor(database, emailer, logger, cache) {
        this.database = database;
        this.emailer = emailer;
        this.logger = logger;
        this.cache = cache;
    }

    createUser(userData) {
        const user = this.database.insert(userData);
        this.cache.set(`user:${user.id}`, user);
        this.emailer.send(user.email, "Welcome");
        this.logger.log(`User created: ${user.id}`);
        return user;
    }
}
```

**Red flags:**
- Circular dependencies (A imports B, B imports A)
- Changes ripple across many modules
- Can't test a module without complex setup
- Modules reach deep into other modules' internals

**Trade-off:** Zero coupling is impossible and undesirable. Some coupling is necessary. The question is where to draw boundaries.

**Guideline:**
- High cohesion within modules (things that change together, stay together)
- Low coupling between modules (minimize cross-module dependencies)
- Use interfaces to decouple from concrete implementations
- Prefer passing dependencies rather than creating them internally

## Common Pitfalls

### Pitfall 1: Premature Optimization

**Symptom:** Abstractions before you understand the problem

```python
# Premature abstraction
class AbstractFactoryProvider:
    def get_factory(self, factory_type):
        # Complex logic for something used once
        pass

# Better: Start simple
def create_user(name, email):
    return User(name=name, email=email)

# Refactor when you need multiple user types
```

**Fix:** Wait until you have three examples before abstracting. Optimize for readability first, performance second.

### Pitfall 2: God Classes

**Symptom:** One class does everything

```java
// UserManager: 2000 lines handling authentication, authorization,
// CRUD, password reset, email, logging, caching...

// Fix: Split by responsibility
class UserRepository { }
class AuthenticationService { }
class AuthorizationService { }
class PasswordResetService { }
```

### Pitfall 3: Anemic Domain Model

**Symptom:** Objects with only getters/setters, no behavior

```python
class Order:
    def __init__(self):
        self.items = []
        self.total = 0

# Logic lives elsewhere
def calculate_order_total(order):
    return sum(item.price * item.quantity for item in order.items)

# Better: Put behavior with data
class Order:
    def calculate_total(self):
        return sum(item.price * item.quantity for item in self.items)
```

### Pitfall 4: Feature Envy

**Symptom:** A method uses more data from another class than its own

```java
// Bad - getOrderTotal uses more from order than from report
class Report {
    public double getOrderTotal(Order order) {
        double total = 0;
        for (Item item : order.getItems()) {
            total += item.getPrice() * item.getQuantity();
        }
        return total;
    }
}

// Good - method belongs where the data is
class Order {
    public double getTotal() {
        double total = 0;
        for (Item item : this.items) {
            total += item.getPrice() * item.getQuantity();
        }
        return total;
    }
}
```

### Pitfall 5: Stringly Typed Code

**Symptom:** Using strings where enums or types would be clearer

```python
# Bad
def process_payment(payment_type):
    if payment_type == "credit":  # typo: "crdit"
        # ...

# Good
from enum import Enum

class PaymentType(Enum):
    CREDIT_CARD = 1
    DEBIT_CARD = 2
    PAYPAL = 3

def process_payment(payment_type: PaymentType):
    if payment_type == PaymentType.CREDIT_CARD:
        # ...
```

## What's Next

You now have practical frameworks for writing maintainable code: clear naming, single responsibility, strategic duplication vs abstraction, appropriate sizing, and SOLID principles with their trade-offs.

For advanced topics including technical debt quantification, code quality frameworks, team standards, and managing quality in large codebases, see **Deep Water: Enterprise Code Quality**.

To apply these principles to existing code, see [Refactoring](/content/03-development/refactoring/). To ensure quality through team processes, see [Code Review Process](/content/03-development/code-review-process/).

---

**Navigation:**
- **Phase:** [03-development](/content/03-development/)
- **Related Topics:** [Refactoring](/content/03-development/refactoring/), [Code Review Process](/content/03-development/code-review-process/), [Secure Coding Practices](/content/03-development/secure-coding-practices/)
- **Previous Depth:** [Surface: Code Quality Essentials](/content/03-development/code-quality/surface/)
- **Next Depth:** [Deep Water: Enterprise Code Quality](/content/03-development/code-quality/deep-water/)
