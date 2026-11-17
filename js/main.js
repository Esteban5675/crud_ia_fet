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
    const descartados = Proyectos.inicializar(proyectos);
    if (error) {
      Interfaz.notificar(error, 'error');
    } else if (descartados > 0) {
      Interfaz.notificar(`Se ignoraron ${descartados} registro(s) guardados con datos inválidos.`, 'error');
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

    // 'input' en la búsqueda filtra mientras se escribe; 'change' basta para los select
    document.getElementById('busqueda').addEventListener('input', () => this.refrescar());
    document.getElementById('filtro-estado').addEventListener('change', () => this.refrescar());
    document.getElementById('orden').addEventListener('change', () => this.refrescar());

    document.getElementById('boton-ejemplos').addEventListener('click', () => this.cargarEjemplos());
    document.getElementById('boton-borrar-todo').addEventListener('click', () => this.borrarTodo());
  },

  /** Si ya hay proyectos, pregunto antes para no mezclar datos reales con los de prueba sin querer. */
  async cargarEjemplos() {
    if (!Proyectos.estaVacia()) {
      const confirmado = await Interfaz.confirmar({
        titulo: 'Cargar datos de ejemplo',
        mensaje: 'Ya tienes proyectos registrados. Los 5 ejemplos se agregarán junto a los que ya existen.',
        textoConfirmar: 'Agregar ejemplos',
        destructiva: false
      });
      if (!confirmado) {
        return;
      }
    }

    const cantidad = Proyectos.cargarEjemplos();
    this.persistir();
    this.refrescar();
    Interfaz.notificar(`Se agregaron ${cantidad} proyectos de ejemplo.`, 'exito');
  },

  async borrarTodo() {
    if (Proyectos.estaVacia()) {
      Interfaz.notificar('No hay proyectos para borrar.', 'info');
      return;
    }

    const { total } = Proyectos.resumen();
    const confirmado = await Interfaz.confirmar({
      titulo: 'Borrar todos los proyectos',
      mensaje: 'Se eliminarán todos los proyectos guardados en este navegador. Esta acción no se puede deshacer.',
      detalle: `${total} ${total === 1 ? 'proyecto' : 'proyectos'} en total`,
      textoConfirmar: 'Borrar todo'
    });
    if (!confirmado) {
      return;
    }

    Proyectos.borrarTodo();
    this.persistir();
    this.salirDeEdicion(); // también limpia el formulario si había algo en edición
    Interfaz.notificar('Se borraron todos los proyectos.', 'exito');
  },

  manejarAccionTabla(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) {
      return;
    }
    const { accion, id } = boton.dataset;
    if (accion === 'editar') {
      this.iniciarEdicion(id);
    } else if (accion === 'eliminar') {
      this.confirmarEliminacion(id);
    }
  },

  async confirmarEliminacion(id) {
    const proyecto = Proyectos.obtener(id);
    if (!proyecto) {
      return;
    }

    const confirmado = await Interfaz.confirmar({
      titulo: 'Eliminar proyecto',
      mensaje: 'Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este proyecto?',
      detalle: `${proyecto.proyecto} — ${proyecto.cliente}`,
      textoConfirmar: 'Eliminar'
    });
    if (!confirmado) {
      return;
    }

    Proyectos.eliminar(id);
    this.persistir();
    // Si justo se estaba editando ese proyecto, el formulario no puede quedarse con sus datos
    if (this.idEnEdicion === id) {
      this.salirDeEdicion();
    } else {
      this.refrescar();
    }
    Interfaz.notificar(`Proyecto "${proyecto.proyecto}" eliminado.`, 'exito');
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

  /** Vuelve a pintar tabla y resumen con el estado actual. Se llama después de cada cambio. */
  refrescar() {
    const proyectos = Proyectos.listar(Interfaz.leerCriterios());
    const resumen = Proyectos.resumen();
    Interfaz.renderTabla(proyectos, { idEnEdicion: this.idEnEdicion, total: resumen.total });
    Interfaz.renderResumen(resumen);
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
