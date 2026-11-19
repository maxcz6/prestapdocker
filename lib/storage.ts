import type { Cliente, Prestamo, Cuota, Pago, Usuario, CuotaEstado } from "@/types/domain";
import { generarId } from "@/lib/ids";
import { calcularPrestamo, crearPrestamoYCuotas, validarClienteInput, validarPagoInput } from "@/lib/business";
import type {
  DashboardData,
  PrestamoConDetalle,
  PagoConDetalle,
  ReportePrestamo,
  ReportePago,
  ReporteMoroso,
  UsuarioItem,
  LoginResult,
  SessionData,
  CrearPrestamoResult,
  CrearPagoResult,
} from "@/lib/api-client";

const KEYS = {
  CLIENTES: "prestap_v1_clientes",
  PRESTAMOS: "prestap_v1_prestamos",
  CUOTAS: "prestap_v1_cuotas",
  PAGOS: "prestap_v1_pagos",
  USUARIOS: "prestap_v1_usuarios",
  SESSION: "prestap_v1_session",
};

// Formato de fecha YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

// ----------------------------------------------------------------------------
// Datos semilla iniciales (Realistas para Huancayo 2026)
// ----------------------------------------------------------------------------
function generateInitialData() {
  const now = new Date();
  const hoyStr = formatDate(now);

  const usuarios: Usuario[] = [
    {
      id: "USR-001",
      id_usuario: "USR-001",
      usuario: "admin",
      correo: "admin@prestap.com",
      password: "admin",
      password_hash: "hash_admin",
      password_salt: "salt_admin",
      rol: "ADMIN",
      estado: "ACTIVO",
      fecha_creacion: formatDate(addDays(now, -60)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "USR-002",
      id_usuario: "USR-002",
      usuario: "supervisor",
      correo: "supervisor@prestap.com",
      password: "supervisor",
      password_hash: "hash_super",
      password_salt: "salt_super",
      rol: "SUPERVISOR",
      estado: "ACTIVO",
      fecha_creacion: formatDate(addDays(now, -45)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "USR-003",
      id_usuario: "USR-003",
      usuario: "operador",
      correo: "operador@prestap.com",
      password: "operador",
      password_hash: "hash_oper",
      password_salt: "salt_oper",
      rol: "OPERADOR",
      estado: "ACTIVO",
      fecha_creacion: formatDate(addDays(now, -30)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "USR-004",
      id_usuario: "USR-004",
      usuario: "cobrador",
      correo: "cobrador@prestap.com",
      password: "cobrador",
      password_hash: "hash_cobr",
      password_salt: "salt_cobr",
      rol: "COBRADOR",
      estado: "ACTIVO",
      fecha_creacion: formatDate(addDays(now, -20)),
      fecha_modificacion: hoyStr,
    },
  ];

  const clientes: Cliente[] = [
    {
      id: "CLI-001",
      id_cliente: "CLI-001",
      dni: "10245678",
      nombres_apellidos: "Juan Carlos Pérez Meza",
      nombre_negocio: "Abarrotes Don Juan",
      celular: "964123456",
      direccion_puesto: "Mercado Mayorista de Huancayo - Puesto 45",
      fecha_creacion: formatDate(addDays(now, -35)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "CLI-002",
      id_cliente: "CLI-002",
      dni: "20345679",
      nombres_apellidos: "María Elena Quispe Flores",
      nombre_negocio: "Verdulería La Caserita",
      celular: "952987654",
      direccion_puesto: "Mercado Modelo de Huancayo - Puesto 12",
      fecha_creacion: formatDate(addDays(now, -25)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "CLI-003",
      id_cliente: "CLI-003",
      dni: "30456780",
      nombres_apellidos: "Carlos Alberto Ramos Soto",
      nombre_negocio: "Carnicería San Martín",
      celular: "981234567",
      direccion_puesto: "Mercado El Tambo - Puesto 08",
      fecha_creacion: formatDate(addDays(now, -20)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "CLI-004",
      id_cliente: "CLI-004",
      dni: "40567891",
      nombres_apellidos: "Rosa Luz Hinojosa Castro",
      nombre_negocio: "Bazar y Novedades Rosita",
      celular: "973456789",
      direccion_puesto: "Feria Dominical de Huancayo - Puesto 110",
      fecha_creacion: formatDate(addDays(now, -40)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "CLI-005",
      id_cliente: "CLI-005",
      dni: "50678902",
      nombres_apellidos: "Jorge Luis Gómez Paucar",
      nombre_negocio: "Pollería y Comidas El Sol",
      celular: "964555123",
      direccion_puesto: "Av. Ferrocarril 340, Huancayo",
      fecha_creacion: formatDate(addDays(now, -10)),
      fecha_modificacion: hoyStr,
    },
    {
      id: "CLI-006",
      id_cliente: "CLI-006",
      dni: "60789013",
      nombres_apellidos: "Ana María Mendoza Tovar",
      nombre_negocio: "Frutería Bendición de Dios",
      celular: "954678112",
      direccion_puesto: "Mercado Mayorista de Huancayo - Puesto 88",
      fecha_creacion: formatDate(addDays(now, -5)),
      fecha_modificacion: hoyStr,
    },
  ];

  const prestamos: Prestamo[] = [];
  const cuotas: Cuota[] = [];
  const pagos: Pago[] = [];

  // Función auxiliar para sembrar préstamo
  function sembrarPrestamo(
    id: string,
    idCliente: string,
    monto: number,
    interesPct: number,
    dias: number,
    diasAtras: number,
    cuotasPagadas: number
  ) {
    const fInicio = addDays(now, -diasAtras);
    const calc = calcularPrestamo({
      id_cliente: idCliente,
      monto,
      interes: interesPct,
      dias,
      fecha_inicio: formatDate(fInicio),
    });

    const nuevoPrestamo: Prestamo = {
      id,
      id_prestamo: id,
      id_cliente: idCliente,
      monto: calc.monto,
      interes: calc.interes,
      monto_interes: calc.monto_interes,
      total_pagar: calc.total_pagar,
      dias: calc.dias,
      cuota_diaria: calc.cuota_diaria,
      fecha_inicio: calc.fecha_inicio,
      fecha_fin: calc.fecha_fin,
      estado: cuotasPagadas >= dias ? "PAGADO" : "ACTIVO",
      fecha_creacion: calc.fecha_inicio,
      fecha_modificacion: hoyStr,
    };
    prestamos.push(nuevoPrestamo);

    for (let i = 1; i <= dias; i++) {
      const fVence = addDays(fInicio, i - 1);
      const fVenceStr = formatDate(fVence);
      const isPaid = i <= cuotasPagadas;
      const isPast = fVence < now && !isPaid;

      let estado: CuotaEstado = "PENDIENTE";
      if (isPaid) estado = "PAGADA";
      else if (isPast) estado = "VENCIDA";

      const cId = `CUO-${id}-${i.toString().padStart(2, "0")}`;
      const cuotaObj: Cuota = {
        id: cId,
        id_cuota: cId,
        id_prestamo: id,
        numero_cuota: i,
        fecha_vencimiento: fVenceStr,
        monto: calc.cuota_diaria,
        estado,
        fecha_creacion: calc.fecha_inicio,
        fecha_modificacion: isPaid ? fVenceStr : hoyStr,
      };
      cuotas.push(cuotaObj);

      if (isPaid) {
        pagos.push({
          id: `PAG-${id}-${i.toString().padStart(2, "0")}`,
          id_pago: `PAG-${id}-${i.toString().padStart(2, "0")}`,
          id_prestamo: id,
          id_cuota: cId,
          numero_cuota: i,
          fecha_pago: `${fVenceStr} 11:30:00`,
          monto_pagado: calc.cuota_diaria,
          observacion: `Cobro cuota #${i} en ruta de mercado`,
          fecha_creacion: fVenceStr,
          fecha_modificacion: fVenceStr,
        });
      }
    }
  }

  // 1. Prestamo activo al dia (Juan Perez) - 20 dias, empezó hace 6 dias, 6 pagadas
  sembrarPrestamo("PREST-001", "CLI-001", 1000, 20, 20, 6, 6);

  // 2. Prestamo activo al dia (Maria Quispe) - 15 dias, empezó hace 3 dias, 3 pagadas
  sembrarPrestamo("PREST-002", "CLI-002", 600, 15, 15, 3, 3);

  // 3. Prestamo con morosidad (Carlos Ramos) - 20 dias, empezó hace 12 dias, solo 2 pagadas (10 cuotas vencidas)
  sembrarPrestamo("PREST-003", "CLI-003", 800, 20, 20, 12, 2);

  // 4. Prestamo totalmente cancelado (Rosa Hinojosa) - 10 dias, empezó hace 18 dias, 10 pagadas
  sembrarPrestamo("PREST-004", "CLI-004", 500, 10, 10, 18, 10);

  // 5. Prestamo nuevo activo (Jorge Gomez) - 24 dias, empezó hoy, 0 pagadas
  sembrarPrestamo("PREST-005", "CLI-005", 1200, 20, 24, 0, 0);

  return { usuarios, clientes, prestamos, cuotas, pagos };
}

// ----------------------------------------------------------------------------
// Capa de Almacenamiento Local (LocalStorage con fallback en memoria para SSR)
// ----------------------------------------------------------------------------
class BrowserStorage {
  private memory: Record<string, unknown> = {};

  private isClient(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  private get<T>(key: string, defaultValue: T): T {
    if (this.isClient()) {
      try {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item) as T;
      } catch {
        // Fallback a memoria si hay error de cuota o parseo
      }
    }
    return (this.memory[key] as T) ?? defaultValue;
  }

  private set<T>(key: string, value: T): void {
    if (this.isClient()) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore quota error
      }
    }
    this.memory[key] = value;
  }

  // Inicializa los datos en la primera visita
  public init(): void {
    const initialized = this.get<boolean>("prestap_v1_initialized", false);
    if (!initialized || !this.getClientes().length) {
      this.resetToDemo();
    }
  }

  public resetToDemo(): void {
    const seed = generateInitialData();
    this.set(KEYS.USUARIOS, seed.usuarios);
    this.set(KEYS.CLIENTES, seed.clientes);
    this.set(KEYS.PRESTAMOS, seed.prestamos);
    this.set(KEYS.CUOTAS, seed.cuotas);
    this.set(KEYS.PAGOS, seed.pagos);
    this.set("prestap_v1_initialized", true);
  }

  // Clientes
  public getClientes(): Cliente[] {
    return this.get<Cliente[]>(KEYS.CLIENTES, []);
  }

  public saveClientes(clientes: Cliente[]): void {
    this.set(KEYS.CLIENTES, clientes);
  }

  // Préstamos
  public getPrestamos(): Prestamo[] {
    return this.get<Prestamo[]>(KEYS.PRESTAMOS, []);
  }

  public savePrestamos(prestamos: Prestamo[]): void {
    this.set(KEYS.PRESTAMOS, prestamos);
  }

  // Cuotas
  public getCuotas(): Cuota[] {
    return this.get<Cuota[]>(KEYS.CUOTAS, []);
  }

  public saveCuotas(cuotas: Cuota[]): void {
    this.set(KEYS.CUOTAS, cuotas);
  }

  // Pagos
  public getPagos(): Pago[] {
    return this.get<Pago[]>(KEYS.PAGOS, []);
  }

  public savePagos(pagos: Pago[]): void {
    this.set(KEYS.PAGOS, pagos);
  }

  // Usuarios
  public getUsuarios(): Usuario[] {
    return this.get<Usuario[]>(KEYS.USUARIOS, []);
  }

  public saveUsuarios(usuarios: Usuario[]): void {
    this.set(KEYS.USUARIOS, usuarios);
  }

  // Sesión
  public getSession(): { id_usuario: string; usuario: string; correo: string; rol: string } | null {
    return this.get(KEYS.SESSION, null);
  }

  public setSession(session: { id_usuario: string; usuario: string; correo: string; rol: string } | null): void {
    this.set(KEYS.SESSION, session);
  }
}

export const storage = new BrowserStorage();
// Inicialización segura
if (typeof window !== "undefined") {
  storage.init();
}

// ----------------------------------------------------------------------------
// Implementación de la API en el Navegador (Sin Base de Datos Externa)
// ----------------------------------------------------------------------------

export const localApi = {
  // Autenticación
  auth: {
    async login(usuario: string, _password?: string): Promise<LoginResult> {
      storage.init();
      const usuarios = storage.getUsuarios();
      const uNormalized = usuario.trim().toLowerCase();

      const user = usuarios.find(
        (u) =>
          u.usuario.toLowerCase() === uNormalized ||
          u.correo.toLowerCase() === uNormalized
      );

      if (!user) {
        throw new Error("Usuario o contraseña incorrectos");
      }

      if (user.estado === "INACTIVO") {
        throw new Error("Esta cuenta se encuentra inactiva. Contacte al administrador.");
      }

      const session = {
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
      };

      storage.setSession(session);
      return session;
    },

    async logout(): Promise<unknown> {
      storage.setSession(null);
      return { success: true };
    },

    async me(): Promise<SessionData> {
      storage.init();
      const session = storage.getSession();
      if (!session) {
        return { authenticated: false };
      }
      return {
        authenticated: true,
        session: {
          id_usuario: session.id_usuario,
          usuario: session.usuario,
          rol: session.rol,
        },
      };
    },
  },

  // Clientes
  clientes: {
    async list(): Promise<Cliente[]> {
      storage.init();
      return storage.getClientes();
    },

    async create(data: Omit<Cliente, "id" | "id_cliente" | "fecha_creacion" | "fecha_modificacion">): Promise<Cliente> {
      storage.init();
      const clientes = storage.getClientes();
      const valid = validarClienteInput(data);

      const exists = clientes.some((c) => c.dni === valid.dni);
      if (exists) {
        throw new Error(`Ya existe un cliente registrado con el DNI ${valid.dni}`);
      }

      const id = generarId("CLI");
      const nuevo: Cliente = {
        id,
        id_cliente: id,
        dni: valid.dni,
        nombres_apellidos: valid.nombres_apellidos,
        nombre_negocio: valid.nombre_negocio,
        celular: valid.celular,
        direccion_puesto: valid.direccion_puesto,
        fecha_creacion: formatDate(new Date()),
        fecha_modificacion: formatDate(new Date()),
      };

      clientes.unshift(nuevo);
      storage.saveClientes(clientes);
      return nuevo;
    },

    async update(data: Partial<Cliente> & { id_cliente: string }): Promise<Cliente> {
      storage.init();
      const clientes = storage.getClientes();
      const idx = clientes.findIndex((c) => c.id_cliente === data.id_cliente || c.id === data.id_cliente);
      if (idx === -1) {
        throw new Error("Cliente no encontrado");
      }

      const actual = clientes[idx];
      const dniToCheck = data.dni ? String(data.dni).trim() : actual.dni;
      if (dniToCheck !== actual.dni) {
        const dup = clientes.some((c) => c.id_cliente !== actual.id_cliente && c.dni === dniToCheck);
        if (dup) throw new Error(`El DNI ${dniToCheck} ya pertenece a otro cliente`);
      }

      const actualizado: Cliente = {
        ...actual,
        ...data,
        dni: dniToCheck,
        fecha_modificacion: formatDate(new Date()),
      };

      clientes[idx] = actualizado;
      storage.saveClientes(clientes);
      return actualizado;
    },

    async delete(id_cliente: string): Promise<{ id_cliente: string; eliminado: boolean }> {
      storage.init();
      const clientes = storage.getClientes();
      const prestamos = storage.getPrestamos();

      const tienePrestamos = prestamos.some((p) => p.id_cliente === id_cliente && p.estado === "ACTIVO");
      if (tienePrestamos) {
        throw new Error("No se puede eliminar un cliente con préstamos activos");
      }

      const filtrados = clientes.filter((c) => c.id_cliente !== id_cliente && c.id !== id_cliente);
      storage.saveClientes(filtrados);
      return { id_cliente, eliminado: true };
    },
  },

  // Préstamos
  prestamos: {
    async list(): Promise<PrestamoConDetalle[]> {
      storage.init();
      const prestamos = storage.getPrestamos();
      const clientes = storage.getClientes();
      const cuotas = storage.getCuotas();
      const pagos = storage.getPagos();

      const hoyStr = formatDate(new Date());

      return prestamos.map((p) => {
        const cliente = clientes.find((c) => c.id_cliente === p.id_cliente);
        const pagosP = pagos.filter((pg) => pg.id_prestamo === p.id_prestamo);
        const pagado = pagosP.reduce((sum, pg) => sum + (Number(pg.monto_pagado) || 0), 0);
        const saldo = Math.max(0, Number((p.total_pagar - pagado).toFixed(2)));

        // Verificar cuotas vencidas
        const cuotasP = cuotas.filter((c) => c.id_prestamo === p.id_prestamo);
        const tieneMora = cuotasP.some((c) => c.estado === "VENCIDA" || (c.estado === "PENDIENTE" && c.fecha_vencimiento < hoyStr));

        let estadoFinal = p.estado;
        if (saldo <= 0.01) {
          estadoFinal = "PAGADO";
        } else if (tieneMora && p.estado === "ACTIVO") {
          // El estado de negocio se mantiene activo pero visible con saldo
        }

        return {
          ...p,
          estado: estadoFinal,
          cliente,
          saldo: {
            total: p.total_pagar,
            pagado: Number(pagado.toFixed(2)),
            saldo,
          },
        };
      });
    },

    async getById(id_prestamo: string): Promise<PrestamoConDetalle | null> {
      const list = await localApi.prestamos.list();
      return list.find((p) => p.id_prestamo === id_prestamo || p.id === id_prestamo) ?? null;
    },

    async create(data: { id_cliente: string; monto: number; interes: number; dias: number; fecha_inicio: string }): Promise<CrearPrestamoResult> {
      storage.init();
      const clientes = storage.getClientes();
      const cliente = clientes.find((c) => c.id_cliente === data.id_cliente || c.id === data.id_cliente);
      if (!cliente) {
        throw new Error("El cliente seleccionado no existe");
      }

      const prestamosActuales = storage.getPrestamos();
      const cuotasActuales = storage.getCuotas();
      const { prestamo, cuotas } = crearPrestamoYCuotas(data, clientes, prestamosActuales, cuotasActuales);

      const prestamos = storage.getPrestamos();
      prestamos.unshift(prestamo);
      storage.savePrestamos(prestamos);

      const allCuotas = storage.getCuotas();
      allCuotas.push(...cuotas);
      storage.saveCuotas(allCuotas);

      return { prestamo, cuotas };
    },

    async update(data: { id_prestamo: string; estado: string }): Promise<Prestamo> {
      storage.init();
      const prestamos = storage.getPrestamos();
      const idx = prestamos.findIndex((p) => p.id_prestamo === data.id_prestamo || p.id === data.id_prestamo);
      if (idx === -1) throw new Error("Préstamo no encontrado");

      prestamos[idx] = {
        ...prestamos[idx],
        estado: data.estado as Prestamo["estado"],
        fecha_modificacion: formatDate(new Date()),
      };
      storage.savePrestamos(prestamos);
      return prestamos[idx];
    },

    async delete(id_prestamo: string): Promise<{ id_prestamo: string; cuotas_eliminadas: number; eliminado: boolean }> {
      storage.init();
      const prestamos = storage.getPrestamos();
      const cuotas = storage.getCuotas();
      const pagos = storage.getPagos();

      const newPrestamos = prestamos.filter((p) => p.id_prestamo !== id_prestamo && p.id !== id_prestamo);
      const cuotasToDelete = cuotas.filter((c) => c.id_prestamo === id_prestamo);
      const newCuotas = cuotas.filter((c) => c.id_prestamo !== id_prestamo);
      const newPagos = pagos.filter((pg) => pg.id_prestamo !== id_prestamo);

      storage.savePrestamos(newPrestamos);
      storage.saveCuotas(newCuotas);
      storage.savePagos(newPagos);

      return {
        id_prestamo,
        cuotas_eliminadas: cuotasToDelete.length,
        eliminado: true,
      };
    },
  },

  // Cuotas
  cuotas: {
    async listByPrestamo(id_prestamo: string): Promise<Cuota[]> {
      storage.init();
      const cuotas = storage.getCuotas();
      const hoyStr = formatDate(new Date());

      const cuotasPrestamo = cuotas.filter((c) => c.id_prestamo === id_prestamo);
      // Actualizar estados al vuelo
      return cuotasPrestamo.map((c) => {
        if (c.estado === "PAGADA") return c;
        if (c.fecha_vencimiento < hoyStr) return { ...c, estado: "VENCIDA" };
        return { ...c, estado: "PENDIENTE" };
      });
    },
  },

  // Pagos / Cobranzas
  pagos: {
    async list(): Promise<PagoConDetalle[]> {
      storage.init();
      const pagos = storage.getPagos();
      const prestamos = storage.getPrestamos();
      const clientes = storage.getClientes();
      const cuotas = storage.getCuotas();

      return pagos
        .slice()
        .reverse()
        .map((p) => {
          const prestamo = prestamos.find((pr) => pr.id_prestamo === p.id_prestamo);
          const cliente = prestamo ? clientes.find((c) => c.id_cliente === prestamo.id_cliente) : undefined;
          const cuota = cuotas.find((cu) => cu.id_cuota === p.id_cuota);
          return {
            ...p,
            prestamos,
            cliente,
            cuota,
          };
        });
    },

    async create(data: {
      id_prestamo: string;
      id_cuota: string;
      monto_pagado: number;
      fecha_pago?: string;
      observacion?: string;
    }): Promise<CrearPagoResult> {
      storage.init();
      const prestamos = storage.getPrestamos();
      const cuotas = storage.getCuotas();
      const pagos = storage.getPagos();

      const prestamo = prestamos.find((p) => p.id_prestamo === data.id_prestamo);
      if (!prestamo) throw new Error("Préstamo no encontrado");

      const cuota = cuotas.find((c) => c.id_cuota === data.id_cuota && c.id_prestamo === data.id_prestamo);
      if (!cuota) throw new Error("Cuota no encontrada para este préstamo");

      if (cuota.estado === "PAGADA") {
        throw new Error("Esta cuota ya ha sido pagada previamente");
      }

      // Validar montos y reglas de negocio
      const pagosDelPrestamo = pagos.filter((p) => p.id_prestamo === data.id_prestamo);
      validarPagoInput(
        {
          id_prestamo: data.id_prestamo,
          id_cuota: data.id_cuota,
          monto_pagado: data.monto_pagado,
        },
        prestamos,
        cuotas.filter((c) => c.id_prestamo === data.id_prestamo),
        pagosDelPrestamo
      );

      const idPago = generarId("PAG");
      const hoy = new Date();
      const fechaPago = data.fecha_pago || `${formatDate(hoy)} ${hoy.toTimeString().split(" ")[0]}`;

      const nuevoPago: Pago = {
        id: idPago,
        id_pago: idPago,
        id_prestamo: data.id_prestamo,
        id_cuota: data.id_cuota,
        numero_cuota: cuota.numero_cuota,
        fecha_pago: fechaPago,
        monto_pagado: Number(data.monto_pagado),
        observacion: data.observacion?.trim() || "Cobro registrado en el navegador",
        fecha_creacion: formatDate(hoy),
        fecha_modificacion: formatDate(hoy),
      };

      // Marcar cuota como PAGADA
      cuota.estado = "PAGADA";
      cuota.fecha_modificacion = formatDate(hoy);

      pagos.push(nuevoPago);
      storage.savePagos(pagos);
      storage.saveCuotas(cuotas);

      // Recalcular saldo total del préstamo
      const totalPagado = pagos
        .filter((p) => p.id_prestamo === data.id_prestamo)
        .reduce((sum, p) => sum + Number(p.monto_pagado), 0);

      let nuevoEstadoPrestamo = prestamo.estado;
      if (totalPagado >= prestamo.total_pagar - 0.01) {
        nuevoEstadoPrestamo = "PAGADO";
        prestamo.estado = "PAGADO";
        prestamo.fecha_modificacion = formatDate(hoy);
        storage.savePrestamos(prestamos);
      }

      return {
        pago: nuevoPago,
        cuota,
        estadoPrestamo: nuevoEstadoPrestamo,
      };
    },
  },

  // Dashboard de KPIs
  dashboard: {
    async get(): Promise<DashboardData> {
      storage.init();
      const clientes = storage.getClientes();
      const prestamos = storage.getPrestamos();
      const cuotas = storage.getCuotas();
      const pagos = storage.getPagos();

      const hoyStr = formatDate(new Date());

      const prestamosActivos = prestamos.filter((p) => p.estado === "ACTIVO");
      const prestado = prestamosActivos.reduce((sum, p) => sum + Number(p.monto), 0);
      const total_cartera = prestamosActivos.reduce((sum, p) => sum + Number(p.total_pagar), 0);

      const cobradoTotal = pagos.reduce((sum, p) => sum + Number(p.monto_pagado), 0);

      // Saldo activo restante
      const totalPagadoActivos = prestamosActivos.reduce((sum, p) => {
        const pagosP = pagos.filter((pg) => pg.id_prestamo === p.id_prestamo);
        return sum + pagosP.reduce((s, pg) => s + Number(pg.monto_pagado), 0);
      }, 0);
      const saldo = Math.max(0, total_cartera - totalPagadoActivos);

      // Cuotas vencidas
      const cuotasVencidasList = cuotas.filter(
        (c) => c.estado !== "PAGADA" && c.fecha_vencimiento < hoyStr
      );
      const cuotas_vencidas = cuotasVencidasList.length;
      const monto_vencido = cuotasVencidasList.reduce((sum, c) => sum + Number(c.monto), 0);

      // Clientes morosos distintos
      const prestamosConMoraIds = new Set(cuotasVencidasList.map((c) => c.id_prestamo));
      const morosos = prestamos
        .filter((p) => p.estado === "ACTIVO" && prestamosConMoraIds.has(p.id_prestamo))
        .map((p) => p.id_cliente);
      const uniqueMorosos = new Set(morosos).size;

      return {
        clientes: clientes.length,
        prestamos: prestamos.length,
        prestado: Number(prestado.toFixed(2)),
        total_cartera: Number(total_cartera.toFixed(2)),
        cobrado: Number(cobradoTotal.toFixed(2)),
        saldo: Number(saldo.toFixed(2)),
        cuotas_vencidas,
        monto_vencido: Number(monto_vencido.toFixed(2)),
        morosos: uniqueMorosos,
      };
    },
  },

  // Reportes
  reportes: {
    async prestamos(): Promise<ReportePrestamo[]> {
      const list = await localApi.prestamos.list();
      return list.map((p) => ({
        id_prestamo: p.id_prestamo,
        cliente: p.cliente?.nombres_apellidos || "Sin nombre",
        negocio: p.cliente?.nombre_negocio || "Sin negocio",
        monto: p.monto,
        interes: p.interes,
        monto_interes: p.monto_interes,
        total: p.total_pagar,
        pagado: p.saldo?.pagado || 0,
        saldo: p.saldo?.saldo || 0,
        estado: p.estado,
      }));
    },

    async pagos(): Promise<ReportePago[]> {
      const list = await localApi.pagos.list();
      return list.map((p) => ({
        fecha: p.fecha_pago,
        cliente: p.cliente?.nombres_apellidos || "Sin nombre",
        negocio: p.cliente?.nombre_negocio || "Sin negocio",
        prestamo: p.id_prestamo,
        cuota: p.numero_cuota,
        monto: p.monto_pagado,
        observacion: p.observacion || "",
      }));
    },

    async morosos(): Promise<ReporteMoroso[]> {
      storage.init();
      const prestamos = await localApi.prestamos.list();
      const cuotas = storage.getCuotas();
      const hoyStr = formatDate(new Date());

      const resultado: ReporteMoroso[] = [];

      for (const p of prestamos) {
        if (p.estado !== "ACTIVO") continue;
        const cuotasV = cuotas.filter(
          (c) => c.id_prestamo === p.id_prestamo && c.estado !== "PAGADA" && c.fecha_vencimiento < hoyStr
        );
        if (cuotasV.length > 0) {
          const montoVencido = cuotasV.reduce((sum, c) => sum + Number(c.monto), 0);
          resultado.push({
            cliente: p.cliente?.nombres_apellidos || "Cliente no identificado",
            telefono: p.cliente?.celular || "—",
            negocio: p.cliente?.nombre_negocio || "—",
            prestamo: p.id_prestamo,
            cuotas_vencidas: cuotasV.length,
            monto_vencido: Number(montoVencido.toFixed(2)),
            saldo: p.saldo?.saldo || 0,
          });
        }
      }

      return resultado;
    },
  },

  // Usuarios
  usuarios: {
    async list(): Promise<UsuarioItem[]> {
      storage.init();
      const usuarios = storage.getUsuarios();
      return usuarios.map((u) => ({
        id_usuario: u.id_usuario,
        usuario: u.usuario,
        correo: u.correo,
        rol: u.rol,
        estado: u.estado,
        fecha_creacion: u.fecha_creacion,
        fecha_modificacion: u.fecha_modificacion,
      }));
    },

    async create(data: { usuario: string; correo: string; password?: string; rol: string; estado?: string }): Promise<UsuarioItem> {
      storage.init();
      const usuarios = storage.getUsuarios();
      const usuarioTrim = data.usuario.trim();
      const correoTrim = data.correo.trim().toLowerCase();

      if (usuarios.some((u) => u.usuario.toLowerCase() === usuarioTrim.toLowerCase())) {
        throw new Error("El nombre de usuario ya está en uso");
      }
      if (usuarios.some((u) => u.correo.toLowerCase() === correoTrim)) {
        throw new Error("El correo electrónico ya está registrado");
      }

      const id = generarId("USR");
      const nuevo: Usuario = {
        id,
        id_usuario: id,
        usuario: usuarioTrim,
        correo: correoTrim,
        password: data.password || "123456",
        password_hash: "hash_local",
        password_salt: "salt_local",
        rol: data.rol,
        estado: data.estado || "ACTIVO",
        fecha_creacion: formatDate(new Date()),
        fecha_modificacion: formatDate(new Date()),
      };

      usuarios.push(nuevo);
      storage.saveUsuarios(usuarios);

      return {
        id_usuario: nuevo.id_usuario,
        usuario: nuevo.usuario,
        correo: nuevo.correo,
        rol: nuevo.rol,
        estado: nuevo.estado,
        fecha_creacion: nuevo.fecha_creacion,
      };
    },

    async update(data: { id_usuario: string; usuario?: string; correo?: string; password?: string; rol?: string; estado?: string }): Promise<UsuarioItem> {
      storage.init();
      const usuarios = storage.getUsuarios();
      const idx = usuarios.findIndex((u) => u.id_usuario === data.id_usuario || u.id === data.id_usuario);
      if (idx === -1) throw new Error("Usuario no encontrado");

      const actual = usuarios[idx];
      const actualizado: Usuario = {
        ...actual,
        usuario: data.usuario ? data.usuario.trim() : actual.usuario,
        correo: data.correo ? data.correo.trim().toLowerCase() : actual.correo,
        rol: data.rol || actual.rol,
        estado: data.estado || actual.estado,
        password: data.password ? data.password : actual.password,
        fecha_modificacion: formatDate(new Date()),
      };

      usuarios[idx] = actualizado;
      storage.saveUsuarios(usuarios);

      return {
        id_usuario: actualizado.id_usuario,
        usuario: actualizado.usuario,
        correo: actualizado.correo,
        rol: actualizado.rol,
        estado: actualizado.estado,
        fecha_modificacion: actualizado.fecha_modificacion,
      };
    },

    async delete(id_usuario: string): Promise<{ id_usuario: string; eliminado: boolean }> {
      storage.init();
      const usuarios = storage.getUsuarios();
      const adminCount = usuarios.filter((u) => u.rol === "ADMIN").length;
      const target = usuarios.find((u) => u.id_usuario === id_usuario);

      if (target?.rol === "ADMIN" && adminCount <= 1) {
        throw new Error("No se puede eliminar el único administrador del sistema");
      }

      const filtrados = usuarios.filter((u) => u.id_usuario !== id_usuario && u.id !== id_usuario);
      storage.saveUsuarios(filtrados);
      return { id_usuario, eliminado: true };
    },
  },
};
