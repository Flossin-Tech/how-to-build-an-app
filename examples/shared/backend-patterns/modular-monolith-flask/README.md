---
title: "Modular Monolith Pattern in Flask"
domain: "shared"
category: "backend-patterns"
languages: ["python"]
difficulty: "intermediate"
topics:
  - phase: "02-design"
    topic: "architecture-design"
    depths: ["surface", "mid-depth"]
  - phase: "03-development"
    topic: "code-quality"
    depths: ["surface", "mid-depth"]
use_cases:
  - "B2B SaaS applications"
  - "Internal tools"
  - "Systems requiring ACID transactions"
anti_patterns_shown: true
working_code: true
tested: false
last_updated: "2025-11-24"
---

# Modular Monolith Pattern in Flask

## Overview

A **modular monolith** is a single deployment unit with clear internal module boundaries. It combines the operational simplicity of a monolith with the organizational clarity of microservices.

This pattern is ideal for:
- Product-market fit validation (0-100 users)
- B2B SaaS applications (100-1,000 users)
- Teams of 1-5 engineers
- Systems requiring ACID transactions across business entities

## Key Characteristics

### What Makes It "Modular"

**Clear Module Boundaries**:
- Each module owns its domain (Auth, Users, Equipment, Dispatch)
- Modules communicate through service layer interfaces
- No direct database access between modules (go through services)
- Public interfaces defined, internal implementation hidden

**Not a "Big Ball of Mud"**:
- Organized by business domain, not technical layers
- Dependencies flow in one direction (no circular imports)
- Each module could theoretically be extracted to a microservice
- But extraction happens **only when scale demands it**

### What Makes It "Monolith"

**Single Deployment Unit**:
- All modules in one Flask application
- Shared database (ACID transactions work)
- One codebase, one release cycle
- Simple debugging (all logs in one place)

**When to Stay Monolithic**:
- 0-1,000 concurrent users (monoliths scale this far easily)
- Team size < 10 engineers (microservices overhead not justified)
- Business logic tightly coupled (users + equipment + dispatch need atomicity)
- Development velocity matters more than independent scaling

## Directory Structure

### Good Example (Modular Monolith)

```
app/
├── __init__.py                  # Flask app factory
├── config.py                    # Environment-based configuration
├── auth_module/
│   ├── __init__.py
│   ├── routes.py                # /auth/* endpoints
│   ├── models.py                # User, Role models (SQLAlchemy)
│   ├── service.py               # Business logic layer
│   ├── decorators.py            # @require_auth, @require_role
│   └── keycloak_client.py       # Keycloak integration
├── users_module/
│   ├── __init__.py
│   ├── routes.py                # /users/* endpoints
│   ├── models.py                # UserProfile model
│   ├── service.py               # User management logic
│   └── schemas.py               # Pydantic/Marshmallow schemas
├── equipment_module/
│   ├── __init__.py
│   ├── routes.py                # /equipment/* endpoints
│   ├── models.py                # Equipment model
│   ├── service.py               # Equipment availability logic
│   └── status_machine.py        # State machine (available/dispatched/maintenance)
├── dispatch_module/
│   ├── __init__.py
│   ├── routes.py                # /dispatch/* endpoints
│   ├── models.py                # Dispatch, WorkOrder models
│   ├── service.py               # Core dispatch logic
│   ├── queue_manager.py         # Queue management
│   └── report_generator.py      # Status report generation
├── reporting_module/
│   ├── __init__.py
│   ├── routes.py                # /reports/* endpoints
│   ├── models.py                # (reuses Dispatch models)
│   ├── service.py               # Report retrieval logic
│   └── analytics.py             # Analytics calculations
└── shared/
    ├── __init__.py
    ├── database.py              # SQLAlchemy db instance
    ├── exceptions.py            # Custom exception classes
    ├── utils.py                 # Shared utilities
    └── middleware.py            # Request/response middleware
```

### Module Communication Pattern

**Through Service Layer (Good)**:

```python
# dispatch_module/service.py
from equipment_module.service import EquipmentService
from users_module.service import UserService

class DispatchService:
    def create_dispatch(self, work_order_id, equipment_id, driver_id):
        # 1. Validate equipment availability through service
        equipment = EquipmentService.get_by_id(equipment_id)
        if not EquipmentService.is_available(equipment):
            raise EquipmentNotAvailableError()

        # 2. Validate driver availability through service
        driver = UserService.get_by_id(driver_id)
        if not UserService.is_driver_available(driver):
            raise DriverNotAvailableError()

        # 3. Create dispatch (atomic transaction)
        with db.session.begin():
            dispatch = Dispatch(
                work_order_id=work_order_id,
                equipment_id=equipment_id,
                driver_id=driver_id
            )
            db.session.add(dispatch)

            # Update equipment status
            EquipmentService.mark_as_dispatched(equipment)

            # Update driver status
            UserService.mark_as_assigned(driver)

            db.session.commit()

        return dispatch
```

**Direct Model Access (Bad)**:

```python
# ❌ DO NOT DO THIS
# dispatch_module/service.py
from equipment_module.models import Equipment  # Direct model import
from users_module.models import User

class DispatchService:
    def create_dispatch(self, work_order_id, equipment_id, driver_id):
        # ❌ Directly querying other module's models
        equipment = Equipment.query.get(equipment_id)
        driver = User.query.get(driver_id)

        # ❌ Directly modifying other module's models
        equipment.status = 'dispatched'
        driver.is_available = False

        # This creates tight coupling and breaks module boundaries
```

## Code Examples

### App Factory Pattern

```python
# app/__init__.py
from flask import Flask
from app.shared.database import db
from app.shared.exceptions import handle_errors

def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(f'app.config.{config_name.capitalize()}Config')

    # Initialize extensions
    db.init_app(app)

    # Register error handlers
    handle_errors(app)

    # Register blueprints (modules)
    from app.auth_module.routes import auth_bp
    from app.users_module.routes import users_bp
    from app.equipment_module.routes import equipment_bp
    from app.dispatch_module.routes import dispatch_bp
    from app.reporting_module.routes import reporting_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(users_bp, url_prefix='/users')
    app.register_blueprint(equipment_bp, url_prefix='/equipment')
    app.register_blueprint(dispatch_bp, url_prefix='/dispatch')
    app.register_blueprint(reporting_bp, url_prefix='/reports')

    return app
```

### Auth Decorator Pattern

```python
# auth_module/decorators.py
from functools import wraps
from flask import request, jsonify
import jwt

def require_auth(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]

        try:
            # Validate JWT with Keycloak public key
            decoded = jwt.decode(
                token,
                get_keycloak_public_key(),
                algorithms=['RS256'],
                audience='dispatch-backend'
            )

            # Attach user info to request context
            request.user_id = decoded['sub']
            request.user_roles = decoded.get('realm_access', {}).get('roles', [])

            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

    return decorated_function


def require_role(role):
    """Decorator to require specific Keycloak role"""
    def decorator(f):
        @wraps(f)
        @require_auth  # First validate token
        def decorated_function(*args, **kwargs):
            if role not in request.user_roles:
                return jsonify({'error': f'Requires role: {role}'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

### Module Routes Example

```python
# dispatch_module/routes.py
from flask import Blueprint, request, jsonify
from app.auth_module.decorators import require_role
from app.dispatch_module.service import DispatchService
from app.shared.exceptions import EquipmentNotAvailableError, DriverNotAvailableError

dispatch_bp = Blueprint('dispatch', __name__)

@dispatch_bp.route('/', methods=['POST'])
@require_role('dispatcher')  # Only dispatchers can create dispatches
def create_dispatch():
    """
    Create new dispatch assignment

    Request body:
    {
        "work_order_id": "uuid",
        "equipment_id": "uuid",
        "driver_id": "uuid"
    }
    """
    data = request.get_json()

    try:
        dispatch = DispatchService.create_dispatch(
            work_order_id=data['work_order_id'],
            equipment_id=data['equipment_id'],
            driver_id=data['driver_id']
        )

        return jsonify({
            'dispatch_id': str(dispatch.id),
            'status': 'dispatched',
            'created_at': dispatch.created_at.isoformat()
        }), 201

    except EquipmentNotAvailableError:
        return jsonify({'error': 'Equipment not available'}), 400
    except DriverNotAvailableError:
        return jsonify({'error': 'Driver not available'}), 400
    except KeyError as e:
        return jsonify({'error': f'Missing required field: {e}'}), 400
```

### Service Layer Pattern

```python
# dispatch_module/service.py
from app.shared.database import db
from app.dispatch_module.models import Dispatch, WorkOrder
from app.dispatch_module.queue_manager import QueueManager
from app.equipment_module.service import EquipmentService
from app.users_module.service import UserService
from app.shared.exceptions import (
    EquipmentNotAvailableError,
    DriverNotAvailableError,
    WorkOrderNotFoundError
)

class DispatchService:
    """Business logic for dispatch operations"""

    @staticmethod
    def create_dispatch(work_order_id, equipment_id, driver_id):
        """
        Create dispatch assignment with atomic transaction

        Steps:
        1. Validate work order exists
        2. Check equipment availability (through EquipmentService)
        3. Check driver availability (through UserService)
        4. Create dispatch
        5. Update equipment and driver statuses

        All steps must succeed or entire transaction rolls back (ACID)
        """
        # 1. Validate work order
        work_order = WorkOrder.query.get(work_order_id)
        if not work_order:
            raise WorkOrderNotFoundError(work_order_id)

        # 2. Validate equipment (through service, not direct model access)
        equipment = EquipmentService.get_by_id(equipment_id)
        if not EquipmentService.is_available(equipment):
            # Queue if not available
            QueueManager.enqueue(work_order_id, equipment_id)
            raise EquipmentNotAvailableError(equipment_id)

        # 3. Validate driver (through service)
        driver = UserService.get_by_id(driver_id)
        if not UserService.is_driver_available(driver):
            raise DriverNotAvailableError(driver_id)

        # 4. Create dispatch (atomic transaction)
        try:
            with db.session.begin():
                dispatch = Dispatch(
                    work_order_id=work_order_id,
                    equipment_id=equipment_id,
                    driver_id=driver_id,
                    status='dispatched'
                )
                db.session.add(dispatch)

                # 5. Update statuses (through services)
                EquipmentService.mark_as_dispatched(equipment)
                UserService.mark_as_assigned(driver)

                db.session.commit()

            return dispatch

        except Exception as e:
            db.session.rollback()
            raise

    @staticmethod
    def complete_dispatch(dispatch_id):
        """
        Complete dispatch assignment

        Steps:
        1. Mark dispatch as completed
        2. Free equipment and driver
        3. Process queue for returned equipment
        """
        dispatch = Dispatch.query.get(dispatch_id)
        if not dispatch:
            raise DispatchNotFoundError(dispatch_id)

        try:
            with db.session.begin():
                dispatch.status = 'completed'

                # Free resources
                EquipmentService.mark_as_available(dispatch.equipment)
                UserService.mark_as_available(dispatch.driver)

                db.session.commit()

            # Process queue (outside transaction - can tolerate failure)
            QueueManager.process_queue_for_equipment(dispatch.equipment_id)

            return dispatch

        except Exception as e:
            db.session.rollback()
            raise
```

## Anti-Patterns

### Anti-Pattern 1: God Service Object

**Problem**: Single service class doing everything

```python
# ❌ BAD: God service object
class DispatchApplicationService:
    def create_user(self, ...):
        pass

    def create_equipment(self, ...):
        pass

    def authenticate_user(self, ...):
        pass

    def create_dispatch(self, ...):
        pass

    def generate_report(self, ...):
        pass

    # ... 50 more methods
```

**Solution**: Module-specific services

```python
# ✅ GOOD: Module-specific services
class UserService:
    def create_user(self, ...):
        pass

class EquipmentService:
    def create_equipment(self, ...):
        pass

class AuthService:
    def authenticate_user(self, ...):
        pass

class DispatchService:
    def create_dispatch(self, ...):
        pass

class ReportingService:
    def generate_report(self, ...):
        pass
```

### Anti-Pattern 2: Circular Imports

**Problem**: Modules depending on each other

```python
# ❌ BAD: Circular import
# dispatch_module/service.py
from equipment_module.service import EquipmentService

# equipment_module/service.py
from dispatch_module.service import DispatchService  # Circular!
```

**Solution**: Define dependency direction

```python
# ✅ GOOD: Clear dependency hierarchy
# Shared layer (no dependencies)
shared/database.py

# Domain layer (depends on shared)
equipment_module/models.py
users_module/models.py
work_order_module/models.py

# Service layer (depends on domain)
equipment_module/service.py
users_module/service.py

# Coordination layer (depends on services)
dispatch_module/service.py  # Can import equipment and user services
```

### Anti-Pattern 3: Tight Database Coupling

**Problem**: Direct model access across modules

```python
# ❌ BAD: Direct model access
# dispatch_module/service.py
from equipment_module.models import Equipment

class DispatchService:
    def create_dispatch(self, equipment_id):
        # Directly modifying another module's model
        equipment = Equipment.query.get(equipment_id)
        equipment.status = 'dispatched'
        db.session.commit()
```

**Solution**: Service layer abstraction

```python
# ✅ GOOD: Through service layer
# dispatch_module/service.py
from equipment_module.service import EquipmentService

class DispatchService:
    def create_dispatch(self, equipment_id):
        equipment = EquipmentService.get_by_id(equipment_id)
        EquipmentService.mark_as_dispatched(equipment)
```

## When This Pattern Fits

### Ideal Scenarios

**Scale**: 0-1,000 concurrent users
- Monoliths scale this far easily with proper optimization
- Single PostgreSQL database handles this load

**Team Size**: 1-5 engineers
- Small teams benefit from single codebase
- No coordination overhead of microservices

**Business Logic**: Tightly coupled domains
- Transactions across multiple entities (users, equipment, dispatches)
- ACID guarantees valuable (no eventual consistency complexity)

**Development Phase**: Product-market fit validation
- Rapid iteration more important than independent scaling
- Debugging simplicity accelerates development

### When to Consider Microservices

**Scale Triggers**:
- Specific module becomes bottleneck (e.g., auth service at 80% CPU while core at 20%)
- Need for independent scaling of high-volume components
- Geographic distribution required (multi-region)

**Team Triggers**:
- Team grows beyond 10 engineers
- Clear ownership boundaries (team per service)
- Microservices expertise available

**Technical Triggers**:
- Polyglot persistence needed (different databases for different modules)
- Different deployment cadences (auth service deploys daily, core weekly)
- Compliance requires service isolation

## Trade-Offs

| Aspect | Modular Monolith | Microservices |
|--------|------------------|---------------|
| **Development Velocity** | Fast (no network calls) | Slower (network overhead) |
| **Debugging** | Easy (single process) | Complex (distributed tracing needed) |
| **Deployment** | Simple (single unit) | Complex (orchestration required) |
| **Scaling** | Vertical + horizontal (entire app) | Horizontal (per service) |
| **Transactions** | ACID guaranteed | Distributed transactions complex |
| **Team Coordination** | Shared codebase (merge conflicts) | Independent services (API versioning) |
| **Operational Complexity** | Low (single deployment) | High (multiple services, service mesh) |
| **Infrastructure Cost** | $50-300/month (Surface) | $500-1,000/month minimum |

## Evolution Path

### Surface Level (Modular Monolith)
- All modules in single Flask app
- Shared database
- Docker Compose deployment
- $50-300/month infrastructure

### Mid-Depth Level (Still Monolithic)
- Same architecture, better infrastructure
- Load balancer + multiple instances
- Kubernetes or managed containers
- $500-600/month infrastructure

### Deep-Water Level (Selective Extraction)
- Extract high-volume services (Auth, Notifications)
- Core monolith remains (Users, Equipment, Dispatch)
- Service mesh for extracted services
- $10,000-50,000/month infrastructure

**Key Insight**: Evolution is selective, not all-or-nothing. Extract services when scale justifies the complexity, not because "microservices are best practice."

## Real-World Example

This pattern is used in the [Dispatch Management case study](/examples/domain-specific/saas-applications/dispatch-management/), which scaled from 0 to 1,000 concurrent users as a monolith before extracting any services.

See:
- [Architecture Philosophy](/examples/domain-specific/saas-applications/dispatch-management/00-overview/architecture-philosophy.md)
- [Module Structure](/examples/domain-specific/saas-applications/dispatch-management/cross-cutting/modular-monolith-patterns.md)
- [Surface Level Architecture](/examples/domain-specific/saas-applications/dispatch-management/01-surface-level/architecture.md)

## References

- [Martin Fowler: Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [Shopify: Deconstructing the Monolith](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)
- [Basecamp: The Majestic Monolith](https://m.signalvnoise.com/the-majestic-monolith/)
