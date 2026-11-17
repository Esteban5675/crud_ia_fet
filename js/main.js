/*
 * main.js
 * Punto de arranque. Conecta los eventos de la página con la lógica
 * (Proyectos), la persistencia (Almacenamiento) y la vista (Interfaz).
 * Este es el único archivo que conoce a los otros tres.
 */
const App = {
  iniciar() {
    Interfaz.inicializar();
    this.cargarDatosGuardados();
    this.registrarEventos();
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

  manejarEnvio(evento) {
    evento.preventDefault();
    const resultado = Proyectos.crear(Interfaz.leerFormulario());

    if (!resultado.ok) {
      Interfaz.mostrarErrores(resultado.errores);
      return;
    }

    this.persistir();
    Interfaz.limpiarFormulario();
    Interfaz.enfocarPrimerCampo();
    Interfaz.notificar(`Proyecto "${resultado.proyecto.proyecto}" agregado.`, 'exito');
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
