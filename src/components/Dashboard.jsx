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
  const [metas, setMetas] = useState([]);
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
        metasRespuesta,
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
        // METAS
        // ------------------------------------------------------

        supabase
          .from("metas")
          .select("*")
          .eq("usuario_id", usuarioId)
          .order("fecha_objetivo", {
            ascending: true,
            nullsFirst: false,
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
      // COMPROBAR METAS
      // ========================================================

      if (metasRespuesta.error) {
        throw metasRespuesta.error;
      }

      // ========================================================
      // GUARDAR DATOS
      // ========================================================

      setMovimientos(movimientosRespuesta.data || []);
      setDeudas(deudasRespuesta.data || []);
      setMetas(metasRespuesta.data || []);
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
    // PASO 9: CALCULAR AHORRO DE METAS
    // ==========================================================

    const ahorroTotal = metas.reduce(
      (total, meta) =>
        total +
        Number(meta.valor_actual || 0),
      0
    );

    const valorObjetivoTotal = metas.reduce(
      (total, meta) =>
        total +
        Number(meta.valor_objetivo || 0),
      0
    );

    // ==========================================================
    // PASO 10: PORCENTAJE DE METAS
    // ==========================================================

    const porcentajeMetas =
      valorObjetivoTotal > 0
        ? Math.min(
            100,
            (ahorroTotal / valorObjetivoTotal) * 100
          )
        : 0;

    // ==========================================================
    // PASO 11: PORCENTAJE DE GASTOS
    // ==========================================================

    const porcentajeGastos =
      ingresosMes > 0
        ? Math.min(
            100,
            (gastosMes / ingresosMes) * 100
          )
        : 0;

    // ==========================================================
    // PASO 12: DEVOLVER TODOS LOS DATOS CALCULADOS
    // ==========================================================

    return {
      totalIngresos,
      totalGastos,
      ingresosMes,
      gastosMes,
      balance,
      deudasPendientes,
      ahorroTotal,
      valorObjetivoTotal,
      porcentajeMetas,
      porcentajeGastos,
    };
  }, [movimientos, deudas, metas]);

  // ==========================================================
  // PASO 13: TOMAR LOS 5 MOVIMIENTOS MÁS RECIENTES
  // ==========================================================

  const movimientosRecientes = movimientos.slice(0, 5);

  // ==========================================================
  // PASO 14: FORMATEAR DINERO EN PESOS COLOMBIANOS
  // ==========================================================

  const formatearDinero = (valor) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(valor || 0));
  };

  // ==========================================================
  // PASO 15: FORMATEAR FECHAS
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
  // PASO 16: OBTENER NOMBRE DEL USUARIO
  // ==========================================================

  const nombreUsuario =
    sesion?.user?.user_metadata?.nombre ||
    sesion?.user?.email?.split("@")[0] ||
    "Usuario";

  // ==========================================================
  // PASO 17: PANTALLA DE CARGA
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
  // PASO 18: DASHBOARD PRINCIPAL
  // ==========================================================

  return (
    <div className="dashboard-page">

      {/* ======================================================
          PASO 19: ENCABEZADO
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
          PASO 20: CONTENIDO PRINCIPAL
      ====================================================== */}

      <main className="dashboard-content">

        {/* ====================================================
            PASO 21: BIENVENIDA
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
            PASO 22: MENSAJE DE ERROR
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
            PASO 23: BALANCE PRINCIPAL
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

            {/* INGRESOS */}

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

            {/* GASTOS */}

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
            PASO 24: TARJETAS DE ESTADÍSTICAS
        ==================================================== */}

        <section className="dashboard-stats">

          {/* INGRESOS DEL MES */}

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

          {/* GASTOS DEL MES */}

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

          {/* METAS */}

          <article className="dashboard-stat-card">

            <div className="stat-icon stat-goal">
              ★
            </div>

            <div>

              <span>
                Ahorro en metas
              </span>

              <strong>
                {formatearDinero(
                  datosFinancieros.ahorroTotal
                )}
              </strong>

            </div>

          </article>

        </section>

        {/* ====================================================
            PASO 25: ACCIONES RÁPIDAS
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

              {/* META */}

              <button
                type="button"
                className="quick-action goal-action"
                onClick={onAgregarMeta}
              >

                <span className="quick-action-icon">
                  ★
                </span>

                <span>

                  <strong>
                    Nueva meta
                  </strong>

                  <small>
                    Crea un objetivo de ahorro
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
            PASO 32: MOVIMIENTOS RECIENTES + METAS
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

          {/* METAS */}

          <div className="dashboard-panel">

            <div className="panel-header">

              <div>

                <span className="dashboard-label">
                  OBJETIVOS
                </span>

                <h2>
                  Mis metas
                </h2>

              </div>

              <span className="panel-count">
                {metas.length}
              </span>

            </div>

            {metas.length === 0 ? (

              <div className="dashboard-empty">

                <div className="dashboard-empty-icon">
                  ★
                </div>

                <strong>
                  No tienes metas creadas
                </strong>

                <p>
                  Crea tu primera meta de ahorro
                  y empieza a avanzar.
                </p>

                <button
                  type="button"
                  className="dashboard-empty-action"
                  onClick={onAgregarMeta}
                >
                  Crear primera meta
                </button>

              </div>

            ) : (

              <div className="dashboard-goals">

                {metas.slice(0, 4).map(
                  (meta) => {

                    const objetivo =
                      Number(
                        meta.valor_objetivo || 0
                      );

                    const actual =
                      Number(
                        meta.valor_actual || 0
                      );

                    const porcentaje =
                      objetivo > 0
                        ? Math.min(
                            100,
                            (actual /
                              objetivo) *
                              100
                          )
                        : 0;

                    return (
                      <div
                        className="dashboard-goal"
                        key={meta.id}
                      >

                        <div className="goal-top">

                          <strong>
                            {meta.nombre}
                          </strong>

                          <span>
                            {Math.round(
                              porcentaje
                            )}
                            %
                          </span>

                        </div>

                        <div className="goal-progress-track">

                          <div
                            className="goal-progress-fill"
                            style={{
                              width: `${porcentaje}%`,
                            }}
                          ></div>

                        </div>

                        <div className="goal-bottom">

                          <span>
                            {formatearDinero(
                              actual
                            )}
                          </span>

                          <span>
                            de{" "}
                            {formatearDinero(
                              objetivo
                            )}
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
            PASO 35: RESUMEN DE AHORRO
        ==================================================== */}

        <section className="dashboard-footer-summary">

          <div>

            <span className="dashboard-label">
              RESUMEN DE AHORRO
            </span>

            <strong>
              {Math.round(
                datosFinancieros.porcentajeMetas
              )}
              %
            </strong>

            <p>
              Progreso total de tus metas de ahorro.
            </p>

          </div>

          <div className="footer-progress">

            <div className="footer-progress-track">

              <div
                className="footer-progress-fill"
                style={{
                  width: `${datosFinancieros.porcentajeMetas}%`,
                }}
              ></div>

            </div>

            <span>
              {formatearDinero(
                datosFinancieros.ahorroTotal
              )}
              {" "}de{" "}
              {formatearDinero(
                datosFinancieros.valorObjetivoTotal
              )}
            </span>

          </div>

        </section>

      </main>

    </div>
  );
}

// ============================================================
// PASO 36: EXPORTAR DASHBOARD
// ============================================================

export default Dashboard;
