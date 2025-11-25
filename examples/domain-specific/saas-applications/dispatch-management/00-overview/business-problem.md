# The Business Problem

## What Needs to Happen

Organizations need to get the right equipment to the right place with the right operator. Think logistics companies sending trucks, healthcare organizations dispatching medical equipment, construction companies coordinating heavy machinery.

The core problem: you have work orders (tasks that need doing), equipment (stuff that does the work), and drivers (people who operate it). When everything aligns, a dispatcher assigns them together and sends them out. When resources aren't available, requests queue up and get fulfilled automatically as things return.

## The Entities

**Work Orders** are tasks that need equipment and a driver. "Deliver materials to site B" or "Transport patient equipment to Building 3." They have two priority levels (standard or urgent) and can include configuration files for complex tasks. Status flows: pending → assigned → completed.

**Equipment** is anything dispatchable—trucks, vans, forklifts, medical devices. Each piece can only do one job at a time. Status options: available (ready to go), dispatched (out on a job), maintenance (in the shop), retired (decommissioned).

**Drivers** operate equipment. One driver per active assignment. At Surface Level, we assume if you're a driver, you can drive anything. At Mid-Depth, you add qualification tracking (CDL class, forklift certification, etc.).

**Dispatchers** are the coordinators. They create work orders, assign equipment and drivers, monitor active dispatches, and handle the queue. They can recall equipment if priorities change.

## Core Workflows

### Creating Work Orders

A dispatcher creates a work order: "Need a truck at the warehouse." Optionally uploads a PDF with delivery details. System assigns a unique order number. Work order enters pending status.

Priority can change until equipment goes out. Urgent requests jump the queue.

### Dispatching (When Resources Available)

Dispatcher picks a pending work order. System shows available equipment matching the type needed. Dispatcher selects equipment, system finds an available driver, dispatcher confirms.

Equipment and driver statuses flip to "dispatched." Work order becomes "assigned." Transaction is atomic—either everything succeeds or nothing changes. This is why the shared database matters at Surface Level.

Dispatcher sees the assignment in the "Active Dispatches" dashboard. Mission accomplished.

### Dispatching (When Resources Busy)

Dispatcher picks a pending work order but all trucks are out. System automatically creates a queue entry with a timestamp.

Queue processes in FIFO order within each priority level. Urgent always goes first, then standard in order received. Dispatcher sees queue position and knows it'll get handled when a truck returns.

### Automatic Queue Processing

This is the clever part: when equipment completes an assignment and becomes available, the system checks the queue. If there's a waiting request for that equipment type, and a driver is free, the system creates the assignment automatically.

Dispatcher gets a notification: "Truck 7 auto-dispatched to queued work order #482." No manual intervention needed.

If no driver is available, the queue entry waits. If the queue is empty, equipment just goes idle.

### Monitoring Active Dispatches

Dispatchers watch the dashboard to see all active dispatches (not just their own—they need full situational awareness). Time elapsed for each dispatch, current status (en route, on site, returning), which driver has which equipment.

At Surface Level, this refreshes every 30 seconds via polling. At Mid-Depth, it's real-time via WebSockets.

### Completing Assignments

Driver or dispatcher marks the assignment done. System generates a status report automatically (work order details, equipment used, driver name, timestamps, duration). Report is immutable—no editing after the fact.

Equipment and driver return to "available" status. Work order becomes "completed." System checks the queue and might auto-dispatch the returned equipment immediately if something's waiting.

### Recalling Equipment

Priorities change. Emergency happens. Dispatcher recalls equipment mid-assignment.

Dispatcher selects active dispatch, clicks "Recall" with a reason. Driver gets notified (at Surface Level this is a phone call; at Mid-Depth it's a push notification). Equipment returns early. Assignment marked "recalled" (not completed—there's a difference for reporting). Original work order returns to pending, can be re-dispatched.

Recall reason gets logged for audit purposes.

## Key Business Rules

**Atomicity matters**: When you dispatch, equipment and driver both must be available, or neither gets assigned. This is why ACID transactions in a shared database are valuable at this scale. Distributed transactions across microservices would add complexity without benefit.

**One assignment at a time**: Equipment can't be in two places. Driver can't operate two machines. Simple constraints enforced by the database.

**Priority is binary**: Urgent or standard. We've learned that more granular priority levels (1-5) cause analysis paralysis. Dispatchers spend more time choosing priority than dispatching. Binary keeps them moving.

**Reports are immutable**: Once generated, you can't change them. Auditing and compliance require this. If there's an error, you add notes, you don't edit history.

**Queue can be overridden**: While the system processes queues automatically, dispatchers can manually grab from the queue if needed. Automation is helpful, not mandatory.

## Real-World Edge Cases

### No Equipment of Required Type
Dispatcher tries to request a forklift but none exist in the system. System prevents queue entry creation with a clear error: "No forklift equipment configured. Add equipment or change work order type."

### Driver Calls In Sick Mid-Dispatch
Equipment is en route but driver becomes unavailable. Dispatcher recalls the equipment, marks the reason as "driver unavailable," work order returns to pending. System doesn't try to be smart here—human judgment required.

### Queue Entry Sits for Hours
All drivers are busy. Queue entry ages. At Surface Level, dispatcher sees the age and escalates manually. At Mid-Depth, system sends alerts if queue entry exceeds 2 hours. At Deep-Water, system might suggest alternative equipment types or route to external contractors.

### Race Condition on Equipment
Two dispatchers try to assign the same truck simultaneously. Database constraint prevents double-assignment. Second dispatcher gets a clear error: "Equipment no longer available." They pick different equipment or queue the request.

At Mid-Depth, optimistic locking with version numbers handles this more gracefully. At Deep-Water, distributed locking prevents the race entirely.

### Equipment Damaged During Dispatch
Equipment can't return to service immediately. Instead of marking as "completed," dispatcher marks as "maintenance" with notes. Partial report generated. Admin must explicitly return equipment to service later.

### Work Order Needs Multiple Equipment Items
Large job requires truck + forklift simultaneously. At Surface Level, create two separate work orders and dispatch separately. At Mid-Depth, link related work orders. At Deep-Water, single work order can have multiple equipment assignments.

Current decision: Surface Level uses separate work orders. It's clunky but works, and customers haven't complained loudly enough to justify the complexity of multi-equipment assignments.

## What Gets Reported

Every completed dispatch generates a status report with:
- Work order number and description
- Equipment identifier and type
- Driver and dispatcher names
- Dispatch and completion timestamps
- Total duration
- Final status (completed or recalled)

At Mid-Depth, add optional fields: GPS coordinates, mileage, fuel consumption, driver notes, photos, customer signature.

At Deep-Water, add analytics: equipment utilization rates, average dispatch duration by type, driver productivity, queue wait times, peak demand periods.

Surface Level keeps it simple: just the facts needed for compliance and billing.

## Compliance and Audit Trail

Everything gets logged with timestamp and user ID:
- Work order creation, modification, cancellation
- Equipment dispatch, recall, completion
- Queue entry creation and removal
- Equipment status changes
- User role changes

Retention periods (configurable):
- Active work orders: until completed
- Completed work orders: 7 years (industry standard for compliance)
- Status reports: 7 years
- Audit logs: 3 years minimum
- User data: employment duration + 1 year

## What This Isn't

**Not a routing system**: We don't calculate optimal routes or ETAs. Work orders specify destinations but the system doesn't do GPS navigation or traffic analysis.

**Not real-time vehicle tracking**: We track assignment status (dispatched, en route, on site) but not live GPS coordinates at Surface Level. That comes at Mid-Depth if customers demand it.

**Not a billing system**: We track what happened but don't calculate invoices or process payments. Reports export to whatever billing system the customer uses.

**Not a customer portal**: Customers don't log in to request work orders at Surface Level. Dispatchers enter requests on their behalf. Customer portal is a Deep-Water feature.

**Not a mobile driver app**: At Surface Level, drivers get phone calls. Push notifications and mobile status updates come at Mid-Depth when the operational overhead is justified.

## Questions to Validate With Customers

Before building more than Surface Level, confirm:

1. **Queue automation**: Do dispatchers want automatic queue processing, or do they prefer manual control over every assignment? (Answer determines if auto-processing can be disabled)

2. **Multi-equipment frequency**: How often do work orders need multiple pieces of equipment? If it's <10% of cases, separate work orders are fine. If it's >30%, we need the complexity earlier.

3. **Driver qualifications**: Beyond "is a driver," what certifications matter? CDL classes? Forklift certification? Equipment-specific training? (Determines if Surface Level's role-based assumption is sufficient)

4. **Priority escalation**: Should standard-priority queue entries automatically escalate to urgent after X hours? Or is manual escalation by dispatchers sufficient?

5. **Recall frequency**: How often are dispatches recalled? If rare (< 5%), keep it simple. If common (>20%), needs more sophisticated workflow with partial completion tracking.

6. **Report consumers**: Who actually reads these reports? If only for compliance, keep them minimal. If used for billing or operational analysis, add more detail.

7. **Geographic scope**: Single location or multiple depots? Impacts data architecture at Mid-Depth (schema-per-tenant needs geographic tenant structure).

8. **Recall urgency**: When equipment is recalled, does it need to return immediately (emergency) or finish current task first (priority change)? Determines UI design.

The answers to these questions refine feature priorities at each maturity level. Don't guess—ask paying customers, watch them use the system, iterate based on real usage patterns.
