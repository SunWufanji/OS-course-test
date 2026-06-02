# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProcessOS — OS course project implementing a process scheduling visual simulator. Backend: Java 17 + Spring Boot 3.2 (Maven) + MySQL. Frontend: React 18 + Vite.

## Common Commands

**Backend:**
```bash
cd backend
mvn spring-boot:run          # Start backend on http://localhost:9090
mvn clean package            # Build JAR
```

**Frontend:**
```bash
cd frontend
npm install                  # Install dependencies
npm run dev                  # Start dev server on http://localhost:3000
npm run build                # Production build
```

**Database:**
- MySQL database: `process_os` on localhost:3306
- Schema file: `backend/src/main/resources/schema.sql`
- Default credentials: root / 123456
- JPA auto-DDL: `spring.jpa.hibernate.ddl-auto=update` (auto-creates tables)

## Architecture

### Backend (Spring Boot)

- **ProcessService** (`service/ProcessService.java`): Core simulation logic. Manages process lifecycle, queues, time ticking, statistics. Generates `currentSessionId` (UUID) per simulation run.
- **Scheduler** (`scheduler/Scheduler.java`): Interface for scheduling algorithms. Implementations: FCFS, SJF, RoundRobin, Priority.
- **ProcessController** (`controller/ProcessController.java`): REST API under `/api`. All endpoints return JSON maps.
- **Models**: `ProcessControlBlock` (PCB, in-memory), `ProcessState` enum.
- **Sync primitives** (`sync/`): Semaphore, Mutex, MessageQueue — included but not wired to the scheduler.

### Database Layer (MySQL + JPA)

Three tables for persisting simulation results:

| Table | Entity | Purpose |
|-------|--------|---------|
| `execution_log` | `ExecutionLog` | Per-process execution traces (waiting, turnaround, completion times) |
| `performance_metrics` | `PerformanceMetrics` | Aggregate stats per session (avg turnaround, throughput, CPU utilization) |
| `scenario_config` | `ScenarioConfig` | Predefined experiment scenarios with process configs stored as JSON |

**Repositories** (`repository/`): Standard Spring Data JPA — `ExecutionLogRepository`, `PerformanceMetricsRepository`, `ScenarioConfigRepository`.

**Data flow**: Simulation runs in-memory → on reset or manual save, `ProcessService` persists logs and metrics to MySQL → history can be queried via `/api/history`.

### Frontend (React)

- Single-component SPA in `App.jsx`. Uses `axios` for API calls to backend.
- Vite proxies `/api` requests to `http://localhost:9090`.
- State is managed via React hooks (useState, useEffect, useCallback).
- Process simulation runs via polling: frontend calls `POST /api/tick` at 500ms intervals when playing.

### API Contract

All endpoints under `/api`. Key routes:
- `GET /processes` — returns all state (processes, queues, runningProcess, ganttData, stats, currentTime)
- `POST /processes` — create process (body: {name, burstTime, priority, arrivalTime})
- `POST /tick` — advance simulation by one time unit
- `POST /scheduler` — switch algorithm (body: {algo: "FCFS"|"SJF"|"RR"|"Priority"})
- `POST /quantum` — set RR time quantum (body: {quantum: int})
- `POST /demo` — load demo data (5 preset processes)
- `POST /reset` — clear in-memory state and persist to DB
- `GET /scenarios` — list all experiment scenarios from DB
- `POST /scenarios/{id}/load` — load a scenario's process config
- `GET /history` — get last 10 simulation performance records
- `POST /save` — manually save current simulation results to DB

## Key Notes

- Backend runs on port 9090 (not 8080 as shown in README — README is outdated).
- Frontend proxies `/api` to backend via Vite config.
- `ProcessControlBlock` stays in-memory only; only `ExecutionLog` and `PerformanceMetrics` are persisted.
- Each simulation run gets a UUID `sessionId` — used to group logs and metrics together.
- Default demo scenarios are seeded in `schema.sql` (轻载/中载/重载/CPU密集型/IO密集型).
