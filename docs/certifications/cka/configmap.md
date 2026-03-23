# ConfigMap 정리

## 1. ConfigMap YAML의 기본 뼈대

ConfigMap은 키-값 쌍으로 데이터를 저장하는 Kubernetes 리소스입니다. 기본 YAML 구조는 다음과 같습니다:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  key1: value1
  key2: value2
```

- `apiVersion`: `v1`
- `kind`: `ConfigMap`
- `metadata`: 이름, 네임스페이스 등 메타데이터
- `data`: 키-값 데이터.

## 2. ConfigMap 생성법

### 명령어로 생성
```bash
# 리터럴 값으로 생성
kubectl create configmap my-config --from-literal=key1=value1 --from-literal=key2=value2
```

### YAML 파일로 생성
```bash
kubectl apply -f configmap.yaml
```

## 3. Pod에 ConfigMap 적용 방식

### 각 변수마다 하나씩 적용 (Environment Variables)
Pod의 컨테이너에 개별 환경변수로 ConfigMap의 키를 매핑:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: my-container
    image: nginx
    env:
    - name: ENV_VAR1
      valueFrom:
        configMapKeyRef:
          name: my-config
          key: key1
    - name: ENV_VAR2
      valueFrom:
        configMapKeyRef:
          name: my-config
          key: key2
```

### 파일 전체 적용 (Environment Variables from ConfigMap)
ConfigMap의 모든 키를 환경변수로 적용:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: my-container
    image: nginx
    envFrom:
    - configMapRef:
        name: my-config
```

### Volume 적용
ConfigMap을 볼륨으로 마운트하여 파일로 접근:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: my-container
    image: nginx
    volumeMounts:
    - name: config-volume
      mountPath: /etc/config
  volumes:
  - name: config-volume
    configMap:
      name: my-config
```

이렇게 하면 `/etc/config/key1`, `/etc/config/key2` 파일로 ConfigMap의 데이터에 접근할 수 있습니다.