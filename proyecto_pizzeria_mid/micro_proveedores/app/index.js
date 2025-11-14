const express = require('express');
const proveedorRoutes = require('./controllers/proveedorController');
const morgan = require('morgan');

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', proveedorRoutes);

app.listen(3002, () => {
    console.log('Microservicio Proveedor ejecutándose en el puerto 3002');
});
