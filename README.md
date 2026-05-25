# ShiftFlow — Cloud-Native Workforce Shift Management

> SIT727 Cloud Automation Technologies — Task 7.2HD  
> Keerthana Vijekumar | Student ID: 224719679  
> T1 2026 | Deakin University

---

## Project Overview

ShiftFlow is a cloud-native workforce shift management system built on a microservices architecture and deployed on Google Kubernetes Engine (GKE). The system allows administrators to create, publish, and approve shifts while employees can browse available shifts and self-allocate through role-based web interfaces.

This project is inspired by real-world shift management platforms used in the Australian aged care sector, specifically Swag by Employment Hero. Having worked as a part-time aged care support worker, I experienced firsthand the operational challenges of poorly coordinated scheduling systems — this project explores how modern Kubernetes infrastructure can address those challenges.

---

## Architecture

ShiftFlow consists of 5 microservices deployed as independent pods inside a Kubernetes cluster:

```
Browser
  └── Frontend Service (port 3003) — Express + static HTML
        ├── Auth Service (port 3000) — JWT authentication
        ├── Admin Service (port 3000) — Shift management
        └── Employee Service (port 3000) — Shift allocation
              └── MongoDB StatefulSet (port 27017) — Persistent database
```

All inter-service communication uses Kubernetes internal DNS names (e.g. `http://admin-service:3000`) — no hardcoded IPs anywhere. The frontend acts as a proxy, routing API calls to backend services inside the cluster so only one external IP is exposed.

---

## Kubernetes Features

This project demonstrates 11 Kubernetes features:

| Feature | File | Description |
|---|---|---|
| Deployments | `*-deployment.yaml` | 5 microservices with rolling update strategy |
| StatefulSet | `mongo-deployment.yaml` | MongoDB with stable identity and ordered lifecycle |
| Services | `*-service.yaml` | LoadBalancer (frontend/backend), ClusterIP None (MongoDB) |
| ConfigMap | `configmap.yaml` | 6 non-sensitive config values — MongoDB URL, API endpoints |
| Secrets | `jwt-secret.yaml` | JWT signing secret, Opaque type, environment variable injection |
| HPA | `admin-hpa.yaml`, `employee-hpa.yaml` | CPU 60% / Memory 70% thresholds, min 1 max 3 replicas |
| PVC | `mongo.yaml` | 1Gi persistent storage for MongoDB data |
| Liveness Probes | All deployments | HTTP GET /version, restarts unresponsive pods |
| Readiness Probes | All deployments | HTTP GET /version, removes pod from load balancer until ready |
| Pod Anti-Affinity | All deployments | Spreads replicas across nodes for high availability |
| RBAC | `rbac.yaml` | ServiceAccount, Role (least privilege), RoleBinding |
| Resource Limits | All deployments | CPU requests/limits and memory requests/limits on all pods |

---

## Technology Stack

| Component | Technology |
|---|---|
| Container orchestration | Kubernetes 1.35 on GKE |
| Cloud platform | Google Cloud Platform (GCP) |
| Container registry | GCP Artifact Registry |
| Monitoring | GCP Cloud Monitoring |
| Database | MongoDB 6.0 |
| Backend services | Node.js + Express |
| Frontend | HTML + CSS + JavaScript |
| Authentication | JWT (jsonwebtoken) |
| Container runtime | Docker |

---

## Project Structure

```
ShiftFlow/
├── kube/                          # Kubernetes configuration files
│   ├── admin-deployment.yaml      # Admin service deployment
│   ├── admin-service.yaml         # Admin LoadBalancer service
│   ├── auth-deployment.yaml       # Auth service deployment
│   ├── auth-service.yaml          # Auth LoadBalancer service
│   ├── employee-deployment.yaml   # Employee service deployment
│   ├── employee-service.yaml      # Employee LoadBalancer service
│   ├── frontend-deployment.yaml   # Frontend service deployment
│   ├── frontend-service.yaml      # Frontend LoadBalancer service
│   ├── mongo-deployment.yaml      # MongoDB StatefulSet
│   ├── mongo-service.yaml         # MongoDB headless ClusterIP service
│   ├── mongo.yaml                 # MongoDB PersistentVolumeClaim
│   ├── configmap.yaml             # Application configuration
│   ├── jwt-secret.yaml            # JWT secret (Opaque)
│   ├── admin-hpa.yaml             # HPA for admin service
│   ├── employee-hpa.yaml          # HPA for employee service
│   └── rbac.yaml                  # ServiceAccount, Role, RoleBinding
├── admin-service/
│   ├── admin.js                   # Shift management REST API
│   ├── model.js                   # Mongoose schemas (Shift, Allocation)
│   ├── package.json
│   ├── Dockerfile
│   └── .env                       # Local development only (not in repo)
├── auth-service/
│   ├── auth.js                    # JWT authentication service
│   ├── users.js                   # User credentials store
│   ├── package.json
│   └── Dockerfile
├── employee-service/
│   ├── employee.js                # Shift allocation + clock in/out API
│   ├── model.js                   # Mongoose schemas
│   ├── package.json
│   └── Dockerfile
├── frontend-service/
│   ├── server.js                  # Express server + proxy middleware
│   ├── package.json
│   ├── Dockerfile
│   └── public/
│       ├── admin/
│       │   ├── admin.html         # Admin dashboard
│       │   └── admin.css
│       ├── login/
│       │   ├── login.html         # Login page
│       │   └── login.css
│       └── employee/
│           ├── employee.html      # Employee dashboard
│           └── employee.css
├── .gitignore
├── docker-compose.yml             # Local development
└── README.md
```

---

## Prerequisites

Before running this project, make sure you have:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install) installed
- A GCP account with billing enabled
- [Node.js 20+](https://nodejs.org/) (for local development only)

---

## Option 1 — Deploy to GKE (Recommended)

### Step 1 — Authenticate with GCP

```bash
gcloud auth login
gcloud config set project shiftflow-gcp
```

### Step 2 — Get cluster credentials

```bash
gcloud container clusters get-credentials shiftflow-cluster \
  --zone australia-southeast1-a
```

### Step 3 — Verify cluster connection

```bash
kubectl get nodes
```

Expected output:
```
NAME                                               STATUS   ROLES    AGE
gke-shiftflow-cluster-default-pool-xxx-xxx         Ready    <none>   Xd
gke-shiftflow-cluster-default-pool-xxx-xxx         Ready    <none>   Xd
```

### Step 4 — Apply all Kubernetes configs

Apply in this order:

```bash
# 1. Configuration and secrets first
kubectl apply -f kube/configmap.yaml
kubectl apply -f kube/jwt-secret.yaml

# 2. MongoDB storage and database
kubectl apply -f kube/mongo.yaml
kubectl apply -f kube/mongo-service.yaml
kubectl apply -f kube/mongo-deployment.yaml

# 3. Backend services
kubectl apply -f kube/admin-deployment.yaml
kubectl apply -f kube/admin-service.yaml
kubectl apply -f kube/auth-deployment.yaml
kubectl apply -f kube/auth-service.yaml
kubectl apply -f kube/employee-deployment.yaml
kubectl apply -f kube/employee-service.yaml

# 4. Frontend
kubectl apply -f kube/frontend-deployment.yaml
kubectl apply -f kube/frontend-service.yaml

# 5. Autoscaling and access control
kubectl apply -f kube/admin-hpa.yaml
kubectl apply -f kube/employee-hpa.yaml
kubectl apply -f kube/rbac.yaml
```

Or apply everything at once (order may vary):
```bash
kubectl apply -f kube/
```

### Step 5 — Verify deployment

```bash
kubectl get pods
kubectl get services
kubectl get hpa
kubectl get statefulsets
kubectl get pvc
```

All pods should show `1/1 Running`.

### Step 6 — Access the application

Get the frontend external IP:
```bash
kubectl get services frontend-service
```

Open in browser:
```
http://<EXTERNAL-IP>
```

**Login credentials:**
- Admin: `ADM001` / `adminpass`
- Employee: `EMP001` / `password123`

---

## Option 2 — Run Locally with Docker Desktop

### Step 1 — Switch kubectl context

```bash
kubectl config use-context docker-desktop
```

### Step 2 — Build Docker images locally

```bash
docker build -t admin-service:latest ./admin-service
docker build -t auth-service:latest ./auth-service
docker build -t employee-service:latest ./employee-service
docker build -t frontend-service:latest ./frontend-service
```

### Step 3 — Update image names in deployment YAMLs

In each deployment file change the image to the local name and add `imagePullPolicy: Never`:

```yaml
# Example for admin-deployment.yaml
containers:
  - name: admin
    image: admin-service:latest
    imagePullPolicy: Never
```

Do this for all 4 service deployments.

### Step 4 — Apply configs and deploy

```bash
kubectl apply -f kube/configmap.yaml
kubectl apply -f kube/jwt-secret.yaml
kubectl apply -f kube/mongo.yaml
kubectl apply -f kube/mongo-service.yaml
kubectl apply -f kube/mongo-deployment.yaml
kubectl apply -f kube/admin-deployment.yaml
kubectl apply -f kube/admin-service.yaml
kubectl apply -f kube/auth-deployment.yaml
kubectl apply -f kube/auth-service.yaml
kubectl apply -f kube/employee-deployment.yaml
kubectl apply -f kube/employee-service.yaml
kubectl apply -f kube/frontend-deployment.yaml
kubectl apply -f kube/frontend-service.yaml
kubectl apply -f kube/admin-hpa.yaml
kubectl apply -f kube/employee-hpa.yaml
kubectl apply -f kube/rbac.yaml
```

### Step 5 — Access the application

```
http://localhost:80
```

---

## Option 3 — Run with Docker Compose (Local Development)

For quick local development without Kubernetes:

```bash
docker-compose up --build
```

Access at `http://localhost:3003`

---

## Building and Pushing Docker Images to GCP Artifact Registry

If you want to rebuild and push images to your own GCP project:

### Step 1 — Create Artifact Registry repository

```bash
gcloud artifacts repositories create shiftflow-repo \
  --repository-format=docker \
  --location=australia-southeast1
```

### Step 2 — Configure Docker authentication

```bash
gcloud auth configure-docker australia-southeast1-docker.pkg.dev
```

### Step 3 — Build and push all images

Replace `YOUR-PROJECT-ID` with your GCP project ID:

```bash
# Admin service
docker build -t australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/admin-service:latest ./admin-service
docker push australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/admin-service:latest

# Auth service
docker build -t australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/auth-service:latest ./auth-service
docker push australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/auth-service:latest

# Employee service
docker build -t australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/employee-service:latest ./employee-service
docker push australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/employee-service:latest

# Frontend service
docker build -t australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/frontend-service:latest ./frontend-service
docker push australia-southeast1-docker.pkg.dev/YOUR-PROJECT-ID/shiftflow-repo/frontend-service:latest
```

### Step 4 — Update deployment YAMLs

Update the image references in all deployment files to use your new image URLs.

---

## API Reference

### Auth Service (port 3000)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/login` | Login with staff_id and password, returns JWT token | None |
| GET | `/version` | Service health check | None |

**Login request:**
```json
{
  "staff_id": "ADM001",
  "password": "adminpass"
}
```

**Login response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "admin"
}
```

### Admin Service (port 3000)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/shifts` | Create a new shift | Optional |
| GET | `/shifts` | Get all shifts | None |
| PUT | `/shifts/:shiftId` | Update a shift | None |
| DELETE | `/shifts/:shiftId` | Delete a shift | None |
| GET | `/picked-shifts` | Get all allocated shifts | None |
| PUT | `/approve` | Approve a shift allocation | None |
| GET | `/allocations` | Get approved allocations | None |
| GET | `/version` | Service health check | None |

**Create shift request:**
```json
{
  "shiftId": "S001",
  "date": "2026-05-24",
  "startTime": "09:00",
  "endTime": "17:00"
}
```

### Employee Service (port 3000)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/shifts/available` | Get available shifts | JWT |
| POST | `/allocate` | Pick up a shift | JWT |
| GET | `/roster` | Get my allocated shifts | JWT |
| POST | `/clockin` | Clock in to a shift | JWT |
| POST | `/clockout` | Clock out of a shift | JWT |
| GET | `/version` | Service health check | None |

---

## Environment Variables

Each service reads configuration from environment variables injected by Kubernetes ConfigMap and Secrets:

| Variable | Source | Services | Description |
|---|---|---|---|
| `MONGO_URL` | ConfigMap | admin, employee | MongoDB connection string |
| `AUTH_API_URL` | ConfigMap | frontend | Auth service URL |
| `ADMIN_API_URL` | ConfigMap | frontend | Admin service URL |
| `EMPLOYEE_API_URL` | ConfigMap | frontend | Employee service URL |
| `JWT_SECRET` | Secret | auth, employee | JWT signing secret |
| `PORT` | ConfigMap | all | Service port |

---

## Monitoring and Observability

The project uses GCP Cloud Monitoring for observability:

### Custom Dashboard
- CPU request utilization across all containers
- Memory request utilization across all containers
- Container restart count (should be 0 for healthy deployment)

### Alert Policies
- **CPU Alert** — triggers when CPU exceeds 80%, sends email notification
- **Pod Restart Alert** — triggers on any pod restart, sends email notification

### Viewing Logs

```bash
# View logs for a specific service
kubectl logs deploy/admin-deployment
kubectl logs deploy/auth-deployment
kubectl logs deploy/employee-deployment
kubectl logs deploy/frontend-deployment
kubectl logs mongo-0
```

---

## Troubleshooting

### Pods not starting — ImagePullBackOff

```bash
kubectl describe pod <pod-name>
```

Check the Events section. If the image cannot be pulled:
- Verify Artifact Registry permissions
- Run `gcloud auth configure-docker australia-southeast1-docker.pkg.dev`
- Check image name in deployment YAML matches Artifact Registry

### Frontend showing "Unable to connect to server"

This happens when the frontend cannot reach backend services. The proxy middleware in `server.js` uses internal Kubernetes DNS names. Make sure:
- All backend pods are running: `kubectl get pods`
- ConfigMap has correct internal DNS names: `kubectl describe configmap shiftflow-config`
- Frontend pod was restarted after ConfigMap changes: `kubectl rollout restart deployment/frontend-deployment`

### MongoDB CrashLoopBackOff

Check MongoDB logs:
```bash
kubectl logs mongo-0
```

If probe-related, the mongo deployment uses TCP socket probes which should work with any MongoDB version. Verify the probe configuration in `mongo-deployment.yaml`.

### HPA showing unknown targets

HPA requires the metrics server to be running. On GKE this is enabled by default. Check:
```bash
kubectl get apiservices | grep metrics
kubectl top pods
```

---

## Cleaning Up

To avoid unnecessary GCP charges, delete the cluster when not in use:

```bash
# Delete all Kubernetes resources
kubectl delete -f kube/

# Delete GKE cluster
gcloud container clusters delete shiftflow-cluster \
  --zone australia-southeast1-a

# Delete Artifact Registry (optional)
gcloud artifacts repositories delete shiftflow-repo \
  --location=australia-southeast1
```

---

## GitHub Repository

[https://github.com/KeerthanaVijekumar/SIT727_ShiftFlow](https://github.com/KeerthanaVijekumar/SIT727_ShiftFlow)

---

## References

- The Kubernetes Authors. (2025). Kubernetes documentation. https://kubernetes.io/docs/home/
- Google Cloud. (2025). Google Kubernetes Engine documentation. https://cloud.google.com/kubernetes-engine/docs
- Employment Hero Pty Ltd. (2025). Swag by Employment Hero. https://swagapp.com/au/

---

*SIT727 Cloud Automation Technologies — Deakin University T1 2026*
