import { useState } from "react";
import { useI18n } from "../i18n";
import { formatDate } from "../i18n/date";
import type { HospitalMessage } from "../../shared/hospitalContracts";
import "./connectedText";
import "./connected.css";

export function PairHospitalPanel({
  pairing,
  error,
  onConnect,
}: {
  pairing: boolean;
  error: boolean;
  onConnect(origin: string, code: string, localDemo: boolean): Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState(() => {
    try {
      return localStorage.getItem("oncoflow-hospital-origin") ?? "";
    } catch {
      return "";
    }
  });
  const [code, setCode] = useState("");
  const [localDemo, setLocalDemo] = useState(false);
  return (
    <details className="hospital-pair-panel hospital-advanced">
      <summary>{t("Conexão avançada")}</summary>
      <section>
        {!open ? (
          <button
            type="button"
            className="secondary full"
            onClick={() => setOpen(true)}
          >
            {t("Conectar ao hospital")}
          </button>
        ) : (
          <form
            className="card hospital-pair-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onConnect(origin, code, localDemo);
            }}
          >
            <h2>{t("Conectar ao hospital")}</h2>
            <p>
              {t(
                "Use o endereço e o código temporário exibidos no painel da equipe.",
              )}
            </p>
            <label htmlFor="hospital-address">
              {t("Endereço do hospital")}
            </label>
            <input
              id="hospital-address"
              type="url"
              placeholder="https://hospital.exemplo"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
              disabled={pairing}
            />
            <label htmlFor="hospital-code">{t("Código de pareamento")}</label>
            <input
              id="hospital-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              required
              maxLength={64}
              disabled={pairing}
            />
            <label className="hospital-local-option">
              <input
                type="checkbox"
                checked={localDemo}
                onChange={(event) => setLocalDemo(event.target.checked)}
                disabled={pairing}
              />
              <span>{t("Rede local de demonstração (HTTP)")}</span>
            </label>
            {localDemo && (
              <p className="footnote">
                {t(
                  "No modo local, conecte o celular e o computador à mesma rede Wi-Fi. Use apenas dados fictícios.",
                )}
              </p>
            )}
            {error && (
              <p role="alert" className="hospital-error">
                {t(
                  "Não foi possível conectar. Confira o endereço, o código e a rede e tente novamente.",
                )}
              </p>
            )}
            <button className="primary full" disabled={pairing}>
              {t(pairing ? "Conectando…" : "Conectar ao hospital")}
            </button>
            <p className="footnote">
              {t(
                "Sessão mantida apenas enquanto o app está aberto. Ao reiniciar, use um novo código.",
              )}
            </p>
          </form>
        )}
      </section>
    </details>
  );
}

/**
 * Access is granted by the care team: the patient enters with the one-time code shown in the
 * team panel. On the web the app is served by the hospital server, so only the code is asked.
 */
export function CareTeamCodePanel({
  pairing,
  error,
  ended,
  onConnect,
}: {
  pairing: boolean;
  error: boolean;
  ended: boolean;
  onConnect(code: string): Promise<void>;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  return (
    <form
      className="card hospital-pair-form care-team-code"
      onSubmit={(event) => {
        event.preventDefault();
        void onConnect(code);
      }}
    >
      <h2>{t("Tenho um código da minha equipe")}</h2>
      <p>
        {t(
          "Sua equipe de cuidado libera o acesso ao app e entrega um código. Ele vale uma única vez e por poucos minutos.",
        )}
      </p>
      {ended && (
        <p role="status" className="hospital-error">
          {t(
            "Seu acesso ao app foi encerrado. Para voltar, peça um novo código à sua equipe.",
          )}
        </p>
      )}
      <label htmlFor="care-team-code">{t("Código de acesso")}</label>
      <input
        id="care-team-code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        required
        minLength={4}
        maxLength={64}
        disabled={pairing}
      />
      {error && (
        <p role="alert" className="hospital-error">
          {t(
            "Código inválido, expirado ou já usado. Peça um novo código à sua equipe.",
          )}
        </p>
      )}
      <button className="primary full" disabled={pairing || !code.trim()}>
        {t(pairing ? "Entrando…" : "Entrar com o código")}
      </button>
    </form>
  );
}

export function TeamMessages({
  messages,
  pending,
  onSend,
}: {
  messages: HospitalMessage[];
  pending: boolean;
  onSend(text: string): Promise<void>;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);
  async function send() {
    setError(false);
    setSent(false);
    try {
      await onSend(text.trim());
      setText("");
      setReviewing(false);
      setSent(true);
    } catch {
      setError(true);
    }
  }
  return (
    <section className="team-messages" data-testid="team-messages">
      <div className="section-heading">
        <h2>{t("Mensagens da equipe")}</h2>
      </div>
      <p>
        {t(
          "Aqui aparecem apenas mensagens compartilhadas com você pela equipe. A Lia não responde como profissional.",
        )}
      </p>
      <div className="stack">
        {messages.length ? (
          messages.map((message) => (
            <article
              key={message.id}
              className={`card team-message team-message-${message.role}`}
            >
              <strong>
                {message.role === "patient" ? t("Você") : message.authorLabel}
              </strong>
              <p>{message.text}</p>
              <small>
                {formatDate(message.createdAt)} ·{" "}
                {formatDate(message.createdAt, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </article>
          ))
        ) : (
          <p className="footnote">
            {t("Ainda não há mensagens compartilhadas.")}
          </p>
        )}
      </div>
      <form
        className="card hospital-message-form"
        onSubmit={(event) => {
          event.preventDefault();
          setReviewing(true);
          setSent(false);
        }}
      >
        <label htmlFor="team-message">{t("Sua mensagem")}</label>
        <textarea
          id="team-message"
          value={text}
          maxLength={4000}
          rows={4}
          disabled={reviewing || pending}
          onChange={(event) => {
            setText(event.target.value);
            setSent(false);
          }}
          required
        />
        {!reviewing && (
          <button className="secondary full" disabled={!text.trim() || pending}>
            {t("Revisar mensagem")}
          </button>
        )}
        {reviewing && (
          <div className="message-review">
            <h3>{t("Confirmar envio da mensagem")}</h3>
            <p>{t("Enviar esta mensagem para a equipe da demonstração?")}</p>
            <blockquote>{text}</blockquote>
            <button
              type="button"
              className="primary full"
              disabled={pending}
              onClick={() => void send()}
            >
              {t(pending ? "Salvando no hospital…" : "Confirmar envio")}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={pending}
              onClick={() => setReviewing(false)}
            >
              {t("Cancelar")}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="hospital-error">
            {t(
              "Não foi possível confirmar o envio. Tente a mesma ação novamente; ela não será duplicada.",
            )}
          </p>
        )}
        {sent && <p role="status">{t("Mensagem confirmada pelo hospital.")}</p>}
      </form>
    </section>
  );
}
