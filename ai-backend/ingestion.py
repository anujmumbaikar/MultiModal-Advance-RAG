# ingestion.py

from langchain_qdrant import QdrantVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from dotenv import load_dotenv
from chunking import get_all_chunks

load_dotenv()

embedding_model = OpenAIEmbeddings(
    model="text-embedding-3-large"
)

def prepare_chunks_for_ingestion(chunks):
    processed_chunks = []

    for idx, chunk in enumerate(chunks):
        if not chunk.get("content"):
            print(f"Skipping chunk at index {idx} due to missing content.")
            continue

        processed_chunks.append({
            "content": chunk["content"],
            "content_type": chunk.get("content_type", "text"),
            "page_number": chunk.get("page_number", None),
            "filename": chunk.get("filename", "unknown"),
            "caption": chunk.get("caption", None)
        })

    return processed_chunks


def convert_to_documents(chunks):
    docs = []

    for chunk in chunks:
        docs.append(
            Document(
                page_content=chunk["content"],
                metadata={
                    "type": chunk["content_type"],
                    "filename": chunk["filename"],
                    "page_number": chunk.get("page_number"),
                    "caption": chunk.get("caption")
                }
            )
        )

    return docs


def store_in_qdrant(docs):
    vector_store = QdrantVectorStore.from_documents(
        documents=docs,
        embedding=embedding_model,
        url="http://localhost:6333",
        collection_name="multimodal_collection",
    )
    return vector_store


def ingest_file_to_vector_db(file_path):

    chunks = get_all_chunks(file_path)
    processed_chunks = prepare_chunks_for_ingestion(chunks)
    docs = convert_to_documents(processed_chunks)

    store_in_qdrant(docs)
    print(f"Ingestion completed for file: {file_path}")

    