
// Cambia solo esta línea según el entorno
const BASE_URL = window.location.hostname === "elsalamidelitaliano.com"
  ? "https://elsalamidelitaliano.com/usuarios"
  : "http://localhost:3000/usuarios";

// Registro
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nombre: document.getElementById("regNombre").value,
    email: document.getElementById("regEmail").value,
    telefono: document.getElementById("regTelefono").value,
    rol: document.getElementById("regRol").value,
    password: document.getElementById("regPassword").value
  };

  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  document.getElementById("resultado").innerText = JSON.stringify(result, null, 2);
});

// Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    email: document.getElementById("logEmail").value,
    password: document.getElementById("logPassword").value
  };

  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (result.token) {
    localStorage.setItem("token", result.token);
    document.getElementById("resultado").innerText = "Login correcto. Redirigiendo...";
    // Redirigir según el rol
    switch (result.rol) {
      case "Admin":
        window.location.href = "inventario.html";
        break;
      case "Cajero":
        window.location.href = "ordenes.html";
        break;
      case "Domiciliario":
        window.location.href = "domicilios.html";
        break;
      default:
        document.getElementById("resultado").innerText = "Rol no reconocido. Contacta al administrador.";
    }
  } else {
    document.getElementById("resultado").innerText = JSON.stringify(result, null, 2);
  }
});
