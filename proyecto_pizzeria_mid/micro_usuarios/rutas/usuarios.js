
const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "0933";

// Registro de usuario
router.post("/register", async (req, res) => {
  const { nombre, email, telefono, password, rol, estado } = req.body;
  try {
    // Verificar si el usuario ya existe
    const [existe] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (existe.length > 0) {
      return res.status(400).json({ msg: "El usuario ya existe" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario en la base de datos
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, telefono, password, rol, estado) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, email, telefono, hashedPassword, rol, estado]
    );

    res.json({
      id: result.insertId,
      nombre,
      email,
      telefono,
      rol,
      estado
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ msg: "Credenciales inválidas" });
    const usuario = rows[0];
    const esValido = await bcrypt.compare(password, usuario.password);
    if (!esValido) return res.status(400).json({ msg: "Credenciales inválidas" });
    const token = jwt.sign(
      { email: usuario.email, rol: usuario.rol },
      SECRET_KEY,
      { expiresIn: "1h" }
    );
    res.json({ msg: "Login exitoso", token, rol: usuario.rol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al hacer login" });
  }
});
//ruta protegida

router.get("/perfil", (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(403).json({ msg: "Token requerido" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    res.json({ msg: "Acceso autorizado", user: decoded });
  } catch (err) {
    res.status(401).json({ msg: "Token inválido o expirado" });
  }
});


// ==================== GET: listar todos los usuarios ====================
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios");
    // Remover la contraseña de la respuesta
    const usuariosSinPassword = rows.map(u => {
      const { password, ...rest } = u;
      return { ...rest, password: "" };
    });
    res.json(usuariosSinPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// ==================== GET: obtener un usuario por correo ====================
router.get("/correo/:email", async (req, res) => {
  let { email } = req.params;
  email = decodeURIComponent(email).trim().toLowerCase();
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = ?", [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const { password, ...userSinPassword } = rows[0];
    res.json({ ...userSinPassword, password: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar usuario por correo" });
  }
});

// ==================== GET: obtener un usuario por ID ====================
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

// ==================== GET: obtener un usuario por correo ====================
router.get("/correo/:email", async (req, res) => {
  let { email } = req.params;
  email = decodeURIComponent(email).trim().toLowerCase();
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = ?", [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const { password, ...userSinPassword } = rows[0];
    res.json({ ...userSinPassword, password: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar usuario por correo" });
  }
});

// ==================== GET: obtener un usuario por teléfono ====================
router.get("/telefono/:telefono", async (req, res) => {
  let { telefono } = req.params;
  telefono = telefono.trim();
  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE telefono = ?", [telefono]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    const { password, ...userSinPassword } = rows[0];
    res.json({ ...userSinPassword, password: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar usuario por teléfono" });
  }
});

// ==================== POST: crear un usuario ====================
router.post("/", async (req, res) => {
  const { nombre, email, telefono, rol, estado } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, email, telefono, rol, estado) VALUES (?, ?, ?, ?, ?)",
      [nombre, email, telefono, rol, estado]
    );
    res.json({ id: result.insertId, nombre, email, telefono, rol, estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// ==================== PUT: actualizar un usuario ====================
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, rol, estado } = req.body;
  try {
    const [result] = await pool.query(
      "UPDATE usuarios SET nombre=?, email=?, telefono=?, rol=?, estado=? WHERE id=?",
      [nombre, email, telefono, rol, estado, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ id, nombre, email, telefono, rol, estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});


// ==================== DELETE: eliminar un usuario por email ====================
router.delete("/email/:email", async (req, res) => {
  let { email } = req.params;
  // Normalizar: quitar espacios y pasar a minúsculas
  email = email.trim().toLowerCase();
  try {
    const [result] = await pool.query("DELETE FROM usuarios WHERE LOWER(TRIM(email)) = ?", [email]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

module.exports = router;
