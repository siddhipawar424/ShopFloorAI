import os
from dotenv import load_dotenv
load_dotenv()

from sentence_transformers import SentenceTransformer
import psycopg2
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DB_NAME = os.getenv("CNC_DB_NAME")
DB_USER = os.getenv("CNC_DB_USER")
DB_PASS = os.getenv("CNC_DB_PASSWORD")
DB_HOST = os.getenv("CNC_DB_HOST")
DB_PORT = os.getenv("CNC_DB_PORT", "5432")

if not all([GEMINI_API_KEY, DB_NAME, DB_USER, DB_PASS, DB_HOST]):
    raise ValueError("Missing required .env values. Check GEMINI_API_KEY and DB credentials.")

genai.configure(api_key=GEMINI_API_KEY)

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )

def search_similar(query: str, top_k: int = 3):
    """Retrieve top_k chunks from Postgres using embedding similarity"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        query_embedding = embed_model.encode(query).tolist()
        cur.execute("""
            SELECT id, pdf_name, content
            FROM documents
            ORDER BY embedding <-> %s::vector
            LIMIT %s;
        """, (query_embedding, top_k))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        print("DB error:", e)
        return []

SYSTEM_PROMPT = (
    "You are a CNC machine operation assistant.\n"
    "- You MUST answer questions strictly using the CNC machine operation manuals stored in the database.\n"
    "- Do NOT use general knowledge, assumptions, or external information.\n"
    "- If the required information is not found in the CNC manuals, clearly respond:\n"
    "  'The requested information is not available in the CNC machine operation manuals.'\n"
    "- Keep answers precise, technical, and aligned with machine manuals.\n"
)

MANUAL_SUMMARY = (
    "Knowledge base consists ONLY of CNC machine operation manuals, "
    "including machine startup, shutdown, tooling, offsets, alarms, safety instructions, "
    "maintenance steps, operating parameters, and control panel functions."
)

def generate_answer(query: str, top_k: int = 3):
    retrieved = search_similar(query, top_k)
    context = "\n".join([r[2] for r in retrieved if r[2].strip()])
    filenames = [r[1] for r in retrieved]
    ids = [str(r[0]) for r in retrieved]

    if not context:
        instructions = (
            "- The CNC manuals do NOT contain information to answer this question.\n"
            "- Respond exactly with:\n"
            "  'The requested information is not available in the CNC machine operation manuals.'"
        )
    else:
        instructions = (
            "- Answer strictly using the provided CNC manual extracts.\n"
            "- Do NOT add explanations beyond what is written in the manuals.\n"
            "- If the manual text does not fully answer the question, state clearly that it is not documented.\n"
            "- Use technical terminology exactly as mentioned in the manuals."
        )

    prompt = f"""
{SYSTEM_PROMPT}

CNC Manual Context:
{MANUAL_SUMMARY}

Relevant CNC Manual Extracts:
{context if context else 'None'}

User Question:
{query}

Instructions:
{instructions}
"""

    try:
        gemini_model = genai.GenerativeModel("gemini-2.5-flash-lite")
        resp = gemini_model.generate_content(
            prompt,
            generation_config={"temperature": 0, "top_p": 1, "max_output_tokens": 800}
        )
        answer_text = resp.text.strip()
    except Exception as e:
        print("❌ Gemini API error:", e)
        answer_text = "The requested information is not available in the CNC machine operation manuals."

    return {
        "answer": answer_text,
        "sources": [{"id": i, "filename": f} for i, f in zip(ids, filenames)]
    }

def six_sigma_tool(query: str):
    response = generate_answer(query)
    return {
        "answer": response["answer"],
        "sources": [f"{s['filename']} (ID: {s['id']})" for s in response.get("sources", [])]
    }

def main():
    print("CNC Machine Manual AGNO Playground (Type 'exit' to quit)")
    while True:
        query = input("\nEnter your question: ").strip()
        if query.lower() in ["exit", "quit"]:
            print("Goodbye!")
            break

        response = generate_answer(query)
        print("\nAnswer:\n", response["answer"])
        if response["sources"]:
            print("\nSources:")
            for s in response["sources"]:
                print(f"- {s['filename']} (ID: {s['id']})")

if __name__ == "__main__":
    main()
