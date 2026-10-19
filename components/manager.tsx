"use client";

import { useMemo, useState } from "react";
import { useData, downloadCsv, fmtDate, hours, type Person } from "@/lib/data";
import { ContentLibrary, trailLessonIds, useMyTrails } from "./learner";
import { Empty, Heading, Icon, MetricGrid, Progress, SectionTitle, type PageProps } from "./ui";

/** Métricas e listas da equipe direta do gestor. */
function useTeam() {
  const d = useData();
  return useMemo(() => {
    const team = d.team;
    const ids = new Set(team.map((p) => p.id));
    const enr = d.enrollments.filter((e) => ids.has(e.user_id));
    const prog = d.teamProgress.filter((p) => ids.has(p.user_id));
    const started = team.filter((p) => enr.some((e) => e.user_id === p.id && Number(e.progress_pct) > 0)).length;
    const month = new Date().toISOString().slice(0, 7);
    const completedAll = prog.filter((p) => p.status === "completed");
    const completedMonth = completedAll.filter((p) => p.completed_at?.startsWith(month)).length;
    const time = prog.reduce((a, p) => a + p.time_spent_seconds, 0);
    const late = team.filter((p) => p.status === "Atrasado");
    const newThisMonth = team.filter((p) => p.profile.created_at.startsWith(month)).length;
    return { team, enr, prog, started, completedAll, completedMonth, time, late, newThisMonth };
  }, [d]);
}

function teamMetrics(t: ReturnType<typeof useTeam>): [string, string, string, string, string][] {
  const adesao = t.team.length ? Math.round((t.started * 100) / t.team.length) : 0;
  return [
    ["users", "purple", "COLABORADORES", String(t.team.length), t.newThisMonth ? `+${t.newThisMonth} este mês` : "na sua equipe"],
    ["check", "green", "ADESÃO ÀS TRILHAS", `${adesao}%`, `${t.started} de ${t.team.length} já começaram`],
    ["clock", "orange", "TEMPO MÉDIO", t.team.length ? hours(t.time / t.team.length) : "—", "por colaborador"],
    ["award", "blue", "CONCLUSÕES", String(t.completedAll.length), `+${t.completedMonth} este mês`],
  ];
}

export function PeoplePanel(p: PageProps & { people?: Person[] }) {
  const d = useData();
  const list = p.people ?? d.team;
  return (
    <section className="panel team-panel">
      <SectionTitle
        title="Progresso da equipe"
        subtitle="Trilhas obrigatórias e recomendadas"
        action="Ver relatório"
        onClick={() => p.open("report", { title: "Relatório da equipe" })}
      />
      <div className="table-head">
        <span>COLABORADOR</span>
        <span>PROGRESSO</span>
        <span>STATUS</span>
        <span />
      </div>
      {list.length ? (
        list.slice(0, 6).map((x) => (
          <button className="person-row" key={x.id} onClick={() => p.open("person", { id: x.id })}>
            <span className="person">
              <i style={{ background: x.color }}>{x.initials}</i>
              <span>
                <strong>{x.name}</strong>
                <small>{x.role}</small>
              </span>
            </span>
            <span className="person-progress">
              <Progress value={x.progress} compact />
              <small>{x.progress}%</small>
            </span>
            <span className={`status ${x.status.toLowerCase()}`}>{x.status}</span>
            <Icon name="arrow" size={16} />
          </button>
        ))
      ) : (
        <p className="muted-note">Ninguém da sua equipe direta ainda. O administrador define o gestor de cada pessoa.</p>
      )}
    </section>
  );
}

export function ManagerHome(p: PageProps) {
  const d = useData();
  const t = useTeam();
  const mine = useMyTrails("manager")[0] ?? d.trails.find((x) => x.track.audience === "manager" && x.track.status === "published");
  const nextLesson = mine
    ? trailLessonIds(mine).map((id) => d.lessonById(id)).find((l) => l && l.progress < 100)
    : undefined;

  // tema mais concluído pela equipe
  const topTopic = useMemo(() => {
    const count = new Map<string, number>();
    for (const pr of t.completedAll) {
      const tag = d.lessonById(pr.content_id)?.tag;
      if (tag) count.set(tag, (count.get(tag) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [t, d]);

  const suggestion = useSuggestions()[0];

  return (
    <>
      <Heading eyebrow="VISÃO DA EQUIPE" title="Desenvolvimento do time" subtitle="Acompanhe a evolução e descubra onde sua liderança pode ajudar.">
        <button className="primary" onClick={() => p.open("recommend")}>
          <Icon name="spark" />
          Recomendar conteúdo
        </button>
      </Heading>
      <MetricGrid items={teamMetrics(t)} />
      {mine && (
        <section className="manager-callout panel">
          <span className="metric-icon purple">
            <Icon name="route" />
          </span>
          <div>
            <p>SEU DESENVOLVIMENTO COMO GESTOR</p>
            <h2>{mine.title}</h2>
            <div>
              <Progress value={mine.progress} />
              <small>
                {mine.progress}% concluído
                {nextLesson ? ` • próxima aula: ${nextLesson.title}` : ""}
              </small>
            </div>
          </div>
          <button className="primary" onClick={() => p.navigate("Minha trilha")}>
            Acessar minha trilha
          </button>
          <button className="secondary" onClick={() => p.navigate("Conteúdos para gestores")}>
            Ver conteúdos
          </button>
        </section>
      )}
      <div className="manager-grid">
        <PeoplePanel {...p} />
        <aside className="panel attention-panel">
          <SectionTitle title="Pontos de atenção" subtitle="Onde agir esta semana" action="Ver todos" onClick={() => p.navigate("Acompanhamento")} />
          {t.late.length > 0 ? (
            <div className="attention-item warn">
              <span>!</span>
              <div>
                <strong>
                  {t.late.length} {t.late.length === 1 ? "pessoa está atrasada" : "pessoas estão atrasadas"}
                </strong>
                <p>{t.late.map((x) => x.name.split(" ")[0]).join(", ")} com prazo vencido.</p>
                <button
                  onClick={() =>
                    p.run(async () => {
                      const n = await d.sendReminder(t.late.map((x) => x.id));
                      p.notify(`Lembrete enviado para ${n} pessoa${n === 1 ? "" : "s"}.`);
                    })
                  }
                >
                  Enviar lembrete
                </button>
              </div>
            </div>
          ) : (
            <div className="attention-item good">
              <span>✓</span>
              <div>
                <strong>Nenhum atraso</strong>
                <p>Toda a equipe está dentro dos prazos.</p>
              </div>
            </div>
          )}
          {topTopic && (
            <div className="attention-item good">
              <span>↑</span>
              <div>
                <strong>{topTopic} em alta</strong>
                <p>Foi o tema mais concluído pela equipe.</p>
                <button onClick={() => p.navigate("Acompanhamento")}>Ver detalhes</button>
              </div>
            </div>
          )}
          {suggestion && (
            <div className="insight">
              <Icon name="spark" />
              <p>
                <strong>Sugestão para você</strong>Recomende “{suggestion.lesson.title}” para {suggestion.people.length}{" "}
                {suggestion.people.length === 1 ? "pessoa" : "pessoas"} que ainda não fizeram.
              </p>
              <button onClick={() => applySuggestion(p, d, suggestion)}>Aplicar sugestão</button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

type Suggestion = { reason: string; lesson: NonNullable<ReturnType<ReturnType<typeof useData>["lessonById"]>>; people: Person[] };

function useSuggestions(): Suggestion[] {
  const d = useData();
  const t = useTeam();
  return useMemo(() => {
    if (!t.team.length) return [];
    const doneBy = (contentId: string) =>
      new Set(t.prog.filter((x) => x.content_id === contentId && x.status === "completed").map((x) => x.user_id));
    const candidates = d.lessons.filter((l) => l.content.status === "published" && l.content.audience !== "manager" && l.content.type !== "quiz");
    const scored = candidates
      .map((l) => {
        const done = doneBy(l.id);
        return { lesson: l, people: t.team.filter((p) => !done.has(p.id)), done: done.size };
      })
      .filter((x) => x.people.length && x.done > 0)
      .sort((a, b) => b.done - a.done);
    const low = t.team.filter((p) => p.progress < 50);
    const out: Suggestion[] = [];
    if (scored[0]) {
      const forLow = scored[0].people.filter((p) => low.includes(p));
      out.push({
        reason: forLow.length ? "Para quem está abaixo de 50%" : "Já funcionou para parte da equipe",
        lesson: scored[0].lesson,
        people: forLow.length ? forLow : scored[0].people,
      });
    }
    for (const s of scored.slice(1, 3)) out.push({ reason: `Concluído por ${s.done} da equipe`, lesson: s.lesson, people: s.people });
    if (out.length < 3) {
      const fresh = candidates.filter((l) => doneBy(l.id).size === 0 && !out.some((o) => o.lesson.id === l.id)).slice(0, 3 - out.length);
      for (const l of fresh) out.push({ reason: "Ninguém da equipe fez ainda", lesson: l, people: t.team });
    }
    return out;
  }, [d, t]);
}

function applySuggestion(p: PageProps, d: ReturnType<typeof useData>, s: Suggestion) {
  return p.run(async () => {
    const n = await d.assign({
      target_type: "user",
      target_ids: s.people.map((x) => x.id),
      content_id: s.lesson.id,
      mandatory: false,
      due_date: null,
      message: null,
    });
    p.notify(`“${s.lesson.title}” recomendado para ${n} pessoa${n === 1 ? "" : "s"}.`);
  });
}

export function PeoplePage(p: PageProps) {
  const d = useData();
  const [q, setQ] = useState("");
  const [dep, setDep] = useState("Todos os times");
  const [st, setSt] = useState("Todos os status");
  const deps = [...new Set(d.team.map((x) => x.department))].sort();
  const list = d.team.filter(
    (x) =>
      (!q || `${x.name} ${x.email} ${x.role}`.toLowerCase().includes(q.toLowerCase())) &&
      (dep === "Todos os times" || x.department === dep) &&
      (st === "Todos os status" || x.status === st),
  );
  const isAdmin = d.profile?.role === "company_admin" || d.profile?.role === "platform_admin";
  return (
    <>
      <Heading eyebrow="MINHA EQUIPE" title="Pessoas" subtitle="Perfis, desenvolvimento e histórico de cada colaborador.">
        <div className="heading-actions">
          <button
            className="secondary"
            onClick={() => {
              downloadCsv("equipe.csv", [
                ["Nome", "E-mail", "Cargo", "Equipe", "Progresso (%)", "Status"],
                ...list.map((x) => [x.name, x.email, x.role, x.department, x.progress, x.status]),
              ]);
              p.notify("Planilha da equipe exportada.");
            }}
          >
            Exportar
          </button>
          {isAdmin ? (
            <button className="primary" onClick={() => p.open("invite")}>
              <Icon name="plus" />
              Adicionar pessoa
            </button>
          ) : (
            <button className="primary" onClick={() => p.open("recommend")}>
              <Icon name="spark" />
              Recomendar
            </button>
          )}
        </div>
      </Heading>
      <div className="toolbar panel">
        <input placeholder="Buscar colaborador" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={dep} onChange={(e) => setDep(e.target.value)}>
          <option>Todos os times</option>
          {deps.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={st} onChange={(e) => setSt(e.target.value)}>
          <option>Todos os status</option>
          <option>Em dia</option>
          <option>Atenção</option>
          <option>Atrasado</option>
        </select>
      </div>
      <section className="panel data-table">
        <div className="people-header">
          <span>PESSOA</span>
          <span>E-MAIL</span>
          <span>TRILHAS</span>
          <span>PROGRESSO</span>
          <span>STATUS</span>
          <span />
        </div>
        {list.map((x) => {
          const active = d.enrollments.filter((e) => e.user_id === x.id && e.track_id && e.status !== "completed").length;
          return (
            <button className="people-line" key={x.id} onClick={() => p.open("person", { id: x.id })}>
              <span className="person">
                <i style={{ background: x.color }}>{x.initials}</i>
                <span>
                  <strong>{x.name}</strong>
                  <small>{x.role}</small>
                </span>
              </span>
              <span>{x.email}</span>
              <span>
                {active} {active === 1 ? "ativa" : "ativas"}
              </span>
              <span>
                <Progress value={x.progress} compact />
                <small>{x.progress}%</small>
              </span>
              <span className={`status ${x.status.toLowerCase()}`}>{x.status}</span>
              <Icon name="more" />
            </button>
          );
        })}
        {!list.length && <p className="muted-note">Ninguém encontrado com esses filtros.</p>}
      </section>
    </>
  );
}

export function TeamTrailsPage(p: PageProps) {
  const d = useData();
  const ids = new Set(d.team.map((x) => x.id));
  const rows = d.trails
    .filter((t) => t.track.status === "published")
    .map((t) => {
      const enr = d.enrollments.filter((e) => e.track_id === t.id && ids.has(e.user_id));
      const avg = enr.length ? Math.round(enr.reduce((a, e) => a + Number(e.progress_pct), 0) / enr.length) : 0;
      return { t, count: enr.length, avg };
    })
    .sort((a, b) => b.count - a.count);
  return (
    <>
      <Heading eyebrow="MINHA EQUIPE" title="Trilhas da equipe" subtitle="Atribua jornadas e acompanhe a adesão do time.">
        <button className="primary" onClick={() => p.open("recommend", { title: "Atribuir trilha" })}>
          <Icon name="plus" />
          Atribuir trilha
        </button>
      </Heading>
      <div className="team-trail-grid">
        {rows.map(({ t, count, avg }) => (
          <article className="panel team-trail" key={t.id}>
            <div className={`trail-cover ${t.tone}`}>
              <Icon name="layers" />
            </div>
            <div className="team-trail-main">
              <p>TRILHA {count ? "ATIVA" : "DISPONÍVEL"}</p>
              <h2>{t.title}</h2>
              <span>
                {count} {count === 1 ? "participante" : "participantes"} • {t.modules} conteúdos
              </span>
              <Progress value={avg} />
            </div>
            <div className="team-trail-actions">
              <strong>{avg}%</strong>
              <button onClick={() => p.open("trail", { id: t.id })}>Ver conteúdos</button>
              <button onClick={() => p.open("recommend", { id: `track:${t.id}`, title: "Atribuir trilha" })}>•••</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function TrackingPage(p: PageProps) {
  const d = useData();
  const t = useTeam();
  const [days, setDays] = useState(30);
  const [now] = useState(() => Date.now());
  const since = new Date(now - days * 86400000).toISOString();

  // conclusões por dia nos últimos 7 dias
  const week = useMemo(() => {
    const out: { label: string; n: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now - i * 86400000);
      const key = day.toISOString().slice(0, 10);
      out.push({
        label: day.toLocaleDateString("pt-BR", { weekday: "narrow" }).toUpperCase(),
        n: t.completedAll.filter((x) => x.completed_at?.startsWith(key)).length,
      });
    }
    return out;
  }, [t, now]);
  const max = Math.max(1, ...week.map((w) => w.n));

  // adesão por tema: % da equipe que mexeu em algum conteúdo do tema no período
  const topics = useMemo(() => {
    const by = new Map<string, Set<string>>();
    for (const pr of t.prog.filter((x) => x.updated_at >= since)) {
      const tag = d.lessonById(pr.content_id)?.tag;
      if (!tag) continue;
      if (!by.has(tag)) by.set(tag, new Set());
      by.get(tag)!.add(pr.user_id);
    }
    return [...by.entries()]
      .map(([tag, s]) => [tag, t.team.length ? Math.round((s.size * 100) / t.team.length) : 0] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [t, d, since]);

  return (
    <>
      <Heading eyebrow="DADOS DO TIME" title="Acompanhamento" subtitle="Entenda adesão, ritmo e temas que pedem atenção.">
        <div className="heading-actions">
          <select className="period-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Este trimestre</option>
            <option value={365}>Este ano</option>
          </select>
          <button className="secondary" onClick={() => p.open("report", { title: "Relatório de acompanhamento" })}>
            Exportar relatório
          </button>
        </div>
      </Heading>
      <MetricGrid items={teamMetrics(t)} />
      <div className="analytics-grid">
        <article className="panel chart-card">
          <SectionTitle title="Evolução semanal" subtitle="Conteúdos concluídos nos últimos 7 dias" />
          <div className="bars">
            {week.map((w, i) => (
              <div key={i} title={`${w.n} conclusões`}>
                <span style={{ height: `${Math.max(4, (w.n / max) * 100)}%` }} />
                <small>{w.label}</small>
              </div>
            ))}
          </div>
        </article>
        <article className="panel chart-card">
          <SectionTitle title="Adesão por tema" subtitle="Parte da equipe que estudou cada tema no período" />
          {topics.length ? (
            topics.map((x) => (
              <div className="topic-progress" key={x[0]}>
                <span>{x[0]}</span>
                <Progress value={x[1]} />
                <strong>{x[1]}%</strong>
              </div>
            ))
          ) : (
            <p className="muted-note">Sem atividade da equipe no período.</p>
          )}
        </article>
      </div>
      <PeoplePanel {...p} />
    </>
  );
}

export function RecommendationsPage(p: PageProps) {
  const d = useData();
  const suggestions = useSuggestions();
  const sent = d.myAssignments.filter((a) => !a.mandatory).slice(0, 8);
  const name = (id: string | null) => d.people.find((x) => x.id === id)?.name ?? "—";
  return (
    <>
      <Heading eyebrow="DESENVOLVIMENTO" title="Recomendações" subtitle="Sugestões orientadas pelos dados e pelo momento da equipe.">
        <button className="primary" onClick={() => p.open("recommend")}>
          <Icon name="plus" />
          Nova recomendação
        </button>
      </Heading>
      {suggestions.length ? (
        <div className="recommend-grid">
          {suggestions.map((s, i) => (
            <article className="panel recommendation" key={s.lesson.id}>
              <span className={`rec-icon tone-${i}`}>
                <Icon name="spark" />
              </span>
              <p>{s.reason}</p>
              <h2>{s.lesson.title}</h2>
              <small>
                {s.people.length} {s.people.length === 1 ? "pessoa" : "pessoas"} • {s.lesson.tag}
              </small>
              <div>
                <button className="primary" onClick={() => applySuggestion(p, d, s)}>
                  Aplicar recomendação
                </button>
                <button className="secondary" onClick={() => p.open("content", { id: s.lesson.id })}>
                  Ver conteúdo
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty icon="spark" title="Sem sugestões agora" text="Quando sua equipe tiver atividade, as sugestões aparecem aqui." />
      )}
      <SectionTitle title="Recomendações enviadas" subtitle="Últimas que você fez" />
      <section className="panel data-table">
        {sent.length ? (
          sent.map((a) => {
            const item = a.track_id ? d.trailById(a.track_id)?.title : d.lessonById(a.content_id ?? "")?.title;
            return (
              <div className="people-line" key={a.id}>
                <span className="person">
                  <span>
                    <strong>{item ?? "Item removido"}</strong>
                    <small>{a.track_id ? "Trilha" : "Conteúdo"}</small>
                  </span>
                </span>
                <span>{a.target_type === "user" ? name(a.target_id) : a.target_type === "company" ? "Empresa toda" : a.target_type === "group" ? "Grupo" : "Departamento"}</span>
                <span>{a.due_date ? `prazo ${fmtDate(a.due_date)}` : "sem prazo"}</span>
                <span>{fmtDate(a.created_at)}</span>
                <span className="status em">Enviada</span>
                <span />
              </div>
            );
          })
        ) : (
          <p className="muted-note">Você ainda não enviou recomendações.</p>
        )}
      </section>
    </>
  );
}

export function ManagerTrailPage(p: PageProps) {
  const d = useData();
  const mine = useMyTrails("manager")[0] ?? d.trails.find((x) => x.track.audience === "manager" && x.track.status === "published");
  if (!mine)
    return (
      <Empty icon="route" title="Nenhuma trilha para gestores" text="Quando uma trilha de liderança for liberada, ela aparece aqui." action="Ver catálogo" onClick={() => p.navigate("Conteúdos para gestores")} />
    );
  const lessons = trailLessonIds(mine).map((id) => d.lessonById(id)).filter((l): l is NonNullable<typeof l> => !!l);
  const next = lessons.find((l) => l.progress < 100) ?? lessons[0];
  const done = lessons.filter((l) => l.progress === 100).length;
  const totalMin = lessons.reduce((a, l) => a + (l.content.duration_minutes ?? 0), 0);
  const cert = d.certificates.find((c) => c.track_id === mine.id);
  return (
    <>
      <Heading eyebrow="MEU DESENVOLVIMENTO" title="Minha trilha de liderança" subtitle="Uma jornada específica para quem desenvolve pessoas e entrega resultados.">
        <button className="secondary" onClick={() => p.open("certificate")}>
          {cert ? "Ver certificado" : "Certificado"}
        </button>
      </Heading>
      <section className="manager-trail-hero">
        <div>
          <span className="pill light">TRILHA PARA GESTORES</span>
          <h2>{mine.title}</h2>
          <p>{mine.description || "Práticas para conduzir conversas, delegar, decidir e construir times mais seguros."}</p>
          <div>
            <Progress value={mine.progress} />
            <small>
              {mine.progress}% concluído • {done} de {lessons.length} etapas
            </small>
          </div>
          {mine.enrollment ? (
            next && (
              <button onClick={() => p.open("content", { id: next.id })} className="light-button primary">
                <span className="play-dot">▶</span>
                {mine.progress > 0 ? "Continuar trilha" : "Começar trilha"}
              </button>
            )
          ) : (
            <button
              className="light-button primary"
              onClick={() => p.run(() => d.enrollTrack(mine.id), "Inscrição feita. Bons estudos!")}
            >
              <span className="play-dot">▶</span>Inscrever-me
            </button>
          )}
        </div>
        <aside>
          <strong>{lessons.length}</strong>
          <small>etapas</small>
          <strong>{hours(totalMin * 60)}</strong>
          <small>carga estimada</small>
          <strong>{mine.enrollment?.due_date ? fmtDate(mine.enrollment.due_date, { day: "numeric", month: "short" }) : "—"}</strong>
          <small>prazo</small>
        </aside>
      </section>
      <SectionTitle title="Etapas da trilha" subtitle="Acesse aulas, atividades e avaliações" action="Ver visão completa" onClick={() => p.open("trail", { id: mine.id })} />
      <div className="manager-module-list">
        {lessons.map((x, i) => (
          <button className="panel manager-module" key={x.id} onClick={() => p.open("content", { id: x.id })}>
            <span className={x.progress === 100 ? "done" : x.progress > 0 ? "current" : ""}>{x.progress === 100 ? "✓" : i + 1}</span>
            <div>
              <p>
                MÓDULO {i + 1} • {x.type.toUpperCase()} • {x.time}
              </p>
              <strong>{x.title}</strong>
              <Progress value={x.progress} />
            </div>
            <small>{x.progress === 100 ? "Concluído" : x.progress > 0 ? `${x.progress}%` : "Começar"}</small>
            <Icon name="arrow" />
          </button>
        ))}
      </div>
    </>
  );
}

export function ManagerContentPage(p: PageProps) {
  const d = useData();
  const featured = d.lessons.find((l) => l.content.audience === "manager" && l.content.status === "published" && l.progress < 100);
  const banner = featured && (
        <div className="manager-featured panel">
          <div>
            <span className="pill purple">RECOMENDADO PARA ESTA SEMANA</span>
            <h2>{featured.title}</h2>
            <p>{featured.content.description || "Um conteúdo curto para aplicar já na próxima conversa com o time."}</p>
            <button className="primary" onClick={() => p.open("content", { id: featured.id })}>
              <Icon name="play" />
              {featured.progress > 0 ? "Continuar" : "Começar agora"}
            </button>
          </div>
          <div>
            <Icon name="spark" size={35} />
            <strong>Por que isso agora?</strong>
            <p>É o próximo conteúdo de liderança que você ainda não concluiu.</p>
          </div>
        </div>
  );
  return <ContentLibrary {...p} managerOnly banner={banner} />;
}
