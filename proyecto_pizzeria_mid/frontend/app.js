// Configuración de la URL base del microservicio
const BASE_URL = window.location.hostname === "elsalamidelitaliano.com"
    ? "https://elsalamidelitaliano.com/usuarios"
    : "http://localhost:3000/usuarios";

// Elementos del DOM
const loginForm = document.getElementById("loginForm");

// Función para mostrar mensajes con alertas de Bootstrap
function mostrarMensaje(mensaje, tipo = 'info') {
    // Crear alerta temporal
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : tipo === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Función para mostrar loading
function mostrarLoading(mensaje = 'Procesando...') {
    mostrarMensaje(`<i class="bi bi-hourglass-split me-2"></i>${mensaje}`, 'info');
}

// Función para limpiar formularios
function limpiarFormulario(formId) {
    document.getElementById(formId).reset();
}


// Event listener para el formulario de login
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarLoading();

    try {
        const data = {
            email: document.getElementById("logEmail").value.trim().toLowerCase(),
            password: document.getElementById("logPassword").value
        };

        const response = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.token) {
            // Guardar token en localStorage
            localStorage.setItem("token", result.token);
            localStorage.setItem("userRol", result.rol);
            // Intentar guardar email desde el JWT
            try {
                const payload = JSON.parse(atob(result.token.split('.')[1] || '')) || {};
                if (payload.email) {
                    localStorage.setItem('userEmail', payload.email);
                }
            } catch (e) {
                // Ignorar errores de parseo
            }
            
            mostrarMensaje(`¡Login exitoso!<br><strong>Rol:</strong> ${result.rol}<br>Redirigiendo según tu rol...`, 'success');
            
            // Redirigir según el rol después de 2 segundos
            setTimeout(() => {
                switch (result.rol) {
                    case "Admin":
                        mostrarMensaje("Redirigiendo al panel de inventario (Admin)...", 'info');
                        window.location.href = "inventario.html";
                        break;
                    case "Cocina":
                        mostrarMensaje("Redirigiendo al área de cocina...", 'info');
                        // window.location.href = "cocina.html"; // Descomenta cuando tengas la página
                        break;
                    case "Cajero":
                        mostrarMensaje("Redirigiendo al área de órdenes...", 'info');
                        window.location.href = "ordenes.html";
                        break;
                    case "Domiciliario":
                        mostrarMensaje("Redirigiendo al área de domicilios...", 'info');
                        // window.location.href = "domicilios.html"; // Descomenta cuando tengas la página
                        break;
                    default:
                        mostrarMensaje("Rol no reconocido. Contacta al administrador.", 'error');
                }
            }, 2000);
            
            limpiarFormulario("loginForm");
        } else {
            mostrarMensaje(`Error: ${result.msg || result.error || 'Credenciales inválidas'}`, 'error');
        }

    } catch (error) {
        console.error('Error en login:', error);
        mostrarMensaje(`Error de conexión: ${error.message}`, 'error');
    }
});

// Función para verificar si hay un token guardado al cargar la página
function verificarSesion() {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("userRol");
    
    if (token && rol) {
        mostrarMensaje(`Bienvenido de nuevo!<br><strong>Rol actual:</strong> ${rol}`, 'info');
    }
}

// Función para cerrar sesión (puede ser útil para testing)
function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("userRol");
    localStorage.removeItem("userEmail");
    mostrarMensaje("Sesión cerrada correctamente", 'info');
}

// Función para probar el token guardado
async function probarToken() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        mostrarMensaje("No hay token guardado. Inicia sesión primero.", 'error');
        return;
    }

    mostrarLoading();

    try {
        const response = await fetch(`${BASE_URL}/perfil`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            mostrarMensaje(`Token válido!<br><strong>Usuario:</strong> ${result.user.email}<br><strong>Rol:</strong> ${result.user.rol}`, 'success');
        } else {
            mostrarMensaje(`Token inválido: ${result.msg}`, 'error');
            localStorage.removeItem("token");
            localStorage.removeItem("userRol");
        }

    } catch (error) {
        console.error('Error al probar token:', error);
        mostrarMensaje(`Error de conexión: ${error.message}`, 'error');
    }
}

// Agregar botones de utilidad para testing (solo en desarrollo)
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    // Crear botones de utilidad
    const utilidadDiv = document.createElement('div');
    utilidadDiv.className = 'form-section';
    utilidadDiv.innerHTML = `
        <h2 class="section-title">
            <i class="bi bi-tools"></i>
            Utilidades de Desarrollo
        </h2>
        <div class="text-center">
            <button type="button" class="btn btn-outline-primary me-2" onclick="probarToken()">
                <i class="bi bi-key me-2"></i>Probar Token
            </button>
            <button type="button" class="btn btn-outline-warning me-2" onclick="cerrarSesion()">
                <i class="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
            </button>
            <button type="button" class="btn btn-outline-info" onclick="mostrarMensaje('Token: ' + (localStorage.getItem('token') || 'No hay token'), 'info')">
                <i class="bi bi-info-circle me-2"></i>Ver Token
            </button>
        </div>
    `;
    
    document.querySelector('.main-container').appendChild(utilidadDiv);
}


// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    
    // Mostrar información de conexión
    console.log('El Salami del Italiano - Frontend iniciado');
    console.log('URL del microservicio:', BASE_URL);
    console.log('Token guardado:', localStorage.getItem('token') ? 'Sí' : 'No');
});
