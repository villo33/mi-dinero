import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./Movimientos.css";

/* =========================================================
   PASO 1 — CATEGORÍAS GENERALES DE RESPALDO
   ========================================================= */

const CATEGORIAS_PREDETERMINADAS = [
  {
    id: "ingreso-salario",
    usuario_id: null,
    nombre: "Salario",
    tipo: "ingreso",
  },
  {
    id: "ingreso-trabajo-extra",
    usuario_id: null,
    nombre: "Trabajo extra",
    tipo: "ingreso",
  },
  {
    id: "ingreso-negocio",
    usuario_id: null,
    nombre: "Negocio",
    tipo: "ingreso",
  },
  {
    id: "ingreso-transferencia",
    usuario_id: null,
    nombre: "Transferencia",
    tipo: "ingreso",
  },
  {
    id: "ingreso-regalo",
    usuario_id: null,
    nombre: "Regalo",
    tipo: "ingreso",
  },
  {
    id: "ingreso-otro",
    usuario_id: null,
    nombre: "Otro",
    tipo: "ingreso",
  },
  {
    id: "gasto-alimentacion",
    usuario_id: null,
    nombre: "Alimentación",
    tipo: "gasto",
  },
  {
    id: "gasto-transporte",
    usuario_id: null,
    nombre: "Transporte",
    tipo: "gasto",
  },
  {
    id: "gasto-vivienda",
    usuario_id: null,
    nombre: "Vivienda",
    tipo: "gasto",
  },
  {
    id: "gasto-servicios",
    usuario_id: null,
    nombre: "Servicios",
    tipo: "gasto",
  },
  {
    id: "gasto-deudas",
    usuario_id: null,
    nombre: "Deudas",
    tipo: "gasto",
  },
  {
    id: "gasto-salud",
    usuario_id: null,
    nombre: "Salud",
    tipo: "gasto",
  },
  {
    id: "gasto-compras",
    usuario_id: null,
    nombre: "Compras",
    tipo: "gasto",
  },
  {
    id: "gasto-entretenimiento",
    usuario_id: null,
    nombre: "Entretenimiento",
    tipo: "gasto",
  },
  {
    id: "gasto-diezmo",
    usuario_id: null,
    nombre: "Diezmo",
    tipo: "gasto",
  },
  {
    id: "gasto-deuda",
    usuario_id: null,
    nombre: "Deuda",
    tipo: "gasto",
  },
  {
    id: "gasto-otro",
    usuario_id: null,
    nombre: "Otro",
    tipo: "gasto",
  },
];

function Movimientos({
  sesion,
  tipoInicial = "ingreso",
  onVolver,
}) {
  const [movimientos, setMovimientos] = useState([]);
  const [categorias, setCategorias] = useState(
    CATEGORIAS_PREDETERMINADAS
  );

  const [tipo, setTipo] = useState(tipoInicial);
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  /* =========================================================
     PASO 2 — CAMBIAR TIPO
     ========================================================= */

  useEffect(() => {
    setTipo(tipoInicial);
    setCategoria("");
    setError("");
    setMensaje("");
  }, [tipoInicial]);

  /* =========================================================
     PASO 3 — CARGAR DATOS
     ========================================================= */

  const cargarDatos = async () => {
    if (!sesion?.user?.id) {
      setCargando(false);
      return;
    }

    setCargando(true);
    setError("");

    try {
      const usuarioId = sesion.user.id;

      /* -----------------------------------------------
         CARGAR MOVIMIENTOS DEL USUARIO
         ----------------------------------------------- */

      const movimientosRespuesta = await supabase
        .from("movimientos")
        .select("*")
        .eq("usuario_id", usuarioId)
        .order("fecha", { ascending: false })
        .order("fecha", { ascending: false });

      if (movimientosRespuesta.error) {
        throw movimientosRespuesta.error;
      }

      /* -----------------------------------------------
         CARGAR CATEGORÍAS DE SUPABASE
         ----------------------------------------------- */

      const categoriasRespuesta = await supabase
        .from("categorias")
        .select("id, usuario_id, nombre, tipo")
        .order("nombre", { ascending: true });

      /*
         Si Supabase devuelve categorías, las usamos.
         Si devuelve vacío por RLS u otra razón,
         conservamos las categorías predeterminadas.
      */

      if (
        !categoriasRespuesta.error &&
        categoriasRespuesta.data?.length > 0
      ) {
        const categoriasSupabase =
          categoriasRespuesta.data.filter(
            (item) =>
              item.usuario_id === null ||
              item.usuario_id === usuarioId
          );

        if (categoriasSupabase.length > 0) {
          setCategorias(categoriasSupabase);
        } else {
          setCategorias(
            CATEGORIAS_PREDETERMINADAS
          );
        }
      } else {
        setCategorias(
          CATEGORIAS_PREDETERMINADAS
        );
      }

      setMovimientos(
        movimientosRespuesta.data || []
      );
    } catch (err) {
      console.error(
        "Error cargando movimientos:",
        err
      );

      /*
         Aunque exista un problema cargando categorías,
         dejamos disponibles las predeterminadas.
      */

      setCategorias(
        CATEGORIAS_PREDETERMINADAS
      );

      setError(
        err.message ||
          "No pudimos cargar tus movimientos."
      );
    } finally {
      setCargando(false);
    }
  };

  /* =========================================================
     PASO 4 — CARGAR AL ENTRAR
     ========================================================= */

  useEffect(() => {
    cargarDatos();
  }, [sesion?.user?.id]);

  /* =========================================================
     PASO 5 — FILTRAR CATEGORÍAS
     ========================================================= */

  const categoriasFiltradas = useMemo(() => {
    return categorias
      .filter((item) => item.tipo === tipo)
      .sort((a, b) =>
        a.nombre.localeCompare(
          b.nombre,
          "es",
          {
            sensitivity: "base",
          }
        )
      );
  }, [categorias, tipo]);

  /* =========================================================
     PASO 6 — LIMPIAR FORMULARIO
     ========================================================= */

  const limpiarFormulario = () => {
    setMonto("");
    setCategoria("");
    setDescripcion("");

    setFecha(
      new Date().toISOString().split("T")[0]
    );
  };

  /* =========================================================
     PASO 7 — CAMBIAR INGRESO / GASTO
     ========================================================= */

  const cambiarTipo = (nuevoTipo) => {
    setTipo(nuevoTipo);
    setCategoria("");
    setError("");
    setMensaje("");
  };

  /* =========================================================
     PASO 8 — REGISTRAR MOVIMIENTO
     ========================================================= */

  const registrarMovimiento = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    const montoNumerico = Number(
      String(monto)
        .replace(/\./g, "")
        .replace(",", ".")
    );

    if (!monto || montoNumerico <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    if (!categoria) {
      setError("Selecciona una categoría.");
      return;
    }

    if (!fecha) {
      setError("Selecciona una fecha.");
      return;
    }

    if (!sesion?.user?.id) {
      setError(
        "Tu sesión no está disponible."
      );
      return;
    }

    setGuardando(true);

    try {
      const { error: insertarError } =
        await supabase
          .from("movimientos")
          .insert({
            usuario_id: sesion.user.id,
            tipo,
            monto: montoNumerico,
            categoria,
            descripcion:
              descripcion.trim() || null,
            fecha,
          });

      if (insertarError) {
        throw insertarError;
      }

      setMensaje(
        tipo === "ingreso"
          ? "Ingreso registrado correctamente."
          : "Gasto registrado correctamente."
      );

      limpiarFormulario();

      await cargarDatos();
    } catch (err) {
      console.error(
        "Error registrando movimiento:",
        err
      );

      setError(
        err.message ||
          "No pudimos registrar el movimiento."
      );
    } finally {
      setGuardando(false);
    }
  };

  /* =========================================================
     PASO 9 — ELIMINAR MOVIMIENTO
     ========================================================= */

  const eliminarMovimiento = async (id) => {
    const confirmar = window.confirm(
      "¿Quieres eliminar este movimiento? Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    try {
      const { error: eliminarError } =
        await supabase
          .from("movimientos")
          .delete()
          .eq("id", id)
          .eq("usuario_id", sesion.user.id);

      if (eliminarError) {
        throw eliminarError;
      }

      setMensaje(
        "Movimiento eliminado correctamente."
      );

      await cargarDatos();
    } catch (err) {
      console.error(
        "Error eliminando movimiento:",
        err
      );

      setError(
        "No pudimos eliminar el movimiento."
      );
    }
  };

  /* =========================================================
     PASO 10 — FORMATEAR DINERO
     ========================================================= */

  const formatearDinero = (valor) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(valor || 0));
  };

  /* =========================================================
     PASO 11 — FORMATEAR FECHA
     ========================================================= */

  const formatearFecha = (valor) => {
    if (!valor) return "";

    return new Date(
      `${valor}T00:00:00`
    ).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =========================================================
     PASO 12 — CARGANDO
     ========================================================= */

  if (cargando) {
    return (
      <div className="movimientos-loading">
        <div className="movimientos-spinner"></div>

        <p>Cargando movimientos...</p>
      </div>
    );
  }

  /* =========================================================
     PASO 13 — INTERFAZ
     ========================================================= */

  return (
    <div className="movimientos-page">

      <header className="movimientos-header">

        <div>
          <span className="movimientos-label">
            MI DINERO
          </span>

          <h1>Movimientos</h1>

          <p>
            Registra y controla cada ingreso y gasto.
          </p>
        </div>

        <button
          type="button"
          className="movimientos-back"
          onClick={onVolver}
        >
          ← Volver
        </button>

      </header>

      <main className="movimientos-content">

        {/* =================================================
            PASO 14 — FORMULARIO
            ================================================= */}

        <section className="movimientos-form-card">

          <div className="form-card-header">

            <div>
              <span className="movimientos-label">
                NUEVO MOVIMIENTO
              </span>

              <h2>Registrar dinero</h2>

              <p>
                Guarda tus ingresos y gastos para mantener
                actualizado tu balance.
              </p>
            </div>

          </div>

          {/* INGRESO / GASTO */}

          <div className="tipo-selector">

            <button
              type="button"
              className={
                tipo === "ingreso"
                  ? "tipo-button active-income"
                  : "tipo-button"
              }
              onClick={() =>
                cambiarTipo("ingreso")
              }
            >
              <span>↑</span>
              Ingreso
            </button>

            <button
              type="button"
              className={
                tipo === "gasto"
                  ? "tipo-button active-expense"
                  : "tipo-button"
              }
              onClick={() =>
                cambiarTipo("gasto")
              }
            >
              <span>↓</span>
              Gasto
            </button>

          </div>

          <form
            className="movimientos-form"
            onSubmit={registrarMovimiento}
          >

            {/* MONTO */}

            <div className="form-field monto-field">

              <label htmlFor="monto">
                Monto
              </label>

              <div className="monto-input-wrapper">

                <span>$</span>

                <input
                  id="monto"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={monto}
                  onChange={(e) =>
                    setMonto(e.target.value)
                  }
                />

                <small>COP</small>

              </div>

            </div>

            {/* CATEGORÍA Y FECHA */}

            <div className="form-row">

              <div className="form-field">

                <label htmlFor="categoria">
                  Categoría
                </label>

                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) =>
                    setCategoria(e.target.value)
                  }
                >

                  <option value="">
                    Selecciona una categoría
                  </option>

                  {categoriasFiltradas.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.nombre}
                      >
                        {item.nombre}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div className="form-field">

                <label htmlFor="fecha">
                  Fecha
                </label>

                <input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) =>
                    setFecha(e.target.value)
                  }
                />

              </div>

            </div>

            {/* DESCRIPCIÓN */}

            <div className="form-field">

              <label htmlFor="descripcion">
                Descripción
                <span>Opcional</span>
              </label>

              <input
                id="descripcion"
                type="text"
                placeholder={
                  tipo === "ingreso"
                    ? "Ej. Pago de nómina"
                    : "Ej. Compra de mercado"
                }
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(e.target.value)
                }
                maxLength={150}
              />

            </div>

            {/* ERROR */}

            {error && (
              <div className="movimientos-message error">
                <span>!</span>
                {error}
              </div>
            )}

            {/* ÉXITO */}

            {mensaje && (
              <div className="movimientos-message success">
                <span>✓</span>
                {mensaje}
              </div>
            )}

            {/* GUARDAR */}

            <button
              type="submit"
              className={`guardar-button ${
                tipo === "ingreso"
                  ? "guardar-ingreso"
                  : "guardar-gasto"
              }`}
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : tipo === "ingreso"
                  ? "Registrar ingreso"
                  : "Registrar gasto"}
            </button>

          </form>

        </section>

        {/* =================================================
            PASO 15 — HISTORIAL
            ================================================= */}

        <section className="movimientos-list-card">

          <div className="list-header">

            <div>

              <span className="movimientos-label">
                HISTORIAL
              </span>

              <h2>Movimientos recientes</h2>

            </div>

            <span className="movimientos-count">
              {movimientos.length}
            </span>

          </div>

          {movimientos.length === 0 ? (

            <div className="movimientos-empty">

              <div className="empty-movement-icon">
                $
              </div>

              <strong>
                No tienes movimientos todavía
              </strong>

              <p>
                Registra tu primer ingreso o gasto y
                aparecerá aquí.
              </p>

            </div>

          ) : (

            <div className="movimientos-list">

              {movimientos.map((movimiento) => {

                const esIngreso =
                  movimiento.tipo === "ingreso";

                return (
                  <article
                    className="movimiento-item"
                    key={movimiento.id}
                  >

                    <div
                      className={`movimiento-type ${
                        esIngreso
                          ? "movement-income"
                          : "movement-expense"
                      }`}
                    >
                      {esIngreso ? "↑" : "↓"}
                    </div>

                    <div className="movimiento-data">

                      <strong>
                        {movimiento.categoria ||
                          (esIngreso
                            ? "Ingreso"
                            : "Gasto")}
                      </strong>

                      <span>
                        {movimiento.descripcion ||
                          "Sin descripción"}
                      </span>

                      <small>
                        {formatearFecha(
                          movimiento.fecha
                        )}
                      </small>

                    </div>

                    <div className="movimiento-right">

                      <strong
                        className={
                          esIngreso
                            ? "amount-income"
                            : "amount-expense"
                        }
                      >
                        {esIngreso ? "+" : "-"}
                        {formatearDinero(
                          movimiento.monto
                        )}
                      </strong>

                      <button
                        type="button"
                        className="delete-movement"
                        onClick={() =>
                          eliminarMovimiento(
                            movimiento.id
                          )
                        }
                        title="Eliminar movimiento"
                      >
                        ×
                      </button>

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default Movimientos;
