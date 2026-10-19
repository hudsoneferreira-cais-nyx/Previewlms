"use client";

import { useMemo, useRef, useState } from "react";
import { useData, downloadCsv, fmtDate, timeAgo, initialsOf, avatarFor, ROLE_LABEL, STATUS_LABEL, type AppRole } from "@/lib/data";
import { Empty, Heading, Icon, MetricGrid, Progress, Quick, SectionTitle, type PageProps } from "./ui";

export function AdminHome(p: PageProps) {
  const d = useData();
  const ov = d.overview;
  const published = d.trails.filter((t) => t.track.status === "published").length;
  const drafts = d.trails.filter((t) => t.track.status === "draft").length;
  const enr = d.enrollments.length;
  const done = d.enrollments.filter((e) => e.status === "completed").length;
  const rate = enr ? Math.round((done * 100) / enr) : 0;
  return (
    <>
      <Heading eyebrow={`ADMINISTRAÇÃO • ${(d.company?.name ?? "").toUpperCase()}`} title="Gestão da plataforma" subtitle="Conteúdo, pessoas e resultados em um só lugar.">
        <div className="heading-actions">
          <button className="secondary" onClick={() => p.open("create-content")}>
            <Icon name="plus" />
            Novo conteúdo
          </button>
          <button className="primary" onClick={() => p.open("create-trail")}>
            <Icon name="plus" />
            Criar trilha
          </button>
        </div>
      </Heading>
      <MetricGrid
        items={[
          ["users", "purple", "USUÁRIOS ATIVOS", String(ov?.active_users_this_month ?? 0), `de ${ov?.active_people ?? d.people.length} pessoas cadastradas`],
          ["layers", "green", "TRILHAS PUBLICADAS", String(published), drafts ? `${drafts} em construção` : "nenhuma em rascunho"],
          ["play", "orange", "CONTEÚDOS", String(d.lessons.length), "Vídeos, textos e avaliações"],
          ["chart", "blue", "TAXA DE CONCLUSÃO", `${rate}%`, `${done} de ${enr} inscrições`],
        ]}
      />
      <div className="admin-grid">
        <section className="panel trails-panel">
          <SectionTitle title="Trilhas de desenvolvimento" subtitle="Organize, publique e acompanhe" action="Ver todas" onClick={() => p.navigate("Trilhas")} />
          {d.trails.slice(0, 5).map((t) => {
            const rows = d.enrollments.filter((e) => e.track_id === t.id);
            const r = rows.length ? Math.round((rows.filter((e) => e.status === "completed").length * 100) / rows.length) : 0;
            return (
              <button className="trail-row" key={t.id} onClick={() => p.open("trail", { id: t.id })}>
                <span className={`trail-cover ${t.tone}`}>
                  <Icon name="layers" />
                </span>
                <span className="trail-info">
                  <strong>{t.title}</strong>
                  <small>
                    {t.modules} conteúdos • {t.people} participantes
                  </small>
                </span>
                <span className="trail-rate">
                  <small>CONCLUSÃO</small>
                  <strong>{r}%</strong>
                  <Progress value={r} compact />
                </span>
                <span className={`publish ${t.track.status !== "published" ? "draft" : ""}`}>{t.status}</span>
                <Icon name="more" />
              </button>
            );
          })}
        </section>
        <ActivityPanel {...p} />
      </div>
      <section className="panel quick-panel">
        <SectionTitle title="Ações rápidas" subtitle="Atalhos para administrar seu ambiente" action="Configurações" onClick={() => p.navigate("Configurações")} />
        <div className="quick-grid">
          <Quick icon="play" title="Adicionar conteúdo" text="Vídeo, texto, PDF ou SCORM" onClick={() => p.open("create-content")} />
          <Quick icon="layers" title="Montar uma trilha" text="Organize conteúdos e etapas" onClick={() => p.open("create-trail")} />
          <Quick icon="users" title="Convidar usuários" text="Individualmente ou por planilha" onClick={() => p.open("invite")} />
          <Quick icon="chart" title="Gerar relatório" text="Acompanhe adesão e resultados" onClick={() => p.open("report", { id: "executivo", title: "Relatório executivo" })} />
        </div>
      </section>
    </>
  );
}

function ActivityPanel(p: PageProps) {
  const d = useData();
  const feed = useMemo(() => {
    const person = (id: string) => d.people.find((x) => x.id === id);
    const items: { id: string; who: string; color: string; text: string; detail: string; at: string }[] = [];
    for (const pr of d.teamProgress) {
      const who = person(pr.user_id);
      const l = d.lessonById(pr.content_id);
      if (!who || !l) continue;
      items.push({
        id: `p${pr.user_id}${pr.content_id}`,
        who: who.name,
        color: who.color,
        text: `${who.name.split(" ")[0]} ${pr.status === "completed" ? "concluiu" : "iniciou"} um conteúdo`,
        detail: l.title,
        at: pr.status === "completed" ? pr.completed_at ?? pr.updated_at : pr.updated_at,
      });
    }
    for (const e of d.enrollments) {
      if (!e.track_id || e.status !== "completed" || !e.completed_at) continue;
      const who = person(e.user_id);
      if (!who) continue;
      items.push({
        id: `e${e.id}`,
        who: who.name,
        color: who.color,
        text: `${who.name.split(" ")[0]} concluiu uma trilha`,
        detail: d.trailById(e.track_id)?.title ?? "",
        at: e.completed_at,
      });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  }, [d]);
  return (
    <aside className="panel activity-panel">
      <SectionTitle title="Atividade recente" subtitle="Últimas atualizações" action="Relatórios" onClick={() => p.navigate("Relatórios")} />
      {feed.length ? (
        feed.map((a) => (
          <div className="activity" key={a.id}>
            <i style={{ background: a.color }}>{initialsOf(a.who)}</i>
            <div>
              <strong>{a.text}</strong>
              <p>{a.detail}</p>
              <small>{timeAgo(a.at)}</small>
            </div>
          </div>
        ))
      ) : (
        <p className="muted-note">Ainda sem atividade.</p>
      )}
    </aside>
  );
}

export function AdminLibrary(p: PageProps) {
  const d = useData();
  const [q, setQ] = useState("");
  const [fmt, setFmt] = useState("Todos os formatos");
  const [st, setSt] = useState("Todos os status");
  const usage = (id: string) => d.trails.filter((t) => t.track.modules.some((m) => m.items.some((i) => i.contentId === id))).length;
  const rows = d.lessons.filter(
    (x) =>
      (!q || `${x.title} ${x.tag}`.toLowerCase().includes(q.toLowerCase())) &&
      (fmt === "Todos os formatos" || x.type === fmt) &&
      (st === "Todos os status" || STATUS_LABEL[x.content.status].startsWith(st.slice(0, 6))),
  );
  return (
    <>
      <Heading eyebrow="CONTEÚDO" title="Biblioteca" subtitle="Gerencie conteúdos independentes e reutilize-os em várias trilhas.">
        <button className="primary" onClick={() => p.open("create-content")}>
          <Icon name="plus" />
          Adicionar conteúdo
        </button>
      </Heading>
      <div className="toolbar panel">
        <input placeholder="Buscar na biblioteca" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
          <option>Todos os formatos</option>
          {["Vídeo", "Artigo", "PDF", "Interativo", "Avaliação", "Atividade", "Link"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={st} onChange={(e) => setSt(e.target.value)}>
          <option>Todos os status</option>
          <option>Publicado</option>
          <option>Rascunho</option>
          <option>Arquivado</option>
        </select>
        <button onClick={() => p.run(d.refresh, "Biblioteca atualizada.")}>Atualizar</button>
      </div>
      <section className="panel library-table">
        <div className="library-head">
          <span>CONTEÚDO</span>
          <span>FORMATO</span>
          <span>USO</span>
          <span>STATUS</span>
          <span>ATUALIZAÇÃO</span>
          <span />
        </div>
        {rows.map((x) => (
          <div className="library-line" key={x.id}>
            <button className="library-title" onClick={() => p.open("content", { id: x.id })}>
              <span className={`mini-cover ${x.color}`}>
                <Icon name="play" />
              </span>
              <span>
                <strong>{x.title}</strong>
                <small>
                  {x.tag} • {x.time}
                  {x.content.company_id === null ? " • Biblioteca da consultoria" : ""}
                </small>
              </span>
            </button>
            <span>{x.type}</span>
            <span>
              {usage(x.id)} {usage(x.id) === 1 ? "trilha" : "trilhas"}
            </span>
            <span className={`publish ${x.content.status !== "published" ? "draft" : ""}`}>{STATUS_LABEL[x.content.status].replace("Publicada", "Publicado").replace("Arquivada", "Arquivado")}</span>
            <span>{fmtDate(x.content.updated_at, { day: "numeric", month: "short", year: "numeric" })}</span>
            <button onClick={() => p.open("actions", { id: `content:${x.id}`, title: x.title })}>
              <Icon name="more" />
            </button>
          </div>
        ))}
        {!rows.length && <p className="muted-note">Nenhum conteúdo encontrado.</p>}
      </section>
    </>
  );
}

export function AssessmentsPage(p: PageProps) {
  const d = useData();
  const quizzes = d.lessons.filter((l) => l.content.type === "quiz");
  return (
    <>
      <Heading eyebrow="CONTEÚDO" title="Avaliações" subtitle="Questionários, diagnósticos e critérios de conclusão.">
        <button className="primary" onClick={() => p.open("assessment")}>
          <Icon name="plus" />
          Nova avaliação
        </button>
      </Heading>
      {quizzes.length ? (
        <div className="assessment-grid">
          {quizzes.map((a, i) => {
            const s = d.quizStats.get(a.id);
            return (
              <article className="panel assessment-card" key={a.id}>
                <div>
                  <span className={`metric-icon ${["purple", "green", "orange"][i % 3]}`}>
                    <Icon name="check" />
                  </span>
                  <span className={`publish ${a.content.status !== "published" ? "draft" : ""}`}>{STATUS_LABEL[a.content.status]}</span>
                </div>
                <h2>{a.title}</h2>
                <p>
                  {s?.questions ?? 0} questões • nota mínima {a.content.pass_score}%
                </p>
                <div>
                  <span>
                    <strong>{s?.attempts ?? 0}</strong>
                    <small>Tentativas</small>
                  </span>
                  <span>
                    <strong>{s?.avg != null ? `${Math.round(s.avg)}%` : "—"}</strong>
                    <small>Nota média</small>
                  </span>
                </div>
                <footer>
                  <button onClick={() => p.open("content", { id: a.id })}>Ver avaliação</button>
                  <button onClick={() => p.open("actions", { id: `content:${a.id}`, title: a.title })}>•••</button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty icon="check" title="Nenhuma avaliação ainda" text="Crie um quiz com nota mínima. A correção é feita pelo servidor." action="Nova avaliação" onClick={() => p.open("assessment")} />
      )}
    </>
  );
}

function parseCsv(text: string) {
  const sep = text.includes(";") ? ";" : ",";
  return text
    .split(/\r?\n/)
    .map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((r) => r.some(Boolean));
}

export function UsersPage(p: PageProps) {
  const d = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const active = d.people.filter((x) => x.userStatus === "active").length;
  const managers = d.people.filter((x) => x.appRole === "manager").length;
  const admins = d.people.filter((x) => x.appRole === "company_admin" || x.appRole === "platform_admin").length;
  const list = d.people.filter((x) => !q || `${x.name} ${x.email}`.toLowerCase().includes(q.toLowerCase()));

  async function importFile(f: File) {
    const rows = parseCsv(await f.text());
    const header = rows[0]?.map((h) => h.toLowerCase()) ?? [];
    const hasHeader = header.some((h) => h.includes("mail"));
    const col = (names: string[], fallback: number) => {
      const i = header.findIndex((h) => names.some((n) => h.includes(n)));
      return hasHeader && i >= 0 ? i : fallback;
    };
    const iName = col(["nome", "name"], 0),
      iMail = col(["mail"], 1),
      iRole = col(["perfil", "papel", "role"], 2),
      iDep = col(["equipe", "depart", "time"], 3);
    const roleMap: Record<string, AppRole> = { gestor: "manager", administrador: "company_admin", admin: "company_admin" };
    let ok = 0,
      fail = 0;
    for (const r of rows.slice(hasHeader ? 1 : 0)) {
      const email = r[iMail];
      if (!email?.includes("@")) {
        fail++;
        continue;
      }
      const dep = d.departments.find((x) => x.name.toLowerCase() === (r[iDep] ?? "").toLowerCase());
      try {
        await d.invite({
          full_name: r[iName] || email.split("@")[0],
          email,
          role: roleMap[(r[iRole] ?? "").toLowerCase()] ?? "learner",
          department_id: dep?.id ?? null,
        });
        ok++;
      } catch {
        fail++;
      }
    }
    p.notify(`${ok} convite${ok === 1 ? "" : "s"} criado${ok === 1 ? "" : "s"}${fail ? ` • ${fail} linha(s) ignorada(s)` : ""}.`);
  }

  return (
    <>
      <Heading eyebrow="GESTÃO" title="Usuários" subtitle="Acessos, perfis, equipes e vínculos com empresas.">
        <div className="heading-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.run(() => importFile(f));
              e.target.value = "";
            }}
          />
          <button className="secondary" onClick={() => fileRef.current?.click()} title="CSV com colunas: nome; e-mail; perfil; equipe">
            Importar planilha
          </button>
          <button className="primary" onClick={() => p.open("invite")}>
            <Icon name="plus" />
            Novo usuário
          </button>
        </div>
      </Heading>
      <div className="metric-grid small-metrics">
        <article>
          <div>
            <small>ATIVOS</small>
            <strong>{active}</strong>
            <p>{d.people.length ? Math.round((active * 100) / d.people.length) : 0}% da base</p>
          </div>
        </article>
        <article>
          <div>
            <small>PENDENTES</small>
            <strong>{d.invitations.length}</strong>
            <p>Aguardando cadastro</p>
          </div>
        </article>
        <article>
          <div>
            <small>GESTORES</small>
            <strong>{managers}</strong>
            <p>{d.departments.length} equipes</p>
          </div>
        </article>
        <article>
          <div>
            <small>ADMINISTRADORES</small>
            <strong>{admins}</strong>
            <p>Acesso total</p>
          </div>
        </article>
      </div>
      <div className="toolbar panel">
        <input placeholder="Buscar usuário" value={q} onChange={(e) => setQ(e.target.value)} />
        <button
          onClick={() =>
            downloadCsv("modelo-importacao.csv", [
              ["nome", "email", "perfil", "equipe"],
              ["Maria Silva", "maria@empresa.com.br", "colaborador", d.departments[0]?.name ?? "Comercial"],
            ])
          }
        >
          Baixar modelo
        </button>
      </div>
      <section className="panel data-table">
        <div className="people-header">
          <span>USUÁRIO</span>
          <span>E-MAIL</span>
          <span>PERFIL</span>
          <span>ÚLTIMO ACESSO</span>
          <span>STATUS</span>
          <span />
        </div>
        {list.map((x) => (
          <div className="people-line" key={x.id}>
            <button className="person" onClick={() => p.open("person", { id: x.id })}>
              <i style={{ background: x.color }}>{x.initials}</i>
              <span>
                <strong>{x.name}</strong>
                <small>
                  {x.role} • {x.department}
                </small>
              </span>
            </button>
            <span>{x.email}</span>
            <span>{ROLE_LABEL[x.appRole]}</span>
            <span>{x.lastActive ? timeAgo(x.lastActive) : "nunca"}</span>
            <span className={`status ${x.userStatus === "active" ? "em" : "atrasado"}`}>{x.userStatus === "active" ? "Ativo" : "Inativo"}</span>
            <button onClick={() => p.open("person", { id: x.id })}>
              <Icon name="more" />
            </button>
          </div>
        ))}
        {d.invitations.map((inv) => (
          <div className="people-line" key={inv.id}>
            <span className="person">
              <i style={{ background: avatarFor(inv.id) }}>{initialsOf(inv.full_name || inv.email)}</i>
              <span>
                <strong>{inv.full_name || inv.email}</strong>
                <small>Convite enviado {timeAgo(inv.created_at)}</small>
              </span>
            </span>
            <span>{inv.email}</span>
            <span>{ROLE_LABEL[inv.role]}</span>
            <span>—</span>
            <span className="status atenção">Pendente</span>
            <button
              title="Cancelar convite"
              onClick={() => p.run(() => d.cancelInvite(inv.id), "Convite cancelado.")}
            >
              <Icon name="close" />
            </button>
          </div>
        ))}
      </section>
    </>
  );
}

export function CompaniesPage(p: PageProps) {
  const d = useData();
  const isPlatform = d.profile?.role === "platform_admin";
  return (
    <>
      <Heading eyebrow="GESTÃO MULTIEMPRESA" title="Empresas" subtitle="Ambientes independentes para cada cliente da consultoria.">
        {isPlatform && (
          <button className="primary" onClick={() => p.open("company", { title: "Adicionar empresa" })}>
            <Icon name="plus" />
            Nova empresa
          </button>
        )}
      </Heading>
      <div className="company-grid">
        {d.companies.map((c) => (
          <article className="panel company-card" key={c.id}>
            <div>
              <span style={{ background: c.primary_color ?? "#f4d58b", color: "#fff" }}>{initialsOf(c.name)}</span>
              <span className={`publish ${c.is_active ? "" : "draft"}`}>{c.is_active ? "Ativo" : "Inativo"}</span>
            </div>
            <h2>{c.name}</h2>
            <p>
              {c.id === d.company?.id ? "Ambiente atual • " : ""}
              {c.custom_domain || `${c.slug}`}
            </p>
            <div>
              <span>
                <strong>{c.people} pessoas</strong>
                <small>Cadastradas</small>
              </span>
              <span>
                <strong>{c.trails} trilhas</strong>
                <small>Próprias</small>
              </span>
            </div>
            <footer>
              <button onClick={() => p.open("company", { id: c.id })}>Gerenciar ambiente</button>
            </footer>
          </article>
        ))}
      </div>
      <section className="panel white-label">
        <div>
          <Icon name="building" />
          <span>
            <strong>Personalização por cliente</strong>
            <small>Cada empresa tem logotipo, cores, domínio e catálogo próprios.</small>
          </span>
        </div>
        <button onClick={() => p.navigate("Configurações")}>Configurar identidade</button>
      </section>
    </>
  );
}

export const REPORTS: [string, string, string, string][] = [
  ["executivo", "Relatório executivo", "Visão geral de adesão, evolução e conclusão", "chart"],
  ["trilhas", "Progresso por trilha", "Participantes, etapas e atrasos", "layers"],
  ["avaliacoes", "Desempenho em avaliações", "Notas e tentativas", "check"],
  ["engajamento", "Engajamento de usuários", "Acessos, tempo de estudo e conclusões", "users"],
];

/** Monta as linhas de cada relatório (usado na tela e na exportação). */
export function useReportRows() {
  const d = useData();
  return (id: string): (string | number)[][] => {
    if (id === "trilhas" || id === "executivo" || id === "equipe") {
      const rows = id === "equipe" ? d.report.filter((r) => d.team.some((t) => t.id === r.user_id)) : d.report;
      return [
        ["Pessoa", "E-mail", "Equipe", "Gestor", "Tipo", "Item", "Obrigatório", "Progresso (%)", "Prazo", "Situação", "Concluído em"],
        ...rows.map((r) => [
          r.full_name ?? "",
          r.email ?? "",
          r.department ?? "",
          r.manager_name ?? "",
          r.item_kind ?? "",
          r.item_title ?? "",
          r.mandatory ? "sim" : "não",
          Math.round(Number(r.progress_pct ?? 0)),
          r.due_date ? fmtDate(r.due_date, { day: "2-digit", month: "2-digit", year: "numeric" }) : "",
          r.situation ?? "",
          r.completed_at ? fmtDate(r.completed_at, { day: "2-digit", month: "2-digit", year: "numeric" }) : "",
        ]),
      ];
    }
    if (id === "avaliacoes") {
      return [
        ["Avaliação", "Questões", "Tentativas", "Nota média (%)", "Nota mínima (%)"],
        ...d.lessons
          .filter((l) => l.content.type === "quiz")
          .map((l) => {
            const s = d.quizStats.get(l.id);
            return [l.title, s?.questions ?? 0, s?.attempts ?? 0, s?.avg != null ? Math.round(s.avg) : "", l.content.pass_score];
          }),
      ];
    }
    // engajamento
    return [
      ["Pessoa", "E-mail", "Perfil", "Último acesso", "Conteúdos concluídos", "Tempo de estudo (min)", "Pontos"],
      ...d.people.map((x) => {
        const pr = d.teamProgress.filter((p) => p.user_id === x.id);
        return [
          x.name,
          x.email,
          ROLE_LABEL[x.appRole],
          x.lastActive ? fmtDate(x.lastActive, { day: "2-digit", month: "2-digit", year: "numeric" }) : "nunca",
          pr.filter((p) => p.status === "completed").length,
          Math.round(pr.reduce((a, p) => a + p.time_spent_seconds, 0) / 60),
          x.profile.xp,
        ];
      }),
    ];
  };
}

export function ReportsPage(p: PageProps) {
  const d = useData();
  const rowsFor = useReportRows();
  const months = useMemo(() => {
    const out: { label: string; n: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(1);
      dt.setMonth(dt.getMonth() - i);
      const key = dt.toISOString().slice(0, 7);
      out.push({
        label: dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        n: d.teamProgress.filter((x) => x.status === "completed" && x.completed_at?.startsWith(key)).length,
      });
    }
    return out;
  }, [d.teamProgress]);
  const max = Math.max(1, ...months.map((m) => m.n));
  return (
    <>
      <Heading eyebrow="GESTÃO" title="Relatórios" subtitle="Resultados de aprendizagem prontos para análise e apresentação.">
        <button className="primary" onClick={() => p.open("report", { id: "executivo", title: "Relatório executivo" })}>
          <Icon name="chart" />
          Abrir relatório executivo
        </button>
      </Heading>
      <div className="report-grid">
        {REPORTS.map((r, i) => (
          <article className="panel report-card" key={r[0]}>
            <span className={`metric-icon ${["purple", "green", "orange", "blue"][i]}`}>
              <Icon name={r[3]} />
            </span>
            <h2>{r[1]}</h2>
            <p>{r[2]}</p>
            <div>
              <button onClick={() => p.open("report", { id: r[0], title: r[1] })}>Abrir relatório</button>
              <button
                onClick={() => {
                  downloadCsv(`${r[0]}.csv`, rowsFor(r[0]));
                  p.notify(`${r[1]} exportado em planilha.`);
                }}
              >
                Exportar
              </button>
            </div>
          </article>
        ))}
      </div>
      <article className="panel chart-card wide-chart">
        <SectionTitle
          title="Conteúdos concluídos por mês"
          subtitle="Últimos seis meses"
          action="Exportar dados"
          onClick={() => downloadCsv("conclusoes-por-mes.csv", [["Mês", "Conclusões"], ...months.map((m) => [m.label, m.n])])}
        />
        <div className="bars horizontal">
          {months.map((m, i) => (
            <div key={i} title={`${m.n} conclusões`}>
              <span style={{ height: `${Math.max(4, (m.n / max) * 100)}%` }} />
              <small>{m.label}</small>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

type Settings = { monthly_goal?: number; auto_progress?: boolean; certificates?: boolean; allow_download?: boolean; reminders?: boolean };

export function SettingsPage(p: PageProps) {
  const d = useData();
  const c = d.company;
  const initial = (c?.settings ?? {}) as Settings;
  const [section, setSection] = useState("Geral");
  const [name, setName] = useState(c?.name ?? "");
  const [color, setColor] = useState(c?.primary_color ?? "#6658D5");
  const [logo, setLogo] = useState(c?.logo_url ?? "");
  const [policy, setPolicy] = useState(c?.privacy_policy_url ?? "");
  const [version, setVersion] = useState(c?.privacy_policy_version ?? "1.0");
  const [s, setS] = useState<Settings>({
    monthly_goal: initial.monthly_goal ?? 4,
    auto_progress: initial.auto_progress ?? true,
    certificates: initial.certificates ?? true,
    allow_download: initial.allow_download ?? false,
    reminders: initial.reminders ?? true,
  });
  if (!c) return null;
  const toggles: [keyof Settings, string, string][] = [
    ["auto_progress", "Salvar progresso automaticamente", "Retoma vídeos e conteúdos do ponto exato."],
    ["certificates", "Emitir certificados", "Libera o certificado ao concluir a trilha."],
    ["allow_download", "Permitir download de materiais", "Mostra o botão de baixar arquivos dos conteúdos."],
    ["reminders", "Enviar lembretes de prazo", "Avisa sobre trilhas próximas do vencimento."],
  ];
  const save = () =>
    p.run(
      () =>
        d.saveCompany(c.id, {
          name,
          primary_color: color,
          logo_url: logo || null,
          privacy_policy_url: policy || null,
          privacy_policy_version: version || "1.0",
          settings: { ...(c.settings as object), ...s },
        }),
      "Todas as configurações foram salvas.",
    );
  return (
    <>
      <Heading eyebrow="GESTÃO" title="Configurações" subtitle="Preferências do ambiente, aprendizagem e comunicação.">
        <button className="primary" onClick={save}>
          Salvar alterações
        </button>
      </Heading>
      <div className="settings-layout">
        <nav className="panel settings-nav">
          {["Geral", "Identidade visual", "Aprendizagem", "Privacidade"].map((x) => (
            <button className={section === x ? "selected" : ""} key={x} onClick={() => setSection(x)}>
              {x}
              <Icon name="arrow" size={14} />
            </button>
          ))}
        </nav>
        <section className="panel settings-form">
          {section === "Geral" && (
            <>
              <h2>Configurações gerais</h2>
              <p>Informações exibidas neste ambiente.</p>
              <div className="form-grid">
                <label>
                  Nome do ambiente
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  Endereço
                  <input value={c.custom_domain || c.slug} disabled />
                </label>
                <label>
                  Idioma
                  <select disabled>
                    <option>Português (Brasil)</option>
                  </select>
                </label>
                <label>
                  Fuso horário
                  <select disabled>
                    <option>Brasília (GMT-3)</option>
                  </select>
                </label>
              </div>
            </>
          )}
          {section === "Identidade visual" && (
            <>
              <h2>Identidade visual</h2>
              <p>Cor principal e logotipo deste cliente. A cor muda na hora para todos.</p>
              <div className="form-grid">
                <label>
                  Cor principal
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} />
                </label>
                <label>
                  Endereço do logotipo (URL)
                  <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" />
                </label>
              </div>
            </>
          )}
          {section === "Aprendizagem" && (
            <>
              <h2>Regras de aprendizagem</h2>
              <p>Valem para todas as pessoas desta empresa.</p>
              <div className="form-grid">
                <label>
                  Meta mensal (conteúdos por pessoa)
                  <input type="number" min={1} max={50} value={s.monthly_goal} onChange={(e) => setS({ ...s, monthly_goal: Number(e.target.value) })} />
                </label>
              </div>
              {toggles.map((x) => (
                <button className="toggle-row" key={x[0]} onClick={() => setS({ ...s, [x[0]]: !s[x[0]] })}>
                  <span>
                    <strong>{x[1]}</strong>
                    <small>{x[2]}</small>
                  </span>
                  <i className={s[x[0]] ? "on" : ""}>
                    <b />
                  </i>
                </button>
              ))}
            </>
          )}
          {section === "Privacidade" && (
            <>
              <h2>Privacidade e LGPD</h2>
              <p>No primeiro acesso, cada pessoa aceita a política abaixo. O aceite fica registrado com data e versão.</p>
              <div className="form-grid">
                <label>
                  Link da política de privacidade
                  <input value={policy} onChange={(e) => setPolicy(e.target.value)} placeholder="https://empresa.com.br/privacidade" />
                </label>
                <label>
                  Versão da política
                  <input value={version} onChange={(e) => setVersion(e.target.value)} />
                </label>
              </div>
              <div className="danger-zone">
                <div>
                  <strong>Mudou a política?</strong>
                  <small>Altere a versão: todos precisarão aceitar de novo no próximo acesso.</small>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
