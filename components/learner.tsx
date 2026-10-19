"use client";

import { useMemo, useState } from "react";
import { useData, fmtDate, type Lesson, type Trail } from "@/lib/data";
import { printCertificate } from "./certificate";
import {
  Empty,
  Heading,
  Icon,
  LessonGrid,
  Progress,
  SectionTitle,
  type PageProps,
} from "./ui";

const FORMATS: Record<string, string> = {
  Vídeos: "Vídeo",
  Artigos: "Artigo",
  Interativos: "Interativo",
  Materiais: "PDF",
  Avaliações: "Avaliação",
};

/** Conteúdos que o colaborador vê no catálogo (publicados e não restritos a gestores). */
export function useLearnerLessons(managerOnly = false) {
  const { lessons } = useData();
  return useMemo(
    () =>
      lessons.filter(
        (l) =>
          l.content.status === "published" &&
          (managerOnly ? l.content.audience === "manager" : l.content.audience !== "manager"),
      ),
    [lessons, managerOnly],
  );
}

/** Trilhas em que a pessoa está inscrita, por prazo. */
export function useMyTrails(audience?: "manager") {
  const { trails } = useData();
  return useMemo(
    () =>
      trails
        .filter((t) => t.enrollment && (!audience || t.track.audience === audience))
        .sort((a, b) => {
          const da = a.enrollment?.due_date ?? "9999";
          const db = b.enrollment?.due_date ?? "9999";
          return da.localeCompare(db);
        }),
    [trails, audience],
  );
}

export function trailLessonIds(t: Trail) {
  return t.track.modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((m) => m.items.slice().sort((a, b) => a.position - b.position).map((i) => i.contentId));
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function LearnerHome(p: PageProps) {
  const d = useData();
  const myTrails = useMyTrails();
  const catalog = useLearnerLessons();
  const firstName = (d.profile?.full_name || "").split(" ")[0] || "";

  // Continue de onde parou: o último conteúdo em andamento
  const continuing = useMemo(() => {
    const inProgress = [...d.progress.values()]
      .filter((x) => x.status === "in_progress")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const lesson =
      (inProgress[0] && d.lessonById(inProgress[0].content_id)) ||
      myTrails
        .flatMap((t) => trailLessonIds(t))
        .map((id) => d.lessonById(id))
        .find((l) => l && l.progress < 100) ||
      catalog.find((l) => l.progress < 100);
    if (!lesson) return null;
    const trail = d.trails.find((t) => trailLessonIds(t).includes(lesson.id));
    const ids = trail ? trailLessonIds(trail) : [];
    return { lesson, trail, index: ids.indexOf(lesson.id) + 1, total: ids.length };
  }, [d, myTrails, catalog]);

  const journey = useMemo(() => {
    const ids = myTrails.flatMap((t) => trailLessonIds(t));
    const list = ids
      .map((id) => d.lessonById(id))
      .filter((l): l is Lesson => !!l && l.progress < 100);
    const seen = new Set(list.map((l) => l.id));
    for (const l of catalog) if (!seen.has(l.id) && l.progress < 100) list.push(l);
    return list.sort((a, b) => b.progress - a.progress).slice(0, 3);
  }, [myTrails, catalog, d]);

  const goal = Number((d.company?.settings as Record<string, unknown> | null)?.monthly_goal ?? 4);
  const month = new Date().toISOString().slice(0, 7);
  const doneThisMonth = [...d.progress.values()].filter(
    (x) => x.status === "completed" && x.completed_at?.startsWith(month),
  ).length;
  const goalPct = Math.min(100, Math.round((doneThisMonth / Math.max(goal, 1)) * 100));
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" });

  const nextDue = myTrails.find((t) => t.enrollment?.due_date && t.enrollment.status !== "completed");
  const today = new Date();
  const eyebrow = today
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  return (
    <>
      <Heading
        eyebrow={eyebrow}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""} 👋`}
        subtitle="Seu próximo passo já está preparado. Vamos continuar?"
      >
        <div className="streak">
          <span>🔥</span>
          <div>
            <strong>
              {d.streak} {d.streak === 1 ? "dia" : "dias"}
            </strong>
            <small>sequência atual</small>
          </div>
        </div>
      </Heading>
      {continuing ? (
        <section className="continue-card">
          <div className="continue-copy">
            <span className="pill light">
              {continuing.lesson.progress > 0 ? "CONTINUE DE ONDE PAROU" : "SEU PRÓXIMO PASSO"}
            </span>
            <p className="muted-light">
              {continuing.trail ? `Trilha • ${continuing.trail.title}` : `${continuing.lesson.type} • ${continuing.lesson.tag}`}
            </p>
            <h2>{continuing.lesson.title}</h2>
            <p>{continuing.lesson.content.description || "Continue sua jornada de desenvolvimento."}</p>
            <div className="continue-progress">
              <Progress value={continuing.lesson.progress} />
              <span>{continuing.lesson.progress}% concluído</span>
            </div>
            <button
              onClick={() => p.open("content", { id: continuing.lesson.id })}
              className="primary light-button"
            >
              <span className="play-dot">▶</span>
              {continuing.lesson.progress > 0 ? "Continuar conteúdo" : "Começar conteúdo"}
            </button>
          </div>
          <div className="continue-art">
            <div className="orbit one" />
            <div className="orbit two" />
            <span className="quote-mark">“</span>
            <p>Uma boa conversa pode mudar a rota de alguém.</p>
            {continuing.total > 0 && (
              <div className="lesson-number">
                {String(continuing.index).padStart(2, "0")}{" "}
                <small>/ {String(continuing.total).padStart(2, "0")}</small>
              </div>
            )}
          </div>
        </section>
      ) : (
        <Empty
          icon="route"
          title="Tudo em dia por aqui"
          text="Você não tem conteúdos pendentes. Explore o catálogo para continuar aprendendo."
          action="Ver trilhas"
          onClick={() => p.navigate("Trilhas")}
        />
      )}
      <SectionTitle
        title="Sua jornada"
        subtitle="Conteúdos selecionados para o seu momento"
        action="Ver jornada completa"
        onClick={() => p.navigate("Minha jornada")}
      />
      {journey.length ? (
        <LessonGrid items={journey} {...p} />
      ) : (
        <Empty icon="play" title="Nada pendente" text="Você concluiu tudo o que estava na sua jornada." />
      )}
      <div className="bottom-grid">
        <article className="goal-card">
          <div className="goal-ring">
            <strong>{goalPct}%</strong>
            <small>da meta</small>
          </div>
          <div>
            <span className="pill purple">META DO MÊS</span>
            <h3>{goalPct >= 100 ? "Meta alcançada!" : goalPct >= 50 ? "Você está quase lá." : "Bora começar o mês."}</h3>
            <p>
              {goalPct >= 100
                ? `Você concluiu ${doneThisMonth} conteúdos em ${monthName}.`
                : `Conclua mais ${goal - doneThisMonth} conteúdo${goal - doneThisMonth > 1 ? "s" : ""} para alcançar sua meta de ${monthName}.`}
            </p>
            <button onClick={() => p.navigate("Conteúdos")}>Ver recomendações</button>
          </div>
        </article>
        <article className="next-card">
          <SectionTitle title="Próximos prazos" action="Ver jornada" onClick={() => p.navigate("Minha jornada")} />
          {nextDue ? (
            <div className="meeting">
              <div className="date">
                <strong>{fmtDate(nextDue.enrollment!.due_date, { day: "2-digit" })}</strong>
                <small>{fmtDate(nextDue.enrollment!.due_date, { month: "short" }).replace(".", "").toUpperCase()}</small>
              </div>
              <div>
                <span>{nextDue.enrollment!.mandatory ? "Trilha obrigatória" : "Trilha recomendada"}</span>
                <strong>{nextDue.title}</strong>
                <small>
                  <Icon name="clock" size={14} />
                  {nextDue.progress}% concluído
                </small>
              </div>
              <button onClick={() => p.open("trail", { id: nextDue.id })}>•••</button>
            </div>
          ) : (
            <p className="muted-note">Nenhum prazo próximo.</p>
          )}
        </article>
      </div>
    </>
  );
}

export function JourneyPage(p: PageProps) {
  const d = useData();
  const myTrails = useMyTrails();
  const ids = [...new Set(myTrails.flatMap((t) => trailLessonIds(t)))];
  const done = ids.filter((id) => d.progress.get(id)?.status === "completed").length;
  const pct = ids.length ? Math.round((done * 100) / ids.length) : 0;
  return (
    <>
      <Heading eyebrow="MINHA JORNADA" title="Seu caminho de desenvolvimento" subtitle="Acompanhe etapas, prazos e próximos passos.">
        <button
          className="secondary"
          onClick={() =>
            p.open("generic", {
              title: "Como sua jornada é construída",
              body: "Sua jornada reúne as trilhas atribuídas pela empresa, as recomendações do seu gestor e as trilhas em que você se inscreveu pelo catálogo.",
            })
          }
        >
          <Icon name="spark" />
          Como funciona
        </button>
      </Heading>
      <div className="journey-summary panel">
        <div>
          <strong>{pct}%</strong>
          <small>progresso geral</small>
        </div>
        <Progress value={pct} />
        <span>
          {done} de {ids.length} conteúdos concluídos
        </span>
      </div>
      {myTrails.length ? (
        <div className="timeline">
          {myTrails.map((t, i) => {
            const e = t.enrollment!;
            const state = e.status === "completed" ? "" : i === myTrails.findIndex((x) => x.enrollment?.status !== "completed") ? "current" : "next";
            return (
              <article className="timeline-item" key={t.id}>
                <span className={state}>{e.status === "completed" ? "✓" : i + 1}</span>
                <div className="panel">
                  <div className="trail-head">
                    <div>
                      <p className="eyebrow">
                        ETAPA {i + 1} • {e.mandatory ? "OBRIGATÓRIA" : e.assignment_id ? "RECOMENDADA" : "ESCOLHIDA POR VOCÊ"}
                      </p>
                      <h2>{t.title}</h2>
                      <p>
                        {t.modules} conteúdos
                        {e.due_date ? ` • prazo ${fmtDate(e.due_date)}` : ""}
                      </p>
                    </div>
                    <strong>{t.progress}%</strong>
                  </div>
                  <Progress value={t.progress} />
                  <button className="primary" onClick={() => p.open("trail", { id: t.id })}>
                    {e.status === "completed" ? "Ver trilha" : t.progress > 0 ? "Continuar trilha" : "Começar trilha"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          icon="route"
          title="Sua jornada ainda está vazia"
          text="Quando a empresa ou seu gestor atribuírem uma trilha, ela aparece aqui. Você também pode escolher uma no catálogo."
          action="Explorar trilhas"
          onClick={() => p.navigate("Trilhas")}
        />
      )}
    </>
  );
}

export function TrailCatalog(p: PageProps & { learner?: boolean }) {
  const d = useData();
  const [filter, setFilter] = useState("Todas");
  const list = d.trails
    .filter((t) => (p.learner ? t.track.status === "published" && t.track.audience !== "manager" : true))
    .filter((t) =>
      filter === "Todas"
        ? true
        : filter === "Minhas"
          ? !!t.enrollment
          : filter === "Concluídas"
            ? t.enrollment?.status === "completed"
            : filter === "Disponíveis"
              ? !t.enrollment
              : filter === "Publicadas"
                ? t.track.status === "published"
                : t.track.status === "draft",
    );
  const pills = p.learner ? ["Todas", "Minhas", "Disponíveis", "Concluídas"] : ["Todas", "Publicadas", "Rascunhos"];
  return (
    <>
      <Heading
        eyebrow={p.learner ? "CATÁLOGO" : "ADMINISTRAÇÃO DE CONTEÚDO"}
        title={p.learner ? "Trilhas de desenvolvimento" : "Trilhas"}
        subtitle={p.learner ? "Jornadas completas para desenvolver competências essenciais." : "Crie, organize, publique e atribua jornadas."}
      >
        {!p.learner && (
          <button className="primary" onClick={() => p.open("create-trail")}>
            <Icon name="plus" />
            Criar trilha
          </button>
        )}
      </Heading>
      <div className="filter-pills">
        {pills.map((x) => (
          <button key={x} className={filter === x ? "selected" : ""} onClick={() => setFilter(x)}>
            {x}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="catalog-grid">
          {list.map((t) => (
            <article className="trail-card panel" key={t.id}>
              <div className={`trail-banner ${t.tone}`}>
                <Icon name="layers" size={30} />
                <span>{p.learner ? (t.enrollment ? (t.enrollment.status === "completed" ? "Concluída" : "Inscrito") : "Disponível") : t.status}</span>
              </div>
              <div className="trail-card-body">
                <p>
                  {t.modules} CONTEÚDOS • {t.people} PARTICIPANTES
                  {t.track.company_id === null ? " • BIBLIOTECA" : ""}
                </p>
                <h2>{t.title}</h2>
                <p>{t.description || "Conteúdos aplicáveis, atividades e acompanhamento de evolução."}</p>
                <div className="trail-footer">
                  <div>
                    <Progress value={t.progress} />
                    <small>{t.progress}% concluído</small>
                  </div>
                  <button onClick={() => p.open("trail", { id: t.id })}>{p.learner ? "Ver trilha" : "Abrir"}</button>
                  {!p.learner && (
                    <button className="dots" onClick={() => p.open("actions", { id: `track:${t.id}`, title: t.title })}>
                      •••
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty icon="layers" title="Nenhuma trilha aqui" text="Troque o filtro para ver outras trilhas." action="Mostrar todas" onClick={() => setFilter("Todas")} />
      )}
    </>
  );
}

export function ContentLibrary(p: PageProps & { managerOnly?: boolean; banner?: React.ReactNode }) {
  const all = useLearnerLessons(p.managerOnly);
  const [format, setFormat] = useState("Todos");
  const [topic, setTopic] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filtered = all.filter(
    (x) =>
      (format === "Todos" || x.type === FORMATS[format]) &&
      (topic === "Todos" || x.tag === topic) &&
      (!q || x.title.toLowerCase().includes(q.toLowerCase())) &&
      (status === "Todos" ||
        (status === "Em andamento" && x.progress > 0 && x.progress < 100) ||
        (status === "Não iniciados" && x.progress === 0) ||
        (status === "Concluídos" && x.progress === 100)),
  );
  function reset() {
    setFormat("Todos");
    setTopic("Todos");
    setStatus("Todos");
    setQ("");
    p.notify("Filtros limpos.");
  }
  return (
    <>
      <Heading
        eyebrow={p.managerOnly ? "CONTEÚDO PARA GESTORES" : "BIBLIOTECA"}
        title={p.managerOnly ? "Biblioteca de liderança" : "Conteúdos"}
        subtitle={p.managerOnly ? "Aulas e materiais direcionados aos desafios de quem lidera." : "Explore aulas independentes e aprenda no seu ritmo."}
      >
        <button className={`secondary ${showFilters ? "active-filter" : ""}`} onClick={() => setShowFilters(!showFilters)}>
          <Icon name="settings" />
          Filtros
          {(topic !== "Todos" || status !== "Todos" || q) && (
            <span className="filter-count">{Number(topic !== "Todos") + Number(status !== "Todos") + Number(!!q)}</span>
          )}
        </button>
      </Heading>
      {p.banner}
      <div className="filter-pills">
        <button onClick={() => setFormat("Todos")} className={format === "Todos" ? "selected" : ""}>
          Todos
        </button>
        {Object.keys(FORMATS).map((x) => (
          <button className={format === x ? "selected" : ""} key={x} onClick={() => setFormat(x)}>
            {x}
          </button>
        ))}
      </div>
      {showFilters && (
        <div className="advanced-filters panel">
          <label>
            Buscar
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título do conteúdo" />
          </label>
          <label>
            Tema
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option>Todos</option>
              {[...new Set(all.map((x) => x.tag))].sort().map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Progresso
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Todos</option>
              <option>Não iniciados</option>
              <option>Em andamento</option>
              <option>Concluídos</option>
            </select>
          </label>
          <div>
            <strong>{filtered.length}</strong>
            <small>conteúdos encontrados</small>
          </div>
          <button onClick={reset}>Limpar filtros</button>
        </div>
      )}
      {filtered.length ? (
        <LessonGrid items={filtered} {...p} />
      ) : (
        <Empty icon="search" title="Nenhum conteúdo encontrado" text="Tente combinar outros formatos, temas ou status." action="Limpar filtros" onClick={reset} />
      )}
    </>
  );
}

export function FavoritesPage(p: PageProps) {
  const d = useData();
  const items = d.lessons.filter((x) => d.favorites.has(`c:${x.id}`));
  return (
    <>
      <Heading eyebrow="MINHA CONTA" title="Favoritos" subtitle="Conteúdos que você guardou para acessar depois.">
        <button className="secondary" onClick={() => p.navigate("Conteúdos")}>
          <Icon name="plus" />
          Encontrar conteúdos
        </button>
      </Heading>
      {items.length ? (
        <LessonGrid items={items} {...p} />
      ) : (
        <Empty icon="heart" title="Nenhum favorito ainda" text="Explore a biblioteca e salve conteúdos para ver depois." action="Explorar conteúdos" onClick={() => p.navigate("Conteúdos")} />
      )}
    </>
  );
}

const LEVELS = ["Primeiros passos", "Explorador", "Explorador consistente", "Protagonista", "Referência", "Mestre do desenvolvimento"];

export function AchievementsPage(p: PageProps) {
  const d = useData();
  const xp = d.profile?.xp ?? 0;
  const level = Math.min(LEVELS.length - 1, Math.floor(xp / 200));
  const nextAt = (level + 1) * 200;
  const completed = [...d.progress.values()].filter((x) => x.status === "completed");
  const trailsDone = d.myEnrollments.filter((e) => e.track_id && e.status === "completed").length;
  const halfTrail = d.myEnrollments.some((e) => e.track_id && Number(e.progress_pct) >= 50);
  const quizPassed = completed.some((x) => d.lessonById(x.content_id)?.content.type === "quiz");
  const badges: [string, string, string, boolean][] = [
    ["Primeira etapa", "Concluiu seu primeiro conteúdo", "award", completed.length >= 1],
    ["Ritmo constante", "5 dias seguidos aprendendo", "spark", d.streak >= 5],
    ["Meio do caminho", "Chegou a 50% de uma trilha", "layers", halfTrail],
    ["Aprovado", "Passou em uma avaliação", "check", quizPassed],
    ["Trilha completa", "Concluiu uma trilha inteira", "route", trailsDone >= 1],
    ["Dez conteúdos", "Concluiu 10 conteúdos", "play", completed.length >= 10],
  ];
  return (
    <>
      <Heading eyebrow="MINHA CONTA" title="Conquistas" subtitle="Marcos, certificados e evolução da sua aprendizagem.">
        <button className="secondary" onClick={() => p.open("certificate")}>
          Ver certificados
        </button>
      </Heading>
      <div className="achievement-hero">
        <div>
          <span>🏆</span>
          <div>
            <p>SEU NÍVEL ATUAL</p>
            <h2>{LEVELS[level]}</h2>
            <p>{level < LEVELS.length - 1 ? `Mais ${nextAt - xp} pontos para alcançar o próximo nível.` : "Você chegou ao nível máximo."}</p>
          </div>
        </div>
        <div>
          <strong>{xp}</strong>
          <small>pontos conquistados</small>
          <Progress value={((xp - level * 200) / 200) * 100} />
        </div>
      </div>
      <div className="badge-grid">
        {badges.map((b) => (
          <button className="badge-card panel" key={b[0]} onClick={() => p.open("generic", { title: b[0], body: `${b[1]}. ${b[3] ? "Conquista desbloqueada." : "Ainda bloqueada."}` })}>
            <span className={b[3] ? "" : "locked"}>
              <Icon name={b[2]} size={29} />
            </span>
            <strong>{b[0]}</strong>
            <small>{b[1]}</small>
          </button>
        ))}
      </div>
      <SectionTitle title="Certificados" subtitle="Emitidos automaticamente ao concluir uma trilha" action="Ver todos" onClick={() => p.open("certificate")} />
      {d.certificates.length ? (
        d.certificates.slice(0, 3).map((c) => (
          <div className="certificate-row panel" key={c.id}>
            <span>
              <Icon name="award" />
            </span>
            <div>
              <strong>{c.title}</strong>
              <small>Concluído em {fmtDate(c.issued_at, { day: "numeric", month: "long", year: "numeric" })}</small>
            </div>
            <button onClick={() => printCertificate(c, d.company) || p.notify("Permita pop-ups para abrir o certificado.")}>Baixar PDF</button>
          </div>
        ))
      ) : (
        <div className="certificate-row panel">
          <span>
            <Icon name="award" />
          </span>
          <div>
            <strong>Nenhum certificado ainda</strong>
            <small>Conclua uma trilha para receber o primeiro.</small>
          </div>
          <button onClick={() => p.navigate("Minha jornada")}>Ver jornada</button>
        </div>
      )}
    </>
  );
}
