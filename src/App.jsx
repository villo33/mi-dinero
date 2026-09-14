import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";
import Auth from "./components/Auth";
import "./App.css";
import Dashboard from "./components/Dashboard";
import Movimientos from "./components/Movimientos";
import Deudas from "./components/Deudas";
import Metas from "./components/Metas";

function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pantalla, setPantalla] = useState("dashboard");
  const [tipoMovimiento, setTipoMovimiento] = useState("ingreso");

  useEffect(() => {
    let activo = true;

    const obtenerSesion = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error obteniendo sesión:", error);
      }

      if (activo) {
        setSesion(data?.session ?? null);
        setCargando(false);
      }
    };

    obtenerSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);

      if (!nuevaSesion) {
        setPantalla("dashboard");
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  const abrirMovimientos = (tipo = "ingreso") => {
    setTipoMovimiento(tipo);
    setPantalla("movimientos");
  };

  if (cargando) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Cargando Mi Dinero...</p>
      </div>
    );
  }

  if (!sesion) {
    return <Auth />;
  }

  if (pantalla === "movimientos") {
    return (
      <Movimientos
        sesion={sesion}
        tipoInicial={tipoMovimiento}
        onVolver={() => setPantalla("dashboard")}
      />
    );
  }

  if (pantalla === "deudas") {
    return (
      <Deudas
        sesion={sesion}
        onVolver={() => setPantalla("dashboard")}
      />
    );
  }

  if (pantalla === "metas") {
    return (
      <Metas
        sesion={sesion}
        onVolver={() => setPantalla("dashboard")}
      />
    );
  }

  return (
    <Dashboard
      sesion={sesion}
      onCerrarSesion={cerrarSesion}
      onRegistrarIngreso={() =>
        abrirMovimientos("ingreso")
      }
      onRegistrarGasto={() =>
        abrirMovimientos("gasto")
      }
      onAgregarDeuda={() =>
        setPantalla("deudas")
      }
      onAgregarMeta={() =>
        setPantalla("metas")
      }
    />
  );
}

export default App;