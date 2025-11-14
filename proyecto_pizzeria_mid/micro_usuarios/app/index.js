const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
console.log("Index cargado");
const usuariosRoutes = require("./rutas/usuarios");

const app = express();


// Middlewares
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
const path = require("path");
app.use(express.static(path.join(__dirname, "src", "frontend")));

// Rutas
app.use("/usuarios", require("./rutas/usuarios")); 

// Redirigir cualquier ruta no reconocida al index.html (SPA), solo si no es un archivo
app.use((req, res, next) => {
  if (req.path.includes('.') || req.path.startsWith('/usuarios')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'src', 'frontend', 'index.html'));
});

// Servidor
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
