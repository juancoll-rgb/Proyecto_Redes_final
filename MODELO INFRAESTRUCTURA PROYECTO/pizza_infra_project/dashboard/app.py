
import os, requests, pandas as pd, streamlit as st

API_BASE = os.environ.get("API_BASE", "http://nginx")

st.set_page_config(page_title="Pizza Sales Dashboard", layout="wide")

st.title("🍕 Pizza Sales Dashboard")
st.caption("ETL en Spark + API Flask balanceada con Nginx + Streamlit")

def fetch(endpoint):
    url = f"{API_BASE}{endpoint}"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()

# Layout
tab1, tab2, tab3, tab4 = st.tabs(["Categorías", "Top Pizzas", "Tamaños", "KPIs/Horas"])

with tab1:
    data = fetch("/api/categories")
    df = pd.DataFrame(data)
    st.subheader("Ventas por categoría")
    st.bar_chart(df.set_index("pizza_category")["total_sales"])
    st.dataframe(df)

with tab2:
    data = fetch("/api/top_pizzas")
    df = pd.DataFrame(data)
    st.subheader("Top 5 pizzas por ventas")
    st.bar_chart(df.set_index("pizza_name")["total_sales"])
    st.dataframe(df)

with tab3:
    data = fetch("/api/sizes")
    df = pd.DataFrame(data)
    st.subheader("Ventas por tamaño")
    st.bar_chart(df.set_index("pizza_size")["total_sales"])
    st.dataframe(df)

with tab4:
    daily = pd.DataFrame(fetch("/api/daily_kpis"))
    hourly = pd.DataFrame(fetch("/api/hourly_sales"))
    st.subheader("Ticket promedio diario")
    if not daily.empty:
        daily["order_date_std"] = pd.to_datetime(daily["order_date_std"])
        daily = daily.sort_values("order_date_std")
        st.line_chart(daily.set_index("order_date_std")[["daily_sales","orders","avg_ticket"]])
        st.dataframe(daily)
    st.subheader("Distribución por hora")
    if not hourly.empty:
        st.bar_chart(pd.DataFrame(hourly).set_index("order_hour")["sales"])
        st.dataframe(hourly)
