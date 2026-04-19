# Kubernetes NetworkPolicy

## NetworkPolicy란?

**NetworkPolicy**는 Kubernetes 클러스터에서 **Pod 간 네트워크 트래픽을 제어**하는 리소스입니다. 기본적으로 모든 Pod 간 통신이 허용되지만, NetworkPolicy를 적용하면 특정 규칙에 따라 트래픽을 허용하거나 차단할 수 있습니다.

## NetworkPolicy의 필요성

- **보안 강화**: 민감한 애플리케이션 간 통신을 제한
- **마이크로서비스 아키텍처**: 서비스 간 트래픽을 세밀하게 제어
- **제로 트러스트 모델**: 모든 트래픽을 명시적으로 허용해야 함
- **네트워크 세그먼테이션**: 애플리케이션별로 네트워크 격리

---

## NetworkPolicy 기본 개념

### 작동 방식

1. **기본 동작**: NetworkPolicy가 없으면 모든 Pod 간 통신 허용
2. **정책 적용**: NetworkPolicy가 적용되면 **화이트리스트 방식**으로 변경
3. **레이블 기반**: Pod 레이블을 기반으로 트래픽 제어
4. **네임스페이스 범위**: 기본적으로 동일 네임스페이스 내 Pod에 적용

### 지원되는 트래픽 방향

- **Ingress**: Pod로 들어오는 트래픽
- **Egress**: Pod에서 나가는 트래픽

---

## NetworkPolicy 리소스 구조

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: example-policy
  namespace: default
spec:
  podSelector:          # 정책이 적용될 Pod 선택
    matchLabels:
      app: my-app
  policyTypes:          # 적용할 정책 타입
  - Ingress
  - Egress
  ingress:              # Ingress 규칙들
  - from:               # 허용할 소스
    - podSelector:      # Pod 레이블로 선택
        matchLabels:
          app: frontend
    - namespaceSelector: # 네임스페이스 레이블로 선택
        matchLabels:
          project: myproject
    ports:              # 허용할 포트
    - protocol: TCP
      port: 80
  egress:               # Egress 규칙들
  - to:                 # 허용할 대상
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

---

## 정책 타입 (policyTypes)

| 타입 | 설명 |
|------|------|
| **Ingress** | Pod로 들어오는 트래픽 제어 |
| **Egress** | Pod에서 나가는 트래픽 제어 |
| **Ingress,Egress** | 양방향 트래픽 제어 |

---

## 선택자 (Selector) 종류

### 1. podSelector
- Pod의 레이블을 기반으로 선택
- `matchLabels` 또는 `matchExpressions` 사용

### 2. namespaceSelector
- 네임스페이스의 레이블을 기반으로 선택
- 다른 네임스페이스의 Pod를 대상으로 함

### 3. ipBlock
- IP 주소 범위로 선택 (CIDR 표기)
- 외부 서비스나 특정 IP 대역 허용 시 사용

---

## NetworkPolicy 예제

### 예제 1: 기본 Ingress 정책

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 80
```

**설명**: `app=backend` 레이블이 있는 Pod들은 `app=frontend` 레이블이 있는 Pod들로부터만 80번 포트로의 TCP 트래픽을 허용합니다.

### 예제 2: 네임스페이스 간 통신 허용

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-production-namespace
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
    ports:
    - protocol: TCP
      port: 443
```

**설명**: `production` 네임스페이스의 `app=api` Pod들은 `environment=production` 레이블이 있는 네임스페이스의 모든 Pod들로부터 443번 포트로의 트래픽을 허용합니다.

### 예제 3: IP 범위 기반 허용

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-ips
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 192.168.1.0/24
        except:
        - 192.168.1.100/32
    ports:
    - protocol: TCP
      port: 80
```

**설명**: `app=web` Pod들은 192.168.1.0/24 대역의 IP로부터 80번 포트로의 트래픽을 허용하지만, 192.168.1.100은 제외합니다.

### 예제 4: Egress 정책 (외부 통신 제한)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-egress
spec:
  podSelector:
    matchLabels:
      app: secure-app
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: cache
    ports:
    - protocol: TCP
      port: 6379
```

**설명**: `app=secure-app` Pod들은 `app=database`와 `app=cache` Pod들에게만 트래픽을 보낼 수 있습니다.

### 예제 5: 모든 트래픽 차단 (Deny All)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}  # 모든 Pod에 적용
  policyTypes:
  - Ingress
  - Egress
```

**설명**: 모든 Pod의 모든 Ingress와 Egress 트래픽을 차단합니다. (빈 규칙 = 아무것도 허용하지 않음)

### 예제 6: 모든 트래픽 허용 (Allow All)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all
spec:
  podSelector: {}  # 모든 Pod에 적용
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - {}  # 빈 규칙 = 모든 Ingress 허용
  egress:
  - {}  # 빈 규칙 = 모든 Egress 허용
```

**설명**: 모든 Pod의 모든 트래픽을 허용합니다. (기본 동작과 동일)

---

## 실제 사용 사례

### 1. 웹 애플리케이션 보안

```yaml
# Frontend → API Gateway → Backend → Database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway-policy
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3000
```

### 2. 데이터베이스 접근 제한

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-isolation
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backend
    - podSelector:
        matchLabels:
          app: admin-tools
    ports:
    - protocol: TCP
      port: 5432
```

### 3. 네임스페이스 간 격리

```yaml
# production 네임스페이스의 Pod들만 접근 허용
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: production-only-access
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: sensitive-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
```

---

## NetworkPolicy 동작 원리

```
Internet
   ↓
[LoadBalancer/Ingress]
   ↓
Frontend Pods (app=frontend)
   ↓ (NetworkPolicy로 제어됨)
API Gateway Pods (app=api-gateway)
   ↓
Backend Pods (app=backend)
   ↓
Database Pods (app=database)
```

---

## 주의사항

1. **네트워크 플러그인 필요**: NetworkPolicy를 지원하는 CNI 플러그인 필요 (Calico, Cilium, Weave Net 등)
2. **기본 동작**: 정책이 없으면 모든 통신 허용
3. **레이블 의존성**: 정확한 레이블링이 중요
4. **네임스페이스 범위**: 정책은 동일 네임스페이스 내에서만 적용 (namespaceSelector로 확장 가능)
5. **DNS 트래픽**: Egress 정책에서 DNS(53번 포트) 허용 필요
6. **Service Account 토큰**: API 서버 통신을 위한 443번 포트 허용 필요

---

## NetworkPolicy vs 다른 보안 메커니즘

| 메커니즘 | 레벨 | 제어 대상 |
|----------|------|-----------|
| **RBAC** | API | Kubernetes API 접근 |
| **Pod Security Standards** | 컨테이너 | Pod 실행 권한 |
| **NetworkPolicy** | 네트워크 | Pod 간 트래픽 |
| **Service Mesh** | 애플리케이션 | 서비스 간 통신 |

---

## 실습: NetworkPolicy 설정

```bash
# 1. 네트워크 플러그인 설치 (Calico 예시)
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# 2. 테스트용 Pod 배포
kubectl create namespace test
kubectl run frontend --image=nginx --labels="app=frontend" -n test
kubectl run backend --image=nginx --labels="app=backend" -n test

# 3. 모든 트래픽 차단 정책 적용
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: test
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
EOF

# 4. Frontend에서 Backend로의 통신 허용
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: test
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 80
EOF

# 5. 확인
kubectl get networkpolicies -n test
kubectl describe networkpolicy allow-frontend-to-backend -n test
```

---

## 학습 핵심 요약

✅ **NetworkPolicy**는 Pod 간 네트워크 트래픽을 제어하는 리소스
✅ **화이트리스트 방식**: 정책 적용 시 모든 트래픽 기본 차단
✅ **Ingress/Egress**: 들어오고 나가는 트래픽을 별도 제어
✅ **레이블 기반**: Pod, 네임스페이스, IP 범위로 선택
✅ **CNI 플러그인 필요**: Calico, Cilium 등의 지원하는 플러그인 필수
✅ **마이크로서비스 보안**: 서비스 메시 아키텍처에서 핵심 역할
