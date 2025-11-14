const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const domiciliosController = require('./controllers/domiciliosController');

const app = express();

app.use(morgan('dev')); // Morgan muestra logs en la terminal
app.use(cors());
app.use(express.json());
app.use(domiciliosController);


app.listen(3004, () => {
  console.log('Microservicio de Domicilios corriendo en el puerto 3004');
});
