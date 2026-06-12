from pathlib import Path

import pyarrow.parquet as pq


FILES = [
    Path("Data/Plant_A/Main-monitoring-data/main_monitoring_data.parquet"),
    Path("Data/Plant_A/Errorcodes/errorcodes.parquet"),
    Path("Data/Plant_B/Main-monitoring-data/main_monitoring_data_plant_b.parquet"),
]


def count_matching(columns, needle):
    return sum(needle in column for column in columns)


for path in FILES:
    if not path.exists():
        print(f"missing: {path}")
        continue

    pf = pq.ParquetFile(path)
    columns = pf.schema.names
    print(f"\n{path}")
    print(f"  rows: {pf.metadata.num_rows:,}")
    print(f"  columns: {pf.metadata.num_columns:,}")
    print(f"  inverter P_AC columns: {count_matching(columns, ' / P_AC (kW)')}")
    print(f"  inverter I_DC columns: {count_matching(columns, ' / I_DC_SUM (A)')}")
    print(f"  inverter U_DC columns: {count_matching(columns, ' / U_DC (V)')}")
    print("  first columns:")
    for column in columns[:8]:
        print(f"    - {column}")

