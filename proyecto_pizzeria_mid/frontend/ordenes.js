// Configuración de servicios
const ORDENES_BASE = (window.location.hostname === 'elsalamidelitaliano.com')
  ? 'https://elsalamidelitaliano.com:3003'
  : 'http://localhost:3003';

// Variables globales
let ordenModalInstance = null;

// Variables para manejar múltiples pizzas en una orden
let ordenActual = null; // Para almacenar el order_id de la orden en progreso
let pizzasEnOrden = []; // Para almacenar las pizzas agregadas a la orden actual

// Funciones de utilidad
function setBadge(level = 'info') {
  const badge = document.getElementById('badgeInfo');
  badge.textContent = level.toUpperCase();
}

function showAlert(message, type = 'info') {
  const alerts = document.getElementById('alerts');
  // Convertir saltos de línea a <br> para mostrar correctamente en HTML
  const formattedMessage = message.replace(/\n/g, '<br>');
  alerts.innerHTML = `<div class="alert alert-${type === 'error' ? 'danger' : type} mb-2" role="alert">${formattedMessage}</div>`;
}

function showModalError(message, type = 'danger') {
  const modalErrors = document.getElementById('modalErrors');
  if (modalErrors) {
    // Convertir saltos de línea a <br> para mostrar correctamente en HTML
    const formattedMessage = message.replace(/\n/g, '<br>');
    modalErrors.innerHTML = `<div class="alert alert-${type} mb-0" role="alert">${formattedMessage}</div>`;
    modalErrors.style.display = 'block';
    
    // Hacer scroll hacia el error
    modalErrors.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function clearModalError() {
  const modalErrors = document.getElementById('modalErrors');
  if (modalErrors) {
    modalErrors.innerHTML = '';
    modalErrors.style.display = 'none';
  }
}

function clearAlert() {
  const alerts = document.getElementById('alerts');
  alerts.innerHTML = '';
}

function renderTable({ headers, rows }) {
  const thead = `<thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<div class="table-responsive"><table class="table table-striped align-middle">${thead}${tbody}</table></div>`;
}

function renderEmpty(message = 'Sin datos para mostrar') {
  return `<div class="text-center text-muted py-5"><i class="bi bi-inbox me-2"></i>${message}</div>`;
}

function setContent(html) {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = html;
}

function getAuthHeaders() {
  const email = localStorage.getItem('userEmail');
  const headers = { 'Content-Type': 'application/json' };
  if (email) headers['x-user-email'] = email;
  console.log('Headers de autenticación:', headers); // Debug
  console.log('Email del localStorage:', localStorage.getItem('userEmail')); // Debug adicional
  return headers;
}

// Funciones de API
async function apiGet(path) {
  const res = await fetch(`${ORDENES_BASE}${path}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Error en la solicitud');
  return data;
}

async function apiSend(path, method, body) {
  const headers = getAuthHeaders();
  const url = `${ORDENES_BASE}${path}`;
  
  console.log('Enviando request:', { url, method, headers, body }); // Debug
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  console.log('Respuesta recibida:', { status: res.status, statusText: res.statusText }); // Debug
  
  const data = await res.json().catch(() => ({}));
  console.log('Datos de respuesta:', data); // Debug
  
  if (!res.ok) throw new Error(data.error || data.message || 'Error en la solicitud');
  return data;
}

// Funciones para obtener recetas y precios
async function cargarRecetas() {
  try {
    const resp = await apiGet('/api/ordenes/recetas');
    return resp.data || resp;
  } catch (e) {
    console.error('Error cargando recetas:', e.message);
    return [];
  }
}

async function cargarRecetasDisponibles() {
  try {
    const resp = await apiGet('/api/ordenes/recetas/disponibles');
    return resp.data || resp;
  } catch (e) {
    console.error('Error cargando recetas disponibles:', e.message);
    return [];
  }
}

async function obtenerPrecioReceta(tipoPizza, tamaño) {
  try {
    const resp = await apiGet(`/api/ordenes/recetas/tipo/${encodeURIComponent(tipoPizza)}/tamaño/${encodeURIComponent(tamaño)}`);
    return resp.data || resp;
  } catch (e) {
    console.error('Error obteniendo precio:', e.message);
    return null;
  }
}

async function verificarStockReceta(recetaId, cantidad) {
  try {
    const resp = await apiSend('/api/ordenes/verificar-stock', 'POST', {
      receta_id: recetaId,
      cantidad: cantidad
    });
    return resp.data || resp;
  } catch (e) {
    console.error('Error verificando stock:', e.message);
    return { puede_preparar: false, error: e.message };
  }
}

// Funciones de gestión de órdenes
async function cargarOrdenes() {
  try {
    clearAlert();
    setBadge('cargando');
    const resp = await apiGet('/api/ordenes');
    const ordenes = resp.data || resp;
    
    console.log('Órdenes cargadas:', ordenes); // Debug
    console.log('Total de órdenes recibidas:', ordenes.length); // Debug
    
    // Debug adicional: mostrar órdenes agrupadas
    const debugOrderIds = {};
    ordenes.forEach(orden => {
      const orderId = orden.order_id;
      if (!debugOrderIds[orderId]) debugOrderIds[orderId] = [];
      debugOrderIds[orderId].push(orden);
    });
    console.log('Órdenes agrupadas por order_id:', debugOrderIds); // Debug
    
    if (!ordenes || ordenes.length === 0) {
      setContent(renderEmpty('No hay órdenes registradas'));
    } else {
      // Agrupar órdenes por order_id
      const ordenesAgrupadas = {};
      ordenes.forEach(o => {
        const orderId = o.order_id || o.id;
        if (!ordenesAgrupadas[orderId]) {
          ordenesAgrupadas[orderId] = {
            order_id: orderId,
            nombre: o.nombre,
            pizzas: [],
            total: 0,
            estado: o.estado,
            fecha: o.order_datetime,
            correo_cajero: o.correo_cajero
          };
        }
        ordenesAgrupadas[orderId].pizzas.push(o);
        ordenesAgrupadas[orderId].total += parseFloat(o.total_price);
      });
      
      const headers = ['ID Orden', 'Cliente', 'Pizzas', 'Total', 'Estado', 'Fecha', 'Acciones'];
      const rows = Object.values(ordenesAgrupadas).map(orden => {
        const pizzasTexto = orden.pizzas.map(p => `${p.pizza_name} ${getTamañoDisplay(p.pizza_size)} x${p.quantity}`).join(', ');
        const acciones = `
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary" data-action="view" data-order-id="${orden.order_id}">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-danger" data-action="delete" data-order-id="${orden.order_id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>`;
        
        return [
          orden.order_id,
          orden.nombre || '-',
          pizzasTexto,
          `$ ${orden.total.toFixed(2)}`,
          orden.estado ? `<span class="badge text-bg-${getEstadoColor(orden.estado)}">${orden.estado}</span>` : '-',
          orden.fecha ? new Date(orden.fecha).toLocaleDateString() : '-',
          acciones
        ];
      });
      
      setContent(renderTable({ headers, rows }));
      bindOrdenesActions(ordenes);
    }
    setBadge('ok');
  } catch (e) {
    setBadge('error');
    showAlert(e.message, 'danger');
    setContent(renderEmpty('No fue posible cargar las órdenes'));
  }
}

async function cargarMisOrdenes() {
  try {
    clearAlert();
    setBadge('cargando');
    const email = localStorage.getItem('userEmail');
    const resp = await apiGet(`/api/ordenes/correo/${encodeURIComponent(email)}`);
    const ordenes = resp.data || resp;
    
    if (!ordenes || ordenes.length === 0) {
      setContent(renderEmpty('No has creado ninguna orden'));
    } else {
      const headers = ['ID', 'Cliente', 'Pizza', 'Tamaño', 'Cantidad', 'Precio', 'Total', 'Estado', 'Fecha', 'Acciones'];
      const rows = ordenes.map(o => {
        const acciones = `
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary" data-action="view" data-id="${o.id}">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-warning" data-action="edit" data-id="${o.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" data-action="delete" data-id="${o.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>`;
        
        return [
          o.order_id || o.id || '-',
          o.nombre || '-',
          o.pizza_name || '-',
          o.pizza_size ? getTamañoDisplay(o.pizza_size) : '-',
          o.quantity || '-',
          o.unit_price ? `$ ${Number(o.unit_price).toFixed(2)}` : '-',
          o.total_price ? `$ ${Number(o.total_price).toFixed(2)}` : '-',
          o.estado ? `<span class="badge text-bg-${getEstadoColor(o.estado)}">${o.estado}</span>` : '-',
          o.fecha_creacion ? new Date(o.fecha_creacion).toLocaleDateString() : '-',
          acciones
        ];
      });
      
      setContent(renderTable({ headers, rows }));
      bindOrdenesActions(ordenes);
    }
    setBadge('ok');
  } catch (e) {
    setBadge('error');
    showAlert(e.message, 'danger');
    setContent(renderEmpty('No fue posible cargar tus órdenes'));
  }
}

async function buscarOrdenes() {
  const nombre = prompt('Ingresa el nombre del cliente a buscar:');
  if (!nombre) return;
  
  try {
    clearAlert();
    setBadge('cargando');
    const resp = await apiGet(`/api/ordenes/nombre/${encodeURIComponent(nombre)}`);
    const ordenes = resp.data || resp;
    
    if (!ordenes || ordenes.length === 0) {
      setContent(renderEmpty(`No se encontraron órdenes para "${nombre}"`));
    } else {
      const headers = ['ID', 'Cliente', 'Pizza', 'Tamaño', 'Cantidad', 'Precio', 'Total', 'Estado', 'Fecha', 'Acciones'];
      const rows = ordenes.map(o => {
        const acciones = `
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary" data-action="view" data-id="${o.id}">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-warning" data-action="edit" data-id="${o.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" data-action="delete" data-id="${o.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>`;
        
        return [
          o.order_id || o.id || '-',
          o.nombre || '-',
          o.pizza_name || '-',
          o.pizza_size ? getTamañoDisplay(o.pizza_size) : '-',
          o.quantity || '-',
          o.unit_price ? `$ ${Number(o.unit_price).toFixed(2)}` : '-',
          o.total_price ? `$ ${Number(o.total_price).toFixed(2)}` : '-',
          o.estado ? `<span class="badge text-bg-${getEstadoColor(o.estado)}">${o.estado}</span>` : '-',
          o.fecha_creacion ? new Date(o.fecha_creacion).toLocaleDateString() : '-',
          acciones
        ];
      });
      
      setContent(renderTable({ headers, rows }));
      bindOrdenesActions(ordenes);
    }
    setBadge('ok');
  } catch (e) {
    setBadge('error');
    showAlert(e.message, 'danger');
    setContent(renderEmpty('No fue posible buscar las órdenes'));
  }
}

// Funciones auxiliares
function getEstadoColor(estado) {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'warning';
    case 'en_proceso': return 'info';
    case 'completada': return 'success';
    case 'cancelada': return 'danger';
    default: return 'secondary';
  }
}

function getTamañoDisplay(tamaño) {
  const tamaños = {
    'S': 'Pequeña',
    'M': 'Mediana',
    'L': 'Grande',
    'XL': 'Familiar',
    'PEQUEÑA': 'Pequeña',
    'MEDIANA': 'Mediana',
    'GRANDE': 'Grande',
    'FAMILIAR': 'Familiar'
  };
  return tamaños[tamaño] || tamaño;
}

function bindOrdenesActions(ordenes) {
  const contentArea = document.getElementById('contentArea');
  contentArea.querySelectorAll('button[data-action]')?.forEach(btn => {
    const action = btn.getAttribute('data-action');
    const orderId = btn.getAttribute('data-order-id');
    const id = btn.getAttribute('data-id');
    
    btn.addEventListener('click', () => {
      switch (action) {
        case 'view':
          if (orderId) {
            // Ver todas las pizzas de la orden
            const pizzasDeLaOrden = ordenes.filter(o => o.order_id === orderId);
            verOrdenCompleta(orderId, pizzasDeLaOrden);
          } else {
            const orden = ordenes.find(x => String(x.id) === String(id));
            verOrden(orden);
          }
          break;
        case 'edit':
          if (orderId) {
            // Editar orden completa
            const pizzasDeLaOrden = ordenes.filter(o => o.order_id === orderId);
            editarOrdenCompleta(orderId, pizzasDeLaOrden);
          } else {
            const orden = ordenes.find(x => String(x.id) === String(id));
            editarOrden(orden);
          }
          break;
        case 'delete':
          if (orderId) {
            // Eliminar orden completa
            eliminarOrdenCompleta(orderId);
          } else {
            eliminarOrden(id, ordenes.find(x => String(x.id) === String(id)));
          }
          break;
      }
    });
  });
}

function verOrden(orden) {
  const html = `
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">Detalles de la Orden</h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <strong>ID de Orden:</strong> ${orden.order_id || orden.id || 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Cliente:</strong> ${orden.nombre || 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Pizza:</strong> ${orden.pizza_name || 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Tamaño:</strong> ${orden.pizza_size || 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Cantidad:</strong> ${orden.quantity || 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Precio Unitario:</strong> ${orden.unit_price ? `$ ${Number(orden.unit_price).toFixed(2)}` : 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Total:</strong> ${orden.total_price ? `$ ${Number(orden.total_price).toFixed(2)}` : 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Estado:</strong> <span class="badge text-bg-${getEstadoColor(orden.estado)}">${orden.estado || 'N/A'}</span>
          </div>
          <div class="col-md-6">
            <strong>Modo de Entrega:</strong> ${orden.modo_entrega || 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Dirección:</strong> ${orden.orden_direccion || 'N/A'}
          </div>
          <div class="col-md-6">
            <strong>Fecha:</strong> ${orden.fecha_creacion ? new Date(orden.fecha_creacion).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  `;
  setContent(html);
}

function verOrdenCompleta(orderId, pizzas) {
  const total = pizzas.reduce((sum, pizza) => sum + parseFloat(pizza.total_price), 0);
  const pizzasHtml = pizzas.map(pizza => `
    <div class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <strong>${pizza.pizza_name}</strong> - ${getTamañoDisplay(pizza.pizza_size)}
        <br><small class="text-muted">Cantidad: ${pizza.quantity} x $${parseFloat(pizza.unit_price).toFixed(2)}</small>
      </div>
      <span class="badge bg-primary rounded-pill">$${parseFloat(pizza.total_price).toFixed(2)}</span>
    </div>
  `).join('');
  
  const html = `
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">Orden ${orderId}</h5>
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-6">
            <p><strong>Cliente:</strong> ${pizzas[0]?.nombre || 'N/A'}</p>
            <p><strong>Estado:</strong> <span class="badge text-bg-${getEstadoColor(pizzas[0]?.estado)}">${pizzas[0]?.estado || 'N/A'}</span></p>
          </div>
          <div class="col-md-6">
            <p><strong>Fecha:</strong> ${pizzas[0]?.order_datetime ? new Date(pizzas[0].order_datetime).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Total:</strong> <strong class="text-success">$${total.toFixed(2)}</strong></p>
          </div>
        </div>
        <h6>Pizzas en la orden:</h6>
        <div class="list-group">
          ${pizzasHtml}
        </div>
      </div>
    </div>
  `;
  setContent(html);
}

function editarOrdenCompleta(orderId, pizzas) {
  showAlert('Función de edición de órdenes completas en desarrollo', 'info');
}

function eliminarOrdenCompleta(orderId) {
  if (confirm(`¿Estás seguro de que quieres eliminar la orden ${orderId} completa?`)) {
    // Aquí se implementaría la lógica para eliminar todas las pizzas de la orden
    showAlert('Función de eliminación de órdenes completas en desarrollo', 'info');
  }
}

function editarOrden(orden) {
  // Por ahora solo mostrar un mensaje, se puede implementar después
  showAlert('Función de edición en desarrollo', 'info');
}

async function eliminarOrden(id, orden) {
  if (!confirm(`¿Estás seguro de que quieres eliminar la orden de "${orden.nombre}"?`)) return;
  
  try {
    await apiSend(`/api/ordenes/${id}`, 'DELETE');
    showAlert('Orden eliminada exitosamente', 'success');
    cargarOrdenes(); // Recargar la lista
  } catch (e) {
    showAlert(e.message, 'danger');
  }
}

// Gestión del modal
function getOrdenModal() {
  if (!ordenModalInstance) {
    const el = document.getElementById('ordenModal');
    ordenModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
  }
  return ordenModalInstance;
}

async function openOrdenModal() {
  console.log('Abriendo modal de orden'); // Debug
  console.log('ordenActual:', ordenActual); // Debug
  console.log('pizzasEnOrden:', pizzasEnOrden); // Debug
  
  // Determinar si es una nueva orden o continuar con una existente
  if (ordenActual) {
    console.log('Modal: Continuando orden existente'); // Debug
    document.getElementById('ordenModalTitle').textContent = `Orden ${ordenActual} - Agregar Pizza`;
    document.getElementById('finalizarOrdenBtn').style.display = 'inline-block';
    document.getElementById('guardarOrdenBtn').innerHTML = '<i class="bi bi-plus-circle me-1"></i>Agregar Pizza';
  } else {
    console.log('Modal: Nueva orden'); // Debug
    document.getElementById('ordenModalTitle').textContent = 'Nueva Orden';
    document.getElementById('finalizarOrdenBtn').style.display = 'none';
    document.getElementById('guardarOrdenBtn').innerHTML = '<i class="bi bi-check2 me-1"></i>Crear Orden';
    document.getElementById('ordenForm').reset();
    document.getElementById('pizzasAgregadas').style.display = 'none';
  }
  
  document.getElementById('direccionContainer').style.display = 'none';
  
  // Limpiar errores del modal
  clearModalError();
  
  // Cargar recetas disponibles
  try {
    const recetas = await cargarRecetasDisponibles();
    const tipoPizzaSelect = document.getElementById('tipoPizza');
    const tamanoPizzaSelect = document.getElementById('tamanoPizza');
    
    console.log('Recetas cargadas:', recetas); // Debug
    
    // Limpiar opciones existentes
    tipoPizzaSelect.innerHTML = '<option value="">Seleccionar tipo...</option>';
    tamanoPizzaSelect.innerHTML = '<option value="">Primero selecciona un tipo</option>';
    
    // Agregar recetas disponibles
    const disponibles = recetas.recetas_disponibles || recetas.disponibles || [];
    console.log(`Recetas disponibles encontradas: ${disponibles.length}`); // Debug
    
    if (disponibles.length > 0) {
      // Agrupar recetas por tipo de pizza
      const tiposPizza = {};
      disponibles.forEach(receta => {
        const tipo = receta.tipo_pizza || receta.nombre?.split(' ')[1] || 'Desconocido';
        if (!tiposPizza[tipo]) {
          tiposPizza[tipo] = [];
        }
        tiposPizza[tipo].push(receta);
      });
      
      console.log('Tipos de pizza agrupados:', tiposPizza); // Debug
      
      // Llenar select de tipos de pizza
      Object.keys(tiposPizza).forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo;
        option.textContent = tipo;
        option.dataset.recetas = JSON.stringify(tiposPizza[tipo]);
        tipoPizzaSelect.appendChild(option);
      });
      
      if (Object.keys(tiposPizza).length === 0) {
        tipoPizzaSelect.innerHTML = '<option value="">No hay recetas disponibles</option>';
      }
    } else {
      console.log('No se encontraron recetas disponibles'); // Debug
      tipoPizzaSelect.innerHTML = '<option value="">No hay recetas disponibles</option>';
    }
    
    // Agregar recetas no disponibles (deshabilitadas)
    const noDisponibles = recetas.recetas_no_disponibles || recetas.no_disponibles || [];
    if (noDisponibles.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'No disponibles (sin stock)';
      noDisponibles.forEach(receta => {
        const option = document.createElement('option');
        option.value = receta.nombre || receta.tipo_pizza;
        option.textContent = `${receta.nombre || receta.tipo_pizza} - Sin stock`;
        option.disabled = true;
        optgroup.appendChild(option);
      });
      tipoPizzaSelect.appendChild(optgroup);
    }
  } catch (error) {
    console.error('Error cargando recetas:', error);
    showAlert('Error cargando recetas disponibles', 'warning');
  }
  
  getOrdenModal().show();
}

function closeOrdenModal() {
  getOrdenModal().hide();
}

function finalizarOrden() {
  ordenActual = null;
  pizzasEnOrden = [];
  closeOrdenModal();
  cargarOrdenes(); // Recargar la lista
  showAlert('Orden finalizada exitosamente', 'success');
}

function cancelarOrden() {
  ordenActual = null;
  pizzasEnOrden = [];
  closeOrdenModal();
}

function mostrarPizzasAgregadas() {
    console.log('Mostrando pizzas agregadas:', pizzasEnOrden); // Debug
  
  const pizzasAgregadasDiv = document.getElementById('pizzasAgregadas');
  const listaPizzasDiv = document.getElementById('listaPizzas');
  
  if (pizzasEnOrden.length > 0) {
    console.log('Mostrando lista de pizzas'); // Debug
    pizzasAgregadasDiv.style.display = 'block';
    
    const totalOrden = pizzasEnOrden.reduce((sum, pizza) => sum + parseFloat(pizza.total_price), 0);
    
    listaPizzasDiv.innerHTML = pizzasEnOrden.map(pizza => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${pizza.pizza_name}</strong> - ${getTamañoDisplay(pizza.pizza_size)}
          <br><small class="text-muted">Cantidad: ${pizza.quantity} x $${parseFloat(pizza.unit_price).toFixed(2)}</small>
        </div>
        <span class="badge bg-primary rounded-pill">$${parseFloat(pizza.total_price).toFixed(2)}</span>
      </div>
    `).join('') + `
      <div class="list-group-item bg-light d-flex justify-content-between align-items-center">
        <strong>Total de la orden:</strong>
        <strong class="text-success">$${totalOrden.toFixed(2)}</strong>
      </div>
    `;
  } else {
    pizzasAgregadasDiv.style.display = 'none';
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Validar acceso
  const rol = localStorage.getItem('userRol');
  const token = localStorage.getItem('token');
  if (!token || rol !== 'Cajero') {
    window.location.href = 'index.html';
    return;
  }

  // Mostrar la página (evitar parpadeo)
  document.documentElement.style.visibility = 'visible';

  // Botones de navegación
  document.getElementById('btnInicio').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  
  document.getElementById('btnSalir').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRol');
    localStorage.removeItem('userEmail');
    window.location.href = 'index.html';
  });

  // Botones de funcionalidad
  document.getElementById('btnNuevaOrden').addEventListener('click', openOrdenModal);
  document.getElementById('btnVerOrdenes').addEventListener('click', cargarOrdenes);
  // Botones deshabilitados: Buscar y Mis Órdenes eliminados del UI
  const btnBuscar = document.getElementById('btnBuscarOrdenes');
  if (btnBuscar) btnBuscar.remove();
  const btnMis = document.getElementById('btnMisOrdenes');
  if (btnMis) btnMis.remove();

  // Modal de nueva orden
  document.getElementById('modoEntrega').addEventListener('change', (e) => {
    const direccionContainer = document.getElementById('direccionContainer');
    if (e.target.value === 'domicilio') {
      direccionContainer.style.display = 'block';
      document.getElementById('direccionDomicilio').required = true;
    } else {
      direccionContainer.style.display = 'none';
      document.getElementById('direccionDomicilio').required = false;
    }
  });

  // Actualizar tamaños cuando cambie el tipo de pizza
  document.getElementById('tipoPizza').addEventListener('change', actualizarTamanos);
  
  // Actualizar precio cuando cambie el tamaño o cantidad
  document.getElementById('tamanoPizza').addEventListener('change', actualizarPrecio);
  document.getElementById('cantidad').addEventListener('input', actualizarPrecio);
  
  // Limpiar errores cuando el usuario empiece a escribir en los campos
  document.getElementById('nombreCliente').addEventListener('input', clearModalError);
  document.getElementById('direccionDomicilio').addEventListener('input', clearModalError);

  function actualizarTamanos() {
    const tipoPizza = document.getElementById('tipoPizza').value;
    const tamanoSelect = document.getElementById('tamanoPizza');
    
    // Limpiar errores del modal cuando se cambia la selección
    clearModalError();
    
    // Limpiar tamaños
    tamanoSelect.innerHTML = '<option value="">Seleccionar tamaño...</option>';
    
    if (tipoPizza) {
      // Buscar la opción seleccionada del tipo de pizza
      const tipoOption = document.querySelector(`#tipoPizza option[value="${tipoPizza}"]`);
      if (tipoOption && tipoOption.dataset.recetas) {
        const recetas = JSON.parse(tipoOption.dataset.recetas);
        
        // Agrupar por tamaño
        const tamanos = {};
        recetas.forEach(receta => {
          const tamaño = receta.tamano || 'MEDIANA';
          console.log('🔍 Receta procesada:', { nombre: receta.nombre, tamano: receta.tamano, tamaño_final: tamaño }); // Debug
          if (!tamanos[tamaño]) {
            tamanos[tamaño] = receta;
          }
        });
        
        console.log('📏 Tamaños disponibles:', Object.keys(tamanos)); // Debug
        
        // Agregar opciones de tamaño
        Object.keys(tamanos).forEach(tamaño => {
          const option = document.createElement('option');
          option.value = tamaño;
          option.textContent = tamaño;
          option.dataset.receta = JSON.stringify(tamanos[tamaño]);
          tamanoSelect.appendChild(option);
        });
      }
    }
    
    // Limpiar precio cuando cambia el tipo
    document.getElementById('precioUnitario').value = '';
    document.getElementById('precioUnitario').readOnly = false;
    const totalElement = document.getElementById('totalCalculado');
    if (totalElement) {
      totalElement.remove();
    }
  }

  function actualizarPrecio() {
    const tamaño = document.getElementById('tamanoPizza').value;
    const cantidad = parseInt(document.getElementById('cantidad').value) || 1;
    
    // Limpiar errores del modal cuando se cambia la selección
    clearModalError();
    
    if (tamaño) {
      // Buscar la opción seleccionada del tamaño
      const tamañoOption = document.querySelector(`#tamanoPizza option[value="${tamaño}"]`);
      if (tamañoOption && tamañoOption.dataset.receta) {
        const receta = JSON.parse(tamañoOption.dataset.receta);
        
        if (receta && receta.precio_base) {
          const precioUnitario = parseFloat(receta.precio_base);
          const total = precioUnitario * cantidad;
          
          document.getElementById('precioUnitario').value = precioUnitario.toFixed(2);
          document.getElementById('precioUnitario').readOnly = true;
          
          // Mostrar el total calculado
          const totalElement = document.getElementById('totalCalculado');
          if (!totalElement) {
            const totalDiv = document.createElement('div');
            totalDiv.id = 'totalCalculado';
            totalDiv.className = 'alert alert-info mt-2';
            totalDiv.innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
            document.getElementById('precioUnitario').parentNode.appendChild(totalDiv);
          } else {
            totalElement.innerHTML = `<strong>Total: $${total.toFixed(2)}</strong>`;
          }
        }
      }
    } else {
      document.getElementById('precioUnitario').readOnly = false;
      const totalElement = document.getElementById('totalCalculado');
      if (totalElement) {
        totalElement.remove();
      }
    }
  }

  document.getElementById('guardarOrdenBtn').addEventListener('click', async () => {
    try {
      console.log('Botón clickeado - Estado actual:', { ordenActual, pizzasEnOrden: pizzasEnOrden.length }); // Debug
      
      const tipoPizza = document.getElementById('tipoPizza').value;
      const tamaño = document.getElementById('tamanoPizza').value;
      const cantidad = parseInt(document.getElementById('cantidad').value);
      const precioUnitario = parseFloat(document.getElementById('precioUnitario').value);
      
      console.log('Datos del formulario:', { tipoPizza, tamaño, cantidad, precioUnitario }); // Debug
      
      // Obtener la receta seleccionada
      const tamañoOption = document.querySelector(`#tamanoPizza option[value="${tamaño}"]`);
      const receta = tamañoOption ? JSON.parse(tamañoOption.dataset.receta) : null;
      
      const ordenData = {
        nombre: document.getElementById('nombreCliente').value.trim(),
        pizza_id: receta ? receta.id : null, // Agregar pizza_id
        pizza_name: tipoPizza,
        pizza_size: tamaño,
        quantity: cantidad,
        unit_price: precioUnitario,
        total_price: precioUnitario * cantidad,
        modo_entrega: document.getElementById('modoEntrega').value,
        orden_direccion: document.getElementById('modoEntrega').value === 'domicilio' ? 
          document.getElementById('direccionDomicilio').value.trim() : null,
        receta_id: receta ? receta.id : null,
        order_id: ordenActual // Incluir order_id si existe una orden en progreso
      };

      console.log('Datos de la orden a enviar:', ordenData); // Debug

      // Validaciones básicas
      let camposFaltantes = [];
      if (!ordenData.nombre || ordenData.nombre.trim() === '') camposFaltantes.push('Nombre del Cliente');
      if (!ordenData.pizza_name || ordenData.pizza_name.trim() === '') camposFaltantes.push('Tipo de Pizza');
      if (!ordenData.pizza_size || ordenData.pizza_size.trim() === '') camposFaltantes.push('Tamaño');
      if (!ordenData.quantity || ordenData.quantity <= 0) camposFaltantes.push('Cantidad (debe ser mayor a 0)');
      if (!ordenData.unit_price || ordenData.unit_price <= 0) camposFaltantes.push('Precio Unitario (debe ser mayor a 0)');
      if (!ordenData.modo_entrega || ordenData.modo_entrega.trim() === '') camposFaltantes.push('Modo de Entrega');
      
      if (camposFaltantes.length > 0) {
        const errorMessage = `Por favor completa todos los campos requeridos:\n\n• ${camposFaltantes.join('\n• ')}`;
        showModalError(errorMessage, 'warning');
        return;
      }

      if (ordenData.modo_entrega === 'domicilio' && (!ordenData.orden_direccion || ordenData.orden_direccion.trim() === '')) {
        showModalError('La dirección es requerida para órdenes a domicilio.\n\nPor favor, ingresa la dirección de entrega.', 'warning');
        return;
      }

      const response = await apiSend('/api/ordenes', 'POST', ordenData);
      
      if (response.success) {
        console.log('Respuesta exitosa:', response); // Debug
        console.log('ordenActual antes:', ordenActual); // Debug
        
        // Si es una nueva orden, guardar el order_id
        if (!ordenActual && response.orden && response.orden.order_id) {
          ordenActual = response.orden.order_id;
          pizzasEnOrden = [response.orden];
          
          console.log('Nueva orden creada:', ordenActual); // Debug
          console.log('Pizzas en orden:', pizzasEnOrden); // Debug
          
          // Actualizar UI del modal
          document.getElementById('ordenModalTitle').textContent = `Orden ${ordenActual} - Agregar Pizza`;
          document.getElementById('finalizarOrdenBtn').style.display = 'inline-block';
          document.getElementById('guardarOrdenBtn').innerHTML = '<i class="bi bi-plus-circle me-1"></i>Agregar Pizza';
          
          console.log('Botón Finalizar Orden mostrado'); // Debug
          console.log('Botón Guardar actualizado a "Agregar Pizza"'); // Debug
          console.log('Título del modal actualizado:', document.getElementById('ordenModalTitle').textContent); // Debug
          console.log('Botón Finalizar Orden visible:', document.getElementById('finalizarOrdenBtn').style.display); // Debug
          
          showAlert(`Pizza agregada a la orden ${ordenActual}. Puedes agregar más pizzas o finalizar la orden.`, 'success');
        } else {
          // Agregar pizza a orden existente
          pizzasEnOrden.push(response.orden);
          console.log('Pizza agregada a orden existente:', response.orden); // Debug
          showAlert('Pizza agregada exitosamente', 'success');
        }
        
        // Mostrar pizzas agregadas
        mostrarPizzasAgregadas();
        
        // Limpiar solo los campos de pizza, mantener cliente y modo de entrega
        document.getElementById('tipoPizza').value = '';
        document.getElementById('tamanoPizza').innerHTML = '<option value="">Primero selecciona un tipo</option>';
        document.getElementById('cantidad').value = '1';
        document.getElementById('precioUnitario').value = '';
        document.getElementById('precioUnitario').readOnly = false;
        const totalElement = document.getElementById('totalCalculado');
        if (totalElement) {
          totalElement.remove();
        }
        
        // No cerrar el modal para permitir agregar más pizzas
        // closeOrdenModal();
        // cargarOrdenes(); // Recargar la lista
      }
    } catch (e) {
      console.log('Error al crear orden:', e.message); // Debug
      
      // Manejar errores específicos de stock
      if (e.message.includes('No hay inventario suficiente') || e.message.includes('stock suficiente')) {
        // Intentar extraer información de ingredientes faltantes del mensaje
        let errorMessage = 'No hay stock suficiente para esta receta.';
        
        if (e.message.includes('Ingredientes faltantes:')) {
          const ingredientesFaltantes = e.message.split('Ingredientes faltantes: ')[1];
          errorMessage += `\n\nIngredientes faltantes: ${ingredientesFaltantes}`;
        }
        
        errorMessage += '\n\nPor favor, selecciona otra opción o contacta al administrador para reponer el inventario.';
        
        // Mostrar error en el modal
        showModalError(errorMessage, 'warning');
      } else if (e.message.includes('pizza_size y total_price son obligatorios')) {
        showModalError('Error: Faltan datos requeridos. Por favor, verifica que hayas seleccionado tipo y tamaño de pizza.', 'warning');
      } else if (e.message.includes('Acceso denegado') || e.message.includes('autenticación')) {
        showModalError('Error de autenticación. Por favor, inicia sesión nuevamente.', 'danger');
      } else {
        showModalError(`Error: ${e.message}`, 'danger');
      }
    }
  });

  // Event listener para finalizar orden
  document.getElementById('finalizarOrdenBtn').addEventListener('click', finalizarOrden);

  // Event listener para cancelar orden (modificar el botón cancelar)
  document.querySelector('[data-bs-dismiss="modal"]').addEventListener('click', cancelarOrden);

  // Mostrar información del usuario
  const userEmail = localStorage.getItem('userEmail');
  if (userEmail) {
    showAlert(`Bienvenido, ${userEmail}`, 'info');
  } else {
    showAlert('No hay email de usuario en localStorage. Las órdenes pueden no cargar correctamente.', 'warning');
  }
});
