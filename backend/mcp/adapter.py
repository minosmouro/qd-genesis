import os
import hashlib
import math
import uuid
import requests
import time
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

QDRANT_URL = os.getenv('QDRANT_URL', 'http://qdrant:6333')
DEFAULT_DIM = int(os.getenv('MCP_VECTOR_DIM', '128'))
OPENAI_PROVIDER = os.getenv('MCP_EMBEDDING_PROVIDER', 'pseudo').lower()
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')

# requests session with retries for external provider calls
_session = requests.Session()
_retries = Retry(total=3, backoff_factor=0.5, status_forcelist=(429, 500, 502, 503, 504))
_session.mount('https://', HTTPAdapter(max_retries=_retries))


def text_to_vector(text: str, dim: int = DEFAULT_DIM):
    """Deterministic pseudo-embedding for prototype purposes.
    Not a real model — replace with real embeddings provider later.
    """
    h = hashlib.sha256(text.encode('utf-8')).digest()
    # expand hash to floats
    vec = []
    i = 0
    while len(vec) < dim:
        # create 4-byte chunk -> int -> float
        chunk = h[i % len(h): (i % len(h)) + 4]
        if len(chunk) < 4:
            chunk = chunk.ljust(4, b"\0")
        val = int.from_bytes(chunk, 'big')
        # map to [-1,1]
        f = (val % 1000000) / 1000000.0
        vec.append(f)
        i += 4
    # normalize
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    vec = [x / norm for x in vec]
    return vec


def provider_embedding(text: str, dim: int = DEFAULT_DIM):
    if OPENAI_PROVIDER == 'openai':
        if not OPENAI_API_KEY:
            raise RuntimeError('OPENAI_API_KEY not set')
        # lazy import to avoid requiring openai at import time for pseudo mode
        import openai
        openai.api_key = OPENAI_API_KEY
        for _ in range(3):
            try:
                resp = openai.Embedding.create(model=OPENAI_MODEL, input=text)
                vec = resp['data'][0]['embedding']
                return vec
            except Exception as e:
                last = e
                time.sleep(0.5)
        raise RuntimeError(f'OpenAI embedding failed: {last}')
    # fallback to deterministic pseudo-embedding
    return text_to_vector(text, dim)


class MCPAdapter:
    def __init__(self, url: str = QDRANT_URL, collection_prefix: str = 'mcp'):
        self.client = QdrantClient(url=url)
        self.collection_prefix = collection_prefix

    def _collection_name(self, tenant_id: int):
        return f"{self.collection_prefix}_tenant_{tenant_id}"

    def ensure_collection(self, tenant_id: int, dim: int = DEFAULT_DIM):
        name = self._collection_name(tenant_id)
        try:
            self.client.get_collection(name)
        except Exception:
            # create collection if it does not exist (don't recreate to avoid data loss)
            self.client.create_collection(
                collection_name=name,
                vectors_config=qmodels.VectorParams(size=dim, distance=qmodels.Distance.COSINE),
            )
        return name

    def _normalize_point_id(self, point_id: str):
        """Return int or uuid.UUID for point id, otherwise raise ValueError."""
        if point_id is None:
            raise ValueError('point_id is required')
        # if already int
        if isinstance(point_id, int):
            return point_id
        # try int
        try:
            return int(point_id)
        except Exception:
            pass
        # try UUID
        try:
            return uuid.UUID(str(point_id))
        except Exception:
            raise ValueError('point id must be an unsigned integer or a UUID')

    def upsert(self, tenant_id: int, point_id: str, text: str, metadata: dict = None):
        name = self.ensure_collection(tenant_id)
        # choose provider embedding
        if OPENAI_PROVIDER in ('openai',):
            vector = provider_embedding(text, dim=DEFAULT_DIM)
        else:
            vector = text_to_vector(text)
        payload = metadata or {}
        # normalize id
        nid = self._normalize_point_id(point_id)
        try:
            self.client.upsert(
                collection_name=name,
                points=[qmodels.PointStruct(id=nid, vector=vector, payload=payload)],
            )
        except Exception as e:
            # raise a clear error for callers
            raise RuntimeError(f'Unexpected Response: {getattr(e, "args", e)}')
        return True

    def search(self, tenant_id: int, query: str, top_k: int = 5):
        name = self.ensure_collection(tenant_id)
        if OPENAI_PROVIDER in ('openai',):
            vector = provider_embedding(query, dim=DEFAULT_DIM)
        else:
            vector = text_to_vector(query)
        hits = self.client.search(collection_name=name, query_vector=vector, limit=top_k)
        # convert hits to simple dicts
        results = []
        for h in hits:
            results.append({
                'id': h.id,
                'score': h.score,
                'payload': h.payload,
            })
        return results
