/*
 * main.js
 * Punto de arranque. Conecta los eventos de la página con la lógica
 * (Proyectos), la persistencia (Almacenamiento) y la vista (Interfaz).
 * Este es el único archivo que conoce a los otros tres.
 */
const App = {
  // null significa que el formulario está en modo "crear"
  idEnEdicion: null,

  iniciar() {
    Interfaz.inicializar();
    this.cargarDatosGuardados();
    this.registrarEventos();
    this.refrescar();
  },

  cargarDatosGuardados() {
    const { proyectos, error } = Almacenamiento.cargar();
    Proyectos.inicializar(proyectos);
    if (error) {
      Interfaz.notificar(error, 'error');
    }
  },

  registrarEventos() {
    const formulario = document.getElementById('formulario-proyecto');
    formulario.addEventListener('submit', (evento) => this.manejarEnvio(evento));
    formulario.addEventListener('input', (evento) => this.manejarEscrituraEnCampo(evento));
    document.getElementById('boton-cancelar').addEventListener('click', () => this.cancelarEdicion());

    // Un solo listener en el tbody en vez de uno por botón: las filas se
    // vuelven a crear en cada render y así no hay que reasignar nada.
    document.getElementById('cuerpo-tabla').addEventListener('click', (evento) => this.manejarAccionTabla(evento));
  },

  manejarAccionTabla(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) {
      return;
    }
    const { accion, id } = boton.dataset;
    if (accion === 'editar') {
      this.iniciarEdicion(id);
    }
  },

  iniciarEdicion(id) {
    const proyecto = Proyectos.obtener(id);
    if (!proyecto) {
      Interfaz.notificar('Ese proyecto ya no existe.', 'error');
      return;
    }
    this.idEnEdicion = id;
    Interfaz.activarModoEdicion(proyecto);
    this.refrescar();
  },

  cancelarEdicion() {
    this.salirDeEdicion();
    Interfaz.enfocarPrimerCampo();
  },

  /** Deja el formulario en modo crear y quita el resaltado de la fila. */
  salirDeEdicion() {
    this.idEnEdicion = null;
    Interfaz.desactivarModoEdicion();
    this.refrescar();
  },

  /** Al escribir en un campo con error, el mensaje se quita para no regañar de más. */
  manejarEscrituraEnCampo(evento) {
    const campo = evento.target.name;
    if (campo) {
      Interfaz.limpiarErrorCampo(campo);
    }
    if (campo === 'descripcion') {
      Interfaz.actualizarContadorDescripcion();
    }
  },

  /** El mismo formulario sirve para crear y para editar; idEnEdicion decide cuál. */
  manejarEnvio(evento) {
    evento.preventDefault();
    if (this.idEnEdicion) {
      this.guardarEdicion();
    } else {
      this.guardarNuevo();
    }
  },

  guardarNuevo() {
    const resultado = Proyectos.crear(Interfaz.leerFormulario());
    if (!resultado.ok) {
      Interfaz.mostrarErrores(resultado.errores);
      return;
    }

    this.persistir();
    Interfaz.limpiarFormulario();
    Interfaz.enfocarPrimerCampo();
    Interfaz.notificar(`Proyecto "${resultado.proyecto.proyecto}" agregado.`, 'exito');
    this.refrescar();
  },

  guardarEdicion() {
    const resultado = Proyectos.actualizar(this.idEnEdicion, Interfaz.leerFormulario());

    // Caso raro: lo borraron en otra pestaña o ya no está en la lista
    if (resultado.noEncontrado) {
      Interfaz.notificar('El proyecto que editabas ya no existe.', 'error');
      this.salirDeEdicion();
      return;
    }
    if (!resultado.ok) {
      Interfaz.mostrarErrores(resultado.errores);
      return;
    }

    this.persistir();
    this.salirDeEdicion();
    Interfaz.enfocarPrimerCampo();
    Interfaz.notificar(`Cambios guardados en "${resultado.proyecto.proyecto}".`, 'exito');
  },

  /** Vuelve a pintar la tabla con el estado actual. Se llama después de cada cambio. */
  refrescar() {
    const proyectos = Proyectos.listar();
    Interfaz.renderTabla(proyectos, { idEnEdicion: this.idEnEdicion, total: proyectos.length });
  },

  /** Guarda la lista actual y avisa si el navegador no dejó hacerlo. */
  persistir() {
    const guardado = Almacenamiento.guardar(Proyectos.obtenerTodos());
    if (!guardado) {
      Interfaz.notificar('No se pudo guardar en este navegador. Los cambios se perderán al cerrar la página.', 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.iniciar());
