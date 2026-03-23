# Kubernetes Secret 정리

## 1. Secret YAML의 기본 뼈대

Secret은 민감한 데이터를 저장하는 Kubernetes 리소스로, ConfigMap과 유사하지만 데이터가 base64로 인코딩됩니다. 기본 YAML 구조는 다음과 같습니다:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
data:
  username: dXNlcg==  # base64 encoded 'user'
  password: cGFzcw==  # base64 encoded 'pass'
```

- `apiVersion`: `v1`
- `kind`: `Secret`
- `metadata`: 이름, 네임스페이스 등 메타데이터
- `type`: `Opaque` (기본), `kubernetes.io/tls` (TLS 인증서용) 등
- `data`: base64 인코딩된 키-값 데이터

## 2. Secret 생성법

### 명령어로 생성
```bash
# 리터럴 값으로 생성 (자동 base64 인코딩)
kubectl create secret generic my-secret --from-literal=username=user --from-literal=password=pass
```

### YAML 파일로 생성
```bash
kubectl apply -f secret.yaml
```

## 3. Pod에 Secret 적용 방식

### 각 변수마다 하나씩 적용 (Environment Variables)
Pod의 컨테이너에 개별 환경변수로 Secret의 키를 매핑:

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
    - name: USERNAME
      valueFrom:
        secretKeyRef:
          name: my-secret
          key: username
    - name: PASSWORD
      valueFrom:
        secretKeyRef:
          name: my-secret
          key: password
```

### 파일 전체 적용 (Environment Variables from Secret)
Secret의 모든 키를 환경변수로 적용:

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
    - secretRef:
        name: my-secret
```

### Volume 적용
Secret을 볼륨으로 마운트하여 파일로 접근:

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
    - name: secret-volume
      mountPath: /etc/secret
      readOnly: true
  volumes:
  - name: secret-volume
    secret:
      secretName: my-secret
```

이렇게 하면 `/etc/secret/username`, `/etc/secret/password` 파일로 Secret의 데이터에 접근할 수 있습니다. 파일 권한은 자동으로 0644로 설정됩니다.

## 4. Base64 인코딩 방법

Secret의 `data` 필드에 저장되는 값은 base64로 인코딩되어야 합니다. 직접 인코딩하거나, kubectl이 자동으로 처리할 수 있습니다.

### Linux/macOS에서 수동 인코딩
```bash
echo -n 'my-secret-value' | base64
# 출력: bXktc2VjcmV0LXZhbHVl
```

### 디코딩 (확인용)
```bash
echo 'bXktc2VjcmV0LXZhbHVl' | base64 -d
# 출력: my-secret-value
```

### 파일을 base64로 인코딩
```bash
base64 -i myfile.txt
```

### kubectl로 생성 시 자동 인코딩
`kubectl create secret` 명령어는 `--from-literal` 옵션으로 값을 제공하면 자동으로 base64 인코딩합니다. YAML 파일에 직접 작성할 때는 수동으로 인코딩해야 합니다.

### 예시
```bash
# 'admin' 인코딩
echo -n 'admin' | base64
# dXNlcg==

# 'password123' 인코딩
echo -n 'password123' | base64
# cGFzc3dvcmQxMjM=
```

YAML에서:
```yaml
data:
  username: dXNlcg==
  password: cGFzc3dvcmQxMjM=
```