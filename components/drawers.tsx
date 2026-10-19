"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useData,
  downloadCsv,
  fmtDate,
  hours,
  ROLE_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type AppRole,
  type QuizQuestion,
} from "@/lib/data";
import { printCertificate } from "./certificate";
import { trailLessonIds } from "./learner";
import { REPORTS, useReportRows } from "./admin";
import { Icon, Progress, type DrawerKind, type DrawerState, type PageProps } from "./ui";
import type { Enums } from "@/lib/supabase";

type DrawerProps = PageProps & { close: () => void };

export function Drawer({ state, ...p }: DrawerProps & { state: NonNullable<DrawerState> }) {
  const k = state.kind;
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true">
      <button className="modal-scrim" onClick={p.close} aria-label="Fechar" />
      <div className="drawer">
        <button className="drawer-close" onClick={p.close} aria-label="Fechar">
          <Icon name="close" />
        </button>
        {k === "content" && state.id && <ContentDrawer id={state.id} {...p} />}
        {k === "trail" && state.id && <TrailDrawer id={state.id} {...p} />}
        {k === "person" && state.id && <PersonDrawer id={state.id} {...p} />}
        {(k === "create-content" || k === "create-trail") && <CreateDrawer type={k} {...p} />}
        {k === "notifications" && <NotificationsDrawer {...p} />}
        {k === "profile" && <ProfileDrawer {...p} />}
        {k === "company" && <CompanyDrawer id={state.id} title={state.title} {...p} />}
        {k === "support" && <SupportDrawer {...p} />}
        {k === "actions" && <ActionsDrawer id={state.id ?? ""} title={state.title ?? "Item"} {...p} />}
        {k === "invite" && <InviteDrawer {...p} />}
        {k === "assessment" && <AssessmentDrawer {...p} />}
        {k === "certificate" && <CertificateDrawer {...p} />}
        {k === "report" && <ReportDrawer id={state.id ?? "executivo"} title={state.title ?? "Relatório"} {...p} />}
        {k === "recommend" && <RecommendDrawer target={state.id} title={state.title} {...p} />}
        {k === "generic" && <GenericDrawer title={state.title ?? "Detalhes"} body={state.body} {...p} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conteúdo: player, texto, PDF, link, quiz e atividade
// ---------------------------------------------------------------------------
function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function ContentDrawer({ id, ...p }: DrawerProps & { id: string }) {
  const d = useData();
  const lesson = d.lessonById(id);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const c = lesson?.content;
  const prog = d.progress.get(id);
  const [answer, setAnswer] = useState(() => prog?.last_position ?? "");
  const marks = useRef(new Set<number>());
  const startedAt = useRef(0);
  const done = prog?.status === "completed";

  useEffect(() => {
    if (!c) return;
    startedAt.current = Date.now();
    if (c.file_path) d.fileUrl(c.file_path).then(setFileUrl);
    // abrir conta como início
    if (c.status === "published" && !prog && c.type !== "quiz") d.setProgress(c.id, "in_progress", 5).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  if (!lesson || !c) return <GenericDrawer title="Conteúdo indisponível" body="Este conteúdo não existe mais ou não está liberado para você." {...p} />;

  const trail = d.trails.find((t) => trailLessonIds(t).includes(id));
  const pos = trail ? trailLessonIds(trail).indexOf(id) + 1 : 0;
  const settings = (d.company?.settings ?? {}) as { allow_download?: boolean };
  const spent = () => Math.round((Date.now() - startedAt.current) / 1000);

  const complete = () =>
    p.run(async () => {
      await d.setProgress(id, "completed", 100, c.type === "assignment" ? { last_position: answer, time_spent_seconds: spent() } : { time_spent_seconds: spent() });
      startedAt.current = Date.now();
    }, c.type === "assignment" ? "Atividade enviada e concluída." : "Conteúdo marcado como concluído.");

  const onTime = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!v.duration) return;
    const pct = Math.floor((v.currentTime / v.duration) * 100);
    for (const m of [25, 50, 75]) {
      if (pct >= m && !marks.current.has(m) && !done) {
        marks.current.add(m);
        d.setProgress(id, "in_progress", m, { time_spent_seconds: spent() }).catch(() => undefined);
        startedAt.current = Date.now();
      }
    }
  };

  const video = c.type === "video";
  const ext = c.external_url ? embedUrl(c.external_url) : null;

  return (
    <div>
      <span className="pill purple">
        {TYPE_LABEL[c.type].toUpperCase()}
        {c.duration_minutes ? ` • ${c.duration_minutes} MIN` : ""}
      </span>
      <p className="drawer-kicker">{trail ? `${trail.title} • Etapa ${pos}` : lesson.tag}</p>
      <h2>{c.title}</h2>
      {c.description && <p className="drawer-lead">{c.description}</p>}
      {c.status !== "published" && <p className="form-note">Pré-visualização: este conteúdo está como {STATUS_LABEL[c.status].toLowerCase()}.</p>}

      {video &&
        (ext ? (
          <div className="video-frame">
            <iframe src={ext} title={c.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        ) : fileUrl || c.external_url ? (
          <video className="video-frame" src={fileUrl ?? c.external_url ?? undefined} controls onTimeUpdate={onTime} onEnded={() => !done && complete()} />
        ) : (
          <div className="video-placeholder">
            <button disabled>▶</button>
            <span>Vídeo ainda não enviado</span>
          </div>
        ))}

      {c.type === "pdf" &&
        (fileUrl ? (
          <div className="video-frame doc-frame">
            <iframe src={fileUrl} title={c.title} />
          </div>
        ) : (
          <p className="form-note">O arquivo deste material ainda não foi enviado.</p>
        ))}

      {(c.type === "text" || c.type === "assignment") && c.body && (
        <div className="content-body-text">
          {c.body.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {c.type === "link" && c.external_url && (
        <a className="secondary full link-button" href={c.external_url} target="_blank" rel="noreferrer">
          Abrir conteúdo externo <Icon name="arrow" size={15} />
        </a>
      )}

      {c.type === "scorm" && (
        <p className="form-note">
          Conteúdo interativo (SCORM). {fileUrl ? "O pacote está guardado; o player SCORM entra na próxima etapa do projeto." : "Pacote ainda não enviado."}
        </p>
      )}

      {c.type === "quiz" && <QuizRunner contentId={c.id} passScore={c.pass_score} {...p} />}

      {c.type === "assignment" && (
        <label className="drawer-notes">
          Sua resposta
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Escreva aqui sua atividade…" disabled={done} />
        </label>
      )}

      {c.type !== "quiz" && (
        <div className="drawer-actions">
          {fileUrl && (settings.allow_download || c.type === "pdf") ? (
            <a className="secondary" href={fileUrl} target="_blank" rel="noreferrer">
              Baixar material
            </a>
          ) : (
            <button
              className="secondary"
              onClick={() =>
                p.run(async () => {
                  const on = await d.toggleFavorite(id);
                  p.notify(on ? "Conteúdo adicionado aos favoritos." : "Removido dos favoritos.");
                })
              }
            >
              {d.favorites.has(`c:${id}`) ? "♥ Favorito" : "♡ Favoritar"}
            </button>
          )}
          <button className="primary" disabled={done || (c.type === "assignment" && !answer.trim())} onClick={complete}>
            {done ? "✓ Conteúdo concluído" : c.type === "assignment" ? "Enviar atividade" : "Marcar como concluído"}
          </button>
        </div>
      )}
    </div>
  );
}

function QuizRunner({ contentId, passScore, ...p }: DrawerProps & { contentId: string; passScore: number }) {
  const d = useData();
  const [qs, setQs] = useState<QuizQuestion[] | null>(null);
  const [ans, setAns] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; questions: { question_id: string; correct: boolean }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const done = d.progress.get(contentId)?.status === "completed";

  useEffect(() => {
    d.loadQuiz(contentId).then(setQs).catch((e) => p.notify(String(e.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  if (!qs) return <p className="form-note">Carregando avaliação…</p>;
  if (!qs.length) return <p className="form-note">Esta avaliação ainda não tem perguntas.</p>;
  const correctOf = (qid: string) => result?.questions.find((x) => x.question_id === qid)?.correct;
  const toggle = (q: QuizQuestion, o: string) =>
    setAns((a) => {
      const cur = a[q.id] ?? [];
      return { ...a, [q.id]: q.allowMultiple ? (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]) : [o] };
    });
  return (
    <div className="quiz">
      <p className="form-note">
        Nota mínima: {passScore}%. {done ? "Você já foi aprovado nesta avaliação, mas pode refazer." : "A correção é feita pelo servidor."}
      </p>
      {qs.map((q, i) => (
        <fieldset key={q.id} className={`quiz-q ${correctOf(q.id) === true ? "ok" : correctOf(q.id) === false ? "bad" : ""}`}>
          <legend>
            {i + 1}. {q.prompt}
            {q.allowMultiple && !/marque/i.test(q.prompt) && <small> (marque todas as corretas)</small>}
          </legend>
          {q.options.map((o) => (
            <label key={o.id} className="check-label">
              <input
                type={q.allowMultiple ? "checkbox" : "radio"}
                name={q.id}
                checked={(ans[q.id] ?? []).includes(o.id)}
                onChange={() => toggle(q, o.id)}
                disabled={!!result}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      ))}
      {result ? (
        <div className={`quiz-result ${result.passed ? "ok" : "bad"}`}>
          <strong>{Math.round(result.score)}%</strong>
          <span>{result.passed ? "Aprovado! Avaliação concluída." : `Ainda não foi. É preciso ${passScore}%.`}</span>
          <button
            className="secondary"
            onClick={() => {
              setResult(null);
              setAns({});
            }}
          >
            Refazer
          </button>
        </div>
      ) : (
        <button
          className="primary full"
          disabled={busy || qs.some((q) => !(ans[q.id] ?? []).length)}
          onClick={async () => {
            setBusy(true);
            await p.run(async () => setResult(await d.submitQuiz(contentId, ans)));
            setBusy(false);
          }}
        >
          {busy ? "Corrigindo…" : "Enviar respostas"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trilha
// ---------------------------------------------------------------------------
function canEdit(d: ReturnType<typeof useData>, companyId: string | null) {
  const r = d.profile?.role;
  if (r === "platform_admin") return true;
  return r === "company_admin" && companyId !== null && companyId === d.profile?.company_id;
}

function TrailDrawer({ id, ...p }: DrawerProps & { id: string }) {
  const d = useData();
  const [tab, setTab] = useState("Conteúdos");
  const t = d.trailById(id);
  if (!t) return <GenericDrawer title="Trilha indisponível" body="Esta trilha não existe mais ou não está liberada para você." {...p} />;
  const lessons = trailLessonIds(t).map((cid) => d.lessonById(cid)).filter((l): l is NonNullable<typeof l> => !!l);
  const next = lessons.find((x) => x.progress < 100) ?? lessons[0];
  const totalMin = lessons.reduce((a, l) => a + (l.content.duration_minutes ?? 0), 0);
  const cert = d.certificates.find((c) => c.track_id === id);
  const editable = canEdit(d, t.track.company_id);
  const isAdmin = d.profile?.role === "company_admin" || d.profile?.role === "platform_admin";
  const lockedIndex = t.track.sequential ? lessons.findIndex((l) => l.progress < 100) : -1;

  return (
    <div className="trail-drawer">
      <p className="drawer-kicker">
        TRILHA DE DESENVOLVIMENTO{t.track.audience === "manager" ? " • GESTORES" : ""}
        {t.track.status !== "published" ? ` • ${t.status.toUpperCase()}` : ""}
      </p>
      <h2>{t.title}</h2>
      <p className="drawer-lead">{t.description || "Veja os conteúdos da trilha, acesse cada aula e acompanhe seu progresso até a conclusão."}</p>
      <div className="trail-drawer-progress">
        <div>
          <strong>{t.progress}%</strong>
          <small>concluído</small>
        </div>
        <Progress value={t.progress} />
        <span>
          {lessons.length} etapas • cerca de {hours(totalMin * 60)}
          {t.enrollment?.due_date ? ` • prazo ${fmtDate(t.enrollment.due_date)}` : ""}
        </span>
      </div>
      {t.enrollment ? (
        next && (
          <button className="primary full trail-continue" onClick={() => p.open("content", { id: next.id })}>
            <span className="play-dot">▶</span>
            {t.enrollment.status === "completed" ? `Rever: ${next.title}` : `${t.progress > 0 ? "Continuar" : "Começar"}: ${next.title}`}
          </button>
        )
      ) : t.track.status === "published" ? (
        <button className="primary full trail-continue" onClick={() => p.run(() => d.enrollTrack(id), "Inscrição feita. Bons estudos!")}>
          <span className="play-dot">+</span>Inscrever-me nesta trilha
        </button>
      ) : null}
      {isAdmin && (
        <div className="drawer-actions admin-row">
          <button className="secondary" onClick={() => p.open("recommend", { id: `track:${id}`, title: "Atribuir trilha" })}>
            Atribuir
          </button>
          {editable && (
            <button
              className="secondary"
              onClick={() =>
                p.run(
                  () => d.setTrackStatus(id, t.track.status === "published" ? "draft" : "published"),
                  t.track.status === "published" ? "Trilha voltou para rascunho." : "Trilha publicada.",
                )
              }
            >
              {t.track.status === "published" ? "Despublicar" : "Publicar"}
            </button>
          )}
        </div>
      )}
      <div className="trail-tabs">
        {["Conteúdos", "Sobre a trilha", "Certificado"].map((x) => (
          <button key={x} className={tab === x ? "selected" : ""} onClick={() => setTab(x)}>
            {x}
          </button>
        ))}
      </div>
      {tab === "Conteúdos" && (
        <>
          <h3>Conteúdos da trilha</h3>
          <div className="trail-module-list">
            {lessons.map((x, i) => {
              const locked = lockedIndex >= 0 && i > lockedIndex;
              return (
                <button
                  key={x.id}
                  onClick={() => (locked ? p.notify("Conclua a etapa anterior para liberar esta.") : p.open("content", { id: x.id }))}
                  className={locked ? "locked" : ""}
                >
                  <span className={x.progress === 100 ? "complete" : x.progress > 0 ? "current" : ""}>{x.progress === 100 ? "✓" : locked ? "🔒" : i + 1}</span>
                  <div>
                    <p>
                      ETAPA {i + 1} • {x.type.toUpperCase()} • {x.time}
                    </p>
                    <strong>{x.title}</strong>
                    {x.progress > 0 && <Progress value={x.progress} />}
                  </div>
                  <small>{x.progress === 100 ? "Concluído" : x.progress > 0 ? `${x.progress}%` : "Começar"}</small>
                  <Icon name="arrow" size={16} />
                </button>
              );
            })}
          </div>
        </>
      )}
      {tab === "Sobre a trilha" && (
        <div className="detail-list">
          <p>{t.description || "Sem descrição."}</p>
          <p>
            <strong>Ordem:</strong> {t.track.sequential ? "etapas em sequência" : "livre — comece por onde fizer mais sentido"}
          </p>
          <p>
            <strong>Público:</strong> {t.track.audience === "manager" ? "gestores" : "todos os colaboradores"}
          </p>
          <p>
            <strong>Origem:</strong> {t.track.company_id ? d.company?.name : "biblioteca da consultoria"}
          </p>
          <p>
            <strong>Participantes:</strong> {t.people}
          </p>
        </div>
      )}
      {tab === "Certificado" &&
        (cert ? (
          <div className="certificate-item">
            <span>
              <Icon name="award" />
            </span>
            <div>
              <strong>{cert.title}</strong>
              <small>Emitido em {fmtDate(cert.issued_at, { day: "numeric", month: "short", year: "numeric" })} • código {cert.code}</small>
            </div>
            <button onClick={() => printCertificate(cert, d.company) || p.notify("Permita pop-ups para abrir o certificado.")}>Baixar</button>
          </div>
        ) : (
          <p className="form-note">
            {t.track.certificate_enabled ? "O certificado é emitido automaticamente quando você conclui todas as etapas obrigatórias." : "Esta trilha não emite certificado."}
          </p>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pessoa (gestor e admin)
// ---------------------------------------------------------------------------
function PersonDrawer({ id, ...p }: DrawerProps & { id: string }) {
  const d = useData();
  const person = d.people.find((x) => x.id === id);
  const isAdmin = d.profile?.role === "company_admin" || d.profile?.role === "platform_admin";
  const [role, setRole] = useState<AppRole>(person?.appRole ?? "learner");
  const [dep, setDep] = useState(person?.profile.department_id ?? "");
  const [mgr, setMgr] = useState(person?.profile.manager_id ?? "");
  if (!person) return <GenericDrawer title="Pessoa não encontrada" {...p} />;
  const enr = d.enrollments.filter((e) => e.user_id === id);
  const time = d.teamProgress.filter((x) => x.user_id === id).reduce((a, x) => a + x.time_spent_seconds, 0);
  const active = enr.filter((e) => e.status !== "completed").length;
  return (
    <div>
      <div className="person-profile">
        <span style={{ background: person.color }}>{person.initials}</span>
        <div>
          <p className="drawer-kicker">DESENVOLVIMENTO INDIVIDUAL</p>
          <h2>{person.name}</h2>
          <p>
            {person.role} • {person.department}
          </p>
        </div>
      </div>
      <div className="person-stats">
        <div>
          <strong>{person.progress}%</strong>
          <small>progresso geral</small>
        </div>
        <div>
          <strong>{active}</strong>
          <small>em andamento</small>
        </div>
        <div>
          <strong>{hours(time)}</strong>
          <small>tempo total</small>
        </div>
      </div>
      <h3>Trilhas e conteúdos</h3>
      {enr.length ? (
        enr.map((e, i) => {
          const title = e.track_id ? d.trailById(e.track_id)?.title : d.lessonById(e.content_id ?? "")?.title;
          const late = e.status !== "completed" && e.due_date && e.due_date < new Date().toISOString().slice(0, 10);
          return (
            <button className="mini-trail" key={e.id} onClick={() => (e.track_id ? p.open("trail", { id: e.track_id }) : p.open("content", { id: e.content_id ?? "" }))}>
              <span>{e.status === "completed" ? "✓" : i + 1}</span>
              <div>
                <strong>{title ?? "Item"}</strong>
                <Progress value={Number(e.progress_pct)} compact />
              </div>
              <small>{late ? "Atrasado" : `${Math.round(Number(e.progress_pct))}%`}</small>
            </button>
          );
        })
      ) : (
        <p className="form-note">Nenhuma inscrição ainda.</p>
      )}
      <div className="drawer-actions">
        <button
          className="secondary"
          onClick={() => p.run(async () => p.notify((await d.sendReminder([id])) ? "Lembrete enviado." : "Sem permissão para lembrar esta pessoa."))}
        >
          Enviar lembrete
        </button>
        <button className="primary" onClick={() => p.open("recommend", { id: `person:${id}`, title: `Recomendar para ${person.name}` })}>
          Recomendar conteúdo
        </button>
      </div>
      {isAdmin && id !== d.profile?.id && (
        <form
          className="create-form"
          onSubmit={(e) => {
            e.preventDefault();
            p.run(() => d.updatePerson(id, { role, department_id: dep || null, manager_id: mgr || null }), "Acesso atualizado.");
          }}
        >
          <h3>Acesso</h3>
          <label>
            Perfil
            <select value={role} onChange={(e) => setRole(e.target.value as AppRole)} disabled={person.appRole === "platform_admin"}>
              {(["learner", "manager", "company_admin"] as AppRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
              {person.appRole === "platform_admin" && <option value="platform_admin">Consultor</option>}
            </select>
          </label>
          <label>
            Equipe
            <select value={dep} onChange={(e) => setDep(e.target.value)}>
              <option value="">Sem equipe</option>
              {d.departments.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gestor
            <select value={mgr} onChange={(e) => setMgr(e.target.value)}>
              <option value="">Sem gestor</option>
              {d.people
                .filter((x) => x.id !== id)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                p.run(
                  () => d.updatePerson(id, { status: person.userStatus === "inactive" ? "active" : "inactive" }),
                  person.userStatus === "inactive" ? "Acesso reativado." : "Acesso desativado.",
                )
              }
            >
              {person.userStatus === "inactive" ? "Reativar acesso" : "Desativar acesso"}
            </button>
            <button type="submit" className="primary">
              Salvar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Criar conteúdo / trilha
// ---------------------------------------------------------------------------
function CreateDrawer({ type, ...p }: DrawerProps & { type: "create-content" | "create-trail" }) {
  const d = useData();
  const isContent = type === "create-content";
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [ctype, setCtype] = useState<Enums<"content_type">>("video");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [cat, setCat] = useState("");
  const [dur, setDur] = useState("");
  const [audience, setAudience] = useState<Enums<"audience">>("all");
  const [file, setFile] = useState<File | null>(null);
  const [sequential, setSequential] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cats = [...d.categories.entries()];
  const available = d.lessons.filter((l) => l.content.status === "published");

  async function submit(status: Enums<"publish_status">) {
    if (!title.trim()) return p.notify("Dê um título.");
    setBusy(true);
    const ok = await p.run(
      () =>
        isContent
          ? d.createContent({
              title: title.trim(),
              type: ctype,
              description: desc,
              body,
              external_url: url,
              category_id: cat || null,
              duration_minutes: dur ? Number(dur) : null,
              audience,
              status,
              file,
            })
          : d.createTrack({ title: title.trim(), description: desc, audience, status, sequential, contentIds: picked }),
      status === "draft" ? "Rascunho salvo." : isContent ? "Conteúdo publicado." : "Trilha publicada.",
    );
    setBusy(false);
    if (ok) p.close();
  }

  const needsFile = ["pdf", "scorm"].includes(ctype) || (ctype === "video" && !url);
  return (
    <div>
      <p className="drawer-kicker">ADMINISTRAÇÃO</p>
      <h2>{isContent ? "Adicionar novo conteúdo" : "Criar uma nova trilha"}</h2>
      <p className="drawer-lead">
        {isContent ? "Publique uma aula independente ou reutilize-a em diferentes trilhas." : "Organize conteúdos em uma jornada com começo, meio e conclusão."}
      </p>
      <form
        className="create-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit("published");
        }}
      >
        <label>
          Título
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isContent ? "Ex.: Feedback sem ruído" : "Ex.: Formação de novas lideranças"} />
        </label>
        <label>
          {isContent ? "Descrição" : "Objetivo"}
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={isContent ? "Do que trata este conteúdo?" : "O que o participante deve desenvolver?"} />
        </label>
        {isContent ? (
          <>
            <label>
              Formato
              <select value={ctype} onChange={(e) => setCtype(e.target.value as Enums<"content_type">)}>
                <option value="video">Vídeo</option>
                <option value="text">Texto / artigo</option>
                <option value="pdf">PDF ou material</option>
                <option value="link">Link externo</option>
                <option value="scorm">Pacote SCORM</option>
                <option value="assignment">Atividade (resposta escrita)</option>
              </select>
            </label>
            {(ctype === "text" || ctype === "assignment") && (
              <label>
                {ctype === "text" ? "Texto" : "Enunciado"}
                <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Separe parágrafos com uma linha em branco." />
              </label>
            )}
            {(ctype === "video" || ctype === "link") && (
              <label>
                {ctype === "video" ? "Link do vídeo (YouTube, Vimeo ou MP4) — ou envie o arquivo abaixo" : "Endereço"}
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
              </label>
            )}
            {needsFile && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept={ctype === "pdf" ? "application/pdf" : ctype === "scorm" ? ".zip" : "video/*"}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button type="button" className="upload-zone" onClick={() => fileRef.current?.click()}>
                  <Icon name="plus" />
                  <strong>{file ? file.name : "Selecione um arquivo"}</strong>
                  <small>{file ? `${(file.size / 1048576).toFixed(1)} MB` : "Até 50 MB por arquivo no plano atual"}</small>
                </button>
              </>
            )}
            <div className="form-grid">
              <label>
                Tema
                <select value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Geral</option>
                  {cats.map(([id, n]) => (
                    <option key={id} value={id}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Duração (min)
                <input type="number" min={1} value={dur} onChange={(e) => setDur(e.target.value)} />
              </label>
            </div>
          </>
        ) : (
          <>
            <label className="check-label">
              <input type="checkbox" checked={sequential} onChange={(e) => setSequential(e.target.checked)} />
              Exigir que as etapas sejam feitas em ordem
            </label>
            <div className="picker">
              <strong>Conteúdos da trilha ({picked.length})</strong>
              <small>Na ordem em que você marcar.</small>
              {available.map((l) => (
                <label key={l.id} className="check-label">
                  <input
                    type="checkbox"
                    checked={picked.includes(l.id)}
                    onChange={() => setPicked((v) => (v.includes(l.id) ? v.filter((x) => x !== l.id) : [...v, l.id]))}
                  />
                  {picked.includes(l.id) ? `${picked.indexOf(l.id) + 1}. ` : ""}
                  {l.title} <small>• {l.type}</small>
                </label>
              ))}
            </div>
          </>
        )}
        <label>
          Público
          <select value={audience} onChange={(e) => setAudience(e.target.value as Enums<"audience">)}>
            <option value="all">Todos os colaboradores</option>
            <option value="manager">Somente gestores</option>
          </select>
        </label>
        <div className="form-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => submit("draft")}>
            Salvar rascunho
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Salvando…" : isContent ? "Publicar conteúdo" : "Publicar trilha"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notificações, perfil, suporte
// ---------------------------------------------------------------------------
function NotificationsDrawer(p: DrawerProps) {
  const d = useData();
  const unread = d.notifications.filter((n) => !n.read_at).length;
  const go = (link: string | null) => {
    if (!link) return;
    const [, kind, id] = link.split("/");
    if (kind === "trilhas" && id) p.open("trail", { id });
    else if (kind === "conteudos" && id) p.open("content", { id });
    else if (kind === "certificados") p.open("certificate");
    else if (kind === "minha-jornada") {
      p.close();
      p.navigate("Minha jornada");
    }
  };
  return (
    <div>
      <p className="drawer-kicker">CENTRAL DE ATUALIZAÇÕES</p>
      <h2>Notificações</h2>
      <p className="drawer-lead">{unread ? `Você tem ${unread} ${unread === 1 ? "novidade" : "novidades"}.` : "Tudo lido por aqui."}</p>
      {d.notifications.length ? (
        d.notifications.map((n) => (
          <button className={`notification-line ${n.read_at ? "read" : ""}`} key={n.id} onClick={() => go(n.link)}>
            <span />
            <div>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>{fmtDate(n.created_at, { day: "numeric", month: "short" })}</small>
            </div>
          </button>
        ))
      ) : (
        <p className="form-note">Nenhuma notificação ainda.</p>
      )}
      {unread > 0 && (
        <button className="secondary full" onClick={() => p.run(d.markAllRead, "Todas marcadas como lidas.")}>
          Marcar todas como lidas
        </button>
      )}
    </div>
  );
}

function ProfileDrawer(p: DrawerProps) {
  const d = useData();
  const pr = d.profile!;
  const [name, setName] = useState(pr.full_name);
  const [job, setJob] = useState(pr.job_title ?? "");
  const [unit, setUnit] = useState(pr.unit ?? "");
  return (
    <div>
      <p className="drawer-kicker">MINHA CONTA</p>
      <h2>Perfil e preferências</h2>
      <div className="profile-large">
        <span>{name.split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase()}</span>
        <div>
          <strong>{pr.full_name}</strong>
          <small>{pr.email}</small>
        </div>
        <button onClick={() => p.run(d.signOut)}>Sair</button>
      </div>
      <form
        className="create-form"
        onSubmit={(e) => {
          e.preventDefault();
          p.run(() => d.updateMyProfile({ full_name: name.trim(), job_title: job || null, unit: unit || null }), "Perfil atualizado.");
        }}
      >
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Cargo
          <input value={job} onChange={(e) => setJob(e.target.value)} />
        </label>
        <label>
          Unidade
          <input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </label>
        <p className="form-note">
          Perfil de acesso: {ROLE_LABEL[pr.role]} • {d.company?.name}
          {pr.privacy_consented_at ? ` • política de privacidade aceita em ${fmtDate(pr.privacy_consented_at, { day: "numeric", month: "short", year: "numeric" })}` : ""}
        </p>
        <button className="primary full" type="submit">
          Salvar perfil
        </button>
      </form>
    </div>
  );
}

const FAQ: [string, string][] = [
  ["Como criar uma trilha?", "Em Administrador › Trilhas, clique em “Criar trilha”, marque os conteúdos na ordem desejada e publique. Depois, atribua a pessoas, grupos, equipes ou à empresa toda."],
  ["Como convidar usuários?", "Em Usuários, clique em “Novo usuário” ou importe uma planilha. A pessoa recebe o acesso ao se cadastrar com o mesmo e-mail."],
  ["Como emitir certificados?", "O certificado sai sozinho quando a pessoa conclui todas as etapas obrigatórias da trilha. Ele tem um código que qualquer um pode conferir."],
  ["Como acompanhar minha equipe?", "Na área do gestor, veja Pessoas e Acompanhamento. Quem está atrasado aparece em Pontos de atenção, com botão para enviar lembrete."],
];

function SupportDrawer(p: DrawerProps) {
  const d = useData();
  const [subject, setSubject] = useState("Dúvida");
  const [msg, setMsg] = useState("");
  return (
    <div>
      <p className="drawer-kicker">SUPORTE</p>
      <h2>Como podemos ajudar?</h2>
      <p className="drawer-lead">Consulte respostas rápidas ou envie uma solicitação para a equipe da consultoria.</p>
      {FAQ.map(([q, a]) => (
        <button className="help-line" key={q} onClick={() => p.open("generic", { title: q, body: a })}>
          {q}
          <Icon name="arrow" />
        </button>
      ))}
      <form
        className="create-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await p.run(() => d.sendSupport(subject, msg), "Solicitação enviada ao suporte.")) p.close();
        }}
      >
        <label>
          Assunto
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option>Dúvida</option>
            <option>Problema de acesso</option>
            <option>Conteúdo com erro</option>
            <option>Sugestão</option>
          </select>
        </label>
        <label>
          Mensagem
          <textarea required value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Conte o que você precisa..." />
        </label>
        <button className="primary full" type="submit">
          Enviar solicitação
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------
function CompanyDrawer({ id, title, ...p }: DrawerProps & { id?: string; title?: string }) {
  const d = useData();
  const c = id ? d.companies.find((x) => x.id === id) ?? (d.company?.id === id ? d.company : undefined) : undefined;
  const isNew = !c;
  const isPlatform = d.profile?.role === "platform_admin";
  const [name, setName] = useState(c?.name ?? "");
  const [slug, setSlug] = useState(c?.slug ?? "");
  const [color, setColor] = useState(c?.primary_color ?? "#6658D5");
  const [limit, setLimit] = useState(String(c?.active_user_limit ?? ""));
  const [domain, setDomain] = useState(c?.custom_domain ?? "");
  if (isNew && (!isPlatform || title !== "Adicionar empresa"))
    return <GenericDrawer title="Ambiente" body="Só a consultoria pode criar novos ambientes de cliente." {...p} />;
  return (
    <div>
      <p className="drawer-kicker">AMBIENTE DO CLIENTE</p>
      <h2>{isNew ? "Adicionar empresa" : c!.name}</h2>
      <p className="drawer-lead">{isNew ? "Crie um ambiente independente para um novo cliente." : "Identidade, endereço e limites deste ambiente."}</p>
      <form
        className="create-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await p.run(
            () =>
              d.saveCompany(c?.id ?? null, {
                name,
                slug: slug || name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                primary_color: color,
                ...(isPlatform ? { active_user_limit: limit ? Number(limit) : null, custom_domain: domain || null } : {}),
              }),
            isNew ? "Nova empresa criada." : "Ambiente atualizado.",
          );
          if (ok) p.close();
        }}
      >
        <label>
          Nome da empresa
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" required />
        </label>
        <label>
          Identificador do ambiente
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="gerado a partir do nome" pattern="[a-z0-9-]*" />
        </label>
        <label>
          Cor principal
          <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} />
        </label>
        {isPlatform && (
          <>
            <label>
              Limite de usuários ativos por mês
              <input type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="sem limite" />
            </label>
            <label>
              Domínio próprio
              <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="treinamento.cliente.com.br" />
            </label>
          </>
        )}
        <button className="primary full" type="submit">
          {isNew ? "Criar empresa" : "Salvar ambiente"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ações sobre conteúdo e trilha
// ---------------------------------------------------------------------------
function ActionsDrawer({ id, title, ...p }: DrawerProps & { id: string; title: string }) {
  const d = useData();
  const [confirm, setConfirm] = useState(false);
  const [kind, rid] = id.split(":");
  const row = kind === "track" ? d.trailById(rid)?.track : d.lessonById(rid)?.content;
  if (!row) return <GenericDrawer title={title} body="Nenhuma ação disponível para este item." {...p} />;
  const editable = canEdit(d, row.company_id);
  const status = row.status;
  const setStatus = (s: Enums<"publish_status">) => (kind === "track" ? d.setTrackStatus(rid, s) : d.setContentStatus(rid, s));
  const act = (fn: () => Promise<unknown>, ok: string) =>
    p.run(fn, ok).then((r) => {
      if (r) p.close();
    });
  return (
    <div>
      <p className="drawer-kicker">AÇÕES</p>
      <h2>{title}</h2>
      <p className="drawer-lead">
        {editable ? "Escolha o que deseja fazer com este item." : "Item da biblioteca da consultoria: você pode usar e atribuir, mas não editar."}
      </p>
      <div className="action-list">
        <button onClick={() => (kind === "track" ? p.open("trail", { id: rid }) : p.open("content", { id: rid }))}>
          <Icon name="play" />
          <span>Abrir</span>
          <Icon name="arrow" />
        </button>
        <button onClick={() => p.open("recommend", { id: `${kind}:${rid}`, title: "Atribuir" })}>
          <Icon name="users" />
          <span>Atribuir a pessoas ou equipes</span>
          <Icon name="arrow" />
        </button>
        {editable && status !== "published" && (
          <button onClick={() => act(() => setStatus("published"), "Publicado.")}>
            <Icon name="check" />
            <span>Publicar</span>
            <Icon name="arrow" />
          </button>
        )}
        {editable && status === "published" && (
          <button onClick={() => act(() => setStatus("draft"), "Voltou para rascunho.")}>
            <Icon name="settings" />
            <span>Voltar para rascunho</span>
            <Icon name="arrow" />
          </button>
        )}
        {editable && status !== "archived" && (
          <button onClick={() => act(() => setStatus("archived"), "Arquivado.")}>
            <Icon name="book" />
            <span>Arquivar</span>
            <Icon name="arrow" />
          </button>
        )}
        {editable &&
          (confirm ? (
            <button
              className="danger"
              onClick={() => act(() => (kind === "track" ? d.deleteTrack(rid) : d.deleteContent(rid)), "Excluído.")}
            >
              <Icon name="close" />
              <span>Confirmar exclusão definitiva</span>
              <Icon name="arrow" />
            </button>
          ) : (
            <button className="danger" onClick={() => setConfirm(true)}>
              <Icon name="close" />
              <span>Excluir</span>
              <Icon name="arrow" />
            </button>
          ))}
      </div>
      {confirm && <p className="form-note">A exclusão apaga o histórico de progresso ligado a este item. Prefira arquivar se tiver dúvida.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Convite
// ---------------------------------------------------------------------------
function InviteDrawer(p: DrawerProps) {
  const d = useData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("learner");
  const [dep, setDep] = useState("");
  const [mgr, setMgr] = useState("");
  const [job, setJob] = useState("");
  return (
    <div>
      <p className="drawer-kicker">GESTÃO DE ACESSOS</p>
      <h2>Convidar usuário</h2>
      <p className="drawer-lead">A pessoa entra na empresa ao criar a conta com este e-mail. Trilhas atribuídas à empresa, ao grupo ou à equipe chegam sozinhas.</p>
      <form
        className="create-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await p.run(
            () => d.invite({ full_name: name, email, role, department_id: dep || null, manager_id: mgr || null, job_title: job || null }),
            `Convite criado para ${email}.`,
          );
          if (ok) p.close();
        }}
      >
        <label>
          Nome completo
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da pessoa" />
        </label>
        <label>
          E-mail
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com" />
        </label>
        <label>
          Cargo
          <input value={job} onChange={(e) => setJob(e.target.value)} />
        </label>
        <label>
          Perfil
          <select value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
            <option value="learner">Colaborador</option>
            <option value="manager">Gestor</option>
            <option value="company_admin">Administrador</option>
          </select>
        </label>
        <label>
          Equipe
          <select value={dep} onChange={(e) => setDep(e.target.value)}>
            <option value="">Sem equipe</option>
            {d.departments.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Gestor direto
          <select value={mgr} onChange={(e) => setMgr(e.target.value)}>
            <option value="">Sem gestor</option>
            {d.people
              .filter((x) => x.appRole !== "learner")
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            p.close();
            p.navigate("Usuários");
          }}
        >
          Importar vários por planilha
        </button>
        <button className="primary full" type="submit">
          Criar acesso
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nova avaliação (quiz)
// ---------------------------------------------------------------------------
type DraftQ = { prompt: string; options: { label: string; correct: boolean }[] };
const blankQ = (): DraftQ => ({ prompt: "", options: [{ label: "", correct: true }, { label: "", correct: false }] });

function AssessmentDrawer(p: DrawerProps) {
  const d = useData();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [pass, setPass] = useState(70);
  const [qs, setQs] = useState<DraftQ[]>([blankQ()]);
  const [busy, setBusy] = useState(false);
  const upd = (i: number, q: DraftQ) => setQs((v) => v.map((x, n) => (n === i ? q : x)));
  const valid =
    title.trim() &&
    qs.length &&
    qs.every((q) => q.prompt.trim() && q.options.filter((o) => o.label.trim()).length >= 2 && q.options.some((o) => o.correct && o.label.trim()));
  async function save(status: Enums<"publish_status">) {
    if (!valid) return p.notify("Preencha título, perguntas, ao menos 2 alternativas e marque a correta.");
    setBusy(true);
    const ok = await p.run(
      () =>
        d.createQuiz({
          title: title.trim(),
          description: desc,
          pass_score: pass,
          status,
          questions: qs.map((q) => ({ prompt: q.prompt.trim(), options: q.options.filter((o) => o.label.trim()) })),
        }),
      status === "draft" ? "Rascunho salvo." : "Avaliação publicada.",
    );
    setBusy(false);
    if (ok) p.close();
  }
  return (
    <div>
      <p className="drawer-kicker">AVALIAÇÕES</p>
      <h2>Nova avaliação</h2>
      <p className="drawer-lead">O gabarito fica guardado no servidor: quem faz a prova nunca vê as respostas certas.</p>
      <form
        className="create-form"
        onSubmit={(e) => {
          e.preventDefault();
          save("published");
        }}
      >
        <label>
          Título
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da avaliação" />
        </label>
        <label>
          Descrição
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
        </label>
        <label>
          Nota mínima (%)
          <input type="number" min={0} max={100} value={pass} onChange={(e) => setPass(Number(e.target.value))} />
        </label>
        {qs.map((q, i) => (
          <fieldset className="quiz-q" key={i}>
            <legend>Questão {i + 1}</legend>
            <input value={q.prompt} onChange={(e) => upd(i, { ...q, prompt: e.target.value })} placeholder="Enunciado" />
            {q.options.map((o, j) => (
              <div className="option-row" key={j}>
                <input
                  type="checkbox"
                  title="Alternativa correta"
                  checked={o.correct}
                  onChange={(e) => upd(i, { ...q, options: q.options.map((x, n) => (n === j ? { ...x, correct: e.target.checked } : x)) })}
                />
                <input value={o.label} onChange={(e) => upd(i, { ...q, options: q.options.map((x, n) => (n === j ? { ...x, label: e.target.value } : x)) })} placeholder={`Alternativa ${j + 1}`} />
              </div>
            ))}
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => upd(i, { ...q, options: [...q.options, { label: "", correct: false }] })}>
                + Alternativa
              </button>
              {qs.length > 1 && (
                <button type="button" className="secondary" onClick={() => setQs((v) => v.filter((_, n) => n !== i))}>
                  Remover questão
                </button>
              )}
            </div>
          </fieldset>
        ))}
        <button type="button" className="module-preview" onClick={() => setQs((v) => [...v, blankQ()])}>
          <span>+</span>
          <div>
            <strong>Adicionar questão</strong>
            <small>Marque uma ou mais alternativas corretas</small>
          </div>
          <Icon name="arrow" />
        </button>
        <div className="form-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => save("draft")}>
            Salvar rascunho
          </button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Salvando…" : "Publicar avaliação"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Certificados
// ---------------------------------------------------------------------------
function CertificateDrawer(p: DrawerProps) {
  const d = useData();
  const pending = d.trails.filter((t) => t.enrollment && t.enrollment.status !== "completed" && t.track.certificate_enabled);
  return (
    <div>
      <p className="drawer-kicker">CONQUISTAS</p>
      <h2>Certificados</h2>
      <p className="drawer-lead">Emitidos automaticamente ao concluir uma trilha. Cada um tem um código de verificação.</p>
      {d.certificates.map((c) => (
        <div className="certificate-item" key={c.id}>
          <span>
            <Icon name="award" />
          </span>
          <div>
            <strong>{c.title}</strong>
            <small>
              Emitido em {fmtDate(c.issued_at, { day: "numeric", month: "short", year: "numeric" })} • {c.code}
            </small>
          </div>
          <button onClick={() => printCertificate(c, d.company) || p.notify("Permita pop-ups para abrir o certificado.")}>Baixar</button>
        </div>
      ))}
      {pending.map((t) => (
        <div className="certificate-item" key={t.id}>
          <span>
            <Icon name="award" />
          </span>
          <div>
            <strong>{t.title}</strong>
            <small>Em andamento • {t.progress}%</small>
          </div>
          <button onClick={() => p.open("trail", { id: t.id })}>Ver progresso</button>
        </div>
      ))}
      {!d.certificates.length && !pending.length && <p className="form-note">Inscreva-se em uma trilha para conquistar seu primeiro certificado.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------
function printTable(title: string, rows: (string | number)[][]) {
  const esc = (s: string | number) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;color:#1d2428}h1{font-size:22px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid #e6e5df;padding:6px 8px;text-align:left}th{background:#f5f4f0}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Salvar em PDF / imprimir</button><h1>${esc(title)}</h1><p>Gerado em ${new Date().toLocaleString("pt-BR")}</p><table><thead><tr>${rows[0].map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
      .slice(1)
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></body></html>`,
  );
  w.document.close();
  return true;
}

function ReportDrawer({ id, title, ...p }: DrawerProps & { id: string; title: string }) {
  const d = useData();
  const rowsFor = useReportRows();
  const isTeam = title.toLowerCase().includes("equipe") || title.toLowerCase().includes("acompanhamento");
  const key = isTeam ? "equipe" : REPORTS.some((r) => r[0] === id) ? id : "executivo";
  const rows = rowsFor(key);
  const base = key === "equipe" ? d.report.filter((r) => d.team.some((t) => t.id === r.user_id)) : d.report;
  const done = base.filter((r) => r.status === "completed").length;
  const late = base.filter((r) => r.situation === "Atrasado").length;
  const people = new Set(base.map((r) => r.user_id)).size;
  return (
    <div>
      <p className="drawer-kicker">RELATÓRIO</p>
      <h2>{title}</h2>
      <p className="drawer-lead">Dados atualizados agora. Exporte em planilha ou gere um PDF para apresentar.</p>
      <div className="person-stats">
        <div>
          <strong>{base.length ? Math.round((done * 100) / base.length) : 0}%</strong>
          <small>conclusão</small>
        </div>
        <div>
          <strong>{people}</strong>
          <small>pessoas</small>
        </div>
        <div>
          <strong>{late}</strong>
          <small>atrasos</small>
        </div>
      </div>
      <div className="report-preview">
        <table>
          <thead>
            <tr>
              {rows[0].slice(0, 4).map((h) => (
                <th key={String(h)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1, 9).map((r, i) => (
              <tr key={i}>
                {r.slice(0, 4).map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 9 && <small>+ {rows.length - 9} linhas na exportação</small>}
        {rows.length === 1 && <small>Sem dados ainda.</small>}
      </div>
      <div className="drawer-actions">
        <button
          className="secondary"
          onClick={() => {
            downloadCsv(`${key}.csv`, rows);
            p.notify("Planilha exportada.");
          }}
        >
          Exportar planilha
        </button>
        <button className="primary" onClick={() => printTable(title, rows) || p.notify("Permita pop-ups para gerar o PDF.")}>
          Gerar PDF
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recomendar / atribuir
// ---------------------------------------------------------------------------
function RecommendDrawer({ target, title, ...p }: DrawerProps & { target?: string; title?: string }) {
  const d = useData();
  const isAdmin = d.profile?.role === "company_admin" || d.profile?.role === "platform_admin";
  const [preKind, preId] = (target ?? "").split(":");
  const items = useMemo(
    () => [
      ...d.trails.filter((t) => t.track.status === "published").map((t) => ({ key: `track:${t.id}`, label: `Trilha • ${t.title}` })),
      ...d.lessons.filter((l) => l.content.status === "published").map((l) => ({ key: `content:${l.id}`, label: `${l.type} • ${l.title}` })),
    ],
    [d.trails, d.lessons],
  );
  const [item, setItem] = useState(preKind === "track" || preKind === "content" ? target! : items[0]?.key ?? "");
  const assigning = (title ?? "").startsWith("Atribuir");
  const [aud, setAud] = useState(
    preKind === "person" ? "person" : assigning && isAdmin ? "company" : d.team.length ? "team" : isAdmin ? "company" : "person",
  );
  const [targetId, setTargetId] = useState(preKind === "person" ? preId : "");
  const [mandatory, setMandatory] = useState(assigning);
  const [msg, setMsg] = useState("Este conteúdo pode ajudar no seu próximo passo de desenvolvimento.");
  const [due, setDue] = useState("");

  const peopleOptions = isAdmin ? d.people : d.team;
  const resolve = (): { type: Enums<"assignment_target">; ids: (string | null)[] } => {
    if (aud === "company") return { type: "company", ids: [null] };
    if (aud === "group" || aud === "department") return { type: aud, ids: [targetId] };
    if (aud === "person") return { type: "user", ids: [targetId] };
    if (aud === "low") return { type: "user", ids: d.team.filter((x) => x.progress < 50).map((x) => x.id) };
    return { type: "user", ids: d.team.map((x) => x.id) }; // team
  };

  return (
    <div>
      <p className="drawer-kicker">{mandatory ? "ATRIBUIÇÃO" : "RECOMENDAÇÃO"}</p>
      <h2>{title ?? "Recomendar desenvolvimento"}</h2>
      <p className="drawer-lead">Escolha o conteúdo ou trilha e para quem. A pessoa é inscrita na hora e recebe uma notificação.</p>
      <form
        className="create-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const { type, ids } = resolve();
          if (!ids.length || ids.some((x) => x === "") ) return p.notify("Escolha quem vai receber.");
          const [k, iid] = item.split(":");
          const ok = await p.run(async () => {
            const n = await d.assign({
              target_type: type,
              target_ids: ids,
              content_id: k === "content" ? iid : null,
              track_id: k === "track" ? iid : null,
              mandatory,
              due_date: due || null,
              message: msg || null,
            });
            p.notify(type === "user" ? `Enviado para ${n} pessoa${n === 1 ? "" : "s"}.` : "Atribuição feita: o grupo inteiro foi inscrito.");
          });
          if (ok) p.close();
        }}
      >
        <label>
          Conteúdo ou trilha
          <select value={item} onChange={(e) => setItem(e.target.value)}>
            {items.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Para quem
          <select
            value={aud}
            onChange={(e) => {
              setAud(e.target.value);
              setTargetId("");
            }}
          >
            {isAdmin && <option value="company">Empresa toda</option>}
            {isAdmin && <option value="department">Uma equipe</option>}
            {isAdmin && <option value="group">Um grupo</option>}
            {d.team.length > 0 && <option value="team">Minha equipe direta ({d.team.length})</option>}
            {d.team.length > 0 && <option value="low">Minha equipe com progresso abaixo de 50%</option>}
            <option value="person">Uma pessoa</option>
          </select>
        </label>
        {aud === "department" && (
          <label>
            Equipe
            <select required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Escolha…</option>
              {d.departments.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {aud === "group" && (
          <label>
            Grupo
            <select required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Escolha…</option>
              {d.groups.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {aud === "person" && (
          <label>
            Pessoa
            <select required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Escolha…</option>
              {peopleOptions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="check-label">
          <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
          Obrigatório (entra no relatório de conformidade)
        </label>
        <label>
          Mensagem
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} />
        </label>
        <label>
          Prazo
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
        </label>
        <button className="primary full" type="submit">
          {mandatory ? "Atribuir" : "Enviar recomendação"}
        </button>
      </form>
    </div>
  );
}

function GenericDrawer({ title, body, ...p }: DrawerProps & { title: string; body?: string }) {
  return (
    <div>
      <p className="drawer-kicker">DETALHES</p>
      <h2>{title}</h2>
      {body && <p className="drawer-lead">{body}</p>}
      <div className="drawer-actions">
        <button className="primary" onClick={p.close}>
          Entendi
        </button>
      </div>
    </div>
  );
}

export type { DrawerKind };
