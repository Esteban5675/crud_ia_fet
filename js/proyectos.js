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

  /**
   * Recibe lo que venga del almacenamiento y lo deja como lista de trabajo.
   * Los registros que no pasan la validación se descartan, porque un valor
   * que no es número, por ejemplo, dañaría el total del resumen.
   * @returns {number} cuántos registros se descartaron
   */
  inicializar(proyectos) {
    const recibidos = Array.isArray(proyectos) ? proyectos : [];
    this.lista = recibidos.filter((p) => this.esRegistroValido(p)).map((p) => ({ ...p }));
    return recibidos.length - this.lista.length;
  },

  esRegistroValido(proyecto) {
    const datos = this.normalizar(proyecto);
    return typeof proyecto.id === 'string' && Object.keys(this.validar(datos)).length === 0;
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

  /**
   * Lista para la tabla aplicando búsqueda, filtro y orden.
   * @param {Object} criterios
   * @param {string} criterios.texto busca en cliente, proyecto y tecnología
   * @param {string} criterios.estado 'todos' o uno de ESTADOS
   * @param {string} criterios.orden 'fecha-asc' | 'fecha-desc' | 'valor-asc' | 'valor-desc'
   */
  listar({ texto = '', estado = 'todos', orden = 'fecha-asc' } = {}) {
    const busqueda = this.normalizarTexto(texto);
    const filtrados = this.obtenerTodos()
      .filter((p) => estado === 'todos' || p.estado === estado)
      .filter((p) => this.coincideBusqueda(p, busqueda));
    return this.ordenar(filtrados, orden);
  },

  /**
   * Pasa a minúsculas y quita tildes, para que buscar "revision" encuentre "Revisión"
   * o "bogota" encuentre "Bogotá". Nadie escribe tildes en un buscador.
   */
  normalizarTexto(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  },

  coincideBusqueda(proyecto, busqueda) {
    if (busqueda === '') {
      return true;
    }
    const campos = [proyecto.cliente, proyecto.proyecto, proyecto.tecnologia];
    return campos.some((campo) => this.normalizarTexto(campo).includes(busqueda));
  },

  ordenar(proyectos, orden) {
    const comparadores = {
      // Las fechas AAAA-MM-DD se pueden comparar como texto y quedan en orden cronológico
      'fecha-asc': (a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega),
      'fecha-desc': (a, b) => b.fechaEntrega.localeCompare(a.fechaEntrega),
      'valor-asc': (a, b) => a.valor - b.valor,
      'valor-desc': (a, b) => b.valor - a.valor
    };
    const comparar = comparadores[orden] || comparadores['fecha-asc'];
    return [...proyectos].sort(comparar);
  },

  /** Números para las tarjetas de arriba. Siempre sobre todos los proyectos, no sobre el filtro. */
  resumen() {
    return {
      total: this.lista.length,
      valorTotal: this.lista.reduce((suma, p) => suma + p.valor, 0),
      enDesarrollo: this.contarPorEstado('En desarrollo'),
      entregados: this.contarPorEstado('Entregado')
    };
  },

  contarPorEstado(estado) {
    return this.lista.filter((p) => p.estado === estado).length;
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
  },

  borrarTodo() {
    this.lista = [];
  },

  estaVacia() {
    return this.lista.length === 0;
  },

  /**
   * Agrega los proyectos de ejemplo pasando por crear(), así también
   * reciben id, fechas ISO y validación como cualquier otro.
   * @returns {number} cuántos se agregaron
   */
  cargarEjemplos() {
    const creados = this.datosDeEjemplo().map((datos) => this.crear(datos));
    return creados.filter((resultado) => resultado.ok).length;
  },

  /**
   * Las fechas se calculan desde hoy para que los ejemplos siempre
   * se vean actuales, sin importar cuándo se abra la app.
   */
  datosDeEjemplo() {
    return [
      {
        cliente: 'Panadería La Espiga',
        proyecto: 'Tienda en línea de pedidos',
        tecnologia: 'WordPress + WooCommerce',
        estado: 'En desarrollo',
        valor: 3500000,
        fechaEntrega: this.fechaDesdeHoy(18),
        descripcion: 'Catálogo de productos, pedidos para recoger en tienda y pagos con PSE.'
      },
      {
        cliente: 'Ferretería Hermanos Gómez',
        proyecto: 'Sistema de inventario',
        tecnologia: 'PHP + MySQL',
        estado: 'Pendiente',
        valor: 6800000,
        fechaEntrega: this.fechaDesdeHoy(45),
        descripcion: 'Control de existencias en dos sedes de Bucaramanga con alertas de stock bajo.'
      },
      {
        cliente: 'Clínica Dental Sonrisa Paisa',
        proyecto: 'Agenda de citas en línea',
        tecnologia: 'JavaScript + Firebase',
        estado: 'En revisión',
        valor: 4200000,
        fechaEntrega: this.fechaDesdeHoy(6),
        descripcion: 'Reserva de citas por odontólogo y recordatorio por WhatsApp.'
      },
      {
        cliente: 'Café Origen Huila',
        proyecto: 'Landing page de marca',
        tecnologia: 'HTML, CSS y JavaScript',
        estado: 'Entregado',
        valor: 1800000,
        fechaEntrega: this.fechaDesdeHoy(-12),
        descripcion: 'Página para presentar los cafés especiales y el formulario de distribuidores.'
      },
      {
        cliente: 'Transportes Andinos S.A.S.',
        proyecto: 'Panel de seguimiento de envíos',
        tecnologia: 'React + Node.js',
        estado: 'En desarrollo',
        valor: 9500000,
        fechaEntrega: this.fechaDesdeHoy(60),
        descripcion: 'Tablero para ver el estado de cada envío entre Bogotá, Medellín y Cali.'
      }
    ];
  },

  /** Fecha local en formato AAAA-MM-DD sumando (o restando) días a hoy. */
  fechaDesdeHoy(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    // Uso las partes locales y no toISOString(), que convierte a UTC y puede correr el día
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
};
