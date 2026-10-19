"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useData, fmtDate } from "@/lib/data";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark">D</span>
          <span>
            desenvolve<em>.</em>
          </span>
        </div>
        {children}
      </div>
      <p className="auth-foot">Plataforma de desenvolvimento • cais</p>
    </main>
  );
}

export function Splash({ text = "Carregando sua plataforma…" }: { text?: string }) {
  return (
    <Shell>
      <div className="auth-loading">
        <span className="spinner" />
        <p>{text}</p>
      </div>
    </Shell>
  );
}

type Mode = "entrar" | "criar" | "link" | "senha";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const redirect = typeof window !== "undefined" ? window.location.origin : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      } else if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name }, emailRedirectTo: redirect },
        });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, text: "Conta criada. Confira seu e-mail para confirmar o cadastro." });
      } else if (mode === "link") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: false } });
        if (error) throw error;
        setMsg({ ok: true, text: "Enviamos um link de acesso para o seu e-mail." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (error) throw error;
        setMsg({ ok: true, text: "Se houver uma conta com esse e-mail, você vai receber o link para criar uma nova senha." });
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setMsg({
        ok: false,
        text: m.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : m.includes("already registered")
            ? "Este e-mail já tem conta. Use “Entrar”."
            : m.includes("Signups not allowed")
              ? "Não encontramos conta com esse e-mail."
              : m,
      });
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, [string, string]> = {
    entrar: ["Entrar", "Acesse sua jornada de desenvolvimento."],
    criar: ["Criar conta", "Use o e-mail em que você recebeu o convite da sua empresa."],
    link: ["Entrar sem senha", "Mandamos um link de acesso para o seu e-mail."],
    senha: ["Esqueci a senha", "Mandamos um link para você criar uma nova."],
  };

  return (
    <Shell>
      <h1>{titles[mode][0]}</h1>
      <p className="auth-lead">{titles[mode][1]}</p>
      <form className="create-form" onSubmit={submit}>
        {mode === "criar" && (
          <label>
            Nome completo
            <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label>
          E-mail
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        {(mode === "entrar" || mode === "criar") && (
          <label>
            Senha
            <input
              required
              type="password"
              minLength={8}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
            />
          </label>
        )}
        {msg && <p className={`auth-msg ${msg.ok ? "ok" : "bad"}`}>{msg.text}</p>}
        <button className="primary full" type="submit" disabled={busy}>
          {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}
        </button>
      </form>
      <div className="auth-links">
        {mode !== "entrar" && <button onClick={() => setMode("entrar")}>Já tenho conta</button>}
        {mode !== "criar" && <button onClick={() => setMode("criar")}>Recebi um convite</button>}
        {mode !== "link" && <button onClick={() => setMode("link")}>Entrar sem senha</button>}
        {mode !== "senha" && <button onClick={() => setMode("senha")}>Esqueci a senha</button>}
      </div>
    </Shell>
  );
}

export function NewPasswordScreen({ done }: { done: () => void }) {
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <Shell>
      <h1>Nova senha</h1>
      <p className="auth-lead">Escolha uma senha com pelo menos 8 caracteres.</p>
      <form
        className="create-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.auth.updateUser({ password: pass });
          if (error) setMsg(error.message);
          else done();
        }}
      >
        <label>
          Nova senha
          <input required type="password" minLength={8} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
        </label>
        {msg && <p className="auth-msg bad">{msg}</p>}
        <button className="primary full" type="submit">
          Salvar senha
        </button>
      </form>
    </Shell>
  );
}

export function NoCompanyScreen() {
  const d = useData();
  return (
    <Shell>
      <h1>Quase lá</h1>
      <p className="auth-lead">
        Sua conta ({d.profile?.email}) foi criada, mas ainda não está ligada a nenhuma empresa. Peça ao RH ou ao administrador da plataforma para
        enviar o convite para este e-mail. Depois, é só entrar de novo.
      </p>
      <button className="secondary full" onClick={() => d.signOut()}>
        Sair
      </button>
    </Shell>
  );
}

export function ConsentScreen() {
  const d = useData();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const c = d.company;
  const renewed = !!d.profile?.privacy_consented_at;
  return (
    <Shell>
      <h1>{renewed ? "Política de privacidade atualizada" : "Antes de começar"}</h1>
      <p className="auth-lead">
        Para usar a plataforma de {c?.name}, precisamos do seu aceite sobre como seus dados de aprendizagem são tratados (Lei Geral de Proteção de
        Dados).
      </p>
      <div className="consent-box">
        <p>
          <strong>O que guardamos:</strong> nome, e-mail, cargo, equipe, progresso nos conteúdos, notas de avaliações, certificados e datas de acesso.
        </p>
        <p>
          <strong>Quem vê:</strong> você, seu gestor direto (o seu progresso) e os administradores de {c?.name}. Nenhuma outra empresa tem acesso.
        </p>
        <p>
          <strong>Para quê:</strong> acompanhar seu desenvolvimento, emitir certificados e gerar relatórios de treinamento da empresa.
        </p>
        {c?.privacy_policy_url && (
          <p>
            Leia a política completa:{" "}
            <a href={c.privacy_policy_url} target="_blank" rel="noreferrer">
              {c.privacy_policy_url}
            </a>
          </p>
        )}
        <small>Versão {c?.privacy_policy_version ?? "1.0"}</small>
      </div>
      <label className="check-label">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        Li e aceito a política de privacidade
      </label>
      {err && <p className="auth-msg bad">{err}</p>}
      <button
        className="primary full"
        disabled={!ok || busy}
        onClick={async () => {
          setBusy(true);
          const { error } = await supabase.rpc("record_privacy_consent", { p_user_agent: navigator.userAgent });
          if (error) setErr(error.message);
          else await d.refresh();
          setBusy(false);
        }}
      >
        Aceitar e continuar
      </button>
      <button className="secondary full" onClick={() => d.signOut()}>
        Sair
      </button>
    </Shell>
  );
}

export function VerifyScreen({ code }: { code: string }) {
  const [res, setRes] = useState<
    { recipient_name: string; title: string; company_name: string; workload_minutes: number | null; issued_at: string } | null | undefined
  >(undefined);
  useEffect(() => {
    supabase.rpc("verify_certificate", { p_code: code }).then(({ data }) => setRes(data?.[0] ?? null));
  }, [code]);
  return (
    <Shell>
      <h1>Verificação de certificado</h1>
      {res === undefined ? (
        <p className="auth-lead">Conferindo o código {code}…</p>
      ) : res ? (
        <div className="consent-box">
          <p className="auth-msg ok">Certificado válido</p>
          <p>
            <strong>{res.recipient_name}</strong> concluiu <strong>{res.title}</strong>
            {res.company_name ? ` (${res.company_name})` : ""} em {fmtDate(res.issued_at, { day: "numeric", month: "long", year: "numeric" })}
            {res.workload_minutes ? `, com ${Math.max(1, Math.round(res.workload_minutes / 60))}h de carga horária` : ""}.
          </p>
          <small>Código {code.toUpperCase()}</small>
        </div>
      ) : (
        <p className="auth-msg bad">Não encontramos certificado com o código {code}.</p>
      )}
      <button className="secondary full" onClick={() => (window.location.href = window.location.pathname)}>
        Ir para a plataforma
      </button>
    </Shell>
  );
}
