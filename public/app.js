// =========================
// REFERENCIAS DEL DOM
// =========================
const formPersona = document.getElementById('formPersona');
const personaSelect = document.getElementById('personaSelect');
const btnCargar = document.getElementById('btnCargar');
const btnGuardarRegistro = document.getElementById('btnGuardarRegistro');

const tablaPersonas = document.getElementById('tablaPersonas');
const tablaRegistros = document.getElementById('tablaRegistros');

const btnMostrarActivas = document.getElementById('btnMostrarActivas');
const btnMostrarTodas = document.getElementById('btnMostrarTodas');

const filtroIdentificacion = document.getElementById('filtroIdentificacion');
const filtroApellido = document.getElementById('filtroApellido');

const filtroHistorialIdentificacion = document.getElementById('filtroHistorialIdentificacion');
const filtroHistorialApellido = document.getElementById('filtroHistorialApellido');
const filtroHistorialFecha = document.getElementById('filtroHistorialFecha');
const btnLimpiarFiltrosHistorial = document.getElementById('btnLimpiarFiltrosHistorial');

const tabs = document.querySelectorAll('.tabBtn');
const vistas = document.querySelectorAll('.vista');

const anioEstadistica = document.getElementById('anioEstadistica');

const estadisticaPersona = document.getElementById('estadisticaPersona');
const tipoEstadistica = document.getElementById('tipoEstadistica');
const btnCargarEstadisticas = document.getElementById('btnCargarEstadisticas');
const resumenEstadisticas = document.getElementById('resumenEstadisticas');
const tablaEstadisticas = document.getElementById('tablaEstadisticas');

const btnTema = document.getElementById('btnTema');



// =========================
// ESTADO GLOBAL
// =========================
let vistaPersonas = 'activas';
let listaPersonas = [];
let listaRegistros = [];

// =========================
// UTILIDADES DE INTERFAZ
// =========================

function aplicarTema(tema) {
  if (tema === 'oscuro') {
    document.body.classList.add('modoOscuro');
    btnTema.textContent = '☀️ Modo claro';
  } else {
    document.body.classList.remove('modoOscuro');
    btnTema.textContent = '🌙 Modo oscuro';
  }
}

function alternarTema() {
  const esOscuro = document.body.classList.contains('modoOscuro');
  const nuevoTema = esOscuro ? 'claro' : 'oscuro';

  aplicarTema(nuevoTema);
  localStorage.setItem('temaControlHorario', nuevoTema);
}

function obtenerSemanaISOYAnio(fechaTexto) {
  const fecha = new Date(`${fechaTexto}T00:00:00`);
  const fechaUTC = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));

  const dia = fechaUTC.getUTCDay() || 7;
  fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - dia);

  const anioISO = fechaUTC.getUTCFullYear();
  const inicioAnio = new Date(Date.UTC(anioISO, 0, 1));
  const numeroSemana = Math.ceil((((fechaUTC - inicioAnio) / 86400000) + 1) / 7);

  return {
    anioISO,
    numeroSemana
  };
}

function obtenerRangoSemanaISO(anio, semana) {
  const enero4 = new Date(Date.UTC(anio, 0, 4));
  const diaSemana = enero4.getUTCDay() || 7;
  const lunesSemana1 = new Date(enero4);
  lunesSemana1.setUTCDate(enero4.getUTCDate() - diaSemana + 1);

  const lunes = new Date(lunesSemana1);
  lunes.setUTCDate(lunesSemana1.getUTCDate() + (semana - 1) * 7);

  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);

  return { lunes, domingo };
}

function formatearFechaSimple(fecha) {
  return fecha.toLocaleDateString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function agruparRegistrosPorSemanaISO(registros, anioFiltro = '') {
  const grupos = {};

  registros.forEach((r) => {
    if (!r.fecha) return;

    const { anioISO, numeroSemana } = obtenerSemanaISOYAnio(r.fecha);

    if (anioFiltro && String(anioISO) !== String(anioFiltro)) {
      return;
    }

    const clave = `${anioISO}-${String(numeroSemana).padStart(2, '0')}`;

    if (!grupos[clave]) {
      grupos[clave] = {
        periodo: clave,
        total_minutos: 0,
        cantidad_registros: 0
      };
    }

    grupos[clave].total_minutos += Number(r.minutos_trabajados || 0);
    grupos[clave].cantidad_registros += 1;
  });

  return Object.values(grupos).sort((a, b) => b.periodo.localeCompare(a.periodo));
}

function obtenerRangoSemana(anio, semana) {
  // Tomamos el 1 de enero
  const fecha = new Date(anio, 0, 1);

  // Ajuste para llegar a la semana correcta
  const dias = (semana - 1) * 7;
  fecha.setDate(fecha.getDate() + dias);

  // Buscar el lunes de esa semana
  const dia = fecha.getDay();
  const diferencia = (dia === 0 ? -6 : 1) - dia;

  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diferencia);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  return { lunes, domingo };
}


function formatearPeriodo(periodo, tipo) {
  if (!periodo) return '';

  if (tipo === 'mensual') {
    const [anio, mes] = periodo.split('-');
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const indiceMes = parseInt(mes, 10) - 1;
    const nombreMes = meses[indiceMes] || mes;

    return `${nombreMes} ${anio}`;
  }

  if (tipo === 'semanal') {
    const [anio, semana] = periodo.split('-');

    const { lunes, domingo } = obtenerRangoSemanaISO(
      parseInt(anio, 10),
      parseInt(semana, 10)
    );

    return `Semana del ${formatearFechaSimple(lunes)} al ${formatearFechaSimple(domingo)}`;
  }

  return periodo;
}

function cargarAniosEstadistica() {
  const anioActual = new Date().getFullYear();

  anioEstadistica.innerHTML = '<option value="">Todos</option>';

  for (let anio = anioActual; anio >= anioActual - 5; anio--) {
    const option = document.createElement('option');
    option.value = anio;
    option.textContent = anio;
    anioEstadistica.appendChild(option);
  }
}
function mostrarMensaje(texto, tipo = 'exito') {
  const div = document.getElementById('mensaje');

  div.textContent = texto;
  div.className = `mensaje ${tipo}`;
  div.classList.remove('oculto');

  setTimeout(() => {
    div.classList.add('oculto');
  }, 3000);
}

function pedirConfirmacion(titulo, texto) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('overlayConfirm');
    const confirmTitulo = document.getElementById('confirmTitulo');
    const confirmTexto = document.getElementById('confirmTexto');
    const btnAceptar = document.getElementById('btnAceptarConfirm');
    const btnCancelar = document.getElementById('btnCancelarConfirm');

    confirmTitulo.textContent = titulo;
    confirmTexto.textContent = texto;

    overlay.classList.remove('oculto');

    function limpiar(resultado) {
      overlay.classList.add('oculto');
      btnAceptar.removeEventListener('click', aceptar);
      btnCancelar.removeEventListener('click', cancelar);
      overlay.removeEventListener('click', clickFuera);
      resolve(resultado);
    }

    function aceptar(e) {
      e.stopPropagation();
      limpiar(true);
    }

    function cancelar(e) {
      e.stopPropagation();
      limpiar(false);
    }

    function clickFuera(e) {
      if (e.target === overlay) {
        limpiar(false);
      }
    }

    btnAceptar.addEventListener('click', aceptar);
    btnCancelar.addEventListener('click', cancelar);
    overlay.addEventListener('click', clickFuera);
  });
}

// =========================
// NAVEGACIÓN SPA
// =========================
function cambiarVista(idVista) {
  vistas.forEach((vista) => {
    vista.classList.add('oculto');
    vista.classList.remove('activa');
  });

  tabs.forEach((tab) => {
    tab.classList.remove('activo');
  });

  document.getElementById(idVista).classList.remove('oculto');
  document.getElementById(idVista).classList.add('activa');

  const tabActivo = document.querySelector(`[data-vista="${idVista}"]`);
  if (tabActivo) {
    tabActivo.classList.add('activo');
  }
}

// =========================
// FORMATEADORES
// =========================
function formatearFechaHora(valor) {
  if (!valor) return '';

  const fecha = new Date(valor);
  return fecha.toLocaleString('es-UY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatearMinutos(minutos) {
  if (minutos == null) return '';

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h ${resto}m`;
}

// =========================
// PERSONAS
// =========================
async function cargarPersonas() {
  const url = vistaPersonas === 'todas'
    ? '/api/personas/todas'
    : '/api/personas';

  const res = await fetch(url);
  const personas = await res.json();

  listaPersonas = personas;

  renderizarTablaPersonas();
  await cargarOpcionesRegistro();
}

function renderizarTablaPersonas() {
  const valorIdentificacion = filtroIdentificacion.value.trim().toLowerCase();
  const valorApellido = filtroApellido.value.trim().toLowerCase();

  const personasFiltradas = listaPersonas.filter((p) => {
    const identificacion = (p.identificacion || '').toLowerCase();
    const apellido = (p.apellido || '').toLowerCase();

    const coincideIdentificacion = identificacion.includes(valorIdentificacion);
    const coincideApellido = apellido.includes(valorApellido);

    return coincideIdentificacion && coincideApellido;
  });

  tablaPersonas.innerHTML = '';

  if (personasFiltradas.length === 0) {
    tablaPersonas.innerHTML = `
      <tr>
        <td colspan="5">No se encontraron personas con esos filtros.</td>
      </tr>
    `;
    return;
  }

  personasFiltradas.forEach((p) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${p.identificacion ?? ''}</td>
      <td>${p.nombre}</td>
      <td>${p.apellido}</td>
      <td>${p.activo === 1 ? 'Activa' : 'Inactiva'}</td>
      <td>
        ${
          p.activo === 1
            ? `<button type="button" class="btnDesactivar" onclick="desactivarPersona(${p.id})">Desactivar</button>`
            : `<button type="button" class="btnActivar" onclick="activarPersona(${p.id})">Reactivar</button>`
        }
      </td>
    `;

    tablaPersonas.appendChild(tr);
  });
}

async function cargarOpcionesRegistro() {
  const res = await fetch('/api/personas');
  const personas = await res.json();

  personaSelect.innerHTML = '';
  estadisticaPersona.innerHTML = '';

  personas.forEach((p) => {
    const optionRegistro = document.createElement('option');
    optionRegistro.value = p.id;
    optionRegistro.textContent = `${p.apellido}, ${p.nombre} - ${p.identificacion ?? ''}`;
    personaSelect.appendChild(optionRegistro);

    const optionEstadistica = document.createElement('option');
    optionEstadistica.value = p.id;
    optionEstadistica.textContent = `${p.apellido}, ${p.nombre} - ${p.identificacion ?? ''}`;
    estadisticaPersona.appendChild(optionEstadistica);
  });
}

async function desactivarPersona(id) {
  const confirmado = await pedirConfirmacion(
    'Desactivar persona',
    'La persona dejará de aparecer como activa. ¿Querés continuar?'
  );

  if (!confirmado) return;

  const res = await fetch(`/api/personas/desactivar/${id}`, {
    method: 'PUT'
  });

  const data = await res.json();
  mostrarMensaje(data.mensaje || data.error, res.ok ? 'exito' : 'error');

  if (res.ok) {
    await cargarPersonas();
  }
}

async function activarPersona(id) {
  const confirmado = await pedirConfirmacion(
    'Reactivar persona',
    'La persona volverá a estar disponible para registrar horarios. ¿Querés continuar?'
  );

  if (!confirmado) return;

  const res = await fetch(`/api/personas/activar/${id}`, {
    method: 'PUT'
  });

  const data = await res.json();
  mostrarMensaje(data.mensaje || data.error, res.ok ? 'exito' : 'error');

  if (res.ok) {
    await cargarPersonas();
  }
}

// =========================
// REGISTROS
// =========================
async function cargarRegistros() {
  const res = await fetch('/api/registros');
  const registros = await res.json();

  listaRegistros = registros;
  renderizarTablaRegistros();
}

function renderizarTablaRegistros() {
  const filtroIdentificacion = document
    .getElementById('filtroHistorialIdentificacion')
    .value.trim()
    .toLowerCase();

  const filtroApellido = document
    .getElementById('filtroHistorialApellido')
    .value.trim()
    .toLowerCase();

  const filtroFecha = document.getElementById('filtroHistorialFecha').value;

  const registrosFiltrados = listaRegistros.filter((r) => {
    const identificacion = (r.identificacion || '').toLowerCase();
    const apellido = (r.apellido || '').toLowerCase();
    const fecha = r.fecha || '';

    const coincideIdentificacion = identificacion.includes(filtroIdentificacion);
    const coincideApellido = apellido.includes(filtroApellido);
    const coincideFecha = !filtroFecha || fecha === filtroFecha;

    return coincideIdentificacion && coincideApellido && coincideFecha;
  });

  tablaRegistros.innerHTML = '';

  if (registrosFiltrados.length === 0) {
    tablaRegistros.innerHTML = `
      <tr>
        <td colspan="7">No se encontraron registros con esos filtros.</td>
      </tr>
    `;
    return;
  }

  registrosFiltrados.forEach((r) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${r.identificacion ?? ''}</td>
      <td>${r.apellido}, ${r.nombre}</td>
      <td>${r.fecha}</td>
      <td>${formatearFechaHora(r.hora_entrada)}</td>
      <td>${formatearFechaHora(r.hora_salida)}</td>
      <td>${formatearMinutos(r.minutos_trabajados)}</td>
      <td>
        <button class="btnEliminar" onclick="eliminarRegistro(${r.id})" title="Eliminar registro">🗑️</button>
      </td>
    `;

    tablaRegistros.appendChild(tr);
  });
}

async function eliminarRegistro(id) {
  const confirmado = await pedirConfirmacion(
    'Eliminar registro',
    '¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.'
  );

  if (!confirmado) return;

  const boton = document.querySelector(`button[onclick="eliminarRegistro(${id})"]`);
  const fila = boton ? boton.closest('tr') : null;

  if (fila) {
    fila.classList.add('filaEliminando');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const res = await fetch(`/api/registros/${id}`, {
    method: 'DELETE'
  });

  const data = await res.json();
  mostrarMensaje(data.mensaje || data.error, res.ok ? 'exito' : 'error');

  if (res.ok) {
    await cargarRegistros();
  }
}

async function cargarEstadisticas() {
  const persona_id = estadisticaPersona.value;
  const tipo = tipoEstadistica.value;
  const anio = anioEstadistica.value;

  if (!persona_id) {
    mostrarMensaje('Seleccioná una persona para ver estadísticas', 'advertencia');
    return;
  }

  if (tipo === 'mensual') {
    let url = `/api/estadisticas/mensual?persona_id=${persona_id}`;

    if (anio) {
      url += `&anio=${anio}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.error || 'Error al cargar estadísticas', 'error');
      return;
    }

    renderizarEstadisticas(data, tipo, anio);
    return;
  }

  if (tipo === 'semanal') {
    const res = await fetch(`/api/registros?persona_id=${persona_id}`);
    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.error || 'Error al cargar estadísticas semanales', 'error');
      return;
    }

    const agrupados = agruparRegistrosPorSemanaISO(data, anio);
    renderizarEstadisticas(agrupados, tipo, anio);
  }
}

function renderizarEstadisticas(datos, tipo, anio) {
  tablaEstadisticas.innerHTML = '';
  resumenEstadisticas.innerHTML = '';

  if (!datos || datos.length === 0) {
    resumenEstadisticas.innerHTML = `
      <div class="tarjetaResumen">
        <strong>Sin datos</strong>
        <p>No hay registros para la persona seleccionada.</p>
      </div>
    `;

    tablaEstadisticas.innerHTML = `
      <tr>
        <td colspan="3">No hay estadísticas para mostrar.</td>
      </tr>
    `;
    return;
  }

  const totalMinutos = datos.reduce((acc, item) => acc + (item.total_minutos || 0), 0);
  const totalRegistros = datos.reduce((acc, item) => acc + (item.cantidad_registros || 0), 0);

  resumenEstadisticas.innerHTML = `
    <div class="tarjetaResumen">
      <strong>Total trabajado</strong>
      <p>${formatearMinutos(totalMinutos)}</p>
    </div>
    <div class="tarjetaResumen">
      <strong>Total de registros</strong>
      <p>${totalRegistros}</p>
    </div>
    <div class="tarjetaResumen">
      <strong>Tipo de resumen</strong>
      <p>${tipo === 'semanal' ? 'Semanal' : 'Mensual'}</p>
    </div>
    <div class="tarjetaResumen">
      <strong>Año</strong>
      <p>${anio || 'Todos'}</p>
    </div>
  `;

  datos.forEach((item) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${formatearPeriodo(item.periodo, tipo)}</td>
      <td>${formatearMinutos(item.total_minutos)}</td>
      <td>${item.cantidad_registros}</td>
    `;

    tablaEstadisticas.appendChild(tr);
  });
}

// =========================
// EVENTOS
// =========================
tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    cambiarVista(tab.dataset.vista);
  });
});

formPersona.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value;
  const apellido = document.getElementById('apellido').value;
  const identificacion = document.getElementById('identificacion').value;

  const res = await fetch('/api/personas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, apellido, identificacion })
  });

  const data = await res.json();
  mostrarMensaje(data.mensaje || data.error, res.ok ? 'exito' : 'error');

  if (res.ok) {
    formPersona.reset();
    await cargarPersonas();
  }
});

filtroHistorialIdentificacion.addEventListener('input', renderizarTablaRegistros);
filtroHistorialApellido.addEventListener('input', renderizarTablaRegistros);
filtroHistorialFecha.addEventListener('input', renderizarTablaRegistros);

btnLimpiarFiltrosHistorial.addEventListener('click', () => {
  filtroHistorialIdentificacion.value = '';
  filtroHistorialApellido.value = '';
  filtroHistorialFecha.value = '';
  renderizarTablaRegistros();
});

btnGuardarRegistro.addEventListener('click', async () => {
  const persona_id = personaSelect.value;
  const fecha = document.getElementById('fecha').value;
  const hora_entrada = document.getElementById('horaEntrada').value;
  const hora_salida = document.getElementById('horaSalida').value;

  if (!persona_id || !fecha || !hora_entrada || !hora_salida) {
    mostrarMensaje('Completá todos los campos', 'advertencia');
    return;
  }

  const res = await fetch('/api/registros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona_id, fecha, hora_entrada, hora_salida })
  });

  const data = await res.json();
  mostrarMensaje(data.mensaje || data.error, res.ok ? 'exito' : 'error');

  if (res.ok) {
    document.getElementById('horaEntrada').value = '';
    document.getElementById('horaSalida').value = '';
    await cargarRegistros();
  }
});

btnMostrarActivas.addEventListener('click', async () => {
  vistaPersonas = 'activas';
  filtroIdentificacion.value = '';
  filtroApellido.value = '';
  await cargarPersonas();
});

btnMostrarTodas.addEventListener('click', async () => {
  vistaPersonas = 'todas';
  filtroIdentificacion.value = '';
  filtroApellido.value = '';
  await cargarPersonas();
});

filtroIdentificacion.addEventListener('input', renderizarTablaPersonas);
filtroApellido.addEventListener('input', renderizarTablaPersonas);

btnCargar.addEventListener('click', cargarRegistros);

btnCargarEstadisticas.addEventListener('click', cargarEstadisticas);

btnTema.addEventListener('click', alternarTema);

// =========================
// ARRANQUE
// =========================

const temaGuardado = localStorage.getItem('temaControlHorario') || 'claro';
aplicarTema(temaGuardado);
cargarAniosEstadistica();
cargarPersonas();
cargarRegistros();