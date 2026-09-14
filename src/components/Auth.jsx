import { useState } from "react";
import { supabase } from "../services/supabase";
import "./Auth.css";

function Auth() {
  const [modo, setModo] = useState("login");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const limpiarMensajes = () => {
    setMensaje("");
    setError("");
  };

  const cambiarModo = () => {
    limpiarMensajes();

    setModo((actual) =>
      actual === "login" ? "registro" : "login"
    );

    setNombre("");
    setCorreo("");
    setPassword("");
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    limpiarMensajes();

    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    if (modo === "registro" && !nombre.trim()) {
      setError("Ingresa tu nombre.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    setCargando(true);

    try {
      if (modo === "registro") {
        const { data, error: errorRegistro } =
          await supabase.auth.signUp({
            email: correoLimpio,
            password,
            options: {
              data: {
                nombre: nombre.trim(),
              },
            },
          });

        if (errorRegistro) {
          throw errorRegistro;
        }

        if (data.session) {
          setMensaje("Cuenta creada correctamente.");
        } else {
          setMensaje(
            "Cuenta creada. Revisa tu correo para confirmar la cuenta."
          );
        }

        setPassword("");
      } else {
        const { error: errorLogin } =
          await supabase.auth.signInWithPassword({
            email: correoLimpio,
            password,
          });

        if (errorLogin) {
          throw errorLogin;
        }
      }
    } catch (err) {
      console.error("Error de autenticación:", err);

      const mensajeError = err.message?.toLowerCase() || "";

      if (mensajeError.includes("invalid login")) {
        setError("Correo o contraseña incorrectos.");
      } else if (
        mensajeError.includes("email not confirmed")
      ) {
        setError(
          "Primero debes confirmar tu correo electrónico."
        );
      } else if (
        mensajeError.includes("user already registered")
      ) {
        setError("Ese correo ya tiene una cuenta.");
      } else {
        setError(
          err.message || "Ocurrió un error. Intenta nuevamente."
        );
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <div className="auth-logo-icon">$</div>

          <div>
            <h1>Mi Dinero</h1>
            <p>Controla mejor tus finanzas</p>
          </div>
        </div>

        <div className="auth-header">
          <h2>
            {modo === "login"
              ? "Bienvenido de nuevo"
              : "Crea tu cuenta"}
          </h2>

          <p>
            {modo === "login"
              ? "Ingresa para continuar"
              : "Comienza a organizar tu dinero"}
          </p>
        </div>

        <form
          onSubmit={manejarSubmit}
          className="auth-form"
        >
          {modo === "registro" && (
            <div className="auth-field">
              <label htmlFor="nombre">
                Nombre
              </label>

              <input
                id="nombre"
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) =>
                  setNombre(e.target.value)
                }
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="correo">
              Correo electrónico
            </label>

            <input
              id="correo"
              type="email"
              placeholder="correo@ejemplo.com"
              value={correo}
              onChange={(e) =>
                setCorreo(e.target.value)
              }
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete={
                modo === "login"
                  ? "current-password"
                  : "new-password"
              }
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="auth-success">
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={cargando}
          >
            {cargando
              ? "Procesando..."
              : modo === "login"
                ? "Iniciar sesión"
                : "Crear cuenta"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {modo === "login"
              ? "¿Todavía no tienes cuenta?"
              : "¿Ya tienes una cuenta?"}
          </span>

          <button
            type="button"
            onClick={cambiarModo}
          >
            {modo === "login"
              ? "Crear cuenta"
              : "Iniciar sesión"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Auth;