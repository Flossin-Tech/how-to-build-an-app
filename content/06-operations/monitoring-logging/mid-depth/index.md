---
title: "Monitoring & Logging - Mid-Depth"
phase: "06-operations"
topic: "monitoring-logging"
depth: "mid-depth"
reading_time: 28
prerequisites: ["monitoring-logging-surface"]
related_topics: ["incident-response", "patch-management", "backup-recovery"]
personas: ["generalist-leveling-up", "specialist-expanding"]
updated: "2025-11-16"
---

# Monitoring & Logging - Mid-Depth

You've shipped a service to production. Now you need to know if it's working. Not just "is the server up?" but "are users happy?" and "where's the bottleneck when things go wrong?"

This guide covers the practical patterns that matter: what to measure, how to collect it, and how to avoid drowning in alerts you'll ignore.

## When Surface Level Isn't Enough

You've got basic health checks running. The real problems surface later:

- **Averages lie:** Your average response time is 200ms, but some users wait 30 seconds
- **Alert fatigue:** You get paged 40 times per week, most alerts are false positives
- **Missing context:** Logs say "database error" but you can't find which user or request
- **Mystery slowdowns:** Something is occasionally slow but metrics look normal

This guide covers the methodologies and implementation patterns that help you understand what's actually happening in production.

## Core Patterns

### Pattern 1: Four Golden Signals

**When to use this:** Service-level monitoring for any user-facing system.

**How it works:**

Google's Site Reliability Engineering team identified four metrics that, together, tell you if a service is healthy:

1. **Latency** - How long requests take (track success and failure separately)
2. **Traffic** - Demand on your system (requests/sec, bandwidth)
3. **Errors** - Rate of failed requests
4. **Saturation** - How full your service is (CPU, memory, queue depth)

The insight: if these four look good, users are probably happy. If any spike or drop unexpectedly, users are probably suffering.

**Implementation:**

```python
from prometheus_client import Counter, Histogram, Gauge
import time

# 1. LATENCY - Track request duration
request_latency = Histogram(
    'http_request_duration_ms',
    'Request latency in milliseconds',
    ['method', 'endpoint', 'status'],
    buckets=[10, 50, 100, 250, 500, 1000, 2500, 5000]
)

# 2. TRAFFIC - Track request count
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# 3. ERRORS - Track failures
error_count = Counter(
    'http_errors_total',
    'Total HTTP errors',
    ['method', 'endpoint', 'error_type']
)

# 4. SATURATION - Track active requests
active_requests = Gauge(
    'http_active_requests',
    'Currently active HTTP requests'
)

# Middleware that instruments every request
def track_request(method, endpoint):
    def decorator(handler):
        def wrapper(*args, **kwargs):
            start = time.time()
            active_requests.inc()

            try:
                result = handler(*args, **kwargs)
                status = 200
                return result
            except Exception as e:
                status = 500
                error_count.labels(
                    method=method,
                    endpoint=endpoint,
                    error_type=type(e).__name__
                ).inc()
                raise
            finally:
                latency_ms = (time.time() - start) * 1000
                request_latency.labels(
                    method=method,
                    endpoint=endpoint,
                    status=status
                ).observe(latency_ms)

                request_count.labels(
                    method=method,
                    endpoint=endpoint,
                    status=status
                ).inc()

                active_requests.dec()

        return wrapper
    return decorator

# Usage
@track_request("POST", "/orders")
def create_order(order_data):
    # Your business logic here
    return {"order_id": "12345"}
```

**What's happening:**

1. **Latency histogram** - Records duration in buckets. Prometheus can calculate p50, p95, p99 percentiles from this. Using percentiles instead of averages reveals the worst user experience.
2. **Traffic counter** - Increments on every request. Provides context for other metrics. If latency spikes but traffic is normal, something got slower (not just busier).
3. **Error counter** - Separates errors by type. Helps distinguish "database timeout" from "validation error" from "external API failure."
4. **Saturation gauge** - Shows currently processing requests. If this stays high, you're approaching capacity limits.

**Trade-offs:**

- **Pro:** Four numbers answer "is the service healthy?" without overwhelming detail
- **Pro:** Works for services of any size - MVP to massive scale
- **Pro:** Industry standard - team members will recognize this pattern
- **Con:** Doesn't capture application-specific business metrics (orders/sec, revenue/hour)
- **Con:** Doesn't help debug specific user issues (need logs for that)
- **When it's worth it:** Always. This is the foundation. Add complexity on top of this, not instead of it.

### Pattern 2: USE Method (Infrastructure Analysis)

**When to use this:** Debugging performance problems and capacity planning.

**How it works:**

Brendan Gregg's USE Method provides a systematic checklist: for every resource, check Utilization, Saturation, and Errors. It finds 80% of infrastructure bottlenecks with 5% of the effort.

The workflow:
1. List all resources (CPU, memory, disk, network, thread pools, database connections)
2. For each resource, measure three metrics
3. Identify bottlenecks where utilization is high or saturation is non-zero

**Resources to monitor:**

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| **CPU** | % time busy | Run queue length | Thermal throttling events |
| **Memory** | % in use | Swap activity, OOM kills | Failed allocations |
| **Disk** | % time busy | Queue depth, wait time | I/O errors, timeouts |
| **Network** | % bandwidth used | Queue depth, dropped packets | CRC errors, collisions |
| **Thread Pool** | % threads in use | Queue length | Rejected tasks |
| **Database Connections** | % connections active | Wait time for connection | Connection refused |

**Example: Finding a CPU bottleneck**

```bash
# Utilization
top -bn1 | grep "Cpu(s)"
# Example: 95.2% us, 2.1% sy, 0.0% ni, 2.3% id
# → CPU is 95% utilized (high)

# Saturation
vmstat 1
# Look at 'r' column (run queue)
# Example: r = 8 on a 4-core system
# → 8 processes waiting for 4 cores = saturation

# Errors
dmesg | grep -i cpu
# Look for throttling, overheating
# Example: no errors found

# Conclusion: CPU bottleneck confirmed
# Action: Scale horizontally or optimize code
```

**Implementation in monitoring:**

```python
import psutil
from prometheus_client import Gauge

# CPU metrics
cpu_utilization = Gauge('system_cpu_percent', 'CPU utilization')
cpu_queue_length = Gauge('system_cpu_queue_length', 'CPU run queue')

# Memory metrics
memory_utilization = Gauge('system_memory_percent', 'Memory utilization')
swap_usage = Gauge('system_swap_percent', 'Swap usage (saturation indicator)')

# Disk metrics
disk_utilization = Gauge('system_disk_busy_percent', 'Disk busy time', ['device'])
disk_queue_depth = Gauge('system_disk_queue_depth', 'Disk queue depth', ['device'])

def collect_use_metrics():
    # CPU
    cpu_utilization.set(psutil.cpu_percent(interval=1))
    cpu_queue_length.set(len(psutil.Process().threads()))

    # Memory
    memory = psutil.virtual_memory()
    memory_utilization.set(memory.percent)
    swap_usage.set(psutil.swap_memory().percent)

    # Disk (simplified)
    disk_io = psutil.disk_io_counters(perdisk=True)
    for device, stats in disk_io.items():
        disk_utilization.labels(device=device).set(stats.busy_time / 1000)
```

**Trade-offs:**

- **Pro:** Systematic approach prevents guessing
- **Pro:** Covers all infrastructure resources
- **Pro:** Works for physical servers, VMs, containers
- **Con:** Doesn't capture application-level issues
- **Con:** Identifies bottlenecks but not root causes
- **When it's worth it:** Performance investigations and capacity planning

### Pattern 3: Structured Logging with Context

**When to use this:** Any time you need to debug production issues.

**How it works:**

Traditional plain-text logs make it hard to filter, aggregate, or correlate events. Structured logging uses JSON format with consistent fields, enabling machine parsing and high-cardinality queries.

The cost is 1.5-2x more storage, but the debugging speed improvement is typically 10x.

**Implementation:**

```python
import json
import logging
from datetime import datetime
from contextvars import ContextVar

# Context propagation (track request_id across function calls)
request_context = ContextVar('request_context', default={})

class StructuredLogger:
    def __init__(self, service_name):
        self.service = service_name

    def log(self, level, event, **context):
        """Log structured event with full context"""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "service": self.service,
            "level": level,
            "event": event,
            **request_context.get(),  # Include request context
            **context  # Include event-specific context
        }
        print(json.dumps(entry))

    def info(self, event, **context):
        self.log("INFO", event, **context)

    def error(self, event, error=None, **context):
        error_context = {"error": str(error), "error_type": type(error).__name__} if error else {}
        self.log("ERROR", event, **error_context, **context)

logger = StructuredLogger("order-service")

# Middleware sets request context
def handle_request(user_id, request_id):
    request_context.set({
        "user_id": user_id,
        "request_id": request_id,
        "session_id": get_session_id(user_id)
    })

    logger.info("request_started", endpoint="/api/orders", method="POST")

    try:
        result = process_order()
        logger.info("request_completed",
                   status_code=200,
                   latency_ms=45)
        return result
    except DatabaseError as e:
        logger.error("database_error",
                    error=e,
                    table="orders",
                    query="INSERT INTO orders")
        raise
```

**Example log output:**

```json
{
  "timestamp": "2025-11-16T14:30:22.123Z",
  "service": "order-service",
  "level": "ERROR",
  "event": "database_error",
  "user_id": "user_12345",
  "request_id": "req_abc123",
  "session_id": "sess_xyz789",
  "error": "Connection timeout after 30s",
  "error_type": "DatabaseError",
  "table": "orders",
  "query": "INSERT INTO orders"
}
```

**Why this matters:**

```bash
# Query 1: Find all errors for specific user
cat logs.json | jq 'select(.user_id == "user_12345" and .level == "ERROR")'

# Query 2: Find slow requests (>1 second)
cat logs.json | jq 'select(.latency_ms > 1000)'

# Query 3: Group errors by type
cat logs.json | jq 'select(.level == "ERROR") | .error_type' | sort | uniq -c

# Query 4: Correlate all events for a specific request
cat logs.json | jq 'select(.request_id == "req_abc123")'
```

**Essential fields to include:**

- `timestamp` - When it happened (ISO 8601 format)
- `service` - Which service logged this
- `level` - INFO, WARN, ERROR (filter by severity)
- `event` - What happened (request_started, database_error, payment_processed)
- `request_id` - Correlate all logs for one request
- `user_id` - Filter by user (high cardinality, but valuable)
- `latency_ms` - For performance analysis
- `error` and `error_type` - For debugging failures

**Trade-offs:**

- **Pro:** Machine-parsable, enables complex queries
- **Pro:** Preserves high-cardinality data (user_id, request_id)
- **Pro:** Correlates events across services
- **Con:** 1.5-2x more storage than plain text
- **Con:** Requires consistent schema across services
- **When it's worth it:** Always, unless you're logging to paper

## Practical Implementation Guide

### Step 1: Set Up Metrics Collection (Prometheus)

Prometheus is the industry standard for metrics. It scrapes metrics from your services every 15 seconds and stores them in a time-series database.

**Architecture:**

```
Your Service → /metrics endpoint (Prometheus format)
                      ↑
                      | scrape every 15s
                      |
                 Prometheus
                      ↓
                 Grafana (visualization)
```

**docker-compose.yml:**

```yaml
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus_data:
  grafana_data:
```

**prometheus.yml:**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'order-service'
    static_configs:
      - targets: ['order-service:8000']
    metrics_path: '/metrics'
```

**Common issues at this step:**

- **Service unreachable:** Verify Prometheus can reach your service's /metrics endpoint
- **No metrics appearing:** Check your service is exporting Prometheus format correctly
- **High memory usage:** Reduce retention time or implement cardinality controls

### Step 2: Implement Log Aggregation (ELK Stack)

Centralized logging with Elasticsearch, Logstash, and Kibana.

**Data flow:**

```
App writes JSON logs → Filebeat reads files → Logstash parses/enriches → Elasticsearch stores → Kibana queries
```

**docker-compose addition:**

```yaml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/log/myapp:/var/log/myapp:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: filebeat -e -strict.perms=false
```

**filebeat.yml:**

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/myapp/*.json
    json.keys_under_root: true
    json.add_error_key: true

processors:
  - add_host_metadata: ~
  - add_docker_metadata: ~

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "myapp-%{+yyyy.MM.dd}"

setup.kibana:
  host: "kibana:5601"
```

**Common issues at this step:**

- **Logs not appearing:** Check file permissions for Filebeat
- **Parse errors:** Verify your app writes valid JSON
- **Storage full:** Implement index lifecycle management (delete old indices)

### Step 3: Add Distributed Tracing (Optional but Recommended)

If you have multiple services calling each other, tracing shows where time is spent.

**Quick setup with Jaeger:**

```yaml
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "6831:6831/udp"  # Agent endpoint
      - "16686:16686"    # UI
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

**Instrument your service (Python example):**

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter

# Set up tracer
trace.set_tracer_provider(TracerProvider())
jaeger_exporter = JaegerExporter(
    agent_host_name="jaeger",
    agent_port=6831,
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

tracer = trace.get_tracer(__name__)

# Use in your code
def process_order(order_id):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order_id", order_id)

        # Call database
        with tracer.start_as_current_span("database_query"):
            result = db.query("SELECT * FROM orders WHERE id = ?", order_id)

        # Call payment service
        with tracer.start_as_current_span("call_payment_service"):
            payment = payment_service.charge(order_id)

        return result
```

**Common issues at this step:**

- **Broken traces:** Trace context not propagated across service boundaries
- **Missing spans:** Some operations not instrumented
- **Storage overflow:** Too much trace data without sampling

## Decision Framework

Use this to choose your monitoring approach:

| System Size | Metrics | Logs | Traces | Tools | Monthly Cost |
|------------|---------|------|--------|-------|-------------|
| **MVP (<10K req/day)** | Four Golden Signals | JSON to files + grep | None | Prometheus + local logs | $0-50 |
| **Small (10K-100K req/day)** | Four Golden Signals + USE | ELK Stack | Optional | Prometheus + ELK | $100-500 |
| **Medium (100K-1M req/day)** | Four Golden Signals + USE + RED | ELK + sampling | Required | Prometheus + ELK + Jaeger | $500-5K |
| **Large (>1M req/day)** | SLO-based | Cloud logging + aggressive sampling | Required + tail-sampling | Managed services | $5K-50K+ |

**Decision tree:**

```
Do you have multiple services?
  ├─ NO → Four Golden Signals + basic logs
  └─ YES → Add distributed tracing
           │
           Do you have >100K requests/day?
             ├─ NO → Self-hosted ELK + Prometheus
             └─ YES → Consider managed services (Datadog, New Relic)
                      or implement sampling
```

## Testing and Validation

### Verify metrics are working:

```bash
# Check Prometheus is scraping
curl http://localhost:9090/api/v1/targets

# Check metrics endpoint
curl http://your-service:8000/metrics

# Query metrics in Prometheus
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'
```

### Verify logs are aggregated:

```bash
# Check Elasticsearch is receiving logs
curl http://localhost:9200/_cat/indices?v

# Search logs in Kibana
# Open http://localhost:5601
# Create index pattern: myapp-*
# Query: level:"ERROR"
```

### Monitoring in production:

Track these meta-metrics to ensure monitoring itself is healthy:

- **Prometheus scrape success rate** - Should be >99%
- **Log ingestion lag** - Should be <60 seconds
- **Trace sampling rate** - Track what % you're keeping
- **Storage usage growth** - Alert before disk fills

## Common Pitfalls

### Pitfall 1: Alert Fatigue

**What happens:** Team gets 40+ alerts per day, starts ignoring them, eventually misses a real incident.

**Root cause:** Alerting on non-actionable conditions.

**Prevention:**

```yaml
# Bad alert (too sensitive)
alert: HighCPU
expr: cpu_usage > 70
for: 1m

# Good alert (actionable)
alert: HighErrorRate
expr: rate(http_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
for: 2m
annotations:
  description: "Error rate is {{ $value }}% (threshold: 5%)"
  runbook: "https://wiki.company.com/runbooks/high-error-rate"
```

**Detection:** Track alerts per on-call shift. If >10/shift, you have alert fatigue.

### Pitfall 2: Using Averages Instead of Percentiles

**What happens:** Average latency looks fine, but some users experience 30-second delays.

**Root cause:** Averages hide outliers.

**Prevention:**

```python
# Bad: Average
average_latency = sum(latencies) / len(latencies)

# Good: Percentiles
request_latency = Histogram(
    'http_request_duration_ms',
    'Request latency',
    buckets=[10, 50, 100, 250, 500, 1000, 2500, 5000]
)
# Prometheus can calculate p50, p95, p99 from this
```

**Example:**
```
10 requests: [50ms, 50ms, 50ms, 50ms, 50ms, 50ms, 50ms, 50ms, 50ms, 5000ms]

Average: 545ms (misleading - 90% of users saw 50ms)
p50 (median): 50ms
p95: 50ms
p99: 5000ms (reveals the problem)
```

### Pitfall 3: Losing Context Through Aggregation

**What happens:** You can see error rate spiked, but can't find which users or requests.

**Root cause:** Metrics aggregate away high-cardinality dimensions.

**Prevention:** Use structured logs for high-cardinality data.

```python
# In metrics (low cardinality)
error_count.labels(endpoint="/api/orders", status="500").inc()

# In logs (high cardinality preserved)
logger.error("database_timeout",
             user_id="user_12345",  # High cardinality
             request_id="req_abc",   # High cardinality
             query="SELECT * FROM orders WHERE user_id = ?")
```

**Detection:** If you frequently need to SSH into servers to grep logs, you're missing context.

## Real-World Examples

### Example 1: E-commerce Platform

**Context:** 500K requests/day, 15 microservices, 5-person engineering team

**Problem:** Intermittent checkout failures (2% error rate during peak hours)

**Solution:**
- Four Golden Signals revealed error spike correlated with latency spike
- Structured logs filtered by `endpoint="/checkout"` and `status_code>=400`
- Found pattern: errors only for users with >50 items in cart
- Traced requests through distributed tracing
- Identified N+1 query in inventory service

**Results:**
- Mean time to detection: 15 minutes (down from 2+ hours)
- Root cause found in 20 minutes (down from 4+ hours)
- Cost: $500/month for self-hosted ELK + Prometheus

### Example 2: SaaS API Platform

**Context:** 2M requests/day, monolithic application becoming microservices

**Problem:** Alert fatigue - team getting 50+ pages per week

**Solution:**
- Audited all 35 alerts using actionability filter
- Removed 22 alerts (automated fixes instead)
- Adjusted thresholds on remaining 13 based on baseline data
- Implemented 5-minute hold-down periods to prevent duplicate pages

**Results:**
- Alerts dropped from 50/week to 8/week
- False positive rate: 60% → 10%
- On-call satisfaction score improved
- Zero increase in undetected incidents

## Tools and Integration

### Recommended Tools

**Prometheus (Metrics)**
- **What it does:** Time-series database for metrics
- **When to use it:** Any service that needs monitoring
- **Setup:**
```bash
# Start Prometheus
docker run -p 9090:9090 -v prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus

# Verify
curl http://localhost:9090/api/v1/targets
```

**Grafana (Visualization)**
- **What it does:** Dashboard and alerting UI
- **When to use it:** Visualizing Prometheus metrics
- **Setup:**
```bash
# Start Grafana
docker run -p 3000:3000 grafana/grafana

# Add Prometheus datasource
# http://localhost:3000 → Configuration → Data Sources → Add Prometheus
# URL: http://prometheus:9090
```

**ELK Stack (Logs)**
- **What it does:** Centralized log aggregation and search
- **When to use it:** >10K requests/day or multiple services
- **Storage costs:** ~$1/GB/month (cloud) or $0.10/GB/month (self-hosted)

**Alternatives:**
- **Managed services:** Datadog ($15-50/host/month), New Relic (similar)
- **Lightweight:** Loki (Grafana's log system, lower cost)
- **Cloud-native:** CloudWatch (AWS), Cloud Logging (GCP)

## Cost-Benefit Analysis

### Time Investment

**Initial setup:**
- Four Golden Signals: 4-8 hours
- Structured logging: 8-12 hours
- ELK Stack: 16-24 hours
- Distributed tracing: 8-16 hours
- **Total:** 36-60 hours

**Learning curve:**
- Junior engineer: 2-3 weeks to productivity
- Senior engineer: 1 week to productivity

**Ongoing maintenance:**
- Alert tuning: 2 hours/month
- Dashboard updates: 1 hour/month
- Index management: 1 hour/month
- **Total:** 4 hours/month

### Return on Investment

**Immediate (Week 1-4):**
- Visibility into production behavior
- Faster incident detection (hours → minutes)
- Baseline metrics for capacity planning

**Medium-term (Months 3-6):**
- Mean time to detection drops 80%
- Mean time to resolution drops 60%
- Fewer customer-reported issues
- Reduced on-call stress

**Long-term (1+ year):**
- Data-driven capacity planning
- Trend analysis for optimization
- Historical context for debugging
- Reduced alert fatigue and engineer burnout

### When to skip this

**Don't invest in full observability if:**
- You have <1000 requests/day (basic monitoring sufficient)
- Your system is extremely simple (single service, no external dependencies)
- You're in MVP phase (wait until you have real traffic)

**Start simple, add complexity as needed.** Begin with Four Golden Signals and structured logging. Add distributed tracing when you have multiple services. Add advanced sampling when costs become significant.

## Progressive Enhancement Path

**Month 1-2: Foundation**
- [ ] Implement Four Golden Signals for primary service
- [ ] Set up Prometheus and Grafana
- [ ] Convert logs to structured JSON format
- [ ] Create basic dashboard showing latency, traffic, errors, saturation
- [ ] Document what "normal" looks like (baseline metrics)

**Month 3-4: Optimization**
- [ ] Add USE method for infrastructure resources
- [ ] Implement ELK Stack for centralized logging
- [ ] Create 3-5 essential alerts with runbooks
- [ ] Tune alert thresholds based on actual behavior
- [ ] Implement log sampling for high-volume endpoints

**Month 5-6: Advanced**
- [ ] Add distributed tracing for multi-service requests
- [ ] Implement tail-based sampling for traces
- [ ] Create correlation between metrics, logs, and traces
- [ ] Build SLO dashboards
- [ ] Automate remediation for common issues

## Summary

Key takeaways:

1. **Four Golden Signals provide foundation** - Latency, Traffic, Errors, Saturation answer "is the service healthy?"
2. **Percentiles reveal user experience** - p99 shows worst-case, averages hide problems
3. **Structured logging preserves context** - JSON format enables high-cardinality queries worth the 2x storage cost
4. **Alert quality matters more than quantity** - Every alert must be actionable or it creates fatigue

**Start here:**
- Instrument your primary service with Four Golden Signals
- Convert logs to structured JSON format
- Set up Prometheus and Grafana (4-8 hours)

**For deeper understanding:**
- [Deep Water →](../deep-water/) for advanced architectures, sampling strategies, and enterprise patterns
- External: [Google SRE Book - Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- External: [Brendan Gregg - USE Method](https://www.brendangregg.com/usemethod.html)
