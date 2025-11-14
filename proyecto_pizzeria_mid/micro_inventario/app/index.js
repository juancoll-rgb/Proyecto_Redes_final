const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const ingredientesRoutes = require('./src/routes/ingredientes');
const stockRoutes = require('./src/routes/stock');
const recetasRoutes = require('./src/routes/recetas');
const validacionesRoutes = require('./src/routes/validaciones');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan(':method :url :status'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Microservicio de Inventario funcionando correctamente',
        timestamp: new Date().toISOString(),
        service: 'pizzeria-inventario-microservice',
        version: '1.0.0'
    });
});

app.use('/api/ingredientes', ingredientesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/validaciones', validacionesRoutes);

app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'API de Gestión de Inventario de Ingredientes - Pizzería',
        version: '1.0.0',
        authentication: {
            methods: [
                'Header x-user-email: email del administrador',
                'Authorization: Bearer <jwt_token>'
            ],
            required_for: [
                'Operaciones de escritura (POST, PUT, DELETE)',
                'Gestión de stock y movimientos',
                'Preparación de recetas'
            ],
            user_service_url: process.env.USER_SERVICE_URL || 'http://localhost:3000'
        },
        endpoints: {
            ingredientes: {
                'GET /api/ingredientes': 'Obtener todos los ingredientes (Público)',
                'GET /api/ingredientes/:id': 'Obtener ingrediente por ID (Público)',
                'POST /api/ingredientes': 'Crear nuevo ingrediente (Admin)',
                'PUT /api/ingredientes/:id': 'Actualizar ingrediente (Admin)',
                'DELETE /api/ingredientes/:id': 'Eliminar ingrediente (Admin)'
            },
            stock: {
                'GET /api/stock': 'Obtener todo el stock (Público)',
                'GET /api/stock/ingrediente/:id': 'Obtener stock por ingrediente (Público)',
                'GET /api/stock/bajo-umbral': 'Ingredientes con stock bajo (Público)',
                'POST /api/stock': 'Crear/actualizar stock (Admin)',
                'POST /api/stock/entrada': 'Registrar entrada de stock (Admin)',
                'POST /api/stock/salida': 'Registrar salida de stock (Admin)',
                'GET /api/stock/movimientos': 'Obtener movimientos con filtros (Público)'
            },
            recetas: {
                'GET /api/recetas': 'Obtener todas las recetas (Público)',
                'GET /api/recetas/:id': 'Obtener receta por ID (Público)',
                'GET /api/recetas/:id/costo': 'Obtener costo de receta (Público)',
                'POST /api/recetas': 'Crear nueva receta (Admin)',
                'PUT /api/recetas/:id': 'Actualizar receta (Admin)',
                'DELETE /api/recetas/:id': 'Eliminar receta (Admin)'
            },
            validaciones: {
                'GET /api/validaciones/recetas-disponibles': 'Listar recetas disponibles (Público)',
                'POST /api/validaciones/stock-suficiente': 'Verificar stock suficiente (Público)',
                'POST /api/validaciones/preparar-receta': 'Preparar receta y descontar stock (Usuario)',
                'GET /api/validaciones/alertas-stock': 'Obtener alertas de stock bajo (Público)'
            }
        },
        requirements: {
            database: 'MySQL',
            node_version: process.version,
            environment: process.env.NODE_ENV || 'development',
            user_service: 'Microservicio de usuarios debe estar ejecutándose'
        }
    });
});

app.use(notFound);
app.use(errorHandler);

async function startServer() {
    try {
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos. Verifique la configuración.');
            process.exit(1);
        }
        
        app.listen(PORT, () => {
            console.log(` Servidor iniciado en http://localhost:${PORT}`);
        });
        
    } catch (error) {
        console.error(' Error iniciando el servidor:', error);
        process.exit(1);
    }
}

process.on('uncaughtException', (error) => {
    console.error(' Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

process.on('SIGINT', () => {
    process.exit(0);
});

if (require.main === module) {
    startServer();
}

module.exports = app;