import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./Alcancias.css";

const obtenerFechaLocal = () => {
  const fecha = new Date();
  const offset = fecha.getTimezoneOffset();
  const local = new Date(fecha.getTime() - offset * 60000);

  return local.toISOString().split("T")[0];
};

const formularioInicial = {
  nombre: "",
  fecha_objetivo: "",
  monto_objetivo: "",
  descripcion: "",
};

function Alcancias({ sesion, onVolver }) {
  const [alcancias, setAlcancias] = useState([]);
  const [movimientos, setMovimientos] = useState({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoMovimiento, setGuardandoMovimiento] =
    useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [alcanciaEditando, setAlcanciaEditando] =
    useState(null);

  const [formulario, setFormulario] =
    useState(formularioInicial);

  const [alcanciaParaMovimiento, setAlcanciaParaMovimiento] =
    useState(null);

  const [tipoMovimiento, setTipoMovimiento] =
    useState("aporte");

  const [montoMovimiento, setMontoMovimiento] =
    useState("");

  const [fechaMovimiento, setFechaMovimiento] =
    useState(obtenerFechaLocal);

  const [descripcionMovimiento, setDescripcionMovimiento] =
    useState("");

  const [alcanciasAbiertas, setAlcanciasAbiertas] =
    useState({});

  const [cargandoMovimientos, setCargandoMovimientos] =
    useState({});

  const usuarioId = sesion?.user?.id;

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "Sin fecha";

    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio}`;
  };

  const obtenerEstadoFecha = (fecha) => {
    if (!fecha) return "";

    const hoy = obtenerFechaLocal();

    if (fecha < hoy) {
      return "vencida";
    }

    if (fecha === hoy) {
      return "hoy";
    }

    return "activa";
  };

  const calcularSaldo = (alcanciaId) => {
    const lista = movimientos[alcanciaId] || [];

    return lista.reduce((total, movimiento) => {
      const monto = Number(movimiento.monto) || 0;

      if (movimiento.tipo === "aporte") {
        return total + monto;
      }

      return total - monto;
    }, 0);
  };

  const calcularPlanAhorro = (
    saldo,
    objetivo,
    fechaObjetivo
  ) => {
    if (
      objetivo === null ||
      !Number.isFinite(objetivo) ||
      objetivo <= 0 ||
      !fechaObjetivo ||
      saldo >= objetivo
    ) {
      return null;
    }

    const hoy = new Date(`${obtenerFechaLocal()}T00:00:00`);
    const fechaMeta = new Date(
      `${fechaObjetivo}T00:00:00`
    );

    const diferencia =
      fechaMeta.getTime() - hoy.getTime();

    const diasRestantes = Math.ceil(
      diferencia / (1000 * 60 * 60 * 24)
    );

    const faltante = Math.max(0, objetivo - saldo);

    if (diasRestantes <= 0 || faltante <= 0) {
      return null;
    }

    const ahorroDiario =
      faltante / diasRestantes;

    const semanasRestantes =
      diasRestantes / 7;

    const quincenasRestantes =
      diasRestantes / 15;

    const ahorroSemanal =
      semanasRestantes > 0
        ? faltante / semanasRestantes
        : faltante;

    const ahorroQuincenal =
      quincenasRestantes > 0
        ? faltante / quincenasRestantes
        : faltante;

    return {
      faltante,
      diasRestantes,
      ahorroDiario,
      ahorroSemanal,
      ahorroQuincenal,
    };
  };

  const cargarAlcancias = async () => {
    if (!usuarioId) return;

    setCargando(true);
    setError("");

    const { data, error: errorConsulta } =
      await supabase
        .from("alcancias")
        .select("*")
        .eq("usuario_id", usuarioId)
        .order("fecha_objetivo", {
          ascending: true,
        });

    if (errorConsulta) {
      console.error(
        "Error cargando alcancías:",
        errorConsulta
      );

      setError(
        "No fue posible cargar tus alcancías."
      );
      setAlcancias([]);
    } else {
      setAlcancias(data || []);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarAlcancias();
  }, [usuarioId]);

  const cargarMovimientos = async (alcanciaId) => {
    if (!usuarioId) return;

    setCargandoMovimientos((anteriores) => ({
      ...anteriores,
      [alcanciaId]: true,
    }));

    const { data, error: errorConsulta } =
      await supabase
        .from("movimientos_alcancia")
        .select("*")
        .eq("usuario_id", usuarioId)
        .eq("alcancia_id", alcanciaId)
        .order("fecha", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

    if (errorConsulta) {
      console.error(
        "Error cargando movimientos de alcancía:",
        errorConsulta
      );

      setError(
        "No fue posible cargar el historial de esta alcancía."
      );
    } else {
      setMovimientos((anteriores) => ({
        ...anteriores,
        [alcanciaId]: data || [],
      }));
    }

    setCargandoMovimientos((anteriores) => ({
      ...anteriores,
      [alcanciaId]: false,
    }));
  };

  const abrirNuevaAlcancia = () => {
    setAlcanciaEditando(null);
    setFormulario(formularioInicial);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  };

  const abrirEditarAlcancia = (alcancia) => {
    setAlcanciaEditando(alcancia);

    setFormulario({
      nombre: alcancia.nombre || "",
      fecha_objetivo: alcancia.fecha_objetivo || "",
      monto_objetivo:
        alcancia.monto_objetivo ?? "",
      descripcion: alcancia.descripcion || "",
    });

    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) return;

    setMostrarFormulario(false);
    setAlcanciaEditando(null);
    setFormulario(formularioInicial);
  };

  const cambiarFormulario = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const guardarAlcancia = async (event) => {
    event.preventDefault();

    if (!usuarioId) return;

    setMensaje("");
    setError("");

    const nombre = formulario.nombre.trim();

    const montoObjetivo =
      formulario.monto_objetivo === ""
        ? null
        : Number(formulario.monto_objetivo);

    if (!nombre) {
      setError(
        "Escribe el nombre de la alcancía."
      );
      return;
    }

    if (!formulario.fecha_objetivo) {
      setError(
        "Selecciona una fecha objetivo."
      );
      return;
    }

    const hoy = obtenerFechaLocal();

    if (formulario.fecha_objetivo < hoy) {
      setError(
        "La fecha objetivo no puede ser anterior a hoy."
      );
      return;
    }

    if (
      montoObjetivo !== null &&
      (!Number.isFinite(montoObjetivo) ||
        montoObjetivo <= 0)
    ) {
      setError(
        "El monto objetivo debe ser mayor que cero."
      );
      return;
    }

    setGuardando(true);

    const datos = {
      usuario_id: usuarioId,
      nombre,
      fecha_objetivo:
        formulario.fecha_objetivo,
      monto_objetivo: montoObjetivo,
      descripcion:
        formulario.descripcion.trim() || null,
    };

    if (alcanciaEditando) {
      const {
        data,
        error: errorActualizacion,
      } = await supabase
        .from("alcancias")
        .update({
          nombre: datos.nombre,
          fecha_objetivo:
            datos.fecha_objetivo,
          monto_objetivo:
            datos.monto_objetivo,
          descripcion:
            datos.descripcion,
        })
        .eq("id", alcanciaEditando.id)
        .eq("usuario_id", usuarioId)
        .select()
        .single();

      if (errorActualizacion) {
        console.error(
          "Error actualizando alcancía:",
          errorActualizacion
        );

        setError(
          "No fue posible actualizar la alcancía."
        );
      } else {
        setAlcancias((anteriores) =>
          anteriores.map((alcancia) =>
            alcancia.id ===
            alcanciaEditando.id
              ? data
              : alcancia
          )
        );

        setMensaje(
          "Alcancía actualizada correctamente."
        );

        cerrarFormulario();
      }
    } else {
      const {
        data,
        error: errorInsercion,
      } = await supabase
        .from("alcancias")
        .insert({
          ...datos,
          estado: "activa",
        })
        .select()
        .single();

      if (errorInsercion) {
        console.error(
          "Error creando alcancía:",
          errorInsercion
        );

        setError(
          "No fue posible crear la alcancía."
        );
      } else {
        setAlcancias((anteriores) =>
          [...anteriores, data].sort(
            (a, b) => {
              return (
                a.fecha_objetivo || ""
              ).localeCompare(
                b.fecha_objetivo || ""
              );
            }
          )
        );

        setMensaje(
          "Alcancía creada correctamente."
        );

        cerrarFormulario();
      }
    }

    setGuardando(false);
  };

  const obtenerMovimientosSiEsNecesario = async (
    alcanciaId
  ) => {
    if (!movimientos[alcanciaId]) {
      await cargarMovimientos(alcanciaId);
    }
  };

  const abrirMovimiento = async (
    alcancia,
    tipo = "aporte"
  ) => {
    setMensaje("");
    setError("");

    await obtenerMovimientosSiEsNecesario(
      alcancia.id
    );

    setAlcanciaParaMovimiento(alcancia);
    setTipoMovimiento(tipo);
    setMontoMovimiento("");
    setFechaMovimiento(
      obtenerFechaLocal()
    );
    setDescripcionMovimiento("");
  };

  const cerrarMovimiento = () => {
    if (guardandoMovimiento) return;

    setAlcanciaParaMovimiento(null);
    setMontoMovimiento("");
    setFechaMovimiento(
      obtenerFechaLocal()
    );
    setDescripcionMovimiento("");
  };

  const guardarMovimiento = async (event) => {
    event.preventDefault();

    if (
      !usuarioId ||
      !alcanciaParaMovimiento
    ) {
      return;
    }

    setMensaje("");
    setError("");

    const monto = Number(montoMovimiento);

    if (!Number.isFinite(monto) || monto <= 0) {
      setError(
        "El monto debe ser mayor que cero."
      );
      return;
    }

    if (!fechaMovimiento) {
      setError(
        "Selecciona la fecha."
      );
      return;
    }

    const saldoActual = calcularSaldo(
      alcanciaParaMovimiento.id
    );

    if (
      tipoMovimiento === "retiro" &&
      monto > saldoActual
    ) {
      setError(
        `No puedes retirar más de ${formatearMoneda(
          saldoActual
        )}.`
      );
      return;
    }

    setGuardandoMovimiento(true);

    const {
      data,
      error: errorInsercion,
    } = await supabase
      .from("movimientos_alcancia")
      .insert({
        usuario_id: usuarioId,
        alcancia_id:
          alcanciaParaMovimiento.id,
        tipo: tipoMovimiento,
        monto,
        fecha: fechaMovimiento,
        descripcion:
          descripcionMovimiento.trim() ||
          null,
      })
      .select()
      .single();

    if (errorInsercion) {
      console.error(
        "Error registrando movimiento:",
        errorInsercion
      );

      setError(
        "No fue posible registrar el movimiento."
      );

      setGuardandoMovimiento(false);
      return;
    }

    setMovimientos((anteriores) => ({
      ...anteriores,
      [alcanciaParaMovimiento.id]: [
        ...(anteriores[
          alcanciaParaMovimiento.id
        ] || []),
        data,
      ].sort((a, b) => {
        const fechaA = a.fecha || "";
        const fechaB = b.fecha || "";

        if (fechaA !== fechaB) {
          return fechaB.localeCompare(
            fechaA
          );
        }

        return (
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
        );
      }),
    }));

    setMensaje(
      tipoMovimiento === "aporte"
        ? "Aporte registrado correctamente."
        : "Retiro registrado correctamente."
    );

    cerrarMovimiento();

    setGuardandoMovimiento(false);
  };

  const eliminarAlcancia = async (
    alcancia
  ) => {
    if (!usuarioId) return;

    const confirmar = window.confirm(
      `¿Quieres eliminar la alcancía "${alcancia.nombre}"?`
    );

    if (!confirmar) return;

    setMensaje("");
    setError("");

    const {
      error: errorEliminacion,
    } = await supabase
      .from("alcancias")
      .delete()
      .eq("id", alcancia.id)
      .eq("usuario_id", usuarioId);

    if (errorEliminacion) {
      console.error(
        "Error eliminando alcancía:",
        errorEliminacion
      );

      setError(
        "No fue posible eliminar la alcancía."
      );

      return;
    }

    setAlcancias((anteriores) =>
      anteriores.filter(
        (item) => item.id !== alcancia.id
      )
    );

    setMovimientos((anteriores) => {
      const copia = { ...anteriores };
      delete copia[alcancia.id];
      return copia;
    });

    setMensaje(
      "Alcancía eliminada correctamente."
    );
  };

  const alternarMovimientos = async (
    alcanciaId
  ) => {
    const estaAbierta =
      alcanciasAbiertas[alcanciaId];

    setAlcanciasAbiertas((anteriores) => ({
      ...anteriores,
      [alcanciaId]: !estaAbierta,
    }));

    if (
      !estaAbierta &&
      !movimientos[alcanciaId]
    ) {
      await cargarMovimientos(alcanciaId);
    }
  };

  const resumen = useMemo(() => {
    let totalAhorrado = 0;
    let totalObjetivos = 0;
    const totalAlcancias =
      alcancias.length;

    alcancias.forEach((alcancia) => {
      const saldo = calcularSaldo(
        alcancia.id
      );

      totalAhorrado += saldo;

      if (alcancia.monto_objetivo) {
        totalObjetivos += Number(
          alcancia.monto_objetivo
        );
      }
    });

    const alcanciasConObjetivo =
      alcancias.filter(
        (alcancia) =>
          alcancia.monto_objetivo !== null &&
          alcancia.monto_objetivo !== ""
      ).length;

    return {
      totalAhorrado,
      totalObjetivos,
      totalAlcancias,
      alcanciasConObjetivo,
    };
  }, [alcancias, movimientos]);

  if (cargando) {
    return (
      <div className="alcancias-page">
        <div className="alcancias-loading">
          <div className="loading-spinner"></div>

          <p>
            Cargando tus alcancías...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="alcancias-page">
      <div className="alcancias-container">

        <header className="alcancias-header">
          <div>
            <button
              type="button"
              className="alcancias-back-button"
              onClick={onVolver}
            >
              ← Volver
            </button>

            <h1>Mis alcancías</h1>

            <p>
              Guarda dinero poco a poco y
              aporta cuando tengas disponible.
            </p>
          </div>

          <button
            type="button"
            className="alcancias-primary-button"
            onClick={abrirNuevaAlcancia}
          >
            + Nueva alcancía
          </button>
        </header>

        {mensaje && (
          <div className="alcancias-message success">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="alcancias-message error">
            {error}
          </div>
        )}

        <section className="alcancias-resumen">

          <div className="alcancia-resumen-card">
            <span>Total ahorrado</span>

            <strong>
              {formatearMoneda(
                resumen.totalAhorrado
              )}
            </strong>
          </div>

          <div className="alcancia-resumen-card">
            <span>Alcancías</span>

            <strong>
              {resumen.totalAlcancias}
            </strong>
          </div>

          <div className="alcancia-resumen-card">
            <span>Objetivos definidos</span>

            <strong>
              {resumen.alcanciasConObjetivo}
            </strong>
          </div>

          <div className="alcancia-resumen-card">
            <span>Objetivo total</span>

            <strong>
              {formatearMoneda(
                resumen.totalObjetivos
              )}
            </strong>
          </div>

        </section>

        {alcancias.length === 0 ? (
          <section className="alcancias-empty">

            <div className="alcancias-empty-icon">
              🐷
            </div>

            <h2>Aún no tienes alcancías</h2>

            <p>
              Crea una alcancía y empieza a
              guardar dinero cuando tengas
              disponible.
            </p>

            <button
              type="button"
              className="alcancias-primary-button"
              onClick={abrirNuevaAlcancia}
            >
              Crear mi primera alcancía
            </button>

          </section>
        ) : (
          <section className="alcancias-grid">

            {alcancias.map((alcancia) => {
              const saldo =
                calcularSaldo(
                  alcancia.id
                );

              const objetivo =
                alcancia.monto_objetivo
                  ? Number(
                      alcancia.monto_objetivo
                    )
                  : null;

              const porcentaje =
                objetivo
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (saldo / objetivo) *
                          100
                      )
                    )
                  : null;

              const planAhorro =
                calcularPlanAhorro(
                  saldo,
                  objetivo,
                  alcancia.fecha_objetivo
                );

              const estadoFecha =
                obtenerEstadoFecha(
                  alcancia.fecha_objetivo
                );

              const movimientosAbiertos =
                alcanciasAbiertas[
                  alcancia.id
                ];

              return (
                <article
                  className="alcancia-card"
                  key={alcancia.id}
                >

                  <div className="alcancia-card-top">

                    <div>

                      <span
                        className={`alcancia-status ${estadoFecha}`}
                      >
                        {estadoFecha ===
                        "vencida"
                          ? "Fecha cumplida"
                          : estadoFecha ===
                            "hoy"
                          ? "Es hoy"
                          : "Activa"}
                      </span>

                      <h2>
                        🐷 {alcancia.nombre}
                      </h2>

                    </div>

                    <div className="alcancia-card-actions">

                      <button
                        type="button"
                        className="alcancia-icon-button"
                        onClick={() =>
                          abrirEditarAlcancia(
                            alcancia
                          )
                        }
                        title="Editar alcancía"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        className="alcancia-icon-button danger"
                        onClick={() =>
                          eliminarAlcancia(
                            alcancia
                          )
                        }
                        title="Eliminar alcancía"
                      >
                        🗑️
                      </button>

                    </div>

                  </div>

                  {alcancia.descripcion && (
                    <p className="alcancia-description">
                      {alcancia.descripcion}
                    </p>
                  )}

                  <div className="alcancia-values">

                    <div>
                      <span>Ahorrado</span>

                      <strong>
                        {formatearMoneda(
                          saldo
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {objetivo
                          ? "Objetivo"
                          : "Ahorro libre"}
                      </span>

                      <strong>
                        {objetivo
                          ? formatearMoneda(
                              objetivo
                            )
                          : "Sin límite"}
                      </strong>
                    </div>

                  </div>

                  {objetivo !== null && (
                    <>
                      <div className="alcancia-progress-large">

                        <div
                          className="alcancia-progress-fill"
                          style={{
                            width: `${porcentaje}%`,
                          }}
                        ></div>

                      </div>

                      <div className="alcancia-progress-info">

                        <strong>
                          {porcentaje.toFixed(0)}%
                        </strong>

                        <span>
                          {saldo >= objetivo
                            ? "Objetivo alcanzado"
                            : `Faltan ${formatearMoneda(
                                objetivo -
                                  saldo
                              )}`}
                        </span>

                      </div>

                      {planAhorro && (
                        <div className="alcancia-plan-ahorro">

                          <div className="alcancia-plan-header">
                            <div>
                              <span>
                                PLAN DE AHORRO
                              </span>

                              <h3>
                                Para alcanzar tu objetivo
                              </h3>
                            </div>

                            <strong>
                              {planAhorro.diasRestantes}{" "}
                              {planAhorro.diasRestantes ===
                              1
                                ? "día"
                                : "días"}{" "}
                              restantes
                            </strong>
                          </div>

                          <div className="alcancia-plan-grid">

                            <div className="alcancia-plan-item">
                              <span>
                                Diario
                              </span>

                              <strong>
                                {formatearMoneda(
                                  planAhorro.ahorroDiario
                                )}
                              </strong>
                            </div>

                            <div className="alcancia-plan-item">
                              <span>
                                Semanal
                              </span>

                              <strong>
                                {formatearMoneda(
                                  planAhorro.ahorroSemanal
                                )}
                              </strong>
                            </div>

                            <div className="alcancia-plan-item">
                              <span>
                                Quincenal
                              </span>

                              <strong>
                                {formatearMoneda(
                                  planAhorro.ahorroQuincenal
                                )}
                              </strong>
                            </div>

                          </div>

                          <p>
                            Te faltan{" "}
                            <strong>
                              {formatearMoneda(
                                planAhorro.faltante
                              )}
                            </strong>{" "}
                            para completar tu objetivo.
                          </p>

                        </div>
                      )}

                    </>
                  )}

                  <div className="alcancia-details">

                    <div>
                      <span>
                        Fecha objetivo
                      </span>

                      <strong>
                        {formatearFecha(
                          alcancia.fecha_objetivo
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Ahorrado disponible
                      </span>

                      <strong>
                        {formatearMoneda(
                          Math.max(
                            0,
                            saldo
                          )
                        )}
                      </strong>
                    </div>

                  </div>

                  <div className="alcancia-card-buttons">

                    <button
                      type="button"
                      className="alcancias-primary-button"
                      onClick={() =>
                        abrirMovimiento(
                          alcancia,
                          "aporte"
                        )
                      }
                    >
                      + Aportar dinero
                    </button>

                    {saldo > 0 && (
                      <button
                        type="button"
                        className="alcancias-secondary-button"
                        onClick={() =>
                          abrirMovimiento(
                            alcancia,
                            "retiro"
                          )
                        }
                      >
                        Retirar dinero
                      </button>
                    )}

                    <button
                      type="button"
                      className="alcancias-secondary-button"
                      onClick={() =>
                        alternarMovimientos(
                          alcancia.id
                        )
                      }
                    >
                      {movimientosAbiertos
                        ? "Ocultar historial"
                        : "Ver historial"}
                    </button>

                  </div>

                  {movimientosAbiertos && (
                    <div className="alcancia-historial">

                      <h3>
                        Historial de movimientos
                      </h3>

                      {cargandoMovimientos[
                        alcancia.id
                      ] ? (
                        <p>
                          Cargando historial...
                        </p>
                      ) : !movimientos[
                          alcancia.id
                        ]?.length ? (
                        <p>
                          Todavía no hay movimientos
                          registrados.
                        </p>
                      ) : (
                        <div className="alcancia-historial-lista">

                          {movimientos[
                            alcancia.id
                          ].map(
                            (movimiento) => (
                              <div
                                className={`alcancia-movimiento-item ${movimiento.tipo}`}
                                key={
                                  movimiento.id
                                }
                              >

                                <div>

                                  <strong>
                                    {movimiento.tipo ===
                                    "aporte"
                                      ? "+"
                                      : "-"}
                                    {formatearMoneda(
                                      movimiento.monto
                                    )}
                                  </strong>

                                  <span>
                                    {formatearFecha(
                                      movimiento.fecha
                                    )}
                                  </span>

                                </div>

                                {movimiento.descripcion && (
                                  <p>
                                    {
                                      movimiento.descripcion
                                    }
                                  </p>
                                )}

                              </div>
                            )
                          )}

                        </div>
                      )}

                    </div>
                  )}

                </article>
              );
            })}

          </section>
        )}

      </div>

      {mostrarFormulario && (
        <div
          className="alcancias-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !guardando
            ) {
              cerrarFormulario();
            }
          }}
        >

          <div className="alcancias-modal">

            <div className="alcancias-modal-header">

              <div>
                <span>MI DINERO</span>

                <h2>
                  {alcanciaEditando
                    ? "Editar alcancía"
                    : "Nueva alcancía"}
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                ×
              </button>

            </div>

            <form onSubmit={guardarAlcancia}>

              <div className="alcancias-form-group">

                <label htmlFor="alcancia-nombre">
                  Nombre de la alcancía
                </label>

                <input
                  id="alcancia-nombre"
                  type="text"
                  value={formulario.nombre}
                  onChange={(event) =>
                    cambiarFormulario(
                      "nombre",
                      event.target.value
                    )
                  }
                  placeholder="Ej. Mi ahorro"
                  disabled={guardando}
                  autoFocus
                />

              </div>

              <div className="alcancias-form-group">

                <label htmlFor="alcancia-fecha">
                  Fecha objetivo
                </label>

                <input
                  id="alcancia-fecha"
                  type="date"
                  min={obtenerFechaLocal()}
                  value={
                    formulario.fecha_objetivo
                  }
                  onChange={(event) =>
                    cambiarFormulario(
                      "fecha_objetivo",
                      event.target.value
                    )
                  }
                  disabled={guardando}
                />

              </div>

              <div className="alcancias-form-group">

                <label htmlFor="alcancia-objetivo">
                  Monto objetivo
                  <small>
                    {" "}
                    (opcional)
                  </small>
                </label>

                <input
                  id="alcancia-objetivo"
                  type="number"
                  min="1"
                  step="1"
                  value={
                    formulario.monto_objetivo
                  }
                  onChange={(event) =>
                    cambiarFormulario(
                      "monto_objetivo",
                      event.target.value
                    )
                  }
                  placeholder="Ej. 500000"
                  disabled={guardando}
                />

                <small>
                  Puedes dejarlo vacío si solo
                  quieres ahorrar hasta la fecha.
                </small>

              </div>

              <div className="alcancias-form-group">

                <label htmlFor="alcancia-descripcion">
                  Descripción
                </label>

                <textarea
                  id="alcancia-descripcion"
                  rows="3"
                  value={
                    formulario.descripcion
                  }
                  onChange={(event) =>
                    cambiarFormulario(
                      "descripcion",
                      event.target.value
                    )
                  }
                  placeholder="Opcional"
                  disabled={guardando}
                ></textarea>

              </div>

              <div className="alcancias-modal-buttons">

                <button
                  type="button"
                  className="alcancias-secondary-button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="alcancias-primary-button"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : alcanciaEditando
                    ? "Guardar cambios"
                    : "Crear alcancía"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {alcanciaParaMovimiento && (
        <div
          className="alcancias-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !guardandoMovimiento
            ) {
              cerrarMovimiento();
            }
          }}
        >

          <div className="alcancias-modal">

            <div className="alcancias-modal-header">

              <div>
                <span>AHORRO</span>

                <h2>
                  {tipoMovimiento ===
                  "aporte"
                    ? "Aportar dinero"
                    : "Retirar dinero"}
                </h2>

                <p>
                  {alcanciaParaMovimiento.nombre}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarMovimiento}
                disabled={
                  guardandoMovimiento
                }
              >
                ×
              </button>

            </div>

            <div className="alcancia-movimiento-resumen">

              <div>
                <span>
                  Saldo actual
                </span>

                <strong>
                  {formatearMoneda(
                    calcularSaldo(
                      alcanciaParaMovimiento.id
                    )
                  )}
                </strong>
              </div>

              {alcanciaParaMovimiento.monto_objetivo && (
                <div>
                  <span>
                    Objetivo
                  </span>

                  <strong>
                    {formatearMoneda(
                      alcanciaParaMovimiento.monto_objetivo
                    )}
                  </strong>
                </div>
              )}

            </div>

            <form
              onSubmit={guardarMovimiento}
            >

              <div className="alcancias-form-group">

                <label>
                  Tipo de movimiento
                </label>

                <div className="alcancia-tipo-buttons">

                  <button
                    type="button"
                    className={
                      tipoMovimiento ===
                      "aporte"
                        ? "alcancia-tipo-button active"
                        : "alcancia-tipo-button"
                    }
                    onClick={() =>
                      setTipoMovimiento(
                        "aporte"
                      )
                    }
                    disabled={
                      guardandoMovimiento
                    }
                  >
                    + Aporte
                  </button>

                  <button
                    type="button"
                    className={
                      tipoMovimiento ===
                      "retiro"
                        ? "alcancia-tipo-button active retiro"
                        : "alcancia-tipo-button"
                    }
                    onClick={() =>
                      setTipoMovimiento(
                        "retiro"
                      )
                    }
                    disabled={
                      guardandoMovimiento
                    }
                  >
                    − Retiro
                  </button>

                </div>

              </div>

              <div className="alcancias-form-group">

                <label htmlFor="movimiento-alcancia-monto">
                  Monto
                </label>

                <input
                  id="movimiento-alcancia-monto"
                  type="number"
                  min="1"
                  step="1"
                  value={
                    montoMovimiento
                  }
                  onChange={(event) =>
                    setMontoMovimiento(
                      event.target.value
                    )
                  }
                  placeholder="Ej. 20000"
                  disabled={
                    guardandoMovimiento
                  }
                  autoFocus
                />

              </div>

              <div className="alcancias-form-group">

                <label htmlFor="movimiento-alcancia-fecha">
                  Fecha
                </label>

                <input
                  id="movimiento-alcancia-fecha"
                  type="date"
                  value={
                    fechaMovimiento
                  }
                  onChange={(event) =>
                    setFechaMovimiento(
                      event.target.value
                    )
                  }
                  disabled={
                    guardandoMovimiento
                  }
                />

              </div>

              <div className="alcancias-form-group">

                <label htmlFor="movimiento-alcancia-descripcion">
                  Descripción
                </label>

                <textarea
                  id="movimiento-alcancia-descripcion"
                  rows="3"
                  value={
                    descripcionMovimiento
                  }
                  onChange={(event) =>
                    setDescripcionMovimiento(
                      event.target.value
                    )
                  }
                  placeholder={
                    tipoMovimiento ===
                    "aporte"
                      ? "Ej. Ahorro de esta semana"
                      : "Ej. Necesité retirar dinero"
                  }
                  disabled={
                    guardandoMovimiento
                  }
                ></textarea>

              </div>

              <div className="alcancias-modal-buttons">

                <button
                  type="button"
                  className="alcancias-secondary-button"
                  onClick={
                    cerrarMovimiento
                  }
                  disabled={
                    guardandoMovimiento
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="alcancias-primary-button"
                  disabled={
                    guardandoMovimiento
                  }
                >
                  {guardandoMovimiento
                    ? "Guardando..."
                    : tipoMovimiento ===
                      "aporte"
                    ? "Registrar aporte"
                    : "Registrar retiro"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Alcancias;
