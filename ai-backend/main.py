from fastapi import FastAPI
from pydantic import BaseModel
from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
client = OpenAI()

embedding_model = OpenAIEmbeddings(
    model="text-embedding-3-large"
)

vector_db = QdrantVectorStore.from_existing_collection(
    embedding=embedding_model,
    url="http://localhost:6333",
    collection_name="multimodal_collection",
)

# request body
class QueryRequest(BaseModel):
    query: str

# endpoint
@app.post("/query")
def query_docs(req: QueryRequest):

    results = vector_db.similarity_search(req.query, k=5)

    context = "\n\n".join([
        r.page_content for r in results
    ])

    SYSTEM_PROMPT = f"""
    Answer ONLY using the context below.
    If not found, say: Answer not found.

    Context:
    {context}
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": req.query}
        ],
    )

    return {
        "answer": response.choices[0].message.content
    }