import { useEffect, useState } from "react";

import { supabase } from "../services/supabase";

import "./Deudas.css";

function Deudas({ sesion, onVolver }) {
  const [deudas, setDeudas] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const [procesandoAbono, setProcesandoAbono] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarAbono, setMostrarAbono] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const [deudaEditando, setDeudaEditando] = useState(null);
  const [deudaAbono, setDeudaAbono] = useState(null);
  const [deudaHistorial, setDeudaHistorial] = useState(null);

  const [pagos, setPagos] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [formulario, setFormulario] = useState({
    nombre: "",
    entidad: "",
    valor_total: "",
    saldo_pendiente: "",
    cuota: "",
    fecha_vencimiento: "",
    estado: "pendiente",
    descripcion: "",
  });

  const [formularioAbono, setFormularioAbono] = useState({
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "",
  });

  useEffect(() => {
    if (sesion?.user?.id) {
      cargarDeudas();
    }
  }, [sesion]);

  const cargarDeudas = async () => {
    setCargando(true);
    setError("");

    const { data, error: errorSupabase } = await supabase
      .from("deudas")
      .select("*")
      .eq("usuario_id", sesion.user.id)
      .order("fecha_vencimiento", { ascending: true });

    if (errorSupabase) {
      console.error("Error cargando deudas:", errorSupabase);
      setError("No se pudieron cargar las deudas.");
      setDeudas([]);
    } else {
      setDeudas(data || []);
    }

    setCargando(false);
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));

    setError("");
    setMensaje("");
  };

  const manejarCambioAbono = (e) => {
    const { name, value } = e.target;

    setFormularioAbono((actual) => ({
      ...actual,
      [name]: value,
    }));

    setError("");
    setMensaje("");
  };

  const convertirNumero = (valor) => {
    if (valor === null || valor === undefined || valor === "") {
      return 0;
    }

    const numero = Number(valor);

    if (Number.isFinite(numero)) {
      return numero;
    }

    const limpio = String(valor)
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    const resultado = Number(limpio);

    return Number.isFinite(resultado) ? resultado : 0;
  };

  const formatearMoneda = (valor) => {
    const numero = Number(valor) || 0;

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(numero);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) {
      return "Sin fecha";
    }

    const fechaLocal = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(fechaLocal.getTime())) {
      return "Sin fecha";
    }

    return fechaLocal.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const obtenerPorcentajePagado = (deuda) => {
    const total = Number(deuda.valor_total) || 0;
    const saldo = Number(deuda.saldo_pendiente) || 0;

    if (total <= 0) {
      return 0;
    }

    const pagado = total - saldo;
    const porcentaje = (pagado / total) * 100;

    return Math.min(100, Math.max(0, porcentaje));
  };

  const limpiarFormulario = () => {
    setFormulario({
      nombre: "",
      entidad: "",
      valor_total: "",
      saldo_pendiente: "",
      cuota: "",
      fecha_vencimiento: "",
      estado: "pendiente",
      descripcion: "",
    });
  };

  const abrirFormulario = () => {
    setError("");
    setMensaje("");
    limpiarFormulario();
    setDeudaEditando(null);
    setMostrarFormulario(true);
  };

  const abrirEditar = (deuda) => {
    setError("");
    setMensaje("");

    setDeudaEditando(deuda);

    setFormulario({
      nombre: deuda.nombre || "",
      entidad: deuda.entidad || "",
      valor_total: deuda.valor_total ?? "",
      saldo_pendiente: deuda.saldo_pendiente ?? "",
      cuota: deuda.cuota ?? "",
      fecha_vencimiento: deuda.fecha_vencimiento || "",
      estado:
        Number(deuda.saldo_pendiente) === 0
          ? "pagada"
          : deuda.estado || "pendiente",
      descripcion: deuda.descripcion || "",
    });

    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setDeudaEditando(null);
    setError("");
    limpiarFormulario();
  };

  const guardarDeuda = async (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    const nombre = formulario.nombre.trim();
    const entidad = formulario.entidad.trim();
    const valorTotal = convertirNumero(formulario.valor_total);
    const saldoPendiente = convertirNumero(
      formulario.saldo_pendiente
    );
    const cuota = convertirNumero(formulario.cuota);
    const descripcion = formulario.descripcion.trim();

    if (!nombre) {
      setError("Escribe el nombre de la deuda.");
      return;
    }

    if (valorTotal <= 0) {
      setError("El valor total debe ser mayor que $0.");
      return;
    }

    if (saldoPendiente < 0) {
      setError("El saldo pendiente no puede ser negativo.");
      return;
    }

    if (saldoPendiente > valorTotal) {
      setError(
        "El saldo pendiente no puede ser mayor que el valor total."
      );
      return;
    }

    if (cuota < 0) {
      setError("La cuota no puede ser negativa.");
      return;
    }

    setGuardando(true);

    const estadoFinal =
      saldoPendiente === 0 ? "pagada" : "pendiente";

    const datosDeuda = {
      usuario_id: sesion.user.id,
      nombre,
      entidad: entidad || null,
      valor_total: valorTotal,
      saldo_pendiente: saldoPendiente,
      cuota,
      fecha_vencimiento:
        formulario.fecha_vencimiento || null,
      estado: estadoFinal,
      descripcion: descripcion || null,
    };

    if (deudaEditando) {
      const { data, error: errorSupabase } = await supabase
        .from("deudas")
        .update(datosDeuda)
        .eq("id", deudaEditando.id)
        .eq("usuario_id", sesion.user.id)
        .select()
        .single();

      if (errorSupabase) {
        console.error(
          "Error actualizando deuda:",
          errorSupabase
        );

        setError(
          errorSupabase.message ||
            "No se pudo actualizar la deuda."
        );

        setGuardando(false);
        return;
      }

      setDeudas((actuales) =>
        actuales.map((deuda) =>
          deuda.id === data.id ? data : deuda
        )
      );

      setMensaje("Deuda actualizada correctamente.");
    } else {
      const { data, error: errorSupabase } = await supabase
        .from("deudas")
        .insert(datosDeuda)
        .select()
        .single();

      if (errorSupabase) {
        console.error(
          "Error guardando deuda:",
          errorSupabase
        );

        setError(
          errorSupabase.message ||
            "No se pudo guardar la deuda."
        );

        setGuardando(false);
        return;
      }

      setDeudas((actuales) =>
        [...actuales, data].sort((a, b) => {
          if (!a.fecha_vencimiento) return 1;
          if (!b.fecha_vencimiento) return -1;

          return (
            new Date(a.fecha_vencimiento) -
            new Date(b.fecha_vencimiento)
          );
        })
      );

      setMensaje("Deuda registrada correctamente.");
    }

    limpiarFormulario();
    setDeudaEditando(null);
    setMostrarFormulario(false);
    setGuardando(false);
  };

  const abrirAbono = (deuda) => {
    if (Number(deuda.saldo_pendiente) <= 0) {
      setMensaje("Esta deuda ya está pagada.");
      return;
    }

    setError("");
    setMensaje("");

    setDeudaAbono(deuda);

    setFormularioAbono({
      monto: "",
      fecha: new Date().toISOString().split("T")[0],
      descripcion: "",
    });

    setMostrarAbono(true);
  };

  const cerrarAbono = () => {
    if (procesandoAbono) {
      return;
    }

    setMostrarAbono(false);
    setDeudaAbono(null);

    setFormularioAbono({
      monto: "",
      fecha: new Date().toISOString().split("T")[0],
      descripcion: "",
    });

    setError("");
  };

  const registrarAbono = async (e) => {
    e.preventDefault();

    if (!deudaAbono) {
      return;
    }

    setError("");
    setMensaje("");

    const monto = convertirNumero(formularioAbono.monto);
    const saldoActual =
      Number(deudaAbono.saldo_pendiente) || 0;

    if (monto <= 0) {
      setError("El valor del abono debe ser mayor que $0.");
      return;
    }

    if (monto > saldoActual) {
      setError(
        `El abono no puede ser mayor que el saldo pendiente de ${formatearMoneda(
          saldoActual
        )}.`
      );
      return;
    }

    setProcesandoAbono(true);

    const { error: errorPago } = await supabase
      .from("pagos_deuda")
      .insert({
        usuario_id: sesion.user.id,
        deuda_id: deudaAbono.id,
        monto,
        fecha:
          formularioAbono.fecha ||
          new Date().toISOString().split("T")[0],
        descripcion:
          formularioAbono.descripcion.trim() || null,
      });

    if (errorPago) {
      console.error(
        "Error registrando abono:",
        errorPago
      );

      setError(
        errorPago.message ||
          "No se pudo registrar el abono."
      );

      setProcesandoAbono(false);
      return;
    }

    const nuevoSaldo = Math.max(
      0,
      saldoActual - monto
    );

    const {
      data: deudaActualizada,
      error: errorDeuda,
    } = await supabase
      .from("deudas")
      .update({
        saldo_pendiente: nuevoSaldo,
        estado:
          nuevoSaldo === 0 ? "pagada" : "pendiente",
      })
      .eq("id", deudaAbono.id)
      .eq("usuario_id", sesion.user.id)
      .select()
      .single();

    if (errorDeuda) {
      console.error(
        "Error actualizando saldo después del abono:",
        errorDeuda
      );

      setError(
        errorDeuda.message ||
          "El abono se registró, pero no se pudo actualizar el saldo."
      );

      setProcesandoAbono(false);

      await cargarDeudas();

      return;
    }

    setDeudas((actuales) =>
      actuales.map((deuda) =>
        deuda.id === deudaActualizada.id
          ? deudaActualizada
          : deuda
      )
    );

    setMensaje(
      nuevoSaldo === 0
        ? "Abono registrado. ¡Deuda pagada completamente!"
        : `Abono de ${formatearMoneda(
            monto
          )} registrado correctamente.`
    );

    setMostrarAbono(false);
    setDeudaAbono(null);
    setProcesandoAbono(false);
  };

  const abrirHistorial = async (deuda) => {
    setError("");
    setMensaje("");

    setDeudaHistorial(deuda);
    setMostrarHistorial(true);
    setPagos([]);
    setCargandoPagos(true);

    const { data, error: errorSupabase } = await supabase
      .from("pagos_deuda")
      .select("*")
      .eq("deuda_id", deuda.id)
      .eq("usuario_id", sesion.user.id)
      .order("fecha", { ascending: false });

    if (errorSupabase) {
      console.error(
        "Error cargando historial de pagos:",
        errorSupabase
      );

      setError(
        errorSupabase.message ||
          "No se pudo cargar el historial de pagos."
      );

      setPagos([]);
    } else {
      setPagos(data || []);
    }

    setCargandoPagos(false);
  };

  const cerrarHistorial = () => {
    setMostrarHistorial(false);
    setDeudaHistorial(null);
    setPagos([]);
  };

  const eliminarDeuda = async (id) => {
    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar esta deuda? También se eliminarán sus abonos asociados."
    );

    if (!confirmar) {
      return;
    }

    setError("");
    setMensaje("");
    setEliminando(id);

    const { error: errorPagos } = await supabase
      .from("pagos_deuda")
      .delete()
      .eq("deuda_id", id)
      .eq("usuario_id", sesion.user.id);

    if (errorPagos) {
      console.error(
        "Error eliminando pagos de la deuda:",
        errorPagos
      );

      setError(
        "No se pudieron eliminar los abonos asociados. La deuda no fue eliminada."
      );

      setEliminando(null);
      return;
    }

    const { error: errorSupabase } = await supabase
      .from("deudas")
      .delete()
      .eq("id", id)
      .eq("usuario_id", sesion.user.id);

    if (errorSupabase) {
      console.error(
        "Error eliminando deuda:",
        errorSupabase
      );

      setError(
        errorSupabase.message ||
          "No se pudo eliminar la deuda."
      );

      setEliminando(null);
      return;
    }

    setDeudas((actuales) =>
      actuales.filter((deuda) => deuda.id !== id)
    );

    setMensaje("Deuda eliminada correctamente.");
    setEliminando(null);
  };

  const totalDeudas = deudas.reduce(
    (total, deuda) =>
      total +
      (Number(deuda.saldo_pendiente) || 0),
    0
  );

  const totalOriginal = deudas.reduce(
    (total, deuda) =>
      total +
      (Number(deuda.valor_total) || 0),
    0
  );

  const deudasPendientes = deudas.filter(
    (deuda) =>
      deuda.estado !== "pagada" &&
      Number(deuda.saldo_pendiente) > 0
  ).length;

  const deudasPagadas = deudas.filter(
    (deuda) =>
      deuda.estado === "pagada" ||
      Number(deuda.saldo_pendiente) === 0
  ).length;

  if (cargando) {
    return (
      <div className="deudas-page">
        <div className="deudas-loading">
          <div className="deudas-spinner"></div>
          <p>Cargando tus deudas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="deudas-page">
      <header className="deudas-header">
        <div className="deudas-header-left">
          <button
            type="button"
            className="deudas-back-button"
            onClick={onVolver}
          >
            ←
          </button>

          <div>
            <p className="deudas-eyebrow">
              MI DINERO
            </p>

            <h1>Deudas</h1>

            <p>
              Controla lo que debes y cuánto te falta por pagar.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="deudas-primary-button"
          onClick={abrirFormulario}
        >
          + Nueva deuda
        </button>
      </header>

      {error && (
        <div className="deudas-alert deudas-alert-error">
          <span>⚠</span>
          <p>{error}</p>
        </div>
      )}

      {mensaje && (
        <div className="deudas-alert deudas-alert-success">
          <span>✓</span>
          <p>{mensaje}</p>
        </div>
      )}

      <section className="deudas-resumen">
        <div className="deuda-resumen-card deuda-resumen-principal">
          <div className="deuda-resumen-icono">
            $
          </div>

          <div>
            <span>Saldo pendiente</span>

            <strong>
              {formatearMoneda(totalDeudas)}
            </strong>
          </div>
        </div>

        <div className="deuda-resumen-card">
          <span>Valor original</span>

          <strong>
            {formatearMoneda(totalOriginal)}
          </strong>
        </div>

        <div className="deuda-resumen-card">
          <span>Deudas pendientes</span>

          <strong>{deudasPendientes}</strong>
        </div>

        <div className="deuda-resumen-card">
          <span>Deudas pagadas</span>

          <strong>{deudasPagadas}</strong>
        </div>
      </section>

      {mostrarFormulario && (
        <section className="deuda-formulario-card">
          <div className="deuda-formulario-header">
            <div>
              <span className="deudas-eyebrow">
                {deudaEditando
                  ? "EDITAR"
                  : "REGISTRAR"}
              </span>

              <h2>
                {deudaEditando
                  ? "Editar deuda"
                  : "Nueva deuda"}
              </h2>

              <p>
                {deudaEditando
                  ? "Actualiza los datos de esta deuda."
                  : "Guarda los datos principales de la deuda."}
              </p>
            </div>

            <button
              type="button"
              className="deuda-cerrar-formulario"
              onClick={cerrarFormulario}
              disabled={guardando}
            >
              ×
            </button>
          </div>

          <form onSubmit={guardarDeuda}>
            <div className="deuda-form-grid">
              <div className="deuda-campo">
                <label htmlFor="nombre">
                  Nombre de la deuda *
                </label>

                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formulario.nombre}
                  onChange={manejarCambio}
                  placeholder="Ej. Tarjeta de crédito"
                  maxLength={100}
                  required
                />
              </div>

              <div className="deuda-campo">
                <label htmlFor="entidad">
                  Entidad o persona
                </label>

                <input
                  id="entidad"
                  name="entidad"
                  type="text"
                  value={formulario.entidad}
                  onChange={manejarCambio}
                  placeholder="Ej. Banco, amigo, almacén..."
                  maxLength={100}
                />
              </div>

              <div className="deuda-campo">
                <label htmlFor="valor_total">
                  Valor total *
                </label>

                <input
                  id="valor_total"
                  name="valor_total"
                  type="number"
                  min="0"
                  step="1"
                  value={formulario.valor_total}
                  onChange={manejarCambio}
                  placeholder="0"
                  required
                />
              </div>

              <div className="deuda-campo">
                <label htmlFor="saldo_pendiente">
                  Saldo pendiente *
                </label>

                <input
                  id="saldo_pendiente"
                  name="saldo_pendiente"
                  type="number"
                  min="0"
                  step="1"
                  value={formulario.saldo_pendiente}
                  onChange={manejarCambio}
                  placeholder="0"
                  required
                />
              </div>

              <div className="deuda-campo">
                <label htmlFor="cuota">
                  Cuota
                </label>

                <input
                  id="cuota"
                  name="cuota"
                  type="number"
                  min="0"
                  step="1"
                  value={formulario.cuota}
                  onChange={manejarCambio}
                  placeholder="0"
                />
              </div>

              <div className="deuda-campo">
                <label htmlFor="fecha_vencimiento">
                  Fecha de vencimiento
                </label>

                <input
                  id="fecha_vencimiento"
                  name="fecha_vencimiento"
                  type="date"
                  value={formulario.fecha_vencimiento}
                  onChange={manejarCambio}
                />
              </div>

              <div className="deuda-campo">
                <label htmlFor="estado">
                  Estado
                </label>

                <select
                  id="estado"
                  name="estado"
                  value={formulario.estado}
                  onChange={manejarCambio}
                >
                  <option value="pendiente">
                    Pendiente
                  </option>

                  <option value="pagada">
                    Pagada
                  </option>
                </select>
              </div>

              <div className="deuda-campo deuda-campo-completo">
                <label htmlFor="descripcion">
                  Descripción
                </label>

                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formulario.descripcion}
                  onChange={manejarCambio}
                  placeholder="Agrega una nota sobre esta deuda..."
                  rows="3"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="deuda-formulario-acciones">
              <button
                type="button"
                className="deuda-secondary-button"
                onClick={cerrarFormulario}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="deudas-primary-button"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : deudaEditando
                  ? "Guardar cambios"
                  : "Guardar deuda"}
              </button>
            </div>
          </form>
        </section>
      )}

      {mostrarAbono && deudaAbono && (
        <section className="deuda-formulario-card">
          <div className="deuda-formulario-header">
            <div>
              <span className="deudas-eyebrow">
                REGISTRAR PAGO
              </span>

              <h2>Registrar abono</h2>

              <p>
                {deudaAbono.nombre} · Saldo actual:{" "}
                <strong>
                  {formatearMoneda(
                    deudaAbono.saldo_pendiente
                  )}
                </strong>
              </p>
            </div>

            <button
              type="button"
              className="deuda-cerrar-formulario"
              onClick={cerrarAbono}
              disabled={procesandoAbono}
            >
              ×
            </button>
          </div>

          <form onSubmit={registrarAbono}>
            <div className="deuda-form-grid">
              <div className="deuda-campo">
                <label htmlFor="monto_abono">
                  Valor del abono *
                </label>

                <input
                  id="monto_abono"
                  name="monto"
                  type="number"
                  min="1"
                  max={deudaAbono.saldo_pendiente}
                  step="1"
                  value={formularioAbono.monto}
                  onChange={manejarCambioAbono}
                  placeholder="0"
                  required
                />
              </div>

              <div className="deuda-campo">
                <label htmlFor="fecha_abono">
                  Fecha
                </label>

                <input
                  id="fecha_abono"
                  name="fecha"
                  type="date"
                  value={formularioAbono.fecha}
                  onChange={manejarCambioAbono}
                />
              </div>

              <div className="deuda-campo deuda-campo-completo">
                <label htmlFor="descripcion_abono">
                  Descripción
                </label>

                <textarea
                  id="descripcion_abono"
                  name="descripcion"
                  value={formularioAbono.descripcion}
                  onChange={manejarCambioAbono}
                  placeholder="Ej. Pago de cuota, abono extra..."
                  rows="3"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="deuda-formulario-acciones">
              <button
                type="button"
                className="deuda-secondary-button"
                onClick={cerrarAbono}
                disabled={procesandoAbono}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="deudas-primary-button"
                disabled={procesandoAbono}
              >
                {procesandoAbono
                  ? "Registrando..."
                  : "Registrar abono"}
              </button>
            </div>
          </form>
        </section>
      )}

      {mostrarHistorial && deudaHistorial && (
        <section className="deuda-formulario-card">
          <div className="deuda-formulario-header">
            <div>
              <span className="deudas-eyebrow">
                HISTORIAL DE PAGOS
              </span>

              <h2>{deudaHistorial.nombre}</h2>

              <p>
                Consulta todos los abonos registrados para esta deuda.
              </p>
            </div>

            <button
              type="button"
              className="deuda-cerrar-formulario"
              onClick={cerrarHistorial}
            >
              ×
            </button>
          </div>

          {cargandoPagos ? (
            <div className="deudas-loading">
              <div className="deudas-spinner"></div>

              <p>Cargando historial...</p>
            </div>
          ) : pagos.length === 0 ? (
            <div className="deudas-vacio">
              <div className="deudas-vacio-icono">
                $
              </div>

              <h3>Sin abonos registrados</h3>

              <p>
                Todavía no has registrado pagos para esta deuda.
              </p>
            </div>
          ) : (
            <div className="deuda-historial-lista">
              {pagos.map((pago) => (
                <div
                  className="deuda-historial-item"
                  key={pago.id}
                >
                  <div>
                    <strong>
                      {formatearMoneda(pago.monto)}
                    </strong>

                    <span>
                      {formatearFecha(pago.fecha)}
                    </span>
                  </div>

                  {pago.descripcion && (
                    <p>{pago.descripcion}</p>
                  )}
                </div>
              ))}

              <div className="deuda-historial-total">
                <span>
                  Total abonado registrado
                </span>

                <strong>
                  {formatearMoneda(
                    pagos.reduce(
                      (total, pago) =>
                        total +
                        (Number(pago.monto) || 0),
                      0
                    )
                  )}
                </strong>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="deudas-lista-section">
        <div className="deudas-lista-header">
          <div>
            <h2>Mis deudas</h2>

            <p>
              {deudas.length === 0
                ? "Todavía no tienes deudas registradas."
                : `${deudas.length} ${
                    deudas.length === 1
                      ? "deuda registrada"
                      : "deudas registradas"
                  }`}
            </p>
          </div>
        </div>

        {deudas.length === 0 ? (
          <div className="deudas-vacio">
            <div className="deudas-vacio-icono">
              $
            </div>

            <h3>Aún no tienes deudas</h3>

            <p>
              Registra tu primera deuda para comenzar
              a controlar tus pagos.
            </p>

            <button
              type="button"
              className="deudas-primary-button"
              onClick={abrirFormulario}
            >
              + Registrar primera deuda
            </button>
          </div>
        ) : (
          <div className="deudas-grid">
            {deudas.map((deuda) => {
              const porcentaje =
                obtenerPorcentajePagado(deuda);

              const pagado =
                (Number(deuda.valor_total) || 0) -
                (Number(deuda.saldo_pendiente) || 0);

              const estaPagada =
                deuda.estado === "pagada" ||
                Number(deuda.saldo_pendiente) === 0;

              return (
                <article
                  className={`deuda-card ${
                    estaPagada
                      ? "deuda-card-pagada"
                      : ""
                  }`}
                  key={deuda.id}
                >
                  <div className="deuda-card-top">
                    <div>
                      <span className="deuda-card-label">
                        DEUDA
                      </span>

                      <h3>{deuda.nombre}</h3>

                      {deuda.entidad && (
                        <p className="deuda-entidad">
                          {deuda.entidad}
                        </p>
                      )}
                    </div>

                    <span
                      className={`deuda-estado ${
                        estaPagada
                          ? "deuda-estado-pagada"
                          : "deuda-estado-pendiente"
                      }`}
                    >
                      {estaPagada
                        ? "Pagada"
                        : "Pendiente"}
                    </span>
                  </div>

                  <div className="deuda-saldo">
                    <span>Saldo pendiente</span>

                    <strong>
                      {formatearMoneda(
                        deuda.saldo_pendiente
                      )}
                    </strong>
                  </div>

                  <div className="deuda-progreso">
                    <div className="deuda-progreso-info">
                      <span>
                        Progreso de pago
                      </span>

                      <strong>
                        {Math.round(porcentaje)}%
                      </strong>
                    </div>

                    <div className="deuda-progreso-barra">
                      <div
                        className="deuda-progreso-fill"
                        style={{
                          width: `${porcentaje}%`,
                        }}
                      ></div>
                    </div>

                    <p>
                      Pagado:{" "}
                      <strong>
                        {formatearMoneda(pagado)}
                      </strong>{" "}
                      de{" "}
                      <strong>
                        {formatearMoneda(
                          deuda.valor_total
                        )}
                      </strong>
                    </p>
                  </div>

                  <div className="deuda-detalles">
                    <div>
                      <span>Cuota</span>

                      <strong>
                        {formatearMoneda(
                          deuda.cuota
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Vencimiento</span>

                      <strong>
                        {formatearFecha(
                          deuda.fecha_vencimiento
                        )}
                      </strong>
                    </div>
                  </div>

                  {deuda.descripcion && (
                    <div className="deuda-descripcion">
                      <span>Nota</span>

                      <p>{deuda.descripcion}</p>
                    </div>
                  )}

                  <div className="deuda-card-footer">
                    {!estaPagada && (
                      <button
                        type="button"
                        className="deuda-abono-button"
                        onClick={() =>
                          abrirAbono(deuda)
                        }
                      >
                        💵 Abonar
                      </button>
                    )}

                    <button
                      type="button"
                      className="deuda-editar-button"
                      onClick={() =>
                        abrirEditar(deuda)
                      }
                    >
                      ✏️ Editar
                    </button>

                    <button
                      type="button"
                      className="deuda-historial-button"
                      onClick={() =>
                        abrirHistorial(deuda)
                      }
                    >
                      📋 Historial
                    </button>

                    <button
                      type="button"
                      className="deuda-eliminar-button"
                      onClick={() =>
                        eliminarDeuda(deuda.id)
                      }
                      disabled={
                        eliminando === deuda.id
                      }
                    >
                      {eliminando === deuda.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Deudas;