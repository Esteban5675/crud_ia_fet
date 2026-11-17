/*
 * proyectos.js
 * Lógica del CRUD. Aquí no se toca el DOM ni localStorage: este objeto
 * solo mantiene la lista en memoria y decide qué es válido y qué no.
 * Gracias a eso se puede probar desde Node sin navegador.
 */
const Proyectos = {
  ESTADOS: ['Pendiente', 'En desarrollo', 'En revisión', 'Entregado'],

  // Límites de longitud en un solo lugar para no repetir números mágicos
  LIMITES: {
    cliente: { min: 2, max: 60 },
    proyecto: { min: 2, max: 80 },
    tecnologia: { min: 2, max: 50 },
    descripcion: { max: 300 }
  },

  lista: [],

  /** Recibe lo que venga del almacenamiento y lo deja como lista de trabajo. */
  inicializar(proyectos) {
    this.lista = Array.isArray(proyectos) ? proyectos.map((p) => ({ ...p })) : [];
  },

  /** Copia de todos los proyectos, para guardar sin exponer la lista interna. */
  obtenerTodos() {
    return this.lista.map((p) => ({ ...p }));
  },

  /** Busca un proyecto por id. Devuelve una copia o null si no existe. */
  obtener(id) {
    const proyecto = this.lista.find((p) => p.id === id);
    return proyecto ? { ...proyecto } : null;
  },

  /** Lista para mostrar en la tabla, por defecto con la entrega más próxima primero. */
  listar() {
    // Las fechas AAAA-MM-DD se pueden comparar como texto y quedan en orden cronológico
    return this.obtenerTodos().sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
  },

  /**
   * Id corto y suficientemente único para uso local:
   * el tiempo en base 36 más un pedazo aleatorio por si se crean dos en el mismo milisegundo.
   */
  generarId() {
    const aleatorio = Math.floor(Math.random() * 1e9).toString(36);
    return Date.now().toString(36) + aleatorio;
  },

  /**
   * Limpia lo que llega del formulario: quita espacios sobrantes
   * y convierte el valor a número. No valida, solo ordena.
   */
  normalizar(datos) {
    const textoValor = String(datos.valor ?? '').trim();
    return {
      cliente: String(datos.cliente ?? '').trim(),
      proyecto: String(datos.proyecto ?? '').trim(),
      tecnologia: String(datos.tecnologia ?? '').trim(),
      estado: String(datos.estado ?? '').trim(),
      // Number('') da 0, por eso un campo vacío se deja como NaN para que la validación lo atrape
      valor: textoValor === '' ? NaN : Number(textoValor),
      fechaEntrega: String(datos.fechaEntrega ?? '').trim(),
      descripcion: String(datos.descripcion ?? '').trim()
    };
  },

  /**
   * Valida un proyecto ya normalizado.
   * @returns {Object} errores por campo; si está vacío, todo está bien
   */
  validar(datos) {
    const errores = {};

    this.validarTexto(errores, 'cliente', datos.cliente, 'el nombre del cliente');
    this.validarTexto(errores, 'proyecto', datos.proyecto, 'el nombre del proyecto');
    this.validarTexto(errores, 'tecnologia', datos.tecnologia, 'la tecnología');

    if (!this.ESTADOS.includes(datos.estado)) {
      errores.estado = 'Selecciona un estado de la lista.';
    }

    if (Number.isNaN(datos.valor)) {
      errores.valor = 'Escribe el valor del proyecto.';
    } else if (!Number.isFinite(datos.valor) || datos.valor < 0) {
      errores.valor = 'El valor debe ser un número mayor o igual a 0.';
    }

    if (datos.fechaEntrega === '') {
      errores.fechaEntrega = 'Elige la fecha de entrega.';
    } else if (!this.esFechaValida(datos.fechaEntrega)) {
      errores.fechaEntrega = 'La fecha no es válida.';
    }

    if (datos.descripcion.length > this.LIMITES.descripcion.max) {
      errores.descripcion = `La descripción no puede pasar de ${this.LIMITES.descripcion.max} caracteres.`;
    }

    return errores;
  },

  /** Reglas comunes de los campos de texto obligatorios (vacío, mínimo y máximo). */
  validarTexto(errores, campo, texto, nombreLegible) {
    const { min, max } = this.LIMITES[campo];
    if (texto === '') {
      errores[campo] = `Escribe ${nombreLegible}.`;
    } else if (texto.length < min) {
      errores[campo] = `Debe tener al menos ${min} caracteres.`;
    } else if (texto.length > max) {
      errores[campo] = `No puede pasar de ${max} caracteres.`;
    }
  },

  /**
   * Comprueba que la fecha tenga formato AAAA-MM-DD y que exista de verdad.
   * El truco de crear la fecha y volver a leer sus partes descarta cosas como 2025-02-30,
   * que Date convierte en silencio al 2 de marzo.
   */
  esFechaValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return false;
    }
    const [anio, mes, dia] = texto.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  },

  /**
   * Crea un proyecto nuevo si los datos son válidos.
   * @returns {{ ok: boolean, proyecto?: Object, errores?: Object }}
   */
  crear(datosFormulario) {
    const datos = this.normalizar(datosFormulario);
    const errores = this.validar(datos);
    if (Object.keys(errores).length > 0) {
      return { ok: false, errores };
    }

    const ahora = new Date().toISOString();
    const proyecto = {
      id: this.generarId(),
      ...datos,
      valor: Math.round(datos.valor), // en COP no se manejan centavos
      creadoEn: ahora,
      actualizadoEn: ahora
    };
    this.lista.push(proyecto);
    return { ok: true, proyecto: { ...proyecto } };
  },

  /**
   * Reemplaza los datos de un proyecto existente.
   * El id y creadoEn se conservan; solo cambia actualizadoEn.
   * @returns {{ ok: boolean, proyecto?: Object, errores?: Object, noEncontrado?: boolean }}
   */
  actualizar(id, datosFormulario) {
    const indice = this.lista.findIndex((p) => p.id === id);
    if (indice === -1) {
      return { ok: false, noEncontrado: true, errores: {} };
    }

    const datos = this.normalizar(datosFormulario);
    const errores = this.validar(datos);
    if (Object.keys(errores).length > 0) {
      return { ok: false, errores };
    }

    const original = this.lista[indice];
    const actualizado = {
      ...original,
      ...datos,
      valor: Math.round(datos.valor),
      id: original.id,
      creadoEn: original.creadoEn,
      actualizadoEn: new Date().toISOString()
    };
    this.lista[indice] = actualizado;
    return { ok: true, proyecto: { ...actualizado } };
  },

  /**
   * Elimina un proyecto por id.
   * @returns {boolean} true si existía y se borró
   */
  eliminar(id) {
    const cantidadAntes = this.lista.length;
    this.lista = this.lista.filter((p) => p.id !== id);
    return this.lista.length < cantidadAntes;
  }
};
