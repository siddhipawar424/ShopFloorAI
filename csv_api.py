import os
import re
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
from decimal import Decimal
from dotenv import load_dotenv
import jwt
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional

import google.generativeai as genai
from google.genai import Client

load_dotenv()
DB_HOST = os.getenv("CSV_DB_HOST") or os.getenv("DB_HOST")
DB_NAME = os.getenv("CSV_DB_NAME") or os.getenv("DB_NAME")
DB_USER = os.getenv("CSV_DB_USER") or os.getenv("DB_USER")
DB_PASSWORD = os.getenv("CSV_DB_PASSWORD") or os.getenv("DB_PASSWORD")
DB_PORT = int(os.getenv("CSV_DB_PORT", 5432))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not all([DB_HOST, DB_NAME, DB_USER, DB_PASSWORD]):
    raise ValueError(":x: Missing DB credentials in .env file")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_client = Client(api_key=GEMINI_API_KEY)
    gemini_available = True
else:
    print(":warning: GEMINI_API_KEY not found. Gemini features disabled.")
    gemini_available = False

app = FastAPI(title="CNC Semantic + Dynamic SQL API")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )

def json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)

def decodeJwt(token):
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        claims = decoded.get("https://hasura.io/jwt/claims", {})
        return {
            "user_id": claims.get("x-hasura-user-id"),
            "V2tenant": claims.get("x-hasura-tenant-id"),
            "role": claims.get("x-hasura-default-role")
        }
    except Exception:
        return None

def get_table_columns(table_name="ft_oee_analysis"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = '{table_name.split('.')[-1]}'
    """)
    cols = {row[0]: row[1] for row in cursor.fetchall()}
    cursor.close()
    conn.close()
    return cols

def get_sample_row(table_name="ft_oee_analysis"):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row if row else {}

def extract_json_paths(data, prefix=""):
    paths = {}
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}->{k}" if prefix else k
            if isinstance(v, dict):
                paths.update(extract_json_paths(v, full_key))
            elif isinstance(v, list) and v:
                if isinstance(v[0], dict):
                    paths.update(extract_json_paths(v[0], f"{full_key}[0]"))
                else:
                    paths[full_key] = f"array[{type(v[0]).__name__}]"
            else:
                paths[full_key] = type(v).__name__
    return paths

def normalize_date(date_str: str) -> str:
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str

def generate_sql(user_prompt, table_name="ft_oee_analysis", v2tenant=None):
    columns = get_table_columns(table_name)
    sample_row = get_sample_row(table_name)
    json_paths = {
        col: extract_json_paths(sample_row[col])
        for col, dtype in columns.items()
        if dtype in ("json", "jsonb") and sample_row.get(col)
    }
    system_prompt = f"""
You are a PostgreSQL expert. Generate SQL for table '{table_name}'.
Columns: {', '.join(columns.keys())}
Detected JSON structure: {json.dumps(json_paths, indent=2)}
User request: {user_prompt}
V2tenant: {v2tenant}

Rules:
1. Use -> for JSON objects, ->> for scalar values.
2. Cast numbers where aggregation is applied.
3. If the request mentions a JSON key, return full JSON object.
4. Always alias extracted JSON fields with valid names (use col_ prefix if numeric).
5. Convert dates into 'YYYY-MM-DD' automatically.
6. Output ONLY the SQL query.
"""
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=system_prompt
    )
    sql_text = re.sub(r"```(?:sql)?", "", response.text.strip()).strip()
    sql_text = re.sub(r"AS\s+\"?(\d+)\"?", lambda m: f"AS col_{m.group(1)}", sql_text)
    sql_text = re.sub(r"'(\d{1,2}[-/]\d{1,2}[-/]\d{4})'",
                      lambda m: f"'{normalize_date(m.group(1))}'",
                      sql_text)
    sql_text = re.sub(r"jsonb_array_elements\(([^)]+)\)", r"jsonb_array_elements((\1)::jsonb)", sql_text)
    return sql_text

def execute_sql(query):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def format_results(rows):
    if not rows:
        return {"message": ":warning: No results found."}
    return json.loads(json.dumps(rows, default=json_serializer, indent=2))

DEFAULT_JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWQiOiIyNGYxOTRmOC0xMWFhLTRhNTgtYTJhMC1mYjQxMWQ2ODMzNzEiLCJuYW1lIjoiNzA2NjQzMjExMCIsImFkbWluIjoidHJ1ZSIsInJvbGUiOiJhZG1pbiIsImh0dHBzOi8vaGFzdXJhLmlvL2p3dC9jbGFpbXMiOnsieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoidXNlciIsIngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsic3VwZXItYWRtaW4iLCJ1c2VyIiwiYWRtaW4iLCJvcGVyYXRvciIsInF1YWxpdHkiLCJtYWludGVuYW5jZSJdLCJ4LWhhc3VyYS11c2VyLWlkIjoiMjRmMTk0ZjgtMTFhYS00YTU4LWEyYTAtZmI0MTFkNjgzMzcxIiwieC1oYXN1cmEtdGVuYW50LWlkIjoiZWM4ZTY2NDktZTgxMy00MGEwLWJjNmUtZmQyYmEyZDgzZjMwIiwieC1oYXN1cmEtY3VzdG9tIjoiY3VzdG9tLXZhbHVlIn0sImlhdCI6MTc1ODE3MjE3NiwiZXhwIjoxNzU4Nzc2OTc2fQ.YkcRyd8RJoxKize5Yn1rZ-_BmkUOPlZfW6pmDyXIOp0"

def oee_tool(user_prompt: str, jwt_token: str = None):
    """
    Fully dynamic terminal-style OEE tool.
    - Works with any table or nested JSON.
    - Dynamically displays all fields from the query.
    - No hardcoding of column names.
    """
    try:
        token_to_use = jwt_token or DEFAULT_JWT_TOKEN
        v2tenant = None
        if token_to_use:
            decoded_user = decodeJwt(token_to_use)
            if decoded_user:
                v2tenant = decoded_user.get("V2tenant")

        normalized_query = user_prompt.strip()

        sql_query = generate_sql(normalized_query, v2tenant=v2tenant)
        rows = execute_sql(sql_query)

        if not rows:
            return ("No data available for the specified criteria.")

        output_lines = []

        for idx, row in enumerate(rows, 1):
            if len(rows) > 1:
                output_lines.append(f"--- Result {idx} ---")

            def process_value(key, value, indent=0):
                prefix = "  " * indent
                if isinstance(value, dict):
                    output_lines.append(f"{prefix}{key}:")
                    for sub_key, sub_val in value.items():
                        process_value(sub_key, sub_val, indent + 1)
                elif isinstance(value, list):
                    if all(isinstance(i, dict) for i in value):
                        output_lines.append(f"{prefix}{key}:")
                        for i, item in enumerate(value, 1):
                            output_lines.append(f"{prefix}  - Item {i}:")
                            for k, v in item.items():
                                process_value(k, v, indent + 2)
                    else:
                        output_lines.append(f"{prefix}{key}: {value}")
                elif isinstance(value, float):
                    output_lines.append(f"{prefix}{key}: {round(value, 4)}")
                elif isinstance(value, Decimal):
                    output_lines.append(f"{prefix}{key}: {float(value)}")
                elif isinstance(value, (datetime, date)):
                    output_lines.append(f"{prefix}{key}: {value.isoformat()}")
                else:
                    output_lines.append(f"{prefix}{key}: {value}")

            for col, val in row.items():
                process_value(col, val)

            output_lines.append("")

        return "\n".join(output_lines)

    except Exception as e:
        return f"Error: {str(e)}"
        
class QueryRequest(BaseModel):
    query: str

@app.post("/query")
async def query_endpoint(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")

    jwt_token = auth_header.split(" ")[1]
    decoded_user = decodeJwt(jwt_token)
    if not decoded_user:
        raise HTTPException(status_code=401, detail="Invalid JWT token")

    v2tenant = decoded_user.get("V2tenant")
    body = await req.json()
    user_query = body.get("query")
    if not user_query:
        raise HTTPException(status_code=400, detail="Query is required")

    if not gemini_available:
        raise HTTPException(status_code=500, detail="Gemini not available")
    sql_query = generate_sql(user_query, v2tenant=v2tenant)
    results = execute_sql(sql_query)

    return {
        "decoded_user": decoded_user,

        "results": format_results(results)
    }

    