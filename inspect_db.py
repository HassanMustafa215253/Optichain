import argparse
import json
import os
from sqlalchemy import create_engine, inspect, text

DEFAULT_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://curr_user:hassan@localhost/company4",
)


def dump_database(engine, include_data: bool, limit: int | None):
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    output = {}

    with engine.connect() as connection:
        for table in tables:
            columns = inspector.get_columns(table)
            table_info = {
                "columns": [
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col["nullable"],
                    }
                    for col in columns
                ]
            }

            if include_data:
                limit_clause = "" if limit is None else f" LIMIT {limit}"
                rows = connection.execute(
                    text(f'SELECT * FROM "{table}"{limit_clause}')
                ).mappings().all()
                table_info["rows"] = [dict(row) for row in rows]

            output[table] = table_info

    return output


def main():
    parser = argparse.ArgumentParser(
        description="Inspect database tables and optionally dump rows."
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_DATABASE_URL,
        help="SQLAlchemy database URL.",
    )
    parser.add_argument(
        "--include-data",
        action="store_true",
        help="Include row data for each table.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Row limit per table when including data. Use 0 for no limit.",
    )
    parser.add_argument(
        "--output",
        help="Write output JSON to a file instead of stdout.",
    )

    args = parser.parse_args()
    limit = None if args.limit == 0 else args.limit

    engine = create_engine(args.url)
    data = dump_database(engine, args.include_data, limit)

    payload = json.dumps(data, indent=2, default=str)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(payload)
    else:
        print(payload)


if __name__ == "__main__":
    main()
