from fastapi import FastAPI
from pydantic import BaseModel
import uuid
import time
import psycopg2
import json

from agentTeam.observer import observer_agent

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    session_id: str = None
    user_id: str = "user_1"


def parse_session_data(raw_data):
    if isinstance(raw_data, dict):
        return raw_data
    if isinstance(raw_data, str):
        try:
            return json.loads(raw_data)
        except json.JSONDecodeError:
            return {}
    return {}


def get_db_connection():
    return psycopg2.connect(
        dbname="observer",
        user="postgres",
        password="eesha12345",
        host="localhost",
        port="5432"
    )

def save_to_db(session_id, user_id, user_message, response_text):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT session_data FROM observer_sessions WHERE session_id = %s;",
            (session_id,),
        )
        row = cur.fetchone()
        existing = parse_session_data(row[0]) if row else {}
        messages = existing.get("messages", [])

        if not messages and existing.get("user_message"):
            messages = [
                {
                    "user_message": existing.get("user_message"),
                    "response": existing.get("response"),
                }
            ]

        messages.append(
            {"user_message": user_message, "response": response_text}
        )

        cur.execute("""
        INSERT INTO observer_sessions 
        (session_id, user_id, session_data, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (session_id) DO UPDATE
        SET session_data = EXCLUDED.session_data,
            updated_at = EXCLUDED.updated_at;
        """, (
            session_id,
            user_id,
            json.dumps({"messages": messages, "title": user_message}),
            int(time.time()),
            int(time.time())
        ))

        conn.commit()

    except Exception as e:
        print("DB ERROR:", e)

    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        session_id = request.session_id or str(uuid.uuid4())
        response = observer_agent.run(
            request.message,
            session_id=session_id,
            user_id=request.user_id
        )
        if hasattr(response, "content") and response.content:
            final_output = response.content
        elif hasattr(response, "messages") and response.messages:
            final_output = response.messages[-1].content
        else:
            final_output = str(response)
        save_to_db(
            session_id,
            request.user_id,
            request.message,
            final_output
        )
        return {
            "content": final_output,
            "session_id": session_id,
            "agent_id": "observer_agent",
            "timestamp": int(time.time())
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT session_id, user_id, session_data, created_at, updated_at
            FROM observer_sessions
            WHERE session_id = %s;
        """, (session_id,))

        row = cur.fetchone()

        if not row:
            return {"message": "Session not found"}

        session_data = parse_session_data(row[2])

        return {
            "session_id": row[0],
            "user_id": row[1],
            "session_data": session_data,
            "created_at": row[3],
            "updated_at": row[4]
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

@app.get("/sessions")
def get_all_sessions():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT session_id, user_id, session_data, updated_at
            FROM observer_sessions
            ORDER BY updated_at DESC;
        """)

        rows = cur.fetchall()

        sessions = []
        for row in rows:
            session_data = parse_session_data(row[2])
            title = session_data.get("title")
            if not title:
                messages = session_data.get("messages", [])
                if messages:
                    title = messages[0].get("user_message", "New Chat")
                else:
                    title = session_data.get("user_message", "New Chat")

            sessions.append({
                "session_id": row[0],
                "user_id": row[1],
                "title": title,
                "created_at": row[3],
                "updated_at": row[3]
            })

        return sessions

    except Exception as e:
        return {"error": str(e)}

    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()



@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    try:
        conn = get_db_connection()

        cur = conn.cursor()

        cur.execute("""
            DELETE FROM observer_sessions
            WHERE session_id = %s;
        """, (session_id,))

        conn.commit()

        return {"message": "Session deleted"}

    except Exception as e:
        return {"error": str(e)}

    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

            