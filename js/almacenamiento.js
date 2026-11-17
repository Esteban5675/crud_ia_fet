/*
 * almacenamiento.js
 * Única parte de la app que habla con localStorage.
 * Si algún día cambio a otra forma de guardar (por ejemplo una API),
 * solo tendría que tocar este archivo.
 */
const Almacenamiento = {
  CLAVE: 'proyectos_clientes_v1',

  /**
   * Lee los proyectos guardados.
   * Nunca lanza errores: si algo sale mal devuelve una lista vacía
   * y un mensaje para que la interfaz avise al usuario.
   * @returns {{ proyectos: Array, error: string|null }}
   */
  cargar() {
    try {
      const texto = localStorage.getItem(this.CLAVE);

      // Primera vez que se abre la app: no hay nada guardado y eso no es un error
      if (texto === null) {
        return { proyectos: [], error: null };
      }

      const datos = JSON.parse(texto);
      if (!this.tieneFormatoValido(datos)) {
        return { proyectos: [], error: 'Los datos guardados estaban dañados. La aplicación arrancó vacía.' };
      }
      return { proyectos: datos, error: null };
    } catch (error) {
      // Aquí caen tanto el JSON corrupto como un navegador que bloquea localStorage
      return { proyectos: [], error: 'No se pudieron leer los datos guardados. La aplicación arrancó vacía.' };
    }
  },

  /**
   * Guarda la lista completa de proyectos.
   * @param {Array} proyectos
   * @returns {boolean} true si se guardó, false si el navegador no lo permitió
   */
  guardar(proyectos) {
    try {
      localStorage.setItem(this.CLAVE, JSON.stringify(proyectos));
      return true;
    } catch (error) {
      // Pasa con el almacenamiento lleno o en algunos modos privados
      return false;
    }
  },

  /**
   * Revisión mínima de lo que viene de localStorage: debe ser un arreglo
   * de objetos con id. Alguien pudo haber editado el valor a mano desde
   * las herramientas del navegador, así que no confío ciegamente.
   */
  tieneFormatoValido(datos) {
    if (!Array.isArray(datos)) {
      return false;
    }
    return datos.every((item) => item !== null && typeof item === 'object' && typeof item.id === 'string');
  }
};
