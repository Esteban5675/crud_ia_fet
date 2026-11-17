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
      notificaciones: porId('notificaciones')
    };
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
