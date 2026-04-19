# LangChain을 활용한 RAG(Retrieval Augmented Generation) 학습 가이드

## 📚 개요
이 문서는 LangChain을 이용하여 RAG 시스템을 구축하는 과정을 단계별로 정리한 학습 가이드입니다.

---

## 📁 파일 구조 및 학습 순서

### 1️⃣ **1.langchain_llm_test.ipynb** - LangChain 기본 사용법

#### 목표
- LangChain과 OpenAI API의 기본 사용 방법 학습
- 간단한 질문-답변 시스템 구축

#### 주요 코드

```python
# 1. 라이브러리 설치
%pip install langchain-openai python-dotenv

# 2. 환경 변수 로드
from dotenv import load_dotenv
load_dotenv()

# 3. ChatOpenAI 모델 초기화
from langchain_openai import ChatOpenAI
llm = ChatOpenAI()

# 4. 간단한 질문 처리
ai_message = llm.invoke("인프런에 어떤 강의가 있나요?")
print(ai_message.content)
```

#### 학습 포인트
- `ChatOpenAI()`: LLM 모델 초기화
- `invoke()`: LLM에 질문 전달 및 답변 받기
- 간단한 프롬프트 기반 상호작용

---

### 2️⃣ **2.rag_with_chroma_copy.ipynb** - Chroma를 이용한 RAG 기초

#### 목표
- RAG 시스템의 전체 워크플로우 이해
- Chroma 벡터 데이터베이스 활용
- 로컬 벡터 스토어 구축 및 유사도 검색

#### RAG 워크플로우

```
1. 문서 로드 → 2. 문서 분할 → 3. 임베딩 및 벡터 저장 → 4. 유사도 검색 → 5. LLM으로 답변 생성
```

#### 주요 단계별 코드

**Step 1: 문서 로드**
```python
from langchain_community.document_loaders import Docx2txtLoader

loader = Docx2txtLoader('./tax.dotx')
document = loader.load()  # 문서 1개 로드: [Document(...)]
```

**Step 2: 문서 분할 (Text Splitting)**
```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,        # 한 청크의 토큰 수
    chunk_overlap=200,      # 청크 간 겹치는 부분 (검색 정확도 향상)
)

document_list = loader.load_and_split(text_splitter=text_splitter)
# 결과: [Document1, Document2, ..., DocumentN]
```

**Step 3: 임베딩 및 벡터 데이터베이스 생성**
```python
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

embedding = OpenAIEmbeddings(model='text-embedding-3-large')

# 벡터 데이터베이스에 문서 저장
database = Chroma.from_documents(
    documents=document_list,
    embedding=embedding,
    collection_name='chroma_tax',
    persist_directory="./chroma"
)

# 기존 데이터베이스 로드
# database = Chroma(
#     collection_name='chroma_tax',
#     persist_directory="./chroma",
#     embedding_function=embedding
# )
```

**Step 4: 유사도 검색**
```python
query = '연봉 5천만원인 직장인의 소득세는 얼마인가요?'

# 유사도 검색으로 관련 문서 검색
retrieved_docs = database.similarity_search(query, k=3)
# k: 반환할 가장 유사한 문서의 개수
```

**Step 5: 프롬프트 생성 및 LLM 답변**
```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model='gpt-4o')

prompt = f"""[Identity]
- 당신은 최고의 한국 소득세 전문가 입니다.
- [Context]를 참고해서 사용자의 질문에 답변해주세요.

[Context]
{retrieved_docs}

Question: {query}
"""

ai_message = llm.invoke(prompt)
print(ai_message.content)
```

**Step 6: RetrievalQA 체인 (간편한 방법)**
```python
from langchain_classic.chains import RetrievalQA
from langchain_classic import hub

# LangChainHub에서 RAG 프롬프트 템플릿 가져오기
prompt = hub.pull("rlm/rag-prompt")

# RetrievalQA 체인 생성
qa_chain = RetrievalQA.from_chain_type(
    llm,
    retriever=database.as_retriever(),
    chain_type_kwargs={"prompt": prompt}
)

# 질문 처리
result = qa_chain({"query": query})
print(result['result'])
```

#### 핵심 개념

| 개념 | 설명 |
|------|------|
| **Document Loader** | 다양한 형식(PDF, DOCX, TXT 등)의 문서 로드 |
| **Text Splitter** | 긴 문서를 일정 크기(chunk_size)의 청크로 분할 |
| **Embedding** | 텍스트를 고차원 벡터로 변환 |
| **Vector Store** | 임베딩된 문서를 저장하고 검색 |
| **Retriever** | 쿼리와 유사한 문서를 검색 |
| **RAG Chain** | Retriever와 LLM을 결합한 QA 체인 |

#### 주의점
- **토큰 수 문제**: 문서가 길면 LLM에 한 번에 처리 불가능 → 청크 분할 필요
- **검색 정확도**: `chunk_overlap` 활용으로 경계 정보 손실 방지
- **임베딩 모델**: `text-embedding-3-large`는 3072차원 벡터 생성

---

### 3️⃣ **4-0.rag_with_pinecone.ipynb** - Pinecone 벡터 데이터베이스 기초

#### 목표
- 클라우드 기반 Pinecone 벡터 스토어 활용
- Chroma의 로컬 저장 방식과 비교
- 확장성 있는 RAG 시스템 구축

#### 주요 변경사항

**Chroma (로컬)**
```python
from langchain_chroma import Chroma
database = Chroma.from_documents(documents=document_list, embedding=embedding)
```

**Pinecone (클라우드)**
```python
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore

index_name = 'tax-index'
pinecone_api_key = os.environ.get('PINECONE_API_KEY')
pc = Pinecone(api_key=pinecone_api_key)

database = PineconeVectorStore.from_documents(
    document_list, 
    embedding, 
    index_name=index_name
)
```

#### Pinecone의 장점

| 항목 | Chroma (로컬) | Pinecone (클라우드) |
|------|---------------|-------------------|
| **저장소** | 로컬 디렉토리 | 클라우드 서버 |
| **확장성** | 제한적 | 무제한 확장 가능 |
| **성능** | 중소규모 | 대규모 데이터 최적화 |
| **비용** | 무료 | 유료 (무료 tier 존재) |
| **유지보수** | 직접 관리 | 자동 관리 |

#### 사용 패턴

```python
# 쿼리 처리는 동일
retrieved_docs = database.similarity_search(query, k=3)
retriever = database.as_retriever()
```

---

### 4️⃣ **4-1.rag_with_pinecone.ipynb** - 테이블 포함 문서 처리

#### 목표
- 구조화된 데이터(테이블)를 포함한 문서의 효과적인 처리
- 개선된 Retrieval 입도(granularity) 조정
- 더 정확한 검색 결과 획득

#### 주요 변경사항

**문서 변경**
```python
# 4-0: ./tax.dotx (일반 문서)
# 4-1: ./tax_with_table.docx (테이블 포함 문서)

loader = Docx2txtLoader('./tax_with_table.docx')
document_list = loader.load_and_split(text_splitter=text_splitter)
```

**Pinecone 인덱스 변경**
```python
# 4-0: 'tax-index'
# 4-1: 'tax-table-index'
index_name = 'tax-table-index'
```

#### 개선점

1. **테이블 구조 유지**: 행(row)과 열(column) 정보 보존
2. **청크 단위 최적화**: 테이블 분할 방식 고려
3. **메타데이터 활용**: 테이블 위치 정보 저장

#### 처리 예시

```
원본 문서: tax_with_table.docx
    ├─ 텍스트 부분 1
    ├─ [소득세율 테이블]
    ├─ 텍스트 부분 2
    └─ [공제액 테이블]

분할 결과:
    ├─ Document 1: "텍스트 부분 1"
    ├─ Document 2: "소득세율 테이블 + 관련 설명"
    ├─ Document 3: "텍스트 부분 2"
    └─ Document 4: "공제액 테이블 + 관련 설명"
```

---

### 5️⃣ **4-2.rag_with_pinecone.ipynb** - 고급 Retrieval 최적화 (키워드 사전)

#### 목표
- Retrieval 효율 개선을 위한 데이터 전처리
- 키워드 사전을 활용한 검색 정확도 향상
- 마크다운 형식의 구조화된 문서 활용

#### 주요 특징

**문서 전처리 (마크다운 형식)**
```python
# 4-1: ./tax_with_table.docx (테이블)
# 4-2: ./tax_with_markdown.docx (마크다운 형식)

loader = Docx2txtLoader('./tax_with_markdown.docx')
document_list = loader.load_and_split(text_splitter=text_splitter)

# 마크다운 예시: 
# # 소득세 계산 방법
# ## 기본 공제
# - 기본공제: 1,500,000원
# - 배우자 추가공제: 1,500,000원
# ### 소득공제 대상
# - 국민연금: 10%
```

**Pinecone 인덱스 설정 (차원 명시)**
```python
from pinecone import ServerlessSpec

index_name = 'tax-markdown-index'
pc = Pinecone(api_key=pinecone_api_key)

# 기존 인덱스 삭제 (차원 불일치 방지)
if index_name in [idx.name for idx in pc.list_indexes()]:
    pc.delete_index(index_name)

# 인덱스 생성
pc.create_index(
    name=index_name,
    dimension=3072,  # text-embedding-3-large 차원
    metric='cosine',
    spec=ServerlessSpec(cloud='aws', region='us-east-1')
)

database = PineconeVectorStore.from_documents(
    document_list, 
    embedding, 
    index_name=index_name
)
```

#### 키워드 사전 활용

**개념**: 도메인 특화 키워드를 수동으로 정의하여 검색 질의를 강화

```python
# 예시: 세금 관련 키워드 사전
keyword_dict = {
    '소득세': ['소득세율', '과세표준', '산출세액', '세액공제'],
    '공제': ['기본공제', '인적공제', '소득공제', '세액공제'],
    '연봉': ['급여', '임금', '근로소득', '연간 소득'],
    '거주자': ['국내 거주', '주소 있는 자', '183일 규칙'],
}

# 사용 예시
if '소득세' in query:
    # 소득세 관련 문서 검색 강화
    query = query + " " + " ".join(keyword_dict['소득세'])
```

#### 마크다운 형식의 장점

| 항목 | 비구조화 텍스트 | 마크다운 형식 |
|------|----------------|-------------|
| **계층 구조** | 불명확 | 헤딩으로 명확화 |
| **검색 정확도** | 낮음 | 높음 |
| **메타데이터** | 없음 | 제목, 레벨로 활용 가능 |
| **재사용성** | 어려움 | 용이 |
| **유지보수** | 어려움 | 용이 |

---

## 🔄 RAG 파이프라인 비교

```
┌─────────────────────────────────────────────────────────┐
│                     1. LangChain 기본                     │
├─────────────────────────────────────────────────────────┤
│ 간단한 LLM 호출 → 기본적인 Q&A                            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 2. Chroma + RAG 기초                      │
├─────────────────────────────────────────────────────────┤
│ 문서 로드                                                 │
│ ↓                                                        │
│ 문서 분할 (chunk_size=1500, overlap=200)                 │
│ ↓                                                        │
│ 임베딩 (text-embedding-3-large)                          │
│ ↓                                                        │
│ Chroma DB (로컬 저장)                                     │
│ ↓                                                        │
│ 유사도 검색 (similarity_search)                           │
│ ↓                                                        │
│ LLM + 프롬프트 → 최종 답변                                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              3. Pinecone + 기본 문서 처리                 │
├─────────────────────────────────────────────────────────┤
│ Chroma → Pinecone (클라우드 벡터 스토어)                  │
│ 확장성 향상, 비용 증가                                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│           4. Pinecone + 테이블 포함 문서                  │
├─────────────────────────────────────────────────────────┤
│ 구조화된 데이터(테이블) 처리 개선                         │
│ 청크 단위 최적화                                          │
│ 검색 정확도 향상                                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│      5. Pinecone + 마크다운 전처리 + 키워드 사전          │
├─────────────────────────────────────────────────────────┤
│ 마크다운 형식으로 계층 구조 명확화                        │
│ 키워드 사전 활용으로 검색 강화                            │
│ 최동 수준의 Retrieval 최적화                              │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 핵심 파라미터 튜닝 가이드

### 1. Text Splitting

```python
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,      # 값 조정 가이드:
                          # - 작음(500-1000): 정확한 검색, 많은 청크, 느린 처리
                          # - 중간(1500-2000): 균형잡힌 성능
                          # - 큼(3000-5000): 빠른 처리, 낮은 검색 정확도
    chunk_overlap=200,    # 값 조정 가이드:
                          # - 없음(0): 빠른 처리, 경계 정보 손실
                          # - 작음(100-200): 권장
                          # - 큼(300-500): 높은 정확도, 중복 처리
)
```

### 2. Similarity Search

```python
retrieved_docs = database.similarity_search(
    query,
    k=3  # 값 조정 가이드:
         # - k=1: 가장 관련성 높은 문서만
         # - k=3~5: 권장 (다양한 관점 확보)
         # - k=10+: 광범위 검색, 노이즈 증가
)
```

### 3. Embedding Model

```python
embedding = OpenAIEmbeddings(
    model='text-embedding-3-large'  # 고급 모델
    # model='text-embedding-3-small'  # 빠른 처리, 낮은 비용
)
# 모델별 특성:
# - text-embedding-3-small: 512차원, 빠름, 저비용
# - text-embedding-3-large: 3072차원, 정확함, 고비용
```

---

## 🚀 실전 팁

### 1. 문서 전처리 체크리스트
- [ ] 불필요한 공백/줄바꿈 제거
- [ ] 특수 문자 정제
- [ ] 테이블/이미지 텍스트화
- [ ] 마크다운 형식으로 계층 구조 표현
- [ ] 개체명 정규화 (약자 → 전문용어)

### 2. 검색 결과 검증
```python
# 검색된 문서 확인
for i, doc in enumerate(retrieved_docs):
    print(f"Document {i}:")
    print(f"Content: {doc.page_content[:200]}...")
    print(f"Metadata: {doc.metadata}\n")
```

### 3. 성능 모니터링
```python
import time

# 검색 시간 측정
start = time.time()
docs = database.similarity_search(query, k=3)
search_time = time.time() - start

# LLM 응답 시간 측정
start = time.time()
response = llm.invoke(prompt)
llm_time = time.time() - start

print(f"Search Time: {search_time:.2f}s")
print(f"LLM Time: {llm_time:.2f}s")
```

### 4. 환경 변수 관리
```bash
# .env 파일
OPENAI_API_KEY=sk-xxx...
PINECONE_API_KEY=xxx...
```

---

## 📚 학습 로드맵

```
Week 1: 파일 1-3 (LangChain 기초 + Chroma 기초)
  └─ 목표: RAG의 기본 개념 이해

Week 2: 파일 4-0 (Pinecone 기초)
  └─ 목표: 클라우드 벡터 스토어 활용

Week 3: 파일 4-1 (테이블 처리)
  └─ 목표: 구조화된 데이터 처리

Week 4: 파일 4-2 (고급 최적화)
  └─ 목표: Retrieval 효율 최대화
  └─ 추가학습: 키워드 사전 활용, 마크다운 전처리
```

---

## ⚠️ 주의사항 및 문제해결

### 1. 임베딩 차원 불일치
```
❌ 에러: "Vector dimension mismatch"
✅ 해결: Pinecone 인덱스 삭제 후 재생성
      pc.delete_index('index-name')
```

### 2. API 토큰 초과
```
❌ 에러: "Token limit exceeded"
✅ 해결: chunk_size 감소 또는 retrieved_docs 개수 줄이기
```

### 3. 검색 결과 정확도 낮음
```
❌ 원인: 문서 전처리 부족, chunk_overlap 부족
✅ 해결: 마크다운 형식 + 키워드 사전 활용
```

---

## 🎯 다음 단계

1. **RAG 평가 지표**: BLEU, ROUGE, F1-score 측정
2. **다중 소스 통합**: 여러 문서 소스 결합
3. **메타데이터 필터링**: 검색 범위 제한
4. **프롬프트 최적화**: Few-shot learning, Chain-of-Thought
5. **재정렬(Re-ranking)**: 초기 검색 결과 재정렬
6. **하이브리드 검색**: 키워드 + 벡터 검색 결합

---

## 📖 참고 자료

- [LangChain 공식 문서](https://python.langchain.com)
- [Pinecone 문서](https://docs.pinecone.io)
- [OpenAI Embedding Models](https://platform.openai.com/docs/guides/embeddings)
- [RAG 최적화 가이드](https://lilianweng.github.io/posts/2024-01-25-rag-digging-deeper/)

---

**마지막 업데이트**: 2026년 4월 13일
