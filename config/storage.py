# config/storage.py
from agno.storage.postgres import PostgresStorage

postgres_storage = PostgresStorage(
    db_url="postgresql://postgres:eesha12345@localhost:5432/observer",
    table_name="observer_sessions",
)