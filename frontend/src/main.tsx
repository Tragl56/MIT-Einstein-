import "@oncoflow/shared/estilos.css";

import { ErroApi, Sessao } from "@oncoflow/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Inicio } from "../apps/paciente/src/Inicio";
import { VisaoGeral } from "../apps/pro/src/VisaoGeral";

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (tentativas, erro) =>
        tentativas < 1 && (!(erro instanceof ErroApi) || erro.status === 0 || erro.status >= 500),
      refetchOnWindowFocus: false,
    },
  },
});

window.addEventListener("oncoflow:sessao", () => void clienteConsultas.resetQueries());
window.addEventListener("oncoflow:reset", () => void clienteConsultas.invalidateQueries());

function EscolhaPainel() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-marca-azul">OncoFlow</p>
        <h1 className="mt-2 text-3xl font-semibold">A jornada, mais próxima.</h1>
        <p className="mt-2 text-texto-suave">Escolha como deseja acessar a demonstração.</p>
      </div>
      <a href="/profissional.html" className="flex min-h-16 items-center justify-between rounded-2xl bg-marca-azul px-5 font-semibold text-white">
        <span>Painel profissional</span><span aria-hidden="true">→</span>
      </a>
      <a href="/paciente.html" className="flex min-h-16 items-center justify-between rounded-2xl border border-marca-azul px-5 font-semibold text-marca-azul">
        <span>Painel do paciente</span><span aria-hidden="true">→</span>
      </a>
      <p className="text-sm text-texto-suave">Demonstração com dados fictícios. Não use para decisões clínicas.</p>
    </main>
  );
}

function Aplicacao() {
  const caminho = window.location.pathname;
  if (caminho.startsWith("/paciente")) {
    return <Sessao app="paciente"><Inicio /></Sessao>;
  }
  if (caminho.startsWith("/profissional")) {
    return (
      <QueryClientProvider client={clienteConsultas}>
        <Sessao app="pro"><VisaoGeral /></Sessao>
      </QueryClientProvider>
    );
  }
  return <EscolhaPainel />;
}

createRoot(document.getElementById("raiz")!).render(<StrictMode><Aplicacao /></StrictMode>);
