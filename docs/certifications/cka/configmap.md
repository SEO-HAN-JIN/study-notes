# Kubernetes ConfigMap

## 개요
ConfigMap은 Kubernetes에서 키-값 쌍으로 구성된 데이터를 저장하는 리소스입니다. 애플리케이션의 설정 데이터를 컨테이너 이미지와 분리하여 관리할 수 있습니다. 민감하지 않은 데이터를 저장하며, Secret과 달리 암호화되지 않습니다.

## 주요 특징
- 키-값 데이터 저장
- 환경 변수 또는 파일로 Pod에 주입 가능
- 변경 시 Pod 재시작 필요 (환경 변수의 경우)
- 네임스페이스 범위 리소스

## 생성 방법

### 명령어로 생성
```bash
# 리터럴 값으로 생성
kubectl create configmap my-config --from-literal=key1=value1 --from-literal=key2=value2

# 파일에서 생성
kubectl create configmap my-config --from-file=config.txt

# 디렉터리에서 생성 (파일명이 키, 내용이 값)
kubectl create configmap my-config --from-file=/path/to/directory
```

### YAML 파일로 생성
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  key1: value1
  key2: value2
  config.yaml: |
    apiVersion: v1
    kind: Config
    # ... 설정 내용
```

## 사용 방법

ConfigMap을 Pod에 적용하는 방법은 크게 두 가지입니다: 환경 변수로 주입하거나, 볼륨으로 마운트하여 파일로 제공하는 방식입니다. 각 방법에 대해 자세히 설명하겠습니다.

### 1. 환경 변수로 주입
ConfigMap의 데이터를 Pod의 컨테이너 환경 변수로 직접 주입할 수 있습니다. 이 방법은 간단한 키-값 데이터를 애플리케이션에 전달할 때 유용합니다.

#### 개별 키 참조
특정 키의 값을 하나의 환경 변수로 설정합니다.
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
    - name: DATABASE_URL
      valueFrom:
        configMapKeyRef:
          name: my-config
          key: database_url
    - name: API_KEY
      valueFrom:
        configMapKeyRef:
          name: my-config
          key: api_key
```

- `configMapKeyRef.name`: ConfigMap의 이름
- `configMapKeyRef.key`: ConfigMap 내의 키 이름
- 선택적으로 `optional: true`를 추가하면 키가 존재하지 않아도 Pod 생성이 실패하지 않음

#### 전체 ConfigMap을 환경 변수로 주입
ConfigMap의 모든 키-값 쌍을 환경 변수로 변환합니다. 키 이름이 환경 변수 이름이 됩니다.
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

- `envFrom.configMapRef.name`: ConfigMap의 이름
- 이 방법은 ConfigMap의 모든 데이터를 환경 변수로 노출하므로, 키 이름이 유효한 환경 변수 이름이어야 함

**주의**: 환경 변수를 사용하는 경우, ConfigMap이 변경되어도 기존 Pod의 환경 변수는 업데이트되지 않습니다. Pod를 재시작해야 변경사항이 반영됩니다.

### 2. 볼륨으로 마운트
ConfigMap의 데이터를 파일로 마운트하여 컨테이너 내에서 파일로 접근할 수 있습니다. 이 방법은 설정 파일 전체를 제공하거나, 여러 파일을 한 번에 마운트할 때 유용합니다.

#### 기본 마운트
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
      readOnly: true
  volumes:
  - name: config-volume
    configMap:
      name: my-config
```

- `volumeMounts.mountPath`: 컨테이너 내 마운트 경로
- `volumes.configMap.name`: ConfigMap 이름
- 각 키가 파일명으로, 값이 파일 내용으로 생성됨

#### 특정 키만 마운트
특정 키만 파일로 마운트할 수 있습니다.
```yaml
volumes:
- name: config-volume
  configMap:
    name: my-config
    items:
    - key: config.yaml
      path: app-config.yaml
    - key: log_level
      path: log/level.txt
```

- `items.key`: ConfigMap의 키
- `items.path`: 마운트될 파일 경로 (상대 경로)

#### 권한 설정
마운트된 파일의 권한을 설정할 수 있습니다.
```yaml
volumes:
- name: config-volume
  configMap:
    name: my-config
    defaultMode: 0644  # 8진수 권한
```

**주의**: 볼륨 마운트를 사용하는 경우, ConfigMap 변경 시 마운트된 파일 내용이 자동으로 업데이트됩니다 (kubelet이 주기적으로 동기화). 하지만 애플리케이션이 파일 변경을 감지하여 재로딩해야 할 수 있습니다.

### 적용 시 고려사항
- **네임스페이스**: ConfigMap과 Pod는 같은 네임스페이스에 있어야 함
- **타이밍**: ConfigMap이 Pod보다 먼저 생성되어야 함
- **업데이트**: 환경 변수 방식은 Pod 재시작 필요, 볼륨 방식은 자동 업데이트 가능
- **보안**: 민감한 데이터는 Secret 사용

## 관련 명령어
- 생성: `kubectl create configmap`
- 조회: `kubectl get configmaps`
- 상세 조회: `kubectl describe configmap <name>`
- 삭제: `kubectl delete configmap <name>`
- 편집: `kubectl edit configmap <name>`

## 주의사항
- ConfigMap 데이터는 base64 인코딩되지 않음 (Secret과 차이점)
- 데이터 크기 제한: 1MB
- 변경 시 기존 Pod에는 반영되지 않음 (새 Pod에만 적용)
- 민감한 데이터는 Secret 사용 권장