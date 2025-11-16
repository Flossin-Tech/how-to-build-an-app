---
title: "Systematic Refactoring: Code Smells and Safe Improvement Techniques"
phase: "03-development"
topic: "refactoring"
depth: "mid-depth"
reading_time: 25
prerequisites: []
related_topics: ["code-quality", "code-review-process", "testing-strategy"]
personas: ["generalist-leveling-up", "specialist-expanding", "busy-developer"]
updated: "2025-11-15"
---

# Systematic Refactoring: Code Smells and Safe Improvement Techniques

Refactoring isn't just "making code prettier." It's a systematic practice of recognizing problems (code smells) and applying proven solutions (refactoring patterns) while maintaining safety through tests.

This guide gives you a catalog of what to look for and how to fix it.

## The Safe Refactoring Process

Before we get into code smells and techniques, understand the process that keeps refactoring safe:

### 1. Tests First, Always

If you don't have tests covering the code you're about to refactor, stop. Write tests first. You need to know the code works before you change it, and you need automated verification that it still works after.

This is called "characterization testing" when you're working with legacy code - tests that describe what the code currently does, even if what it does is weird. You can improve behavior later. First, lock in current behavior so you know you're not breaking things.

### 2. Small Changes, Continuous Validation

Make one small change. Run tests. Commit if tests pass. Repeat.

Don't refactor and add features in the same commit. Don't refactor three different things at once. One smell, one refactoring, one commit.

Modern version control makes this easy. If something breaks, you know exactly which change broke it because you only changed one thing.

### 3. Refactor → Test → Commit → Repeat

This rhythm becomes automatic:
1. Identify a smell
2. Apply a refactoring
3. Run all tests
4. Commit if green
5. Find next smell

If tests fail, you either found a bug (good, you can fix it) or you broke something (revert and try again with a smaller change).

### 4. Use Your Tools

Modern IDEs have refactoring support built in. "Extract Method," "Rename," "Move Class" - these aren't just menu items. They're automated refactorings that preserve behavior and update all references.

Use them. They're safer than manual changes and way faster.

## The 5 Categories of Code Smells

Kent Beck and Martin Fowler identified patterns that indicate code needs attention. These are "code smells" - not bugs exactly, but signs that something's wrong.

### Category 1: Bloaters

These are things that have grown too large or complex. They start small and accumulate cruft over time.

#### Long Method

A method that does too much. Hard to understand, hard to test, hard to reuse parts of it.

**Smells like:**
```javascript
function processCheckout(cart, user, paymentInfo, shippingInfo) {
    // Validate cart
    if (!cart || cart.items.length === 0) {
        throw new Error("Empty cart");
    }
    for (let item of cart.items) {
        if (item.quantity <= 0) throw new Error("Invalid quantity");
        if (!item.price || item.price <= 0) throw new Error("Invalid price");
    }

    // Calculate totals
    let subtotal = 0;
    for (let item of cart.items) {
        subtotal += item.price * item.quantity;
    }
    let tax = subtotal * 0.08;
    let shipping = subtotal > 100 ? 0 : 9.99;
    let total = subtotal + tax + shipping;

    // Process payment
    let paymentResponse = await paymentGateway.charge(
        paymentInfo.cardNumber,
        paymentInfo.cvv,
        paymentInfo.expiry,
        total
    );
    if (!paymentResponse.success) {
        throw new Error("Payment failed");
    }

    // Update inventory
    for (let item of cart.items) {
        await database.query(
            'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
            [item.quantity, item.id]
        );
    }

    // Create order record
    let orderId = await database.insert('orders', {
        userId: user.id,
        total: total,
        status: 'processing'
    });

    // Send confirmation email
    await emailService.send({
        to: user.email,
        template: 'order-confirmation',
        data: { orderId, total, items: cart.items }
    });

    return { orderId, total };
}
```

**Fix with Extract Method:**
```javascript
function processCheckout(cart, user, paymentInfo, shippingInfo) {
    validateCart(cart);
    const pricing = calculatePricing(cart);
    const payment = await processPayment(paymentInfo, pricing.total);
    await updateInventory(cart.items);
    const order = await createOrder(user, pricing, cart.items);
    await sendOrderConfirmation(user.email, order);
    return order;
}

function validateCart(cart) {
    if (!cart || cart.items.length === 0) {
        throw new Error("Empty cart");
    }
    for (let item of cart.items) {
        if (item.quantity <= 0) throw new Error("Invalid quantity");
        if (!item.price || item.price <= 0) throw new Error("Invalid price");
    }
}

function calculatePricing(cart) {
    const subtotal = cart.items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
    );
    const tax = subtotal * 0.08;
    const shipping = subtotal > 100 ? 0 : 9.99;
    return { subtotal, tax, shipping, total: subtotal + tax + shipping };
}

// ... other extracted methods
```

Each piece now has a name that explains what it does. Each can be tested independently. Each can be reused.

#### Large Class (God Class)

A class that does everything. It knows too much, does too much, has too many responsibilities.

**Symptoms:**
- Dozens of methods
- Hundreds of lines
- Fields that are only used by some methods
- Name like "Manager" or "Handler" or "Controller" (vague responsibilities)

**Fix with Extract Class:**

```python
# Before: OrderManager does everything
class OrderManager:
    def __init__(self, db, payment_gateway, email_service, inventory):
        self.db = db
        self.payment_gateway = payment_gateway
        self.email_service = email_service
        self.inventory = inventory

    def create_order(self, cart, user, payment_info):
        # validation logic
        # payment logic
        # inventory logic
        # email logic
        pass

    def cancel_order(self, order_id):
        # more mixed responsibilities
        pass

    def calculate_tax(self, amount):
        # tax logic that should be elsewhere
        pass

# After: Each concern separated
class OrderService:
    def __init__(self, payment_processor, inventory_manager, notification_service):
        self.payment = payment_processor
        self.inventory = inventory_manager
        self.notifications = notification_service

    def create_order(self, cart, user, payment_info):
        payment_result = self.payment.process(payment_info, cart.total)
        self.inventory.reserve(cart.items)
        order = Order.create(cart, user, payment_result)
        self.notifications.send_order_confirmation(order)
        return order

class PaymentProcessor:
    def __init__(self, gateway, tax_calculator):
        self.gateway = gateway
        self.tax_calculator = tax_calculator

    def process(self, payment_info, amount):
        total_with_tax = self.tax_calculator.calculate(amount)
        return self.gateway.charge(payment_info, total_with_tax)

class TaxCalculator:
    def calculate(self, amount, region='US'):
        # tax logic isolated
        pass
```

#### Long Parameter List

Methods that take too many parameters. Hard to call, hard to remember what goes where, easy to pass arguments in the wrong order.

**Fix with Introduce Parameter Object:**

```java
// Before: Too many parameters
public Order createOrder(
    String customerId,
    String customerEmail,
    String customerName,
    String shippingStreet,
    String shippingCity,
    String shippingState,
    String shippingZip,
    String billingStreet,
    String billingCity,
    String billingState,
    String billingZip,
    List<Item> items,
    String paymentMethod,
    String cardNumber
) {
    // ... nightmare to call this
}

// After: Group related parameters
public Order createOrder(
    Customer customer,
    Address shippingAddress,
    Address billingAddress,
    Cart cart,
    PaymentInfo payment
) {
    // Much clearer what's needed
}

// Parameter objects
class Customer {
    String id;
    String email;
    String name;
}

class Address {
    String street;
    String city;
    String state;
    String zip;
}
```

#### Primitive Obsession

Using primitive types (strings, numbers) when you should have a domain object. Leads to validation scattered everywhere and no central place for behavior.

```python
# Before: Primitives everywhere
def send_email(to_address: str, from_address: str):
    # Is this a valid email? Who knows!
    # Validation has to happen here and everywhere else
    if '@' not in to_address:
        raise ValueError("Invalid email")
    # ...

# After: Domain object with validation
class EmailAddress:
    def __init__(self, address: str):
        if '@' not in address or '.' not in address.split('@')[1]:
            raise ValueError(f"Invalid email: {address}")
        self.address = address

    def domain(self):
        return self.address.split('@')[1]

    def __str__(self):
        return self.address

def send_email(to: EmailAddress, from_addr: EmailAddress):
    # Guaranteed to be valid, no checking needed
    # Plus we get domain-specific behavior
    print(f"Sending from {from_addr.domain()} to {to.domain()}")
```

### Category 2: Object-Orientation Abusers

These are violations of OO principles - using the wrong tool for the job.

#### Switch Statements (Type Codes)

Using switch/case or long if/else chains based on type codes instead of polymorphism.

**Problem:**
```javascript
function calculatePay(employee) {
    switch(employee.type) {
        case 'SALARIED':
            return employee.salary / 12;
        case 'HOURLY':
            return employee.hourlyRate * employee.hoursWorked;
        case 'COMMISSIONED':
            return employee.baseSalary + (employee.sales * employee.commissionRate);
        default:
            throw new Error("Unknown employee type");
    }
}

function getVacationDays(employee) {
    switch(employee.type) {
        case 'SALARIED':
            return 20;
        case 'HOURLY':
            return 10;
        case 'COMMISSIONED':
            return 15;
    }
}

// Every time you add a new employee type, you have to find
// and update every switch statement. Easy to miss one.
```

**Fix with Replace Type Code with Polymorphism:**
```javascript
class Employee {
    constructor(name) {
        this.name = name;
    }
    // Default behavior
    calculatePay() {
        throw new Error("Must implement calculatePay");
    }
    getVacationDays() {
        throw new Error("Must implement getVacationDays");
    }
}

class SalariedEmployee extends Employee {
    constructor(name, annualSalary) {
        super(name);
        this.annualSalary = annualSalary;
    }
    calculatePay() {
        return this.annualSalary / 12;
    }
    getVacationDays() {
        return 20;
    }
}

class HourlyEmployee extends Employee {
    constructor(name, hourlyRate) {
        super(name);
        this.hourlyRate = hourlyRate;
    }
    calculatePay(hoursWorked) {
        return this.hourlyRate * hoursWorked;
    }
    getVacationDays() {
        return 10;
    }
}

// Now adding a new employee type means creating one new class.
// All the behavior is in one place.
```

Note: Sometimes a switch statement is fine. If it only appears once and isn't likely to change, polymorphism might be overkill. But if you're duplicating the same switch in multiple places, that's the smell.

#### Temporary Field

Fields in a class that are only used in certain circumstances. Makes the object harder to understand because you don't know what state is valid.

```python
# Before: Fields used only sometimes
class Order:
    def __init__(self):
        self.items = []
        self.discount_code = None  # Only used during promotion periods
        self.gift_wrap = None      # Only used for gifts
        self.rush_shipping = None  # Only used when rushing

    def calculate_total(self):
        total = sum(item.price for item in self.items)
        if self.discount_code:  # Sometimes this matters, sometimes it doesn't
            total -= self.apply_discount()
        if self.gift_wrap:
            total += 5.99
        if self.rush_shipping:
            total += 20.00
        return total

# After: Extract special cases to their own classes
class Order:
    def __init__(self, items):
        self.items = items

    def calculate_total(self):
        return sum(item.price for item in self.items)

class PromotionalOrder(Order):
    def __init__(self, items, discount_code):
        super().__init__(items)
        self.discount_code = discount_code

    def calculate_total(self):
        base_total = super().calculate_total()
        return base_total - self.apply_discount()

class GiftOrder(Order):
    def __init__(self, items, gift_wrap_type):
        super().__init__(items)
        self.gift_wrap_type = gift_wrap_type

    def calculate_total(self):
        return super().calculate_total() + self.gift_wrap_cost()
```

### Category 3: Change Preventers

These make change difficult and risky. When one change requires touching lots of files or making parallel changes in multiple places.

#### Divergent Change

One class changes for multiple different reasons. Violates the Single Responsibility Principle.

**Symptom:** "Whenever we add a new payment method, we have to change the Order class. Whenever we add a new shipping carrier, we also have to change the Order class. And whenever we add a tax jurisdiction..."

Each different reason to change should be its own class.

```java
// Before: Order changes for many reasons
class Order {
    public void processPayment() {
        // Payment logic - changes when payment methods change
    }

    public void calculateShipping() {
        // Shipping logic - changes when carriers change
    }

    public void calculateTax() {
        // Tax logic - changes when tax rules change
    }
}

// After: Each responsibility separated
class Order {
    private PaymentProcessor paymentProcessor;
    private ShippingCalculator shippingCalculator;
    private TaxCalculator taxCalculator;

    public void process() {
        paymentProcessor.process(this);
        shippingCalculator.calculate(this);
        taxCalculator.calculate(this);
    }
}
```

#### Shotgun Surgery

The opposite problem - one change requires editing many classes. Want to change how logging works? You have to touch 47 files.

**Fix:** Group related changes into one place using Move Method and Move Field.

### Category 4: Dispensables

Things that don't need to exist - they're not pulling their weight.

#### Comments (Smell, not always)

Comments are good for explaining *why* something is done a particular way. Comments that explain *what* code does are a smell - the code should be self-explanatory.

```python
# Bad: Comment explains what code does
# Loop through users and send email to each active user
for user in users:
    if user.is_active:
        send_email(user.email, message)

# Good: Code explains itself
def send_email_to_active_users(users, message):
    active_users = [u for u in users if u.is_active]
    for user in active_users:
        notify_user(user, message)
```

Good comments explain *why*:
```python
# We batch in groups of 100 because the email service rate-limits
# at 150/minute and we want to stay safely under that limit
for batch in chunk_users(active_users, size=100):
    send_batch_emails(batch, message)
    time.sleep(60)
```

#### Duplicate Code

The most common smell. Same code (or very similar code) in multiple places.

**The Rule of Three:** First time you write something, just write it. Second time you write something similar, you can duplicate. Third time, refactor.

```javascript
// Before: Duplication
class ReportGenerator {
    generatePDFReport(data) {
        let header = `Report Generated: ${new Date().toISOString()}`;
        let footer = `Page ${this.pageNum} - Confidential`;
        // ... generate PDF
    }

    generateExcelReport(data) {
        let header = `Report Generated: ${new Date().toISOString()}`;
        let footer = `Page ${this.pageNum} - Confidential`;
        // ... generate Excel
    }

    generateHTMLReport(data) {
        let header = `Report Generated: ${new Date().toISOString()}`;
        let footer = `Page ${this.pageNum} - Confidential`;
        // ... generate HTML
    }
}

// After: Extract common parts
class ReportGenerator {
    createReportHeader() {
        return `Report Generated: ${new Date().toISOString()}`;
    }

    createReportFooter() {
        return `Page ${this.pageNum} - Confidential`;
    }

    generatePDFReport(data) {
        let header = this.createReportHeader();
        let footer = this.createReportFooter();
        // ... generate PDF
    }

    // Other methods use the same extracted header/footer
}
```

#### Dead Code

Code that isn't called. Delete it. Version control remembers.

If you're worried you might need it someday, add a comment in the commit message about why you removed it. Git will keep the old code if you ever need to resurrect it.

#### Lazy Class

A class that doesn't do enough to justify its existence. Maybe it used to do more, or maybe someone planned for it to grow but it never did.

If a class is just wrapping one method with no additional behavior, inline it or fold it into another class.

### Category 5: Couplers

These are about classes that are too tightly coupled - they know too much about each other's internals.

#### Feature Envy

A method that uses data from another class more than its own class.

```python
# Before: Calculate uses Account's data more than its own
class Account:
    def __init__(self, balance, interest_rate, years):
        self.balance = balance
        self.interest_rate = interest_rate
        self.years = years

class InterestCalculator:
    def calculate(self, account):
        # This knows too much about Account's internals
        return account.balance * account.interest_rate * account.years

# After: Move the method to where the data is
class Account:
    def __init__(self, balance, interest_rate, years):
        self.balance = balance
        self.interest_rate = interest_rate
        self.years = years

    def calculate_interest(self):
        return self.balance * self.interest_rate * self.years

# Calculator becomes simpler
class InterestCalculator:
    def calculate(self, account):
        return account.calculate_interest()
```

#### Message Chains

`a.getB().getC().getD().doSomething()` - Law of Demeter violation. If C changes how it exposes D, this breaks.

**Fix with Hide Delegate:** Create a method on `a` that does what you need without exposing the chain.

## Common Refactoring Techniques

Now that you know the smells, here's the catalog of fixes:

### Extract Method

Take a chunk of code and turn it into a method with a name that explains what it does.

**When:** Long methods, duplicate code, code that needs a comment to explain it

**How:**
1. Create a new method with a descriptive name
2. Copy the code to the new method
3. Look at local variables - turn them into parameters or return values
4. Replace the original code with a call to the new method
5. Test

### Extract Class

Take fields and methods from one class and move them to a new class.

**When:** Large classes, groups of fields/methods that always change together, temporary fields

**How:**
1. Create a new class
2. Move related fields to the new class
3. Move related methods to the new class
4. Update references in the old class to use the new class
5. Test

### Move Method

Move a method from one class to another when it uses more features of the other class.

**When:** Feature envy, methods that don't fit where they are

**How:**
1. Copy method to target class
2. Adjust it to work in new context
3. Update original method to delegate to new location or delete it
4. Update all callers
5. Test

### Introduce Parameter Object

Group parameters that naturally go together into an object.

**When:** Long parameter lists, same parameters appearing in multiple methods

**How:**
1. Create a class to hold the grouped parameters
2. Add a parameter of the new type to the method
3. Replace references to old parameters with references to fields of the new object
4. Remove old parameters
5. Test

### Pull Up Method / Pull Up Field

When subclasses have duplicate code, move it to the parent class.

**When:** Duplicate code in sibling classes

**How:**
1. Verify the methods/fields are truly identical (or make them identical first)
2. Move to parent class
3. Delete from subclasses
4. Test

### Replace Type Code with Polymorphism

Replace conditional logic based on type codes with polymorphic method calls.

**When:** Switch statements or if/else chains based on types, especially when duplicated across multiple methods

**How:**
1. Create subclasses for each type code
2. Move type-specific behavior into overridden methods in subclasses
3. Remove type code field
4. Remove conditional logic - it's now handled by polymorphism
5. Test

## Kent Beck's Four Rules of Simple Design

When you're done refactoring, check your code against these four rules (in priority order):

1. **Passes all tests** - Behavior is preserved
2. **Reveals intention** - Names and structure make purpose clear
3. **No duplication** - DRY principle followed
4. **Fewest elements** - No unnecessary complexity

If your code follows these four rules, it's good enough. Ship it.

## When to Refactor vs When to Rewrite

Refactoring is about small, safe, incremental improvements. Sometimes code is so bad that refactoring won't work - you need to rewrite.

### Refactor When:
- You understand what the code does
- You have tests (or can write them)
- The structure is salvageable
- The business logic is sound
- You can make improvements incrementally

### Consider Rewrite When:
- The code is so tangled you can't understand it
- It's impossible to test without major changes
- The architecture is fundamentally wrong for current needs
- Tech stack is obsolete or unsupported
- Cost of refactoring exceeds cost of rewriting

**The Strangler Fig Pattern** is your friend here: Build new system alongside old, gradually move functionality over, retire old system piece by piece. Best of both worlds.

## Common Pitfalls

**Refactoring without tests.** You're not refactoring, you're just moving code around and hoping. Write tests first.

**Refactoring and adding features simultaneously.** Do one or the other. If you break something, you won't know if it was the refactoring or the feature.

**Refactoring too much.** Perfect is the enemy of done. Make it better, not perfect. Leave some improvement for next time.

**Ignoring performance.** Most refactorings don't affect performance. Some do. Profile before and after if you're concerned. Clean code that's slow is easier to optimize than fast code that's a mess.

**Refactoring for its own sake.** Refactor to make change easier. If nobody's changing this code and it works, leave it alone. Refactor the code you're actually working with.

## Your Refactoring Checklist

When you're about to start work in a file:

1. Do you have tests? If not, write characterization tests.
2. Is there an obvious smell? Long method, duplication, unclear names?
3. Can you fix it in under 10 minutes? Do it now.
4. Is it blocking your feature work? Fix enough to unblock yourself.
5. Did you leave it cleaner than you found it? Even a little bit counts.

Every improvement compounds. Six months of small refactorings transforms a codebase. Six months of ignoring smells creates a swamp.


---

## Navigation

### Depth Levels
- **[← Surface](../surface/index.md)** Essential concepts and quick wins
- **[Deep Water →](../deep-water/index.md)** Advanced architectures and enterprise patterns

### Related Topics
- [code-quality](../../code-quality/mid-depth/index.md) - Related development considerations
- [code-review-process](../../code-review-process/mid-depth/index.md) - Related development considerations
- [secret-management](../../secret-management/mid-depth/index.md) - Related development considerations

### Navigate
- [← Back to Development Phase](../../index.md)
- [↑ Back to Main Guide](../../../../README.md)
