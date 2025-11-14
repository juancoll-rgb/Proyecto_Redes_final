import os
import pathlib
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType, IntegerType, StringType

# ----------------------------
# Rutas 
# ----------------------------
DATA_PATH = os.environ.get("DATA_PATH", "/data/pizza_sales.csv")
OUT_DIR   = os.environ.get("OUT_DIR", "/data/out")

# ----------------------------
# SparkSession
# ----------------------------
spark = (
    SparkSession.builder
    .appName("PizzaSalesETL")
    # .config("spark.sql.session.timeZone", "UTC")  # opcional
    .getOrCreate()
)

# ----------------------------
# Detección simple de separador
# ----------------------------
sep = ","
try:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        first_line = f.readline()
        if ";" in first_line and "," not in first_line:
            sep = ";"
except Exception:
    # Si falla el open (p.ej., distinto FS), usamos coma por defecto
    sep = ","

# ----------------------------
# Lectura del CSV
# ----------------------------
df = (
    spark.read
    .option("header", True)
    .option("inferSchema", True)
    .option("sep", sep)
    .option("mode", "PERMISSIVE")
    .csv(DATA_PATH)
)

# ----------------------------
# Limpieza de nombres de columnas 
# ----------------------------
for c in df.columns:
    clean = c.replace("\ufeff", "").strip()
    if clean != c:
        df = df.withColumnRenamed(c, clean)

# ----------------------------
# Helpers
# ----------------------------
def to_float_col(colname: str):
    """
    Convierte columna a float de forma segura:
    - Si viene como string con coma decimal, la cambia por punto.
    - Si ya es numérica, castea directamente a double.
    """
    return F.regexp_replace(F.col(colname).cast(StringType()), ",", ".").cast(DoubleType())

def parse_order_timestamp(df_):
    """
    Crea 'order_ts' intentando varios formatos de fecha/hora.
    Soporta:
      - "yyyy-MM-dd HH:mm:ss"  (ISO)
      - "d/M/yyyy H:m:s"
      - "dd/MM/yyyy HH:mm:ss"
      - "M/d/yyyy H:m:s"
      - Solo fecha: "yyyy-MM-dd", "d/M/yyyy", "M/d/yyyy"
    Si existe 'order_time', se concatena; si no, se intenta sólo con la fecha.
    """
    date_s = F.col("order_date").cast(StringType())
    time_s = F.col("order_time").cast(StringType())

    dt_space = F.concat_ws(" ", date_s, time_s)  # "fecha hora"

    # Intentos con fecha+hora
    ts_iso      = F.to_timestamp(dt_space, "yyyy-MM-dd HH:mm:ss")
    ts_dmy      = F.to_timestamp(dt_space, "d/M/yyyy H:m:s")
    ts_dmy_full = F.to_timestamp(dt_space, "dd/MM/yyyy HH:mm:ss")
    ts_mdy      = F.to_timestamp(dt_space, "M/d/yyyy H:m:s")

    # Intentos solo con fecha
    ts_iso_date  = F.to_timestamp(date_s, "yyyy-MM-dd")
    ts_dmy_date  = F.to_timestamp(date_s, "d/M/yyyy")
    ts_mdy_date  = F.to_timestamp(date_s, "M/d/yyyy")

    order_ts = F.coalesce(ts_iso, ts_dmy, ts_dmy_full, ts_mdy, ts_iso_date, ts_dmy_date, ts_mdy_date)
    return df_.withColumn("order_ts", order_ts)

# ----------------------------
# Tipificación de campos clave
# ----------------------------
# Si tus columnas tienen estos nombres (según logs): 
# order_details_id, order_id, pizza_id, quantity, order_date, order_time,
# unit_price, total_price, pizza_size, pizza_category, pizza_ingredients, pizza_name

# Números
df = (
    df.withColumn("unit_price_f", to_float_col("unit_price"))
      .withColumn("total_price_f", to_float_col("total_price"))
      .withColumn("quantity_i", F.col("quantity").cast(IntegerType()))
)

# Parseo robusto de timestamp
df = parse_order_timestamp(df)
df = df.withColumn("order_date_std", F.to_date(F.col("order_ts")))
df = df.withColumn("order_hour", F.hour(F.col("order_ts")))

# Monto final (usa total_price si existe; si no, quantity * unit_price)
df = df.withColumn(
    "amount",
    F.coalesce(F.col("total_price_f"), F.col("unit_price_f") * F.col("quantity_i"))
)

# ----------------------------
# Sanidad y recuentos
# ----------------------------
total_rows = df.count()
valid_df = df.filter(F.col("order_ts").isNotNull() & F.col("amount").isNotNull())
valid_rows = valid_df.count()

print(f"[DEBUG] Filas totales: {total_rows}")
print(f"[DEBUG] Filas válidas (con fecha y monto): {valid_rows}")

# Si no hay válidas, no generamos vacíos silenciosos
if valid_rows == 0:
    # Escribe un mensaje de diagnóstico y sal
    pathlib.Path(OUT_DIR).mkdir(parents=True, exist_ok=True)
    with open(os.path.join(OUT_DIR, "_EMPTY_OUTPUT.txt"), "w", encoding="utf-8") as f:
        f.write("No se encontraron filas válidas. Revisa formatos de 'order_date'/'order_time' y precios.")
    spark.stop()
    print("ETL terminado SIN datos. Revisa _EMPTY_OUTPUT.txt en el OUT_DIR.")
    raise SystemExit(0)

# ----------------------------
# KPIs / Agregaciones
# ----------------------------
# 1) Ventas por categoría
sales_by_category = (
    valid_df.groupBy("pizza_category")
    .agg(
        F.round(F.sum("amount"), 2).alias("total_sales"),
        F.sum("quantity_i").alias("total_qty")
    )
    .orderBy(F.desc("total_sales"))
)

# 2) Top 5 pizzas por ventas
top_pizzas = (
    valid_df.groupBy("pizza_name")
    .agg(
        F.round(F.sum("amount"), 2).alias("total_sales"),
        F.sum("quantity_i").alias("total_qty")
    )
    .orderBy(F.desc("total_sales"))
    .limit(5)
)

# 3) Ventas por tamaño
sales_by_size = (
    valid_df.groupBy("pizza_size")
    .agg(
        F.round(F.sum("amount"), 2).alias("total_sales"),
        F.sum("quantity_i").alias("total_qty")
    )
    .orderBy(F.desc("total_sales"))
)

# 4) KPIs diarios (ticket promedio)
daily = (
    valid_df.groupBy("order_date_std")
    .agg(
        F.round(F.sum("amount"), 2).alias("daily_sales"),
        F.sum("quantity_i").alias("daily_qty"),
        F.countDistinct("order_id").alias("orders")
    )
    .withColumn("avg_ticket", F.round(F.col("daily_sales") / F.when(F.col("orders") > 0, F.col("orders")).otherwise(1), 2))
    .orderBy("order_date_std")
)

# 5) Distribución por hora
by_hour = (
    valid_df.groupBy("order_hour")
    .agg(
        F.round(F.sum("amount"), 2).alias("sales"),
        F.sum("quantity_i").alias("qty")
    )
    .orderBy("order_hour")
)


pathlib.Path(OUT_DIR).mkdir(parents=True, exist_ok=True)

(sales_by_category.coalesce(1)
    .write.mode("overwrite")
    .json(os.path.join(OUT_DIR, "sales_by_category"))
)

(top_pizzas.coalesce(1)
    .write.mode("overwrite")
    .json(os.path.join(OUT_DIR, "top_pizzas"))
)

(sales_by_size.coalesce(1)
    .write.mode("overwrite")
    .json(os.path.join(OUT_DIR, "sales_by_size"))
)

(daily.coalesce(1)
    .write.mode("overwrite")
    .json(os.path.join(OUT_DIR, "daily_kpis"))
)

(by_hour.coalesce(1)
    .write.mode("overwrite")
    .json(os.path.join(OUT_DIR, "hourly_sales"))
)

spark.stop()
print("ETL finished. Files written to:", OUT_DIR)
