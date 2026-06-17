import os
import re
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date
from decimal import Decimal
from dotenv import load_dotenv
from fuzzywuzzy import process

import google.generativeai as genai
from google.genai import Client

load_dotenv()
DB_HOST = os.getenv("CSV_DB_HOST")
DB_NAME = os.getenv("CSV_DB_NAME")
DB_USER = os.getenv("CSV_DB_USER")
DB_PASSWORD = os.getenv("CSV_DB_PASSWORD")
DB_PORT = int(os.getenv("CSV_DB_PORT", 5432))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not all([DB_HOST, DB_NAME, DB_USER, DB_PASSWORD]):
    raise ValueError("Missing DB credentials in .env file")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_client = Client(api_key=GEMINI_API_KEY)
    gemini_available = True
else:
    print("GEMINI_API_KEY not found. Gemini features disabled.")
    gemini_available = False

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

def sanitize_alias(alias: str) -> str:
    alias = re.sub(r'[^a-zA-Z0-9_]', '_', alias)
    if re.match(r'^\d', alias):  # prevent "AS 11"
        alias = f"col_{alias}"
    return alias

def normalize_date(date_str: str) -> str:
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return date_str 

def generate_sql(user_prompt, table_name="ft_oee_analysis"):
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

Rules:
1. Use -> for JSON objects, ->> for scalar values.
2. Cast numbers where aggregation is applied.
3. If the request mentions a JSON key (like oee), return the full JSON object, not just mean.
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

    sql_text = re.sub(
        r"jsonb_array_elements\(([^)]+)\)",
        r"jsonb_array_elements((\1)::jsonb)",
        sql_text
    )
        
    return sql_text

def execute_sql(query):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return rows
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return None

def format_results(rows):
    if not rows:
        return {"message": "o results found."}
    return json.loads(json.dumps(rows, default=json_serializer, indent=2))

def oee_tool(user_prompt: str):
    """
    Fully dynamic, natural-language oee_tool tool.
    - Understands any NL query about tenants, machines, departments, trend, OEE stats, etc.
    - Returns results in a consistent terminal-style format, independent of query phrasing.
    - Works with multiple rows and nested JSON dynamically.
    """
    try:
        normalized_query = user_prompt.strip()

        sql_query = generate_sql(normalized_query)

        rows = execute_sql(sql_query)

        if not rows:
            return ("I am sorry, but I cannot fulfill this request. "
                    "There is no data available for the specified criteria.")

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
                else:
                    output_lines.append(f"{prefix}{key}: {value}")

            for col, val in row.items():
                process_value(col, val)

            output_lines.append("")  

        return "\n".join(output_lines)

    except Exception as e:
        return f"Error: {str(e)}"

def search_query(user_query, top_k=3):
    """Return top-k rows and fields for the user query."""
    sql = generate_sql(user_query)
    rows = execute_sql(sql)
    fields = list(rows[0].keys()) if rows else []
    return rows[:top_k] if rows else [], fields

def generate_answer(user_query, results, fields):
    """Return formatted answer for MCP usage."""
    if not results:
        return "No results found."
    return format_results(results)

def main():
    print("CNC Semantic + Dynamic SQL Agent (Type 'exit' to quit)\n")
    while True:
        user_query = input("Enter your query: ").strip()
        if user_query.lower() == "exit":
            print("Goodbye!")
            break

        try:
            if gemini_available:
                sql_query = generate_sql(user_query)
                print(f"\n🔹 Generated SQL:\n{sql_query}\n")
                results = execute_sql(sql_query)
            else:
                print("Gemini not available. No SQL generated.")
                results = None

            print("Answer:\n")
            print(json.dumps(format_results(results), indent=2))
            print("\n")
        except Exception as e:
            print(f"Error: {e}\n")

if __name__ == "__main__":
    main()

