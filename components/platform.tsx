"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { allowedRoles, roleOf, initialsOf, useData, type Role } from "@/lib/data";
import { AuthScreen, ConsentScreen, NewPasswordScreen, NoCompanyScreen, Splash, VerifyScreen } from "./auth";
import { Drawer } from "./drawers";
import { AchievementsPage, ContentLibrary, FavoritesPage, JourneyPage, LearnerHome, TrailCatalog } from "./learner";
import {
  ManagerContentPage,
  ManagerHome,
  ManagerTrailPage,
  PeoplePage,
  RecommendationsPage,
  TeamTrailsPage,
  TrackingPage,
} from "./manager";
import { AdminHome, AdminLibrary, AssessmentsPage, CompaniesPage, ReportsPage, SettingsPage, UsersPage } from "./admin";
import { Icon, Loading, type DrawerKind, type DrawerState, type PageProps } from "./ui";

const nav: Record<Role, { section?: string; label: string; icon: string }[]> = {
  colaborador: [
    { label: "Início", icon: "home" },
    { section: "DESENVOLVIMENTO", label: "Minha jornada", icon: "route" },
    { label: "Trilhas", icon: "layers" },
    { label: "Conteúdos", icon: "play" },
    { section: "MINHA CONTA", label: "Favoritos", icon: "heart" },
    { label: "Conquistas", icon: "award" },
  ],
  gestor: [
    { label: "Visão geral", icon: "grid" },
    { section: "MINHA EQUIPE", label: "Pessoas", icon: "users" },
    { label: "Trilhas da equipe", icon: "layers" },
    { label: "Acompanhamento", icon: "chart" },
    { section: "DESENVOLVIMENTO DO TIME", label: "Recomendações", icon: "spark" },
    { section: "MEU DESENVOLVIMENTO", label: "Minha trilha", icon: "route" },
    { label: "Conteúdos para gestores", icon: "play" },
  ],
  admin: [
    { label: "Dashboard", icon: "grid" },
    { section: "CONTEÚDO", label: "Biblioteca", icon: "book" },
    { label: "Trilhas", icon: "layers" },
    { label: "Avaliações", icon: "check" },
    { section: "GESTÃO", label: "Usuários", icon: "users" },
    { label: "Empresas", icon: "building" },
    { label: "Relatórios", icon: "chart" },
    { label: "Configurações", icon: "settings" },
  ],
};
const HOME: Record<Role, string> = { colaborador: "Início", gestor: "Visão geral", admin: "Dashboard" };
const ROLE_NAME: Record<Role, string> = { colaborador: "Colaborador", gestor: "Gestor", admin: "Administrador" };

export function Platform() {
  const d = useData();
  const [verify] = useState<string | null>(() => new URLSearchParams(window.location.search).get("verificar"));
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (verify) return <VerifyScreen code={verify} />;
  if (!d.ready) return <Splash />;
  if (!d.session) return <AuthScreen />;
  if (recovery) return <NewPasswordScreen done={() => setRecovery(false)} />;
  if (d.error && !d.profile) return <Splash text={`Não foi possível carregar: ${d.error}`} />;
  if (!d.profile) return <Splash />;
  if (!d.profile.company_id) return <NoCompanyScreen />;
  if (!d.company) return <Splash />;
  const needsConsent =
    !d.profile.privacy_consented_at || (d.profile.privacy_policy_version ?? "") !== (d.company.privacy_policy_version ?? "1.0");
  if (needsConsent) return <ConsentScreen />;
  return <App />;
}

function App() {
  const d = useData();
  const roles = allowedRoles(d.profile?.role);
  const [role, setRole] = useState<Role>(() => roleOf(d.profile?.role));
  const [activeNav, setActiveNav] = useState(HOME[roleOf(d.profile?.role)]);
  const [sidebar, setSidebar] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [query, setQuery] = useState("");

  function notify(text: string, bad = false) {
    setToast({ text, bad });
    window.setTimeout(() => setToast(null), bad ? 5000 : 2600);
  }
  function open(kind: DrawerKind, opts?: { id?: string; title?: string; body?: string }) {
    setDrawer({ kind, ...opts });
  }
  async function run(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn();
      if (ok) notify(ok);
      return true;
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      notify(m.includes("row-level security") ? "Você não tem permissão para fazer isso." : m, true);
      return false;
    }
  }
  function chooseRole(next: Role) {
    setRole(next);
    setActiveNav(HOME[next]);
    setSidebar(false);
    setQuery("");
  }
  function navigate(label: string) {
    if (!nav[role].some((n) => n.label === label)) {
      const owner = (Object.keys(nav) as Role[]).find((r) => roles.includes(r) && nav[r].some((n) => n.label === label));
      if (owner) setRole(owner);
    }
    setActiveNav(label);
    setSidebar(false);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return [
      ...d.lessons
        .filter((x) => `${x.title} ${x.tag} ${x.type}`.toLowerCase().includes(q))
        .map((x) => ({ id: x.id, title: x.title, meta: `${x.type} • ${x.time}`, kind: "content" as DrawerKind })),
      ...d.trails
        .filter((x) => x.title.toLowerCase().includes(q))
        .map((x) => ({ id: x.id, title: x.title, meta: `Trilha • ${x.modules} conteúdos`, kind: "trail" as DrawerKind })),
      ...(role === "colaborador" ? [] : role === "gestor" ? d.team : d.people)
        .filter((x) => `${x.name} ${x.role} ${x.email}`.toLowerCase().includes(q))
        .map((x) => ({ id: x.id, title: x.name, meta: x.role, kind: "person" as DrawerKind })),
    ].slice(0, 6);
  }, [query, d.lessons, d.trails, d.team, d.people, role]);

  const pendingJourney = d.myEnrollments.filter((e) => e.track_id && e.status !== "completed").length;
  const unread = d.notifications.some((n) => !n.read_at);
  const me = d.profile!;
  const p: PageProps = { open, notify, navigate, run };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">D</span>
          <span>
            desenvolve<em>.</em>
          </span>
        </div>
        <button className="mobile-close" onClick={() => setSidebar(false)} aria-label="Fechar menu">
          <Icon name="close" />
        </button>
        <button className="tenant" onClick={() => open("company", { id: d.company?.id })}>
          {d.company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="tenant-logo" src={d.company.logo_url} alt="" />
          ) : (
            <span className="tenant-logo">{initialsOf(d.company?.name ?? "")}</span>
          )}
          <span>
            <small>AMBIENTE</small>
            {d.company?.name}
          </span>
          <b>⌄</b>
        </button>
        <nav>
          {nav[role].map((item, index) => (
            <div key={`${item.label}-${index}`}>
              {item.section && <p className="nav-section">{item.section}</p>}
              <button title={item.label} className={activeNav === item.label ? "active" : ""} onClick={() => navigate(item.label)}>
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.label === "Minha jornada" && pendingJourney > 0 && <i>{pendingJourney}</i>}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="help-card" onClick={() => open("support")}>
            <span>?</span>
            <div>
              <strong>Precisa de ajuda?</strong>
              <small>Fale com o suporte</small>
            </div>
          </button>
          <button className="user-mini" onClick={() => open("profile")}>
            <span>{initialsOf(me.full_name || me.email)}</span>
            <div>
              <strong>{me.full_name || me.email}</strong>
              <small>{ROLE_NAME[role]}</small>
            </div>
            <Icon name="more" size={17} />
          </button>
        </div>
      </aside>
      {sidebar && <button className="scrim" onClick={() => setSidebar(false)} aria-label="Fechar menu" />}
      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebar(true)} aria-label="Abrir menu">
            <Icon name="menu" />
          </button>
          <div className="search-wrap">
            <label className="search">
              <Icon name="search" size={19} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conteúdos, trilhas e pessoas" />
            </label>
            {query && (
              <div className="search-results">
                {searchResults.length ? (
                  searchResults.map((r, i) => (
                    <button
                      key={`${r.id}-${i}`}
                      onClick={() => {
                        open(r.kind, { id: r.id });
                        setQuery("");
                      }}
                    >
                      <Icon name={r.kind === "person" ? "users" : r.kind === "content" ? "play" : "layers"} />
                      <span>
                        <strong>{r.title}</strong>
                        <small>{r.meta}</small>
                      </span>
                      <Icon name="arrow" size={15} />
                    </button>
                  ))
                ) : (
                  <p>Nenhum resultado encontrado.</p>
                )}
              </div>
            )}
          </div>
          {roles.length > 1 && (
            <div className="role-switcher">
              <span>Visualizar como</span>
              <select value={role} onChange={(e) => chooseRole(e.target.value as Role)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_NAME[r]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className="icon-button" onClick={() => open("notifications")} aria-label="Notificações">
            <Icon name="bell" size={19} />
            {unread && <i />}
          </button>
          <button className="top-avatar" onClick={() => open("profile")} aria-label="Meu perfil">
            {initialsOf(me.full_name || me.email)}
          </button>
        </header>
        <div className="page">
          {d.loading && !d.lessons.length ? <Loading /> : <PageRouter role={role} page={activeNav} {...p} />}
        </div>
      </section>
      {drawer && <Drawer state={drawer} close={() => setDrawer(null)} {...p} />}
      {toast && (
        <div className={`toast ${toast.bad ? "bad" : ""}`}>
          <span>{toast.bad ? "!" : "✓"}</span>
          {toast.text}
        </div>
      )}
    </main>
  );
}

function PageRouter({ role, page, ...p }: PageProps & { role: Role; page: string }) {
  if (role === "colaborador") {
    if (page === "Início") return <LearnerHome {...p} />;
    if (page === "Minha jornada") return <JourneyPage {...p} />;
    if (page === "Trilhas") return <TrailCatalog {...p} learner />;
    if (page === "Conteúdos") return <ContentLibrary {...p} />;
    if (page === "Favoritos") return <FavoritesPage {...p} />;
    return <AchievementsPage {...p} />;
  }
  if (role === "gestor") {
    if (page === "Visão geral") return <ManagerHome {...p} />;
    if (page === "Pessoas") return <PeoplePage {...p} />;
    if (page === "Trilhas da equipe") return <TeamTrailsPage {...p} />;
    if (page === "Acompanhamento") return <TrackingPage {...p} />;
    if (page === "Recomendações") return <RecommendationsPage {...p} />;
    if (page === "Minha trilha") return <ManagerTrailPage {...p} />;
    return <ManagerContentPage {...p} />;
  }
  if (page === "Dashboard") return <AdminHome {...p} />;
  if (page === "Biblioteca") return <AdminLibrary {...p} />;
  if (page === "Trilhas") return <TrailCatalog {...p} />;
  if (page === "Avaliações") return <AssessmentsPage {...p} />;
  if (page === "Usuários") return <UsersPage {...p} />;
  if (page === "Empresas") return <CompaniesPage {...p} />;
  if (page === "Relatórios") return <ReportsPage {...p} />;
  return <SettingsPage {...p} />;
}
