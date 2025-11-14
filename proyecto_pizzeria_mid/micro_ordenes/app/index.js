const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const ordenesRoutes = require('./routes/ordenesRoutes.js');

const app = express();
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Aquí montas las rutas de órdenes con prefijo
app.use('/api/ordenes', ordenesRoutes);

try {
    app.listen(3003, "0.0.0.0", () => {
        console.log('capasBack ejecutándose en el puerto 3003');
    });
} catch (error) {
    console.error("Error fatal al iniciar el servidor:", error);
}

