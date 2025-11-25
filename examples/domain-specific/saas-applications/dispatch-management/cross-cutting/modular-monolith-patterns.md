# Module Structure

## Modular Monolith Philosophy

**Definition**: A monolithic application organized into loosely coupled modules with clear boundaries.

**Benefits**:
- Clear separation of concerns
- Easier to understand and navigate
- Potential to extract to microservices later (if needed)
- Faster development than microservices at early stages
- Single deployment (simpler operations)

**Module Design Principles**:
1. **High Cohesion**: Related functionality grouped together
2. **Low Coupling**: Modules depend on each other minimally
3. **Clear Interfaces**: Modules communicate through well-defined APIs
4. **Independent Testing**: Each module can be tested in isolation
5. **Single Responsibility**: Each module has one primary purpose

---

## Backend Module Structure

### Module Organization Pattern

```
/backend
├── /app
│   ├── __init__.py              # Flask app factory
│   ├── /auth_module             # Authentication & authorization
│   ├── /users_module            # User management
│   ├── /workorders_module       # Work order lifecycle
│   ├── /equipment_module        # Equipment inventory
│   ├── /dispatch_module         # Core dispatch logic (most complex)
│   ├── /reporting_module        # Report generation
│   └── /shared                  # Common utilities
├── /config                      # Configuration files
├── /migrations                  # Database migrations (Alembic)
├── /tests                       # Test suite
├── requirements.txt
├── Dockerfile
└── wsgi.py                      # Entry point
```

### Standard Module Structure

Each module follows consistent pattern:

```
/module_name
├── __init__.py          # Module initialization, blueprint registration
├── routes.py            # API endpoints
├── models.py            # Database models
├── schemas.py           # Marshmallow schemas (serialization/validation)
├── service.py           # Business logic
├── exceptions.py        # Module-specific exceptions
└── /tests
    ├── test_routes.py
    ├── test_service.py
    └── test_models.py
```

---

## Module Specifications

### 1. Auth Module

**Purpose**: Handle authentication via Keycloak and authorization checks

**Responsibilities**:
- Keycloak client configuration
- Token validation
- JWT parsing
- Role-based access decorators
- Session management

**Key Files**:

`keycloak_client.py`:
```python
# Pseudocode
from keycloak import KeycloakOpenID

class KeycloakClient:
    def __init__(self, server_url, realm, client_id, client_secret):
        self.client = KeycloakOpenID(
            server_url=server_url,
            realm_name=realm,
            client_id=client_id,
            client_secret_key=client_secret
        )
    
    def validate_token(self, token):
        # Validates JWT signature, expiry, issuer
        return self.client.introspect(token)
    
    def get_user_roles(self, token):
        # Extracts roles from token claims
        user_info = self.validate_token(token)
        return user_info.get('realm_access', {}).get('roles', [])
```

`decorators.py`:
```python
# Pseudocode
from functools import wraps
from flask import request, g

def require_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = extract_bearer_token(request)
            user_info = keycloak_client.validate_token(token)
            
            if not user_info['active']:
                raise Unauthorized("Invalid token")
            
            roles = user_info.get('realm_access', {}).get('roles', [])
            
            if required_role not in roles and 'admin' not in roles:
                raise Forbidden("Insufficient permissions")
            
            # Store user info in flask g for use in route
            g.user = user_info
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

`routes.py`:
```python
# Pseudocode
@auth_bp.route('/token/refresh', methods=['POST'])
def refresh_token():
    refresh_token = request.json.get('refresh_token')
    new_tokens = keycloak_client.refresh_token(refresh_token)
    return jsonify(new_tokens)

@auth_bp.route('/user/info', methods=['GET'])
@require_role('dispatcher')  # Any authenticated user
def get_user_info():
    # g.user populated by decorator
    return jsonify({
        'username': g.user['preferred_username'],
        'email': g.user['email'],
        'roles': g.user['realm_access']['roles']
    })
```

**Dependencies**: None (foundation module)

**API Endpoints**:
- `POST /api/auth/token/refresh` - Refresh access token
- `GET /api/auth/user/info` - Get current user info
- `POST /api/auth/logout` - Invalidate session

---

### 2. Users Module

**Purpose**: Manage user profiles and role assignments

**Responsibilities**:
- User CRUD operations
- Role management (admin only)
- User search and filtering
- Driver availability tracking

**Key Files**:

`models.py`:
```python
# Pseudocode
class User(db.Model):
    __tablename__ = 'users'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    keycloak_id = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String)  # Cached from Keycloak
    phone = Column(String)
    is_available = Column(Boolean, default=True)  # For drivers
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    dispatches_created = relationship('DispatchAssignment', foreign_keys='DispatchAssignment.dispatcher_id')
    dispatches_as_driver = relationship('DispatchAssignment', foreign_keys='DispatchAssignment.driver_id')
```

`service.py`:
```python
# Pseudocode
class UserService:
    def create_user(self, keycloak_id, email, full_name, role):
        user = User(
            keycloak_id=keycloak_id,
            email=email,
            full_name=full_name,
            role=role
        )
        db.session.add(user)
        db.session.commit()
        return user
    
    def find_available_drivers(self):
        # Find users with driver role who don't have active assignments
        return User.query.filter_by(role='driver', is_available=True).all()
    
    def set_driver_availability(self, user_id, is_available):
        user = User.query.get(user_id)
        user.is_available = is_available
        db.session.commit()
```

`routes.py`:
```python
# Pseudocode
@users_bp.route('/users', methods=['GET'])
@require_role('admin')
def list_users():
    role_filter = request.args.get('role')
    query = User.query
    if role_filter:
        query = query.filter_by(role=role_filter)
    users = query.all()
    return jsonify(UserSchema(many=True).dump(users))

@users_bp.route('/users/<user_id>', methods=['PUT'])
@require_role('admin')
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.full_name = data.get('full_name', user.full_name)
    user.phone = data.get('phone', user.phone)
    db.session.commit()
    return jsonify(UserSchema().dump(user))
```

**Dependencies**: Auth module (for decorators)

**API Endpoints**:
- `GET /api/users` - List users (admin)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user (admin)
- `POST /api/users` - Create user (admin)
- `GET /api/users/drivers/available` - List available drivers

---

### 3. Work Orders Module

**Purpose**: Manage work order lifecycle and configuration files

**Responsibilities**:
- Work order CRUD
- Status transitions
- Configuration file upload/download
- Work order assignment tracking

**Key Files**:

`models.py`:
```python
# Pseudocode
class WorkOrder(db.Model):
    __tablename__ = 'work_orders'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    order_number = Column(String, unique=True, nullable=False)
    description = Column(Text)
    priority = Column(String, default='standard')  # standard, urgent
    status = Column(String, default='pending')  # pending, assigned, in_progress, completed, cancelled
    created_by = Column(UUID, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship('User')
    config_files = relationship('ConfigFile', back_populates='work_order')
    dispatch_assignments = relationship('DispatchAssignment', back_populates='work_order')

class ConfigFile(db.Model):
    __tablename__ = 'config_files'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    work_order_id = Column(UUID, ForeignKey('work_orders.id'))
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)  # Surface: /var/app, Mid-Depth: S3 key
    file_size = Column(Integer)
    content_type = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    work_order = relationship('WorkOrder', back_populates='config_files')
```

`service.py`:
```python
# Pseudocode
class WorkOrderService:
    def create_work_order(self, order_number, description, priority, created_by):
        # Validate order number uniqueness
        existing = WorkOrder.query.filter_by(order_number=order_number).first()
        if existing:
            raise ValidationError("Order number already exists")
        
        work_order = WorkOrder(
            order_number=order_number,
            description=description,
            priority=priority,
            created_by=created_by,
            status='pending'
        )
        db.session.add(work_order)
        db.session.commit()
        return work_order
    
    def upload_config_file(self, work_order_id, file):
        # Surface Level: Save to filesystem
        work_order = WorkOrder.query.get(work_order_id)
        filepath = f'/var/app/uploads/config_files/{work_order_id}/{file.filename}'
        file.save(filepath)
        
        config_file = ConfigFile(
            work_order_id=work_order_id,
            filename=file.filename,
            filepath=filepath,
            file_size=os.path.getsize(filepath),
            content_type=file.content_type
        )
        db.session.add(config_file)
        db.session.commit()
        return config_file
    
    def get_pending_work_orders(self):
        return WorkOrder.query.filter_by(status='pending').all()
```

**Dependencies**: Users module (for creator relationship)

**API Endpoints**:
- `GET /api/work-orders` - List work orders (with filters)
- `POST /api/work-orders` - Create work order
- `GET /api/work-orders/:id` - Get work order details
- `PUT /api/work-orders/:id` - Update work order
- `POST /api/work-orders/:id/config-files` - Upload config file
- `GET /api/config-files/:id/download` - Download config file

---

### 4. Equipment Module

**Purpose**: Manage equipment inventory and availability

**Responsibilities**:
- Equipment CRUD
- Equipment type management
- Availability tracking
- Maintenance status

**Key Files**:

`models.py`:
```python
# Pseudocode
class EquipmentType(db.Model):
    __tablename__ = 'equipment_types'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    name = Column(String, unique=True, nullable=False)  # Truck, Van, Forklift
    description = Column(Text)
    
    # Relationships
    equipment_items = relationship('Equipment', back_populates='equipment_type')

class Equipment(db.Model):
    __tablename__ = 'equipment'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    equipment_type_id = Column(UUID, ForeignKey('equipment_types.id'))
    identifier = Column(String, unique=True, nullable=False)  # License plate, asset tag
    status = Column(String, default='available')  # available, dispatched, maintenance, retired
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    equipment_type = relationship('EquipmentType', back_populates='equipment_items')
    dispatch_assignments = relationship('DispatchAssignment', back_populates='equipment')
```

`service.py`:
```python
# Pseudocode
class EquipmentService:
    def get_available_equipment(self, equipment_type_id=None):
        query = Equipment.query.filter_by(status='available')
        if equipment_type_id:
            query = query.filter_by(equipment_type_id=equipment_type_id)
        return query.all()
    
    def set_equipment_status(self, equipment_id, status):
        equipment = Equipment.query.get(equipment_id)
        equipment.status = status
        equipment.updated_at = datetime.utcnow()
        db.session.commit()
    
    def create_equipment(self, equipment_type_id, identifier, notes=None):
        # Validate identifier uniqueness
        existing = Equipment.query.filter_by(identifier=identifier).first()
        if existing:
            raise ValidationError("Equipment identifier already exists")
        
        equipment = Equipment(
            equipment_type_id=equipment_type_id,
            identifier=identifier,
            notes=notes,
            status='available'
        )
        db.session.add(equipment)
        db.session.commit()
        return equipment
```

**Dependencies**: None (independent module)

**API Endpoints**:
- `GET /api/equipment` - List equipment (with filters)
- `POST /api/equipment` - Create equipment
- `GET /api/equipment/:id` - Get equipment details
- `PUT /api/equipment/:id` - Update equipment
- `GET /api/equipment/available` - List available equipment
- `GET /api/equipment-types` - List equipment types
- `POST /api/equipment-types` - Create equipment type

---

### 5. Dispatch Module (Core Business Logic)

**Purpose**: Coordinate dispatch operations, queue management, and status tracking

**Responsibilities**:
- Dispatch request processing
- Automatic queue management
- Driver-equipment assignment
- Status updates and transitions
- Recall operations

**Key Files**:

`models.py`:
```python
# Pseudocode
class DispatchAssignment(db.Model):
    __tablename__ = 'dispatch_assignments'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    work_order_id = Column(UUID, ForeignKey('work_orders.id'))
    equipment_id = Column(UUID, ForeignKey('equipment.id'))
    driver_id = Column(UUID, ForeignKey('users.id'))
    dispatcher_id = Column(UUID, ForeignKey('users.id'))
    status = Column(String, default='dispatched')  # dispatched, en_route, on_site, returning, completed, recalled
    dispatched_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    work_order = relationship('WorkOrder', back_populates='dispatch_assignments')
    equipment = relationship('Equipment', back_populates='dispatch_assignments')
    driver = relationship('User', foreign_keys=[driver_id])
    dispatcher = relationship('User', foreign_keys=[dispatcher_id])
    status_report = relationship('StatusReport', back_populates='dispatch_assignment', uselist=False)

class DispatchQueue(db.Model):
    __tablename__ = 'dispatch_queue'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    work_order_id = Column(UUID, ForeignKey('work_orders.id'))
    equipment_type_id = Column(UUID, ForeignKey('equipment_types.id'))
    priority = Column(String, default='standard')  # standard, urgent
    requested_by = Column(UUID, ForeignKey('users.id'))
    requested_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    work_order = relationship('WorkOrder')
    equipment_type = relationship('EquipmentType')
    requester = relationship('User')
```

`service.py` (Most complex service):
```python
# Pseudocode
class DispatchService:
    def request_dispatch(self, work_order_id, equipment_type_id, dispatcher_id):
        """
        Main dispatch logic: Immediate dispatch or queue
        """
        with transaction():
            # Find available equipment
            equipment = Equipment.query.filter_by(
                equipment_type_id=equipment_type_id,
                status='available'
            ).with_for_update().first()  # Lock for transaction
            
            # Find available driver
            driver = self._find_available_driver()
            
            if equipment and driver:
                # Immediate dispatch
                assignment = self._create_dispatch_assignment(
                    work_order_id=work_order_id,
                    equipment_id=equipment.id,
                    driver_id=driver.id,
                    dispatcher_id=dispatcher_id
                )
                
                # Update statuses
                equipment.status = 'dispatched'
                work_order = WorkOrder.query.get(work_order_id)
                work_order.status = 'assigned'
                driver.is_available = False
                
                return {'status': 'dispatched', 'assignment': assignment}
            else:
                # Add to queue
                queue_entry = self._create_queue_entry(
                    work_order_id=work_order_id,
                    equipment_type_id=equipment_type_id,
                    requested_by=dispatcher_id,
                    priority='standard'
                )
                return {'status': 'queued', 'queue_entry': queue_entry}
    
    def complete_dispatch(self, assignment_id, completion_notes=None):
        """
        Complete a dispatch, generate report, process queue
        """
        with transaction():
            assignment = DispatchAssignment.query.get(assignment_id)
            assignment.status = 'completed'
            assignment.completed_at = datetime.utcnow()
            assignment.notes = completion_notes
            
            # Free resources
            assignment.equipment.status = 'available'
            assignment.driver.is_available = True
            assignment.work_order.status = 'completed'
            
            db.session.commit()
        
        # Generate report (outside transaction)
        report = reporting_service.generate_status_report(assignment)
        
        # Check queue for pending requests
        self._process_dispatch_queue(assignment.equipment.equipment_type_id)
        
        return report
    
    def recall_dispatch(self, assignment_id, reason):
        """
        Recall equipment before completion
        """
        with transaction():
            assignment = DispatchAssignment.query.get(assignment_id)
            assignment.status = 'recalled'
            assignment.completed_at = datetime.utcnow()
            assignment.notes = f"Recalled: {reason}"
            
            # Free resources
            assignment.equipment.status = 'available'
            assignment.driver.is_available = True
            assignment.work_order.status = 'pending'  # Back to pending
            
            db.session.commit()
        
        # Generate partial report
        report = reporting_service.generate_status_report(assignment)
        
        # Check queue
        self._process_dispatch_queue(assignment.equipment.equipment_type_id)
        
        return report
    
    def _process_dispatch_queue(self, equipment_type_id):
        """
        Automatic queue processing when equipment becomes available
        """
        # Get oldest urgent, then oldest standard
        queue_entry = DispatchQueue.query.filter_by(
            equipment_type_id=equipment_type_id
        ).order_by(
            DispatchQueue.priority.desc(),  # urgent first
            DispatchQueue.requested_at.asc()  # then oldest
        ).first()
        
        if queue_entry:
            result = self.request_dispatch(
                work_order_id=queue_entry.work_order_id,
                equipment_type_id=equipment_type_id,
                dispatcher_id=queue_entry.requested_by
            )
            
            if result['status'] == 'dispatched':
                # Success! Remove from queue
                DispatchQueue.query.filter_by(id=queue_entry.id).delete()
                db.session.commit()
                
                # Notify dispatcher (future enhancement)
                # notification_service.notify_auto_dispatch(result['assignment'])
    
    def _find_available_driver(self):
        return User.query.filter_by(
            role='driver',
            is_available=True
        ).first()
    
    def get_active_dispatches(self):
        return DispatchAssignment.query.filter(
            DispatchAssignment.status.in_(['dispatched', 'en_route', 'on_site', 'returning'])
        ).all()
    
    def get_dispatch_queue(self):
        return DispatchQueue.query.order_by(
            DispatchQueue.priority.desc(),
            DispatchQueue.requested_at.asc()
        ).all()
```

`queue_manager.py`:
```python
# Surface Level: In-memory queue (simple list)
# Mid-Depth and beyond: Redis-backed queue

class InMemoryQueueManager:
    def __init__(self):
        self.queue = []
    
    def add(self, item):
        self.queue.append(item)
        self.queue.sort(key=lambda x: (x.priority != 'urgent', x.requested_at))
    
    def pop(self, equipment_type_id):
        for i, item in enumerate(self.queue):
            if item.equipment_type_id == equipment_type_id:
                return self.queue.pop(i)
        return None
    
    def get_all(self):
        return self.queue
```

**Dependencies**: 
- Users module
- Equipment module
- Work Orders module
- Reporting module (for report generation)

**API Endpoints**:
- `POST /api/dispatch/request` - Request equipment dispatch
- `POST /api/dispatch/:id/complete` - Complete dispatch
- `POST /api/dispatch/:id/recall` - Recall equipment
- `PUT /api/dispatch/:id/status` - Update dispatch status
- `GET /api/dispatch/active` - List active dispatches
- `GET /api/dispatch/queue` - View dispatch queue
- `GET /api/dispatch/:id` - Get dispatch details

---

### 6. Reporting Module

**Purpose**: Generate and manage status reports

**Responsibilities**:
- PDF/JSON report generation
- Report storage
- Report retrieval
- Report metadata management

**Key Files**:

`models.py`:
```python
# Pseudocode
class StatusReport(db.Model):
    __tablename__ = 'status_reports'
    
    id = Column(UUID, primary_key=True, default=uuid4)
    dispatch_assignment_id = Column(UUID, ForeignKey('dispatch_assignments.id'), unique=True)
    report_filepath = Column(String, nullable=False)  # Surface: local path, Mid-Depth: S3 key
    report_format = Column(String, default='pdf')  # pdf, json
    file_size = Column(Integer)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dispatch_assignment = relationship('DispatchAssignment', back_populates='status_report')
```

`generator.py`:
```python
# Pseudocode
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

class ReportGenerator:
    def generate_status_report(self, dispatch_assignment):
        """
        Generate PDF status report
        """
        # Create PDF
        filepath = f'/var/app/reports/{dispatch_assignment.id}/status_report.pdf'
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        c = canvas.Canvas(filepath, pagesize=letter)
        
        # Report content
        c.drawString(100, 750, f"Dispatch Status Report")
        c.drawString(100, 730, f"Work Order: {dispatch_assignment.work_order.order_number}")
        c.drawString(100, 710, f"Equipment: {dispatch_assignment.equipment.identifier}")
        c.drawString(100, 690, f"Driver: {dispatch_assignment.driver.full_name}")
        c.drawString(100, 670, f"Dispatcher: {dispatch_assignment.dispatcher.full_name}")
        c.drawString(100, 650, f"Dispatched: {dispatch_assignment.dispatched_at}")
        c.drawString(100, 630, f"Completed: {dispatch_assignment.completed_at}")
        duration = dispatch_assignment.completed_at - dispatch_assignment.dispatched_at
        c.drawString(100, 610, f"Duration: {duration}")
        c.drawString(100, 590, f"Status: {dispatch_assignment.status}")
        
        c.save()
        
        # Create database record
        report = StatusReport(
            dispatch_assignment_id=dispatch_assignment.id,
            report_filepath=filepath,
            report_format='pdf',
            file_size=os.path.getsize(filepath)
        )
        db.session.add(report)
        db.session.commit()
        
        return report
```

`service.py`:
```python
# Pseudocode
class ReportingService:
    def generate_status_report(self, dispatch_assignment):
        return ReportGenerator().generate_status_report(dispatch_assignment)
    
    def get_reports(self, filters=None):
        query = StatusReport.query
        if filters:
            # Apply filters (date range, work order, driver, etc.)
            if 'start_date' in filters:
                query = query.filter(StatusReport.generated_at >= filters['start_date'])
            if 'end_date' in filters:
                query = query.filter(StatusReport.generated_at <= filters['end_date'])
        return query.all()
    
    def get_report_file(self, report_id):
        report = StatusReport.query.get(report_id)
        return report.report_filepath  # Application serves this file
```

**Dependencies**: Dispatch module (dispatch_assignment relationship)

**API Endpoints**:
- `GET /api/reports` - List reports (with filters)
- `GET /api/reports/:id` - Get report metadata
- `GET /api/reports/:id/download` - Download report file

---

### 7. Shared Module

**Purpose**: Common utilities and cross-cutting concerns

**Contents**:

`database.py`:
```python
# Pseudocode
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
```

`config.py`:
```python
# Pseudocode
import os

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Keycloak
    KEYCLOAK_URL = os.getenv('KEYCLOAK_URL')
    KEYCLOAK_REALM = os.getenv('KEYCLOAK_REALM')
    KEYCLOAK_CLIENT_ID = os.getenv('KEYCLOAK_CLIENT_ID')
    KEYCLOAK_CLIENT_SECRET = os.getenv('KEYCLOAK_CLIENT_SECRET')
    
    # File storage
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', '/var/app/uploads')
    REPORT_FOLDER = os.getenv('REPORT_FOLDER', '/var/app/reports')
    
class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
```

`exceptions.py`:
```python
# Pseudocode
class DispatchAppException(Exception):
    """Base exception"""
    pass

class ValidationError(DispatchAppException):
    """Invalid input data"""
    pass

class NotFoundError(DispatchAppException):
    """Resource not found"""
    pass

class UnauthorizedError(DispatchAppException):
    """Not authenticated"""
    pass

class ForbiddenError(DispatchAppException):
    """Insufficient permissions"""
    pass

class ResourceConflictError(DispatchAppException):
    """Resource already in use"""
    pass
```

`utils.py`:
```python
# Pseudocode
from contextlib import contextmanager

@contextmanager
def transaction():
    """Database transaction context manager"""
    try:
        yield
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

def generate_order_number():
    """Generate unique work order number"""
    import time
    return f"WO-{int(time.time())}"

def calculate_duration(start, end):
    """Calculate duration in human-readable format"""
    delta = end - start
    hours = delta.seconds // 3600
    minutes = (delta.seconds % 3600) // 60
    return f"{hours}h {minutes}m"
```

---

## Frontend Module Structure

### Component Organization

```
/frontend/src
├── /features
│   ├── /auth
│   │   ├── LoginCallback.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── useAuth.js
│   ├── /users
│   │   ├── UserList.jsx
│   │   ├── UserForm.jsx
│   │   └── useUsers.js
│   ├── /workorders
│   │   ├── WorkOrderList.jsx
│   │   ├── WorkOrderForm.jsx
│   │   ├── ConfigFileUpload.jsx
│   │   └── useWorkOrders.js
│   ├── /equipment
│   │   ├── EquipmentList.jsx
│   │   ├── EquipmentForm.jsx
│   │   └── useEquipment.js
│   ├── /dispatch
│   │   ├── DispatchDashboard.jsx      # Main UI
│   │   ├── QueuePanel.jsx
│   │   ├── AvailableEquipment.jsx
│   │   ├── ActiveDispatches.jsx
│   │   ├── DispatchForm.jsx
│   │   └── useDispatch.js
│   └── /reports
│       ├── ReportList.jsx
│       ├── ReportViewer.jsx
│       └── useReports.js
├── /shared
│   ├── /components
│   │   ├── Layout.jsx
│   │   ├── Navigation.jsx
│   │   ├── DataTable.jsx
│   │   ├── Modal.jsx
│   │   └── LoadingSpinner.jsx
│   ├── /hooks
│   │   ├── usePolling.js
│   │   └── useApi.js
│   └── /api
│       ├── axios-instance.js
│       └── endpoints.js
├── App.jsx
├── main.jsx
└── index.css
```

### Feature Module Pattern

Each feature follows consistent structure:

```
/feature_name
├── FeatureList.jsx          # List/table view
├── FeatureForm.jsx          # Create/edit form
├── FeatureDetails.jsx       # Detail view (optional)
└── useFeature.js            # Custom hook for API calls
```

---

## Frontend Module Specifications

### 1. Auth Feature

**Purpose**: Handle Keycloak authentication flow

**Key Files**:

`useAuth.js`:
```javascript
// Pseudocode
import { useKeycloak } from '@react-keycloak/web';

export function useAuth() {
  const { keycloak, initialized } = useKeycloak();
  
  const login = () => keycloak.login();
  const logout = () => keycloak.logout();
  
  const hasRole = (role) => {
    return keycloak.hasRealmRole(role) || keycloak.hasRealmRole('admin');
  };
  
  return {
    isAuthenticated: keycloak.authenticated,
    user: keycloak.tokenParsed,
    login,
    logout,
    hasRole,
    token: keycloak.token
  };
}
```

`ProtectedRoute.jsx`:
```javascript
// Pseudocode
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, hasRole } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && !hasRole(requiredRole)) {
    return <div>Access Denied</div>;
  }
  
  return children;
}
```

---

### 2. Dispatch Feature (Most Complex)

**Purpose**: Dispatcher dashboard and dispatch operations

**Key Components**:

`DispatchDashboard.jsx`:
```javascript
// Pseudocode - 4-panel layout
export function DispatchDashboard() {
  const { queue, activeDispatches, availableEquipment, refreshData } = useDispatch();
  
  // Poll every 30 seconds
  usePolling(refreshData, 30000);
  
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-4 h-screen p-4">
      <div className="border rounded p-4">
        <h2>Pending Queue ({queue.length})</h2>
        <QueuePanel items={queue} />
      </div>
      
      <div className="border rounded p-4">
        <h2>Available Equipment</h2>
        <AvailableEquipment items={availableEquipment} />
      </div>
      
      <div className="col-span-2 border rounded p-4">
        <h2>Active Dispatches ({activeDispatches.length})</h2>
        <ActiveDispatches items={activeDispatches} />
      </div>
    </div>
  );
}
```

`useDispatch.js`:
```javascript
// Pseudocode
import { useState, useCallback } from 'react';
import { api } from '@/shared/api/axios-instance';

export function useDispatch() {
  const [queue, setQueue] = useState([]);
  const [activeDispatches, setActiveDispatches] = useState([]);
  const [availableEquipment, setAvailableEquipment] = useState([]);
  
  const refreshData = useCallback(async () => {
    const [queueData, activeData, equipmentData] = await Promise.all([
      api.get('/dispatch/queue'),
      api.get('/dispatch/active'),
      api.get('/equipment/available')
    ]);
    
    setQueue(queueData.data);
    setActiveDispatches(activeData.data);
    setAvailableEquipment(equipmentData.data);
  }, []);
  
  const requestDispatch = async (workOrderId, equipmentTypeId) => {
    const response = await api.post('/dispatch/request', {
      work_order_id: workOrderId,
      equipment_type_id: equipmentTypeId
    });
    await refreshData();  // Refresh after dispatch
    return response.data;
  };
  
  const completeDispatch = async (assignmentId, notes) => {
    await api.post(`/dispatch/${assignmentId}/complete`, { notes });
    await refreshData();
  };
  
  const recallDispatch = async (assignmentId, reason) => {
    await api.post(`/dispatch/${assignmentId}/recall`, { reason });
    await refreshData();
  };
  
  return {
    queue,
    activeDispatches,
    availableEquipment,
    refreshData,
    requestDispatch,
    completeDispatch,
    recallDispatch
  };
}
```

---

### 3. Shared Components

`DataTable.jsx`:
```javascript
// Pseudocode - reusable table component
export function DataTable({ columns, data, onRowClick }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} onClick={() => onRowClick?.(row)} className="hover:bg-gray-100 cursor-pointer">
            {columns.map(col => (
              <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

`usePolling.js`:
```javascript
// Pseudocode - polling hook
import { useEffect, useRef } from 'react';

export function usePolling(callback, interval) {
  const savedCallback = useRef();
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    
    tick();  // Initial call
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval]);
}
```

---

## Module Communication Patterns

### 1. Direct Service Calls (Within Monolith)

```python
# Dispatch service calls other services directly
from app.users_module.service import UserService
from app.equipment_module.service import EquipmentService

class DispatchService:
    def __init__(self):
        self.user_service = UserService()
        self.equipment_service = EquipmentService()
    
    def request_dispatch(self, ...):
        driver = self.user_service.find_available_drivers()[0]
        equipment = self.equipment_service.get_available_equipment(...)[0]
        # Create dispatch
```

**Pros**: Simple, fast, strongly typed  
**Cons**: Tight coupling (acceptable in monolith)

---

### 2. Event-Based Communication (Mid-Depth and beyond)

```python
# Dispatch service emits events, other services listen
from app.shared.events import event_bus

class DispatchService:
    def complete_dispatch(self, assignment_id):
        assignment = ...
        # Complete dispatch logic
        
        # Emit event
        event_bus.publish('dispatch.completed', {
            'assignment_id': assignment_id,
            'equipment_id': assignment.equipment_id,
            'driver_id': assignment.driver_id
        })

# Equipment service listens
@event_bus.subscribe('dispatch.completed')
def on_dispatch_completed(event):
    equipment_id = event['equipment_id']
    # Mark equipment available
```

**Pros**: Loose coupling, easier to extract to microservices later  
**Cons**: More complex, harder to debug

---

## Testing Strategy per Module

### Unit Tests

Each module has unit tests for:
- Service layer logic
- Model validations
- Utility functions

```python
# tests/dispatch_module/test_service.py
def test_request_dispatch_immediate():
    # Setup: Create available equipment and driver
    # Execute: Call request_dispatch
    # Assert: Assignment created, equipment status changed
    pass

def test_request_dispatch_queued():
    # Setup: No available equipment
    # Execute: Call request_dispatch
    # Assert: Queue entry created
    pass
```

### Integration Tests

Test module interactions:

```python
# tests/integration/test_dispatch_workflow.py
def test_complete_dispatch_workflow():
    # Create work order (workorders module)
    # Request dispatch (dispatch module)
    # Complete dispatch (dispatch module)
    # Verify report generated (reporting module)
    # Verify equipment available (equipment module)
    pass
```

### API Tests

Test HTTP endpoints:

```python
# tests/dispatch_module/test_routes.py
def test_request_dispatch_api(client, auth_headers):
    response = client.post('/api/dispatch/request',
        json={'work_order_id': '...', 'equipment_type_id': '...'},
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json['status'] == 'dispatched'
```

---

## Deployment Structure

### Surface Level: Single Container

```
Docker Container
├── nginx (serves frontend static files + reverse proxy)
├── Flask (all modules)
├── Keycloak (separate container)
└── PostgreSQL (separate container)
```

### Mid-Depth: Multiple Containers

```
Load Balancer
├── Frontend Container (nginx + React build)
├── Backend Container 1 (Flask, all modules)
├── Backend Container 2 (Flask, all modules)
├── Keycloak Cluster (2+ containers)
├── PostgreSQL (managed service)
└── Redis (for queue and caching)
```

### Deep-Water: Microservices (Selective Extraction)

```
API Gateway
├── Auth Service (extracted)
├── Monolith (Users, WorkOrders, Equipment, Dispatch still together)
├── Dispatch Engine Service (extracted, stateless, horizontally scalable)
├── Notification Service (extracted)
├── Reporting Service (extracted, heavy processing)
└── Queue Service (Kafka/RabbitMQ)
```

**Note**: Only extract when monolith performance is a bottleneck. Most of the time, modular monolith is sufficient.

---

## Conclusion

The modular structure provides:
- **Clear boundaries**: Each module has defined responsibilities
- **Independent development**: Teams can work on different modules
- **Testability**: Modules tested in isolation
- **Maintainability**: Easy to locate and modify code
- **Evolution path**: Can extract to microservices if needed

Start with the modular monolith. It's simpler to build, deploy, and operate. Only move to microservices at Deep-Water level when scale demands it.
