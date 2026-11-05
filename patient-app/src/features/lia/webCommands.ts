import type { LiaAction } from "../../../shared/liaActions";

/** Explicit browser commands only. No model, clinical inference or implicit writes. */
export function webLiaCommand(text: string): LiaAction | null {
  const input = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/^(?:lia|leah)[,\s]+/, "")
    .replace(/^please\s+/, "")
    .replace(/[,\s]*(?:por favor|please)[.!?]*$/, "")
    .replace(/[.!?]+$/, "")
    .trim();
  const pages: Record<string, string> = {
    agenda: "agenda",
    schedule: "agenda",
    calendar: "agenda",
    jornada: "journey",
    journey: "journey",
    documentos: "documents",
    documents: "documents",
    pedidos: "requests",
    requests: "requests",
    mensagens: "messages",
    messages: "messages",
    perfil: "profile",
    profile: "profile",
    "check-in": "checkin",
    "check in": "checkin",
  };
  const match =
    /^(abra|abrir|mostre|mostrar|open|show|leia|ler|read)\s+(?:(?:a|o|minha|meu|minhas|meus|my|the)\s+)?(.+)$/.exec(
      input,
    );
  if (match && pages[match[2]])
    return {
      type: /^(leia|ler|read)$/.test(match[1]) ? "read" : "navigate",
      target: pages[match[2]],
      value: null,
    };
  if (
    /^(?:qual|quando)(?: e| sera)? (?:a )?minha proxima consulta$/.test(
      input,
    ) ||
    /^(?:what|when) is my next appointment$/.test(input)
  )
    return { type: "read", target: "agenda", value: null };
  if (
    /^(?:quero |preciso )?falar com (?:a )?equipe$/.test(input) ||
    /^(?:i want to |please )?contact (?:my |the )?team$/.test(input)
  )
    return { type: "request_contact", target: null, value: null };
  return null;
}

export function webLiaHelp(english: boolean): string {
  return english
    ? "I can consult your schedule, journey and shared documents, or prepare a request to contact the team with your confirmation. Try “read my schedule” or “contact my team”. I do not diagnose or change treatment."
    : "Posso consultar sua agenda, jornada e documentos compartilhados, ou preparar um pedido de contato com a equipe com sua confirmação. Tente “leia minha agenda” ou “quero falar com a equipe”. Não faço diagnósticos nem altero tratamentos.";
}
