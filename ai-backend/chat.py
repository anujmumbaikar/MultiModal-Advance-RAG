from ingestion import ingest_file_to_vector_db
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

embedding_model = OpenAIEmbeddings(
    model="text-embedding-3-large"
)

if __name__ == "__main__":
    #step1:ingesting file to vector database
    project_id = "default"  # this is just for testing
    ingest_file_to_vector_db("./files/OLAP_and_OLTP.pdf", project_id)

    #step2:querying the vector database and generating response using LLM
    collection_name = f"project_{project_id}"
    vector_db = QdrantVectorStore.from_existing_collection(
        embedding=embedding_model,
        url="http://localhost:6333",
        collection_name=collection_name,
    )
    while True:
        query = input(">> query: ")

        search_results = vector_db.similarity_search(query, k=6)

        context = "\n\n\n".join([
            f"""
        Page Content:
        {res.page_content}

        Metadata:
        Type: {res.metadata.get("type")}
        Filename: {res.metadata.get("filename")}
        Caption: {res.metadata.get("caption")}
        Page Number:{res.metadata.get("page_number")}

        """
            for res in search_results
        ])

        SYSTEM_PROMPT = f"""
            You are a context-aware AI assistant for document understanding.

            The context may include text, tables, and image descriptions.

            Guidelines:
            - Use only the provided context to answer
            - If the context includes tables, summarize key insights
            - If the context includes image descriptions, explain them clearly
            - Do not hallucinate or add external knowledge
            - If answer is missing, say: "Answer not found in the document"

            Answer clearly and in a structured way.

            Context:
            {context}
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": query,
                }
            ],
        )

        print("\n---\n")
        print(response.choices[0].message.content)