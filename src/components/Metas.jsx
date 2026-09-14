import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import "./Metas.css";

const obtenerFechaLocal = () => {
  const fecha = new Date();
  const offset = fecha.getTimezoneOffset();
  const local = new Date(fecha.getTime() - offset * 60000);

  return local.toISOString().split("T")[0];
};

const formularioInicial = {
  nombre: "",
  valor_objetivo: "",
  valor_actual: "0",
  fecha_objetivo: "",
  descripcion: "",
};

function Metas({ sesion, onVolver }) {
  const [metas, setMetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [metaEditando, setMetaEditando] = useState(null);
  const [formulario, setFormulario] = useState(formularioInicial);

  const [metaParaAporte, setMetaParaAporte] = useState(null);
  const [montoAporte, setMontoAporte] = useState("");
  const [fechaAporte, setFechaAporte] = useState(obtenerFechaLocal);
  const [descripcionAporte, setDescripcionAporte] = useState("");
  const [guardandoAporte, setGuardandoAporte] = useState(false);

  const [metaPagos, setMetaPagos] = useState({});
  const [cargandoPagos, setCargandoPagos] = useState({});
  const [metasConPagosAbiertas, setMetasConPagosAbiertas] = useState({});

  const usuarioId = sesion?.user?.id;

  const cargarMetas = async () => {
    if (!usuarioId) return;

    setCargando(true);
    setError("");

    const { data, error: errorConsulta } = await supabase
      .from("metas")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("fecha_objetivo", { ascending: true });

    if (errorConsulta) {
      console.error("Error cargando metas:", errorConsulta);
      setError("No fue posible cargar tus metas.");
      setMetas([]);
    } else {
      setMetas(data || []);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarMetas();
  }, [usuarioId]);

  const abrirNuevaMeta = () => {
    setMetaEditando(null);
    setFormulario(formularioInicial);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  };

  const abrirEditarMeta = (meta) => {
    setMetaEditando(meta);

    setFormulario({
      nombre: meta.nombre || "",
      valor_objetivo: meta.valor_objetivo ?? "",
      valor_actual: meta.valor_actual ?? "0",
      fecha_objetivo: meta.fecha_objetivo || "",
      descripcion: meta.descripcion || "",
    });

    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) return;

    setMostrarFormulario(false);
    setMetaEditando(null);
    setFormulario(formularioInicial);
  };

  const cambiarFormulario = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const guardarMeta = async (event) => {
    event.preventDefault();

    if (!usuarioId) return;

    setMensaje("");
    setError("");

    const nombre = formulario.nombre.trim();
    const valorObjetivo = Number(formulario.valor_objetivo);
    const valorActual = Number(formulario.valor_actual || 0);

    if (!nombre) {
      setError("Escribe el nombre de la meta.");
      return;
    }

    if (!Number.isFinite(valorObjetivo) || valorObjetivo <= 0) {
      setError("El valor objetivo debe ser mayor que cero.");
      return;
    }

    if (!Number.isFinite(valorActual) || valorActual < 0) {
      setError("El valor actual no puede ser negativo.");
      return;
    }

    if (valorActual > valorObjetivo) {
      setError("El valor actual no puede superar el objetivo.");
      return;
    }

    setGuardando(true);

    const estado = valorActual >= valorObjetivo
      ? "completada"
      : "activa";

    const datos = {
      usuario_id: usuarioId,
      nombre,
      valor_objetivo: valorObjetivo,
      valor_actual: valorActual,
      fecha_objetivo: formulario.fecha_objetivo || null,
      estado,
      descripcion: formulario.descripcion.trim() || null,
    };

    if (metaEditando) {
      const { data, error: errorActualizacion } = await supabase
        .from("metas")
        .update({
          nombre: datos.nombre,
          valor_objetivo: datos.valor_objetivo,
          valor_actual: datos.valor_actual,
          fecha_objetivo: datos.fecha_objetivo,
          estado: datos.estado,
          descripcion: datos.descripcion,
        })
        .eq("id", metaEditando.id)
        .eq("usuario_id", usuarioId)
        .select()
        .single();

      if (errorActualizacion) {
        console.error(
          "Error actualizando meta:",
          errorActualizacion
        );
        setError("No fue posible actualizar la meta.");
      } else {
        setMetas((anteriores) =>
          anteriores.map((meta) =>
            meta.id === metaEditando.id ? data : meta
          )
        );

        setMensaje("Meta actualizada correctamente.");
        setMostrarFormulario(false);
        setMetaEditando(null);
        setFormulario(formularioInicial);
      }
    } else {
      const { data, error: errorInsercion } = await supabase
        .from("metas")
        .insert(datos)
        .select()
        .single();

      if (errorInsercion) {
        console.error(
          "Error creando meta:",
          errorInsercion
        );
        setError("No fue posible crear la meta.");
      } else {
        setMetas((anteriores) =>
          [...anteriores, data].sort((a, b) => {
            if (!a.fecha_objetivo) return 1;
            if (!b.fecha_objetivo) return -1;

            return a.fecha_objetivo.localeCompare(
              b.fecha_objetivo
            );
          })
        );

        setMensaje("Meta creada correctamente.");
        setMostrarFormulario(false);
        setFormulario(formularioInicial);
      }
    }

    setGuardando(false);
  };

  const eliminarMeta = async (meta) => {
    if (!usuarioId) return;

    const confirmar = window.confirm(
      `¿Quieres eliminar la meta "${meta.nombre}"?`
    );

    if (!confirmar) return;

    setMensaje("");
    setError("");

    const { error: errorEliminacion } = await supabase
      .from("metas")
      .delete()
      .eq("id", meta.id)
      .eq("usuario_id", usuarioId);

    if (errorEliminacion) {
      console.error(
        "Error eliminando meta:",
        errorEliminacion
      );
      setError(
        "No fue posible eliminar la meta. Si tiene aportes registrados, puede ser necesario conservarla."
      );
      return;
    }

    setMetas((anteriores) =>
      anteriores.filter((item) => item.id !== meta.id)
    );

    setMetaPagos((anteriores) => {
      const copia = { ...anteriores };
      delete copia[meta.id];
      return copia;
    });

    setMensaje("Meta eliminada correctamente.");
  };

  const abrirAporte = (meta) => {
    if (Number(meta.valor_actual) >= Number(meta.valor_objetivo)) {
      setError("Esta meta ya está completada.");
      return;
    }

    setMetaParaAporte(meta);
    setMontoAporte("");
    setFechaAporte(obtenerFechaLocal());
    setDescripcionAporte("");
    setMensaje("");
    setError("");
  };

  const cerrarAporte = () => {
    if (guardandoAporte) return;

    setMetaParaAporte(null);
    setMontoAporte("");
    setFechaAporte(obtenerFechaLocal());
    setDescripcionAporte("");
  };

  const guardarAporte = async (event) => {
    event.preventDefault();

    if (!usuarioId || !metaParaAporte) return;

    setMensaje("");
    setError("");

    const monto = Number(montoAporte);
    const saldoRestante =
      Number(metaParaAporte.valor_objetivo) -
      Number(metaParaAporte.valor_actual);

    if (!Number.isFinite(monto) || monto <= 0) {
      setError("El monto del aporte debe ser mayor que cero.");
      return;
    }

    if (monto > saldoRestante) {
      setError(
        `El aporte no puede superar el saldo restante de ${formatearMoneda(
          saldoRestante
        )}.`
      );
      return;
    }

    if (!fechaAporte) {
      setError("Selecciona la fecha del aporte.");
      return;
    }

    setGuardandoAporte(true);

    const { data: aporteCreado, error: errorAporte } = await supabase
      .from("aportes_meta")
      .insert({
        usuario_id: usuarioId,
        meta_id: metaParaAporte.id,
        monto,
        fecha: fechaAporte,
        descripcion: descripcionAporte.trim() || null,
      })
      .select()
      .single();

    if (errorAporte) {
      console.error(
        "Error registrando aporte:",
        errorAporte
      );
      setError("No fue posible registrar el aporte.");
      setGuardandoAporte(false);
      return;
    }

    const nuevoValorActual =
      Number(metaParaAporte.valor_actual) + monto;

    const nuevoEstado =
      nuevoValorActual >= Number(metaParaAporte.valor_objetivo)
        ? "completada"
        : "activa";

    const { data: metaActualizada, error: errorMeta } =
      await supabase
        .from("metas")
        .update({
          valor_actual: nuevoValorActual,
          estado: nuevoEstado,
        })
        .eq("id", metaParaAporte.id)
        .eq("usuario_id", usuarioId)
        .select()
        .single();

    if (errorMeta) {
      console.error(
        "Error actualizando meta después del aporte:",
        errorMeta
      );

      if (aporteCreado?.id) {
        await supabase
          .from("aportes_meta")
          .delete()
          .eq("id", aporteCreado.id)
          .eq("usuario_id", usuarioId);
      }

      setError(
        "No fue posible actualizar la meta. El aporte no se guardó."
      );
      setGuardandoAporte(false);
      return;
    }

    setMetas((anteriores) =>
      anteriores.map((meta) =>
        meta.id === metaParaAporte.id
          ? metaActualizada
          : meta
      )
    );

    setMetaParaAporte(null);
    setMontoAporte("");
    setDescripcionAporte("");
    setFechaAporte(obtenerFechaLocal());

    setMensaje(
      nuevoEstado === "completada"
        ? "¡Felicitaciones! Has completado esta meta."
        : "Aporte registrado correctamente."
    );

    setGuardandoAporte(false);

    if (metasConPagosAbiertas[metaParaAporte.id]) {
      await cargarAportes(metaParaAporte.id);
    }
  };

  const cargarAportes = async (metaId) => {
    if (!usuarioId) return;

    setCargandoPagos((anteriores) => ({
      ...anteriores,
      [metaId]: true,
    }));

    const { data, error: errorConsulta } = await supabase
      .from("aportes_meta")
      .select("*")
      .eq("usuario_id", usuarioId)
      .eq("meta_id", metaId)
      .order("fecha", { ascending: false });

    if (errorConsulta) {
      console.error(
        "Error cargando aportes:",
        errorConsulta
      );

      setError("No fue posible cargar los aportes.");
    } else {
      setMetaPagos((anteriores) => ({
        ...anteriores,
        [metaId]: data || [],
      }));
    }

    setCargandoPagos((anteriores) => ({
      ...anteriores,
      [metaId]: false,
    }));
  };

  const alternarAportes = async (metaId) => {
    const estaAbierto =
      metasConPagosAbiertas[metaId];

    setMetasConPagosAbiertas((anteriores) => ({
      ...anteriores,
      [metaId]: !estaAbierto,
    }));

    if (!estaAbierto && !metaPagos[metaId]) {
      await cargarAportes(metaId);
    }
  };

  const porcentajeGeneral = useMemo(() => {
    if (!metas.length) return 0;

    const objetivoTotal = metas.reduce(
      (total, meta) =>
        total + Number(meta.valor_objetivo || 0),
      0
    );

    const actualTotal = metas.reduce(
      (total, meta) =>
        total + Number(meta.valor_actual || 0),
      0
    );

    if (!objetivoTotal) return 0;

    return Math.min(
      100,
      (actualTotal / objetivoTotal) * 100
    );
  }, [metas]);

  const totalObjetivos = useMemo(
    () =>
      metas.reduce(
        (total, meta) =>
          total + Number(meta.valor_objetivo || 0),
        0
      ),
    [metas]
  );

  const totalAhorrado = useMemo(
    () =>
      metas.reduce(
        (total, meta) =>
          total + Number(meta.valor_actual || 0),
        0
      ),
    [metas]
  );

  const metasCompletadas = useMemo(
    () =>
      metas.filter(
        (meta) =>
          meta.estado === "completada" ||
          Number(meta.valor_actual) >=
            Number(meta.valor_objetivo)
      ).length,
    [metas]
  );

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

  const calcularPorcentaje = (meta) => {
    const objetivo = Number(meta.valor_objetivo) || 0;
    const actual = Number(meta.valor_actual) || 0;

    if (!objetivo) return 0;

    return Math.min(
      100,
      Math.max(0, (actual / objetivo) * 100)
    );
  };

  const obtenerEstado = (meta) => {
    if (
      meta.estado === "completada" ||
      Number(meta.valor_actual) >=
        Number(meta.valor_objetivo)
    ) {
      return "completada";
    }

    return "activa";
  };

  if (cargando) {
    return (
      <div className="metas-page">
        <div className="metas-loading">
          <div className="loading-spinner"></div>
          <p>Cargando tus metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="metas-page">
      <div className="metas-container">
        <header className="metas-header">
          <div>
            <button
              type="button"
              className="metas-back-button"
              onClick={onVolver}
            >
              ← Volver
            </button>

            <h1>Metas de ahorro</h1>

            <p>
              Define objetivos y controla cuánto llevas
              ahorrado.
            </p>
          </div>

          <button
            type="button"
            className="metas-primary-button"
            onClick={abrirNuevaMeta}
          >
            + Nueva meta
          </button>
        </header>

        {mensaje && (
          <div className="metas-message success">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="metas-message error">
            {error}
          </div>
        )}

        <section className="metas-resumen">
          <div className="meta-resumen-card">
            <span>Objetivo total</span>
            <strong>
              {formatearMoneda(totalObjetivos)}
            </strong>
          </div>

          <div className="meta-resumen-card">
            <span>Total ahorrado</span>
            <strong>
              {formatearMoneda(totalAhorrado)}
            </strong>
          </div>

          <div className="meta-resumen-card">
            <span>Progreso general</span>
            <strong>
              {porcentajeGeneral.toFixed(0)}%
            </strong>

            <div className="meta-progress">
              <div
                className="meta-progress-fill"
                style={{
                  width: `${porcentajeGeneral}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="meta-resumen-card">
            <span>Metas completadas</span>
            <strong>
              {metasCompletadas} / {metas.length}
            </strong>
          </div>
        </section>

        {metas.length === 0 ? (
          <section className="metas-empty">
            <div className="metas-empty-icon">🎯</div>

            <h2>Aún no tienes metas</h2>

            <p>
              Crea tu primera meta de ahorro y empieza a
              construirla poco a poco.
            </p>

            <button
              type="button"
              className="metas-primary-button"
              onClick={abrirNuevaMeta}
            >
              Crear mi primera meta
            </button>
          </section>
        ) : (
          <section className="metas-grid">
            {metas.map((meta) => {
              const porcentaje =
                calcularPorcentaje(meta);

              const estado = obtenerEstado(meta);

              const restante = Math.max(
                0,
                Number(meta.valor_objetivo) -
                  Number(meta.valor_actual)
              );

              const aportesAbiertos =
                metasConPagosAbiertas[meta.id];

              return (
                <article
                  className="meta-card"
                  key={meta.id}
                >
                  <div className="meta-card-top">
                    <div>
                      <span
                        className={`meta-status ${estado}`}
                      >
                        {estado === "completada"
                          ? "Completada"
                          : "Activa"}
                      </span>

                      <h2>{meta.nombre}</h2>
                    </div>

                    <div className="meta-card-actions">
                      <button
                        type="button"
                        className="meta-icon-button"
                        onClick={() =>
                          abrirEditarMeta(meta)
                        }
                        title="Editar meta"
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        className="meta-icon-button danger"
                        onClick={() =>
                          eliminarMeta(meta)
                        }
                        title="Eliminar meta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {meta.descripcion && (
                    <p className="meta-description">
                      {meta.descripcion}
                    </p>
                  )}

                  <div className="meta-values">
                    <div>
                      <span>Ahorrado</span>
                      <strong>
                        {formatearMoneda(
                          meta.valor_actual
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Objetivo</span>
                      <strong>
                        {formatearMoneda(
                          meta.valor_objetivo
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="meta-progress-large">
                    <div
                      className="meta-progress-fill"
                      style={{
                        width: `${porcentaje}%`,
                      }}
                    ></div>
                  </div>

                  <div className="meta-progress-info">
                    <strong>
                      {porcentaje.toFixed(0)}%
                    </strong>

                    <span>
                      {estado === "completada"
                        ? "Objetivo alcanzado"
                        : `Faltan ${formatearMoneda(
                            restante
                          )}`}
                    </span>
                  </div>

                  <div className="meta-details">
                    <div>
                      <span>Fecha objetivo</span>
                      <strong>
                        {formatearFecha(
                          meta.fecha_objetivo
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="meta-card-buttons">
                    {estado !== "completada" && (
                      <button
                        type="button"
                        className="metas-primary-button"
                        onClick={() =>
                          abrirAporte(meta)
                        }
                      >
                        + Registrar aporte
                      </button>
                    )}

                    <button
                      type="button"
                      className="metas-secondary-button"
                      onClick={() =>
                        alternarAportes(meta.id)
                      }
                    >
                      {aportesAbiertos
                        ? "Ocultar aportes"
                        : "Ver aportes"}
                    </button>
                  </div>

                  {aportesAbiertos && (
                    <div className="meta-aportes">
                      <h3>Historial de aportes</h3>

                      {cargandoPagos[meta.id] ? (
                        <p>Cargando aportes...</p>
                      ) : !metaPagos[meta.id]?.length ? (
                        <p>
                          Todavía no hay aportes
                          registrados.
                        </p>
                      ) : (
                        <div className="meta-aportes-lista">
                          {metaPagos[meta.id].map(
                            (aporte) => (
                              <div
                                className="meta-aporte-item"
                                key={aporte.id}
                              >
                                <div>
                                  <strong>
                                    +
                                    {formatearMoneda(
                                      aporte.monto
                                    )}
                                  </strong>

                                  <span>
                                    {formatearFecha(
                                      aporte.fecha
                                    )}
                                  </span>
                                </div>

                                {aporte.descripcion && (
                                  <p>
                                    {
                                      aporte.descripcion
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
          className="metas-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !guardando
            ) {
              cerrarFormulario();
            }
          }}
        >
          <div className="metas-modal">
            <div className="metas-modal-header">
              <div>
                <span>MI DINERO</span>

                <h2>
                  {metaEditando
                    ? "Editar meta"
                    : "Nueva meta"}
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

            <form onSubmit={guardarMeta}>
              <div className="metas-form-group">
                <label htmlFor="meta-nombre">
                  Nombre de la meta
                </label>

                <input
                  id="meta-nombre"
                  type="text"
                  value={formulario.nombre}
                  onChange={(event) =>
                    cambiarFormulario(
                      "nombre",
                      event.target.value
                    )
                  }
                  placeholder="Ej. Comprar una bicicleta"
                  disabled={guardando}
                  autoFocus
                />
              </div>

              <div className="metas-form-row">
                <div className="metas-form-group">
                  <label htmlFor="meta-objetivo">
                    Valor objetivo
                  </label>

                  <input
                    id="meta-objetivo"
                    type="number"
                    min="1"
                    step="1"
                    value={formulario.valor_objetivo}
                    onChange={(event) =>
                      cambiarFormulario(
                        "valor_objetivo",
                        event.target.value
                      )
                    }
                    placeholder="0"
                    disabled={guardando}
                  />
                </div>

                <div className="metas-form-group">
                  <label htmlFor="meta-actual">
                    Ahorrado actualmente
                  </label>

                  <input
                    id="meta-actual"
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.valor_actual}
                    onChange={(event) =>
                      cambiarFormulario(
                        "valor_actual",
                        event.target.value
                      )
                    }
                    placeholder="0"
                    disabled={guardando}
                  />
                </div>
              </div>

              <div className="metas-form-group">
                <label htmlFor="meta-fecha">
                  Fecha objetivo
                </label>

                <input
                  id="meta-fecha"
                  type="date"
                  value={formulario.fecha_objetivo}
                  onChange={(event) =>
                    cambiarFormulario(
                      "fecha_objetivo",
                      event.target.value
                    )
                  }
                  disabled={guardando}
                />
              </div>

              <div className="metas-form-group">
                <label htmlFor="meta-descripcion">
                  Descripción
                </label>

                <textarea
                  id="meta-descripcion"
                  rows="3"
                  value={formulario.descripcion}
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

              <div className="metas-modal-buttons">
                <button
                  type="button"
                  className="metas-secondary-button"
                  onClick={cerrarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="metas-primary-button"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : metaEditando
                    ? "Guardar cambios"
                    : "Crear meta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {metaParaAporte && (
        <div
          className="metas-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !guardandoAporte
            ) {
              cerrarAporte();
            }
          }}
        >
          <div className="metas-modal">
            <div className="metas-modal-header">
              <div>
                <span>AHORRO</span>

                <h2>Registrar aporte</h2>

                <p>
                  {metaParaAporte.nombre}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarAporte}
                disabled={guardandoAporte}
              >
                ×
              </button>
            </div>

            <div className="meta-aporte-resumen">
              <div>
                <span>Ahorrado</span>
                <strong>
                  {formatearMoneda(
                    metaParaAporte.valor_actual
                  )}
                </strong>
              </div>

              <div>
                <span>Falta</span>
                <strong>
                  {formatearMoneda(
                    Number(
                      metaParaAporte.valor_objetivo
                    ) -
                      Number(
                        metaParaAporte.valor_actual
                      )
                  )}
                </strong>
              </div>
            </div>

            <form onSubmit={guardarAporte}>
              <div className="metas-form-group">
                <label htmlFor="aporte-monto">
                  Monto del aporte
                </label>

                <input
                  id="aporte-monto"
                  type="number"
                  min="1"
                  step="1"
                  value={montoAporte}
                  onChange={(event) =>
                    setMontoAporte(
                      event.target.value
                    )
                  }
                  placeholder="Ej. 50000"
                  disabled={guardandoAporte}
                  autoFocus
                />
              </div>

              <div className="metas-form-group">
                <label htmlFor="aporte-fecha">
                  Fecha
                </label>

                <input
                  id="aporte-fecha"
                  type="date"
                  value={fechaAporte}
                  onChange={(event) =>
                    setFechaAporte(
                      event.target.value
                    )
                  }
                  disabled={guardandoAporte}
                />
              </div>

              <div className="metas-form-group">
                <label htmlFor="aporte-descripcion">
                  Descripción
                </label>

                <textarea
                  id="aporte-descripcion"
                  rows="3"
                  value={descripcionAporte}
                  onChange={(event) =>
                    setDescripcionAporte(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Ahorro de esta semana"
                  disabled={guardandoAporte}
                ></textarea>
              </div>

              <div className="metas-modal-buttons">
                <button
                  type="button"
                  className="metas-secondary-button"
                  onClick={cerrarAporte}
                  disabled={guardandoAporte}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="metas-primary-button"
                  disabled={guardandoAporte}
                >
                  {guardandoAporte
                    ? "Guardando..."
                    : "Registrar aporte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Metas;