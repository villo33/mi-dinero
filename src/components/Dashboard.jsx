// ============================================================
// PASO 1: IMPORTACIONES
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./Dashboard.css";

// ============================================================
// PASO 2: COMPONENTE DASHBOARD
// ============================================================

function Dashboard({
  sesion,
  onCerrarSesion,
  onRegistrarIngreso,
  onRegistrarGasto,
  onAgregarDeuda,
  onAgregarMeta,
  onAgregarAlcancia,
}) {
  // ==========================================================
  // PASO 3: ESTADOS
  // ==========================================================

  const [movimientos, setMovimientos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [alcancias, setAlcancias] = useState([]);
  const [movimientosAlcancias, setMovimientosAlcancias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // PASO 4: CARGAR INFORMACIÓN DESDE SUPABASE
  // ==========================================================

  const cargarDatos = async () => {
    if (!sesion?.user?.id) return;

    setCargando(true);
    setError("");

    try {
      const usuarioId = sesion.user.id;

      const [
        movimientosRespuesta,
        deudasRespuesta,
        alcanciasRespuesta,
        movimientosAlcanciasRespuesta,
      ] = await Promise.all([
        // ------------------------------------------------------
        // MOVIMIENTOS
        // ------------------------------------------------------

        supabase
          .from("movimientos")
          .select("*")
          .eq("usuario_id", usuarioId)
          .order("fecha", { ascending: false }),

        // ------------------------------------------------------
        // DEUDAS
        // ------------------------------------------------------

        supabase
          .from("deudas")
          .select("*")
          .eq("usuario_id", usuarioId)
          .order("fecha_vencimiento", {
            ascending: true,
            nullsFirst: false,
          }),

        // ------------------------------------------------------
        // ALCANCÍAS
        // ------------------------------------------------------

        supabase
          .from("alcancias")
          .select("*")
          .eq("usuario_id", usuarioId)
          .order("fecha_objetivo", {
            ascending: true,
            nullsFirst: false,
          }),

        // ------------------------------------------------------
        // MOVIMIENTOS DE ALCANCÍAS
        // ------------------------------------------------------

        supabase
          .from("movimientos_alcancia")
          .select("*")
          .eq("usuario_id", usuarioId)
          .order("fecha", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          }),
      ]);

      // ========================================================
      // COMPROBAR MOVIMIENTOS
      // ========================================================

      if (movimientosRespuesta.error) {
        throw movimientosRespuesta.error;
      }

      // ========================================================
      // COMPROBAR DEUDAS
      // ========================================================

      if (deudasRespuesta.error) {
        throw deudasRespuesta.error;
      }

      // ========================================================
      // COMPROBAR ALCANCÍAS
      // ========================================================

      if (alcanciasRespuesta.error) {
        throw alcanciasRespuesta.error;
      }

      // ========================================================
      // COMPROBAR MOVIMIENTOS DE ALCANCÍAS
      // ========================================================

      if (movimientosAlcanciasRespuesta.error) {
        throw movimientosAlcanciasRespuesta.error;
      }

      // ========================================================
      // GUARDAR DATOS
      // ========================================================

      setMovimientos(movimientosRespuesta.data || []);
      setDeudas(deudasRespuesta.data || []);
      setAlcancias(alcanciasRespuesta.data || []);
      setMovimientosAlcancias(
        movimientosAlcanciasRespuesta.data || []
      );
    } catch (err) {
      console.error("Error cargando dashboard:", err);

      setError(
        "No pudimos cargar toda la información financiera."
      );
    } finally {
      setCargando(false);
    }
  };

  // ==========================================================
  // PASO 5: CARGAR DATOS CUANDO INICIA SESIÓN
  // ==========================================================

  useEffect(() => {
    cargarDatos();
  }, [sesion?.user?.id]);

  // ==========================================================
  // PASO 6: CALCULAR RESUMEN FINANCIERO
  // ==========================================================

  const datosFinancieros = useMemo(() => {
    const hoy = new Date();

    const inicioMes = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      1
    );

    const siguienteMes = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + 1,
      1
    );

    let totalIngresos = 0;
    let totalGastos = 0;
    let ingresosMes = 0;
    let gastosMes = 0;

    // ----------------------------------------------------------
    // RECORRER MOVIMIENTOS
    // ----------------------------------------------------------

    movimientos.forEach((movimiento) => {
      const monto = Number(movimiento.monto || 0);

      if (movimiento.tipo === "ingreso") {
        totalIngresos += monto;
      }

      if (movimiento.tipo === "gasto") {
        totalGastos += monto;
      }

      // --------------------------------------------------------
      // CALCULAR MOVIMIENTOS DEL MES ACTUAL
      // --------------------------------------------------------

      if (movimiento.fecha) {
        const fechaMovimiento = new Date(
          `${movimiento.fecha}T00:00:00`
        );

        if (
          fechaMovimiento >= inicioMes &&
          fechaMovimiento < siguienteMes
        ) {
          if (movimiento.tipo === "ingreso") {
            ingresosMes += monto;
          }

          if (movimiento.tipo === "gasto") {
            gastosMes += monto;
          }
        }
      }
    });

    // ==========================================================
    // PASO 7: BALANCE
    // ==========================================================

    const balance = totalIngresos - totalGastos;

    // ==========================================================
    // PASO 8: CALCULAR DEUDAS PENDIENTES
    // ==========================================================

    const deudasPendientes = deudas
      .filter(
        (deuda) => deuda.estado !== "pagada"
      )
      .reduce(
        (total, deuda) =>
          total +
          Number(deuda.saldo_pendiente || 0),
        0
      );

    // ==========================================================
    // PASO 9: CALCULAR DINERO EN ALCANCÍAS
    // ==========================================================

    const ahorroAlcancias = movimientosAlcancias.reduce(
      (total, movimiento) => {
        const monto = Number(movimiento.monto || 0);

        if (movimiento.tipo === "aporte") {
          return total + monto;
        }

        if (movimiento.tipo === "retiro") {
          return total - monto;
        }

        return total;
      },
      0
    );

    // ==========================================================
    // PASO 10: OBJETIVOS DE ALCANCÍAS
    // ==========================================================

    const alcanciasConObjetivo = alcancias.filter(
      (alcancia) =>
        alcancia.monto_objetivo !== null &&
        Number(alcancia.monto_objetivo || 0) > 0
    );

    const objetivoAlcancias = alcanciasConObjetivo.reduce(
      (total, alcancia) =>
        total +
        Number(alcancia.monto_objetivo || 0),
      0
    );

    // ==========================================================
    // PASO 11: PORCENTAJE DE ALCANCÍAS
    // ==========================================================

    const porcentajeAlcancias =
      objetivoAlcancias > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (ahorroAlcancias /
                objetivoAlcancias) *
                100
            )
          )
        : 0;

    // ==========================================================
    // PASO 12: PORCENTAJE DE GASTOS
    // ==========================================================

    const porcentajeGastos =
      ingresosMes > 0
        ? Math.min(
            100,
            (gastosMes / ingresosMes) * 100
          )
        : 0;

    // ==========================================================
    // PASO 13: DEVOLVER DATOS
    // ==========================================================

    return {
      totalIngresos,
      totalGastos,
      ingresosMes,
      gastosMes,
      balance,
      deudasPendientes,
      ahorroAlcancias,
      objetivoAlcancias,
      porcentajeAlcancias,
      porcentajeGastos,
    };
  }, [
    movimientos,
    deudas,
    alcancias,
    movimientosAlcancias,
  ]);

  // ==========================================================
  // PASO 14: TOMAR LOS 5 MOVIMIENTOS MÁS RECIENTES
  // ==========================================================

  const movimientosRecientes =
    movimientos.slice(0, 5);

  // ==========================================================
  // PASO 15: CALCULAR SALDO DE CADA ALCANCÍA
  // ==========================================================

  const calcularSaldoAlcancia = (alcanciaId) => {
    return movimientosAlcancias
      .filter(
        (movimiento) =>
          Number(movimiento.alcancia_id) ===
          Number(alcanciaId)
      )
      .reduce(
        (total, movimiento) => {
          const monto = Number(
            movimiento.monto || 0
          );

          if (movimiento.tipo === "aporte") {
            return total + monto;
          }

          if (movimiento.tipo === "retiro") {
            return total - monto;
          }

          return total;
        },
        0
      );
  };

  // ==========================================================
  // PASO 16: FORMATEAR DINERO
  // ==========================================================

  const formatearDinero = (valor) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(valor || 0));
  };

  // ==========================================================
  // PASO 17: FORMATEAR FECHAS
  // ==========================================================

  const formatearFecha = (valor) => {
    if (!valor) return "";

    return new Date(
      `${valor}T00:00:00`
    ).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    });
  };

  // ==========================================================
  // PASO 18: OBTENER NOMBRE DEL USUARIO
  // ==========================================================

  const nombreUsuario =
    sesion?.user?.user_metadata?.nombre ||
    sesion?.user?.email?.split("@")[0] ||
    "Usuario";

  // ==========================================================
  // PASO 19: PANTALLA DE CARGA
  // ==========================================================

  if (cargando) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner"></div>

        <p>
          Cargando tu información financiera...
        </p>
      </div>
    );
  }

  // ==========================================================
  // PASO 20: DASHBOARD PRINCIPAL
  // ==========================================================

  return (
    <div className="dashboard-page">

      {/* ======================================================
          ENCABEZADO
      ====================================================== */}

      <header className="dashboard-header">

        <div className="dashboard-brand">

          <div className="dashboard-brand-icon">
            $
          </div>

          <div>
            <span>
              MI DINERO
            </span>

            <strong>
              Control financiero personal
            </strong>
          </div>

        </div>

        {/* INFORMACIÓN DEL USUARIO */}

        <div className="dashboard-user">

          <div className="dashboard-user-info">

            <strong>
              {nombreUsuario}
            </strong>

            <span>
              {sesion?.user?.email}
            </span>

          </div>

          {/* CERRAR SESIÓN */}

          <button
            type="button"
            className="logout-button"
            onClick={onCerrarSesion}
          >
            Cerrar sesión
          </button>

        </div>

      </header>

      {/* ======================================================
          CONTENIDO PRINCIPAL
      ====================================================== */}

      <main className="dashboard-content">

        {/* ====================================================
            BIENVENIDA
        ==================================================== */}

        <section className="dashboard-welcome">

          <div>

            <span className="dashboard-label">
              RESUMEN FINANCIERO
            </span>

            <h1>
              Hola, {nombreUsuario}
            </h1>

            <p>
              Aquí tienes una visión general de tus
              finanzas.
            </p>

          </div>

          <div className="dashboard-date">
            {new Date().toLocaleDateString(
              "es-CO",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }
            )}
          </div>

        </section>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <div className="dashboard-error">

            <span>
              !
            </span>

            {error}

          </div>
        )}

        {/* ====================================================
            BALANCE PRINCIPAL
        ==================================================== */}

        <section className="dashboard-balance-card">

          <div className="balance-main">

            <span className="dashboard-label">
              BALANCE TOTAL
            </span>

            <strong
              className={
                datosFinancieros.balance >= 0
                  ? "balance-positive"
                  : "balance-negative"
              }
            >
              {formatearDinero(
                datosFinancieros.balance
              )}
            </strong>

            <p>
              Ingresos acumulados menos gastos
              registrados.
            </p>

          </div>

          {/* DETALLE DE INGRESOS Y GASTOS */}

          <div className="balance-details">

            <div className="balance-detail">

              <span className="balance-detail-icon income-icon">
                ↑
              </span>

              <div>

                <span>
                  Ingresos
                </span>

                <strong>
                  {formatearDinero(
                    datosFinancieros.totalIngresos
                  )}
                </strong>

              </div>

            </div>

            <div className="balance-detail">

              <span className="balance-detail-icon expense-icon">
                ↓
              </span>

              <div>

                <span>
                  Gastos
                </span>

                <strong>
                  {formatearDinero(
                    datosFinancieros.totalGastos
                  )}
                </strong>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            TARJETAS DE ESTADÍSTICAS
        ==================================================== */}

        <section className="dashboard-stats">

          {/* INGRESOS */}

          <article className="dashboard-stat-card">

            <div className="stat-icon stat-income">
              ↑
            </div>

            <div>

              <span>
                Ingresos del mes
              </span>

              <strong>
                {formatearDinero(
                  datosFinancieros.ingresosMes
                )}
              </strong>

            </div>

          </article>

          {/* GASTOS */}

          <article className="dashboard-stat-card">

            <div className="stat-icon stat-expense">
              ↓
            </div>

            <div>

              <span>
                Gastos del mes
              </span>

              <strong>
                {formatearDinero(
                  datosFinancieros.gastosMes
                )}
              </strong>

            </div>

          </article>

          {/* DEUDAS */}

          <article className="dashboard-stat-card">

            <div className="stat-icon stat-debt">
              $
            </div>

            <div>

              <span>
                Deudas pendientes
              </span>

              <strong>
                {formatearDinero(
                  datosFinancieros.deudasPendientes
                )}
              </strong>

            </div>

          </article>

          {/* ALCANCÍAS */}

          <article className="dashboard-stat-card">

            <div className="stat-icon stat-piggy">
              🐷
            </div>

            <div>

              <span>
                Ahorro en alcancías
              </span>

              <strong>
                {formatearDinero(
                  datosFinancieros.ahorroAlcancias
                )}
              </strong>

            </div>

          </article>

        </section>

        {/* ====================================================
            ACCIONES RÁPIDAS
        ==================================================== */}

        <section className="dashboard-grid">

          <div className="dashboard-panel quick-actions-panel">

            <div className="panel-header">

              <div>

                <span className="dashboard-label">
                  ACCIONES RÁPIDAS
                </span>

                <h2>
                  Registrar movimiento
                </h2>

              </div>

            </div>

            <div className="quick-actions">

              {/* INGRESO */}

              <button
                type="button"
                className="quick-action income-action"
                onClick={onRegistrarIngreso}
              >

                <span className="quick-action-icon">
                  ↑
                </span>

                <span>

                  <strong>
                    Registrar ingreso
                  </strong>

                  <small>
                    Agrega dinero que recibiste
                  </small>

                </span>

                <span className="quick-action-arrow">
                  →
                </span>

              </button>

              {/* GASTO */}

              <button
                type="button"
                className="quick-action expense-action"
                onClick={onRegistrarGasto}
              >

                <span className="quick-action-icon">
                  ↓
                </span>

                <span>

                  <strong>
                    Registrar gasto
                  </strong>

                  <small>
                    Registra una compra o pago
                  </small>

                </span>

                <span className="quick-action-arrow">
                  →
                </span>

              </button>

              {/* DEUDA */}

              <button
                type="button"
                className="quick-action debt-action"
                onClick={onAgregarDeuda}
              >

                <span className="quick-action-icon">
                  $
                </span>

                <span>

                  <strong>
                    Agregar deuda
                  </strong>

                  <small>
                    Registra una nueva deuda
                  </small>

                </span>

                <span className="quick-action-arrow">
                  →
                </span>

              </button>

              {/* ALCANCÍA */}

              <button
                type="button"
                className="quick-action piggy-action"
                onClick={onAgregarAlcancia}
              >

                <span className="quick-action-icon">
                  🐷
                </span>

                <span>

                  <strong>
                    Nueva alcancía
                  </strong>

                  <small>
                    Ahorra cuando quieras y cuanto quieras
                  </small>

                </span>

                <span className="quick-action-arrow">
                  →
                </span>

              </button>

            </div>

          </div>

          {/* COMPORTAMIENTO DEL MES */}

          <div className="dashboard-panel monthly-panel">

            <div className="panel-header">

              <div>

                <span className="dashboard-label">
                  ESTE MES
                </span>

                <h2>
                  Comportamiento
                </h2>

              </div>

              <span className="monthly-result">

                {formatearDinero(
                  datosFinancieros.ingresosMes -
                  datosFinancieros.gastosMes
                )}

              </span>

            </div>

            {/* BARRA DE GASTOS */}

            <div className="progress-section">

              <div className="progress-info">

                <span>
                  Gastos sobre ingresos
                </span>

                <strong>
                  {Math.round(
                    datosFinancieros.porcentajeGastos
                  )}
                  %
                </strong>

              </div>

              <div className="progress-track">

                <div
                  className="progress-fill expense-progress"
                  style={{
                    width: `${datosFinancieros.porcentajeGastos}%`,
                  }}
                ></div>

              </div>

            </div>

            {/* RESUMEN MENSUAL */}

            <div className="monthly-summary">

              <div>

                <span>
                  Ingresos
                </span>

                <strong className="summary-income">
                  {formatearDinero(
                    datosFinancieros.ingresosMes
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Gastos
                </span>

                <strong className="summary-expense">
                  {formatearDinero(
                    datosFinancieros.gastosMes
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Disponible
                </span>

                <strong
                  className={
                    datosFinancieros.ingresosMes -
                      datosFinancieros.gastosMes >=
                    0
                      ? "summary-income"
                      : "summary-expense"
                  }
                >
                  {formatearDinero(
                    datosFinancieros.ingresosMes -
                    datosFinancieros.gastosMes
                  )}
                </strong>

              </div>

            </div>

          </div>

        </section>

        {/* ====================================================
            MOVIMIENTOS RECIENTES + ALCANCÍAS
        ==================================================== */}

        <section className="dashboard-grid">

          {/* MOVIMIENTOS RECIENTES */}

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <span className="dashboard-label">
                  ACTIVIDAD
                </span>

                <h2>
                  Movimientos recientes
                </h2>

              </div>

              <span className="panel-count">
                {movimientos.length}
              </span>

            </div>

            {movimientosRecientes.length === 0 ? (

              <div className="dashboard-empty">

                <div className="dashboard-empty-icon">
                  $
                </div>

                <strong>
                  Aún no tienes movimientos
                </strong>

                <p>
                  Registra tu primer ingreso o gasto
                  para comenzar.
                </p>

              </div>

            ) : (

              <div className="dashboard-movements">

                {movimientosRecientes.map(
                  (movimiento) => {

                    const esIngreso =
                      movimiento.tipo === "ingreso";

                    return (
                      <div
                        className="dashboard-movement"
                        key={movimiento.id}
                      >

                        <div
                          className={`dashboard-movement-icon ${
                            esIngreso
                              ? "movement-income"
                              : "movement-expense"
                          }`}
                        >
                          {esIngreso ? "↑" : "↓"}
                        </div>

                        <div className="dashboard-movement-info">

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

                        <strong
                          className={
                            esIngreso
                              ? "movement-amount-income"
                              : "movement-amount-expense"
                          }
                        >
                          {esIngreso ? "+" : "-"}
                          {formatearDinero(
                            movimiento.monto
                          )}
                        </strong>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* ALCANCÍAS */}

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <span className="dashboard-label">
                  AHORRO FLEXIBLE
                </span>

                <h2>
                  Mis alcancías
                </h2>

              </div>

              <span className="panel-count">
                {alcancias.length}
              </span>

            </div>

            {alcancias.length === 0 ? (

              <div className="dashboard-empty">

                <div className="dashboard-empty-icon">
                  🐷
                </div>

                <strong>
                  No tienes alcancías creadas
                </strong>

                <p>
                  Crea una alcancía y empieza a
                  guardar dinero a tu ritmo.
                </p>

                <button
                  type="button"
                  className="dashboard-empty-action"
                  onClick={onAgregarAlcancia}
                >
                  Crear primera alcancía
                </button>

              </div>

            ) : (

              <div className="dashboard-goals">

                {alcancias.slice(0, 4).map(
                  (alcancia) => {

                    const saldo =
                      calcularSaldoAlcancia(
                        alcancia.id
                      );

                    const objetivo =
                      alcancia.monto_objetivo !== null
                        ? Number(
                            alcancia.monto_objetivo || 0
                          )
                        : null;

                    const porcentaje =
                      objetivo &&
                      objetivo > 0
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              (saldo /
                                objetivo) *
                                100
                            )
                          )
                        : null;

                    return (
                      <div
                        className="dashboard-goal"
                        key={alcancia.id}
                      >

                        <div className="goal-top">

                          <strong>
                            🐷 {alcancia.nombre}
                          </strong>

                          <span>
                            {objetivo
                              ? `${Math.round(
                                  porcentaje
                                )}%`
                              : "Flexible"}
                          </span>

                        </div>

                        {objetivo ? (

                          <div className="goal-progress-track">

                            <div
                              className="goal-progress-fill"
                              style={{
                                width: `${porcentaje}%`,
                              }}
                            ></div>

                          </div>

                        ) : (

                          <div className="goal-progress-track">

                            <div
                              className="goal-progress-fill"
                              style={{
                                width: "100%",
                                opacity: 0.25,
                              }}
                            ></div>

                          </div>

                        )}

                        <div className="goal-bottom">

                          <span>
                            {formatearDinero(
                              saldo
                            )}
                          </span>

                          <span>
                            {objetivo
                              ? `de ${formatearDinero(
                                  objetivo
                                )}`
                              : "ahorro acumulado"}
                          </span>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </section>

        {/* ====================================================
            RESUMEN DE ALCANCÍAS
        ==================================================== */}

        <section className="dashboard-footer-summary">

          <div>

            <span className="dashboard-label">
              RESUMEN DE ALCANCÍAS
            </span>

            <strong>
              {Math.round(
                datosFinancieros.porcentajeAlcancias
              )}
              %
            </strong>

            <p>
              Progreso de tus alcancías que tienen
              un objetivo definido.
            </p>

          </div>

          <div className="footer-progress">

            <div className="footer-progress-track">

              <div
                className="footer-progress-fill"
                style={{
                  width: `${datosFinancieros.porcentajeAlcancias}%`,
                }}
              ></div>

            </div>

            <span>
              {formatearDinero(
                datosFinancieros.ahorroAlcancias
              )}
              {" "}de{" "}
              {formatearDinero(
                datosFinancieros.objetivoAlcancias
              )}
            </span>

          </div>

        </section>

      </main>

    </div>
  );
}

// ============================================================
// PASO 21: EXPORTAR DASHBOARD
// ============================================================

export default Dashboard;
