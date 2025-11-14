
import os, glob, json
from flask import Flask, jsonify

OUT_DIR = os.environ.get("OUT_DIR", "/data/out")

app = Flask(__name__)

def read_single_json_dir(path):
    # Spark writes part-*.json files; read all and merge as list
    folder = os.path.join(OUT_DIR, path)
    files = glob.glob(os.path.join(folder, "*.json"))
    data = []
    for f in files:
        try:
            with open(f, "r", encoding="utf-8") as fh:
                for line in fh:
                    data.append(json.loads(line))
        except Exception:
            # sometimes Spark writes a _SUCCESS file; ignore non-json
            pass
    return data

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/categories")
def categories():
    return jsonify(read_single_json_dir("sales_by_category"))

@app.get("/api/top_pizzas")
def top_pizzas():
    return jsonify(read_single_json_dir("top_pizzas"))

@app.get("/api/sizes")
def sizes():
    return jsonify(read_single_json_dir("sales_by_size"))

@app.get("/api/daily_kpis")
def daily_kpis():
    return jsonify(read_single_json_dir("daily_kpis"))

@app.get("/api/hourly_sales")
def hourly_sales():
    return jsonify(read_single_json_dir("hourly_sales"))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
