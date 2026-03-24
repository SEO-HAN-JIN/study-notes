# Kubernetes Toleration

## Toleration이란?

**Toleration**은 Pod이 특정 **Taint**가 있는 Node에 스케줄될 수 있도록 해주는 메커니즘입니다. Node의 Taint와 Pod의 Toleration이 일치할 때, Pod은 해당 Node에 배포될 수 있습니다.

## Taint와 Toleration의 관계

### Taint (Node 표시)
- **Taint**는 Node에 부여되는 특수한 표시입니다
- Pod이 이 Taint를 용인(tolerate)하지 않으면 해당 Node를 피합니다
- 주로 특수한 하드웨어(GPU, SSD 등) 또는 특정 목적의 Node를 보호할 때 사용됩니다

### Toleration (Pod의 허용)
- **Toleration**은 Pod이 특정 Taint를 견딜 수 있다는 것을 선언합니다
- Toleration이 Taint와 일치하면 Pod이 Node에 스케줄될 수 있습니다

---

## Taint 설정하기

### Taint 추가/제거

```bash
# Taint 추가
kubectl taint nodes node-name key=value:effect

# Taint 제거 (끝에 '-' 추가)
kubectl taint nodes node-name key-

# 예시
kubectl taint nodes node1 gpu=true:NoSchedule
kubectl taint nodes node2 dedicated=special:NoExecute
```

### Taint Effect (효과) 종류

| Effect | 설명 |
|--------|------|
| **NoSchedule** | Toleration이 없는 Pod은 Node에 스케줄되지 않음 (기존 Pod은 영향 없음) |
| **NoExecute** | Toleration이 없는 Pod은 스케줄되지 않으며, 기존 Pod도 제거됨 |
| **PreferNoSchedule** | Toleration이 없는 Pod을 피하려고 하지만, 필요하면 스케줄될 수 있음 |

---

## Toleration 설정하기

### Pod에 Toleration 추가

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-tolerating-pod
spec:
  tolerations:
  - key: gpu
    operator: Equal
    value: "true"
    effect: NoSchedule
  containers:
  - name: nginx
    image: nginx
```

### Toleration 필드 설명

```yaml
tolerations:
- key: gpu                    # Taint의 key
  operator: Equal             # 비교 방식 (Equal, Exists)
  value: "true"               # Taint의 value (operator가 Equal일 때만)
  effect: NoSchedule          # Taint의 effect (NoSchedule, NoExecute, PreferNoSchedule)
  tolerationSeconds: 300      # NoExecute일 때, Pod을 견디는 시간(초)
```

---

## Toleration 예제

### 예제 1: 특정 값과 정확히 일치

```yaml
# Node에 taint 설정
# kubectl taint nodes node1 disktype=ssd:NoSchedule

apiVersion: v1
kind: Pod
metadata:
  name: ssd-pod
spec:
  tolerations:
  - key: disktype
    operator: Equal
    value: ssd
    effect: NoSchedule
  containers:
  - name: app
    image: nginx
```

### 예제 2: Key 존재 여부 확인 (Exists)

```yaml
# kubectl taint nodes node1 gpu:NoSchedule

apiVersion: v1
kind: Pod
metadata:
  name: gpu-pod
spec:
  tolerations:
  - key: gpu
    operator: Exists
    effect: NoSchedule
  containers:
  - name: nvidia
    image: nvidia/cuda
```

### 예제 3: NoExecute와 tolerationSeconds

```yaml
# kubectl taint nodes node1 maintenance=true:NoExecute

apiVersion: v1
kind: Pod
metadata:
  name: eviction-tolerating-pod
spec:
  tolerations:
  - key: maintenance
    operator: Equal
    value: "true"
    effect: NoExecute
    tolerationSeconds: 3600  # 1시간 후 제거
  containers:
  - name: app
    image: nginx
```

### 예제 4: 와일드카드 Toleration

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: wildcard-pod
spec:
  tolerations:
  - operator: Exists  # 모든 taint를 용인
    effect: NoSchedule
  containers:
  - name: app
    image: nginx
```

---

## 실제 사용 사례

### 1. GPU 노드 전용 Pod 스케줄링

```bash
# GPU 노드에 taint 설정
kubectl taint nodes gpu-node accelerator=nvidia-tesla:NoSchedule

# Pod에서 taint 용인
tolerations:
- key: accelerator
  operator: Equal
  value: nvidia-tesla
  effect: NoSchedule
```

### 2. 유지보수 중인 노드 격리

```bash
# 유지보수 예정 노드에 taint 설정
kubectl taint nodes maintenance-node maintenance=true:NoExecute

# 중요한 Service만 해당 노드에 배치
tolerations:
- key: maintenance
  operator: Equal
  value: "true"
  effect: NoExecute
  tolerationSeconds: 7200  # 2시간 동안만 견딤
```

### 3. 전용 노드 풀

```bash
# 특정 팀 전용 노드
kubectl taint nodes team-node team=data-science:NoSchedule

# 해당 팀의 Pod들
tolerations:
- key: team
  operator: Equal
  value: data-science
  effect: NoSchedule
```

---

## Taint와 Toleration 동작 원리

```
Node (taint = gpu=true:NoSchedule)
  ├─ Pod A (toleration: gpu=true) ✓ 스케줄 가능
  ├─ Pod B (toleration 없음)      ✗ 스케줄 불가
  └─ Pod C (toleration: cpu=high) ✗ taint와 불일치
```

---

## 주의사항

1. **tolerationSeconds 기본값**: NoExecute effect에서 설정하지 않으면 Pod은 즉시 제거됩니다
2. **operator가 Exists일 때는 value 불필요**: key만으로 매칭합니다
3. **여러 toleration**: 하나라도 일치하면 스케줄 가능합니다
4. **DaemonSet**: 자동으로 모든 taint를 용인하도록 설정됩니다

---

## 비교: NodeSelector vs Affinity vs Toleration

| 방식 | 목적 | Pod이 Node를 선택 |
|------|------|-----------------|
| **NodeSelector** | 간단한 Node 선택 | ✓ |
| **Affinity** | 복잡한 스케줄링 규칙 | ✓ |
| **Toleration** | Node의 제약 조건 허용 | ✗ (Node가 Pod을 필터링) |

---

## 실습: Taint와 Toleration 설정

```bash
# 1. Node에 taint 추가
kubectl taint nodes minikube app=critical:NoSchedule

# 2. Toleration 없는 Pod 배포 - 실패
kubectl run nginx --image=nginx

# 3. Toleration 있는 Pod 배포 - 성공
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: critical-app
spec:
  tolerations:
  - key: app
    operator: Equal
    value: critical
    effect: NoSchedule
  containers:
  - name: nginx
    image: nginx
EOF

# 4. 확인
kubectl get pods
kubectl describe node minikube | grep -A 5 "Taints"
```

---

## 학습 핵심 요약

- ✅ **Toleration**은 Pod이 Node의 **Taint를 견디는** 메커니즘
- ✅ **Taint** 설정 → Pod이 Node를 피함
- ✅ **Toleration** 설정 → Pod이 Node에 배치될 수 있음
- ✅ **NoExecute**는 기존 Pod도 제거하는 강력한 effect
- ✅ GPU, 전용 노드, 유지보수 상황에서 자주 사용됨
