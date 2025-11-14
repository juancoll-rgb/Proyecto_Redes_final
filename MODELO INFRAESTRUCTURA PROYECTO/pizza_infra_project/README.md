
# 🍕 Proyecto Final — *Infraestructura Analítica Distribuida: Pizza Sales*

## 📌 Descripción General

Este proyecto implementa un **pipeline analítico distribuido de extremo a extremo**, capaz de procesar un dataset de ventas de pizzas mediante **Apache Spark**, exponer resultados agregados mediante **APIs Flask balanceadas con Nginx**, y visualizar métricas clave en un **dashboard interactivo con Streamlit**.

La arquitectura sigue el paradigma de **microservicios contenedorizados**, orquestados mediante Docker Compose, lo que garantiza portabilidad, escalabilidad y replicabilidad.

---

## ⚙️ Stack Tecnológico

| Componente | Rol | Tecnología |
|-------------|-----|------------|
| **ETL distribuido** | Limpieza, transformación y agregación de datos | 🧠 Apache Spark (1 master + 2 workers) |
| **Backend REST** | Exposición de KPIs procesados | ⚙️ Flask (2 réplicas) |
| **Balanceo de carga** | Distribución de tráfico a réplicas API | 🌐 Nginx |
| **Dashboard** | Visualización interactiva de resultados | 📊 Streamlit |
| **Orquestación** | Coordinación de servicios | 🐳 Docker Compose |

---

## 🧱 Estructura del Proyecto

```
pizza_infra_project/
│
├── api/                # API Flask (REST) para exponer KPIs
├── dashboard/          # Aplicación Streamlit (visualización)
├── data/               # Dataset fuente (pizza_sales.csv)
├── nginx/              # Configuración del balanceador Nginx
├── out/                # Salidas del ETL (JSON generados por Spark)
├── spark/              # Script ETL PySpark + Dockerfile
└── docker-compose.yml  # Orquestación de todos los servicios
```

---

## 🪜 Paso a paso para reproducir la implementación

### 1️⃣ Requisitos previos

- Instalar **Docker Desktop** (Windows/Mac) o **Docker Engine + Compose** (Linux)
- Tener al menos **4 GB de RAM** disponibles
- Clonar o descargar el repositorio completo del proyecto

```bash
git clone https://github.com/usuario/pizza_infra_project.git
cd pizza_infra_project
```

---

### 2️⃣ Verificar la estructura y dataset

Asegúrate de tener el archivo `pizza_sales.csv` en la carpeta `/data`.  
Puedes usar un dataset de ejemplo con las columnas:
```
order_details_id,order_id,pizza_id,quantity,order_date,order_time,
unit_price,total_price,pizza_size,pizza_category,pizza_ingredients,pizza_name
```

---

### 3️⃣ Construir y desplegar la infraestructura

Ejecuta en PowerShell o Terminal:

```bash
docker compose up -d --build
```

Esto levanta los siguientes servicios:
- Spark master y 2 workers
- Flask API (2 réplicas)
- Nginx como balanceador de carga
- Streamlit Dashboard

---

### 4️⃣ Confirmar servicios en ejecución

Verifica que los contenedores estén activos:

```bash
docker ps
```

Debes ver algo similar a:
```
spark-master
spark-worker-1
spark-worker-2
spark-submit
api1
api2
nginx-lb
dashboard
```

---

### 5️⃣ Consultar interfaces

| Servicio | Descripción | URL / Puerto |
|-----------|-------------|--------------|
| **Spark Master UI** | Supervisar el ETL | [http://localhost:8080](http://localhost:8080) |
| **Dashboard Streamlit** | Visualización de resultados | [http://localhost:8501](http://localhost:8501) |
| **API Balanceada (Nginx)** | Endpoints REST | [http://localhost/api/...](http://localhost/api/...) |

---

### 6️⃣ Validar ejecución del ETL

El contenedor `spark-submit` ejecuta automáticamente el script `/spark/pizza_sales_etl.py`, que genera archivos `.json` en `/data/out`.  
Puedes verificar los resultados con:

```bash
docker logs spark-submit -f
```

Y luego copiar los resultados al host:
```bash
docker cp spark-submit:/data/out ./out_check
```

---

### 7️⃣ Consultar los endpoints REST

Ejemplo de pruebas:

```bash
curl http://localhost/api/categories
curl http://localhost/api/top_pizzas
curl http://localhost/api/daily_kpis
```

---

### 8️⃣ Visualizar resultados en el dashboard

Abre tu navegador en:  
👉 [http://localhost:8501](http://localhost:8501)

Verás las gráficas con ventas por categoría, tamaño, top 5 pizzas y ticket promedio diario.

---

### 9️⃣ Limpieza del entorno

Para detener y eliminar todos los servicios, redes y volúmenes:

```bash
docker compose down -v
```

---

## 🧭 Arquitectura General

```
                   ┌───────────────┐
                   │ pizza_sales.csv│
                   └──────┬────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │ Spark Cluster (ETL) │
                │  1 master + 2 workers│
                └─────────┬───────────┘
                          │ JSON KPIs
                          ▼
                ┌─────────────────────┐
                │ Flask API x2        │
                │ (REST microservices)│
                └─────────┬───────────┘
                          │
                    ┌─────▼─────┐
                    │ Nginx LB  │
                    └─────┬─────┘
                          │
             ┌────────────▼────────────┐
             │ Streamlit Dashboard     │
             │  Visualización de KPIs  │
             └─────────────────────────┘
```

---

## 💡 Notas finales

- Si realizas cambios en el script ETL (`pizza_sales_etl.py`), vuelve a ejecutar:
  ```bash
  docker compose up -d --build
  ```
- Puedes ver los logs en tiempo real:
  - `docker logs spark-submit -f` (ETL)
  - `docker logs api1 -f` (API Flask)
- El dashboard se actualiza automáticamente al regenerar los archivos JSON en `/out`.

---
