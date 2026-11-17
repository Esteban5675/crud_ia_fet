/*
 * interfaz.js
 * Todo lo que toca el DOM vive aquí: leer y llenar el formulario,
 * pintar la tabla, el diálogo y las notificaciones.
 * Regla que sigo en todo el archivo: los datos del usuario solo entran
 * con textContent, nunca con innerHTML, para evitar inyección de HTML (XSS).
 */
const Interfaz = {
  CAMPOS: ['cliente', 'proyecto', 'tecnologia', 'estado', 'valor', 'fechaEntrega', 'descripcion'],
  DURACION_TOAST: 4000,

  // Clase CSS de la etiqueta de cada estado
  CLASES_ESTADO: {
    'Pendiente': 'etiqueta--pendiente',
    'En desarrollo': 'etiqueta--desarrollo',
    'En revisión': 'etiqueta--revision',
    'Entregado': 'etiqueta--entregado'
  },

  // Los formateadores se crean una sola vez; crearlos en cada fila sería desperdicio
  formatoMoneda: new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }),
  formatoFecha: new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }),

  elementos: {},

  /** Busca una sola vez los elementos que se usan seguido. */
  inicializar() {
    const porId = (id) => document.getElementById(id);
    this.elementos = {
      formulario: porId('formulario-proyecto'),
      panelFormulario: document.querySelector('.panel--formulario'),
      tituloFormulario: porId('titulo-formulario'),
      botonGuardar: porId('boton-guardar'),
      botonCancelar: porId('boton-cancelar'),
      contadorDescripcion: porId('contador-descripcion'),
      tabla: porId('tabla-proyectos'),
      cuerpoTabla: porId('cuerpo-tabla'),
      tituloListado: porId('titulo-listado'),
      contadorResultados: porId('contador-resultados'),
      estadoVacio: porId('estado-vacio'),
      estadoVacioTitulo: porId('estado-vacio-titulo'),
      estadoVacioTexto: porId('estado-vacio-texto'),
      dialogo: porId('dialogo-confirmacion'),
      dialogoTitulo: porId('dialogo-titulo'),
      dialogoMensaje: porId('dialogo-mensaje'),
      dialogoDetalle: porId('dialogo-detalle'),
      dialogoConfirmar: porId('dialogo-confirmar'),
      dialogoCancelar: porId('dialogo-cancelar'),
      busqueda: porId('busqueda'),
      filtroEstado: porId('filtro-estado'),
      orden: porId('orden'),
      resumenTotal: porId('resumen-total'),
      resumenValor: porId('resumen-valor'),
      resumenDesarrollo: porId('resumen-desarrollo'),
      resumenEntregados: porId('resumen-entregados'),
      notificaciones: porId('notificaciones')
    };
  },

  /** Lee la búsqueda, el filtro y el orden que eligió la persona. */
  leerCriterios() {
    return {
      texto: this.elementos.busqueda.value,
      estado: this.elementos.filtroEstado.value,
      orden: this.elementos.orden.value
    };
  },

  /* ---------------- Resumen ---------------- */

  renderResumen({ total, valorTotal, enDesarrollo, entregados }) {
    this.elementos.resumenTotal.textContent = total;
    this.elementos.resumenValor.textContent = this.formatearValor(valorTotal);
    this.elementos.resumenDesarrollo.textContent = enDesarrollo;
    this.elementos.resumenEntregados.textContent = entregados;
  },

  /* ---------------- Formato ---------------- */

  formatearValor(valor) {
    return this.formatoMoneda.format(valor);
  },

  /**
   * new Date('2025-03-10') se interpreta como medianoche UTC, y en Colombia (UTC-5)
   * eso termina mostrando el 9 de marzo. Armando la fecha con sus partes queda en hora local.
   */
  formatearFecha(textoFecha) {
    const [anio, mes, dia] = textoFecha.split('-').map(Number);
    return this.formatoFecha.format(new Date(anio, mes - 1, dia));
  },

  /* ---------------- Tabla ---------------- */

  /**
   * Pinta la tabla completa con la lista recibida.
   * @param {Array} proyectos lista ya filtrada y ordenada
   * @param {Object} opciones idEnEdicion para resaltar la fila, total para el contador
   */
  renderTabla(proyectos, { idEnEdicion = null, total = proyectos.length } = {}) {
    const filas = proyectos.map((proyecto) => this.crearFila(proyecto, proyecto.id === idEnEdicion));
    this.elementos.cuerpoTabla.replaceChildren(...filas);

    const hayResultados = proyectos.length > 0;
    this.elementos.tabla.hidden = !hayResultados;
    this.elementos.estadoVacio.hidden = hayResultados;
    if (!hayResultados) {
      this.mostrarEstadoVacio(total > 0);
    }
    this.actualizarContadorResultados(proyectos.length, total);
  },

  crearFila(proyecto, enEdicion) {
    const fila = document.createElement('tr');
    fila.dataset.id = proyecto.id;
    if (enEdicion) {
      fila.classList.add('fila--editando');
      fila.setAttribute('aria-current', 'true');
    }

    fila.append(
      this.crearCelda('Cliente', proyecto.cliente),
      this.crearCeldaProyecto(proyecto),
      this.crearCelda('Tecnología', proyecto.tecnologia),
      this.crearCeldaEstado(proyecto.estado),
      this.crearCelda('Valor', this.formatearValor(proyecto.valor), 'tabla__numero'),
      this.crearCelda('Entrega', this.formatearFecha(proyecto.fechaEntrega), 'tabla__fecha'),
      this.crearCeldaAcciones(proyecto)
    );
    return fila;
  },

  /** data-etiqueta lo usa el CSS para mostrar el nombre del dato cuando la tabla se vuelve tarjeta en móvil. */
  crearCelda(etiqueta, texto, clase = '') {
    const celda = document.createElement('td');
    celda.dataset.etiqueta = etiqueta;
    celda.textContent = texto;
    if (clase) {
      celda.className = clase;
    }
    return celda;
  },

  /** El nombre del proyecto va con su descripción debajo, si tiene. */
  crearCeldaProyecto(proyecto) {
    const celda = this.crearCelda('Proyecto', '', 'tabla__proyecto');
    const contenido = document.createElement('div');
    const nombre = document.createElement('strong');
    nombre.textContent = proyecto.proyecto;
    contenido.appendChild(nombre);

    if (proyecto.descripcion) {
      const descripcion = document.createElement('span');
      descripcion.className = 'tabla__secundario';
      descripcion.textContent = proyecto.descripcion;
      contenido.appendChild(descripcion);
    }
    celda.appendChild(contenido);
    return celda;
  },

  crearCeldaEstado(estado) {
    const celda = this.crearCelda('Estado', '');
    const etiqueta = document.createElement('span');
    etiqueta.className = `etiqueta ${this.CLASES_ESTADO[estado] || 'etiqueta--pendiente'}`;
    etiqueta.textContent = estado;
    celda.appendChild(etiqueta);
    return celda;
  },

  crearCeldaAcciones(proyecto) {
    const celda = document.createElement('td');
    celda.className = 'tabla__celda-acciones';
    const contenedor = document.createElement('div');
    contenedor.className = 'tabla__acciones';
    contenedor.append(
      this.crearBotonAccion('Editar', 'editar', proyecto, 'boton--secundario'),
      this.crearBotonAccion('Eliminar', 'eliminar', proyecto, 'boton--peligro-suave')
    );
    celda.appendChild(contenedor);
    return celda;
  },

  /**
   * Los botones solo dicen "Editar" o "Eliminar", pero con aria-label el lector
   * de pantalla sabe de qué proyecto se trata. La acción se lee en main.js
   * por delegación de eventos usando data-accion y data-id.
   */
  crearBotonAccion(texto, accion, proyecto, clase) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `boton boton--pequeno ${clase}`;
    boton.textContent = texto;
    boton.dataset.accion = accion;
    boton.dataset.id = proyecto.id;
    boton.setAttribute('aria-label', `${texto} ${proyecto.proyecto} de ${proyecto.cliente}`);
    return boton;
  },

  /** Mensaje distinto si no hay nada guardado o si es la búsqueda la que no encontró nada. */
  mostrarEstadoVacio(hayProyectosOcultos) {
    if (hayProyectosOcultos) {
      this.elementos.estadoVacioTitulo.textContent = 'Ningún proyecto coincide con la búsqueda.';
      this.elementos.estadoVacioTexto.textContent = 'Prueba con otra palabra o cambia el filtro de estado.';
    } else {
      this.elementos.estadoVacioTitulo.textContent = 'Todavía no tienes proyectos registrados.';
      this.elementos.estadoVacioTexto.textContent = 'Agrega el primero con el formulario o usa "Cargar datos de ejemplo" para ver cómo funciona.';
    }
  },

  actualizarContadorResultados(visibles, total) {
    const texto = visibles === total
      ? `${total} ${total === 1 ? 'proyecto' : 'proyectos'}`
      : `Mostrando ${visibles} de ${total}`;
    this.elementos.contadorResultados.textContent = texto;
  },

  /* ---------------- Formulario ---------------- */

  /** Devuelve los valores tal cual están en el formulario (la limpieza la hace Proyectos). */
  leerFormulario() {
    const formulario = this.elementos.formulario;
    const datos = {};
    this.CAMPOS.forEach((campo) => {
      datos[campo] = formulario.elements[campo].value;
    });
    return datos;
  },

  limpiarFormulario() {
    this.elementos.formulario.reset();
    this.limpiarErrores();
    this.actualizarContadorDescripcion();
  },

  /** Pone los datos de un proyecto en el formulario para editarlo. */
  llenarFormulario(proyecto) {
    const formulario = this.elementos.formulario;
    this.limpiarErrores();
    this.CAMPOS.forEach((campo) => {
      formulario.elements[campo].value = proyecto[campo] ?? '';
    });
    this.actualizarContadorDescripcion();
  },

  /** Cambia títulos y botones para que quede claro que se está editando y no creando. */
  activarModoEdicion(proyecto) {
    this.llenarFormulario(proyecto);
    this.elementos.tituloFormulario.textContent = 'Editar proyecto';
    this.elementos.botonGuardar.textContent = 'Guardar cambios';
    this.elementos.botonCancelar.hidden = false;
    this.elementos.panelFormulario.classList.add('panel--editando');
    // En móvil el formulario queda arriba de la tabla, así que lo traigo a la vista.
    // Si la persona pidió menos movimiento en su sistema, el salto es inmediato.
    const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.elementos.panelFormulario.scrollIntoView({ behavior: menosMovimiento ? 'auto' : 'smooth', block: 'start' });
    // preventScroll evita que el foco corte a la mitad el desplazamiento suave
    this.elementos.formulario.elements.cliente.focus({ preventScroll: true });
  },

  desactivarModoEdicion() {
    this.limpiarFormulario();
    this.elementos.tituloFormulario.textContent = 'Nuevo proyecto';
    this.elementos.botonGuardar.textContent = 'Agregar proyecto';
    this.elementos.botonCancelar.hidden = true;
    this.elementos.panelFormulario.classList.remove('panel--editando');
  },

  enfocarPrimerCampo() {
    this.elementos.formulario.elements.cliente.focus();
  },

  /** Muestra cada mensaje de error debajo de su campo y lo marca como inválido. */
  mostrarErrores(errores) {
    this.limpiarErrores();
    Object.entries(errores).forEach(([campo, mensaje]) => {
      this.marcarError(campo, mensaje);
    });
    this.enfocarPrimerError(errores);
  },

  marcarError(campo, mensaje) {
    const control = this.elementos.formulario.elements[campo];
    const parrafo = document.getElementById(`error-${campo}`);
    if (!control || !parrafo) {
      return;
    }
    control.setAttribute('aria-invalid', 'true');
    parrafo.textContent = mensaje;
  },

  limpiarErrorCampo(campo) {
    const control = this.elementos.formulario.elements[campo];
    const parrafo = document.getElementById(`error-${campo}`);
    if (control) {
      control.removeAttribute('aria-invalid');
    }
    if (parrafo) {
      parrafo.textContent = '';
    }
  },

  limpiarErrores() {
    this.CAMPOS.forEach((campo) => this.limpiarErrorCampo(campo));
  },

  /** Lleva el foco al primer campo con error, en el orden en que aparecen en pantalla. */
  enfocarPrimerError(errores) {
    const primero = this.CAMPOS.find((campo) => campo in errores);
    if (primero) {
      this.elementos.formulario.elements[primero].focus();
    }
  },

  actualizarContadorDescripcion() {
    // El máximo sale del maxlength del HTML para no tener el 300 escrito en dos lugares
    const descripcion = this.elementos.formulario.elements.descripcion;
    this.elementos.contadorDescripcion.textContent = `${descripcion.value.length} / ${descripcion.maxLength}`;
  },

  /* ---------------- Diálogo de confirmación ---------------- */

  /**
   * Abre el <dialog> y devuelve una promesa que se resuelve en true solo si
   * la persona pulsa el botón de confirmar. Cancelar o la tecla Escape dan false.
   * Así main.js puede usarlo con await, parecido a confirm() pero accesible y con estilo.
   */
  confirmar({ titulo, mensaje, detalle = '', textoConfirmar = 'Eliminar', destructiva = true }) {
    const { dialogo, dialogoTitulo, dialogoMensaje, dialogoDetalle, dialogoConfirmar, dialogoCancelar } = this.elementos;
    const elementoAnterior = document.activeElement;

    dialogoTitulo.textContent = titulo;
    dialogoMensaje.textContent = mensaje;
    dialogoDetalle.textContent = detalle;
    dialogoConfirmar.textContent = textoConfirmar;
    // Rojo solo cuando de verdad se va a borrar algo
    dialogoConfirmar.classList.toggle('boton--peligro', destructiva);
    dialogoConfirmar.classList.toggle('boton--primario', !destructiva);
    dialogo.returnValue = ''; // si no se limpia, queda el valor de la vez anterior

    return new Promise((resolver) => {
      dialogo.addEventListener('close', () => {
        resolver(dialogo.returnValue === 'confirmar');
        // Espero un turno para que quien llamó alcance a borrar la fila antes de devolver el foco
        setTimeout(() => this.restaurarFoco(elementoAnterior), 0);
      }, { once: true });

      dialogo.showModal();
      // Para acciones destructivas el foco arranca en Cancelar: un Enter por accidente no borra nada
      dialogoCancelar.focus();
    });
  },

  /**
   * Devuelve el foco a donde estaba antes del diálogo. Si ese botón ya no existe
   * (porque su fila se eliminó), lo llevo al título de la lista para no dejarlo perdido.
   */
  restaurarFoco(elemento) {
    if (elemento && elemento.isConnected && elemento !== document.body) {
      elemento.focus();
    } else {
      this.elementos.tituloListado.focus();
    }
  },

  /* ---------------- Notificaciones ---------------- */

  /**
   * Muestra un toast que se va solo. El contenedor tiene aria-live,
   * así que los lectores de pantalla lo anuncian sin mover el foco.
   * @param {string} mensaje
   * @param {'exito'|'error'|'info'} tipo
   */
  notificar(mensaje, tipo = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;
    toast.textContent = mensaje;
    this.elementos.notificaciones.appendChild(toast);

    setTimeout(() => this.cerrarToast(toast), this.DURACION_TOAST);
  },

  cerrarToast(toast) {
    toast.classList.add('toast--saliendo');
    // Espero a que termine la transición antes de quitarlo del DOM
    setTimeout(() => toast.remove(), 200);
  }
};
