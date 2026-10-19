"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, type Tables, type Views, type Enums } from "./supabase";

// ---------------------------------------------------------------------------
// Tipos usados pelas telas (mesmo formato que o protótipo usava)
// ---------------------------------------------------------------------------
export type Role = "colaborador" | "gestor" | "admin";
export type ContentRow = Tables<"contents">;
export type TrackRow = Tables<"tracks">;
export type Profile = Tables<"profiles">;
export type Company = Tables<"companies">;
export type Enrollment = Tables<"enrollments">;
export type Progress = Tables<"content_progress">;
export type Notification = Tables<"notifications">;
export type Certificate = Tables<"certificates">;
export type ReportRow = Views<"report_learner_progress">;
export type AppRole = Enums<"app_role">;

export type Lesson = {
  id: string;
  title: string;
  type: string;
  time: string;
  progress: number;
  color: string;
  tag: string;
  content: ContentRow;
};

export type TrackModule = {
  id: string;
  title: string;
  position: number;
  items: { contentId: string; required: boolean; position: number }[];
};
export type TrackFull = TrackRow & { modules: TrackModule[] };

export type Trail = {
  id: string;
  title: string;
  description: string;
  modules: number;
  progress: number;
  people: number;
  status: string;
  tone: string;
  track: TrackFull;
  enrollment?: Enrollment;
};

export type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
  progress: number;
  status: "Em dia" | "Atenção" | "Atrasado";
  color: string;
  email: string;
  department: string;
  appRole: AppRole;
  userStatus: Enums<"user_status">;
  lastActive: string | null;
  profile: Profile;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  allowMultiple: boolean;
  options: { id: string; label: string }[];
};

// ---------------------------------------------------------------------------
// Utilitários de apresentação
// ---------------------------------------------------------------------------
const COLORS = ["coral", "mint", "butter", "violet", "blue", "green"];
const TONES = ["purple", "blue", "green", "orange"];
const AVATAR = ["#7467df", "#e78f7d", "#62a881", "#d69a45", "#5b8eaf", "#b07ad1"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export const colorFor = (id: string) => COLORS[hash(id) % COLORS.length];
export const toneFor = (id: string) => TONES[hash(id) % TONES.length];
export const avatarFor = (id: string) => AVATAR[hash(id) % AVATAR.length];
export const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("") || "?";

export const TYPE_LABEL: Record<Enums<"content_type">, string> = {
  video: "Vídeo",
  text: "Artigo",
  pdf: "PDF",
  scorm: "Interativo",
  quiz: "Avaliação",
  link: "Link",
  assignment: "Atividade",
};
export const STATUS_LABEL: Record<Enums<"publish_status">, string> = {
  draft: "Rascunho",
  published: "Publicada",
  archived: "Arquivada",
};
export const ROLE_LABEL: Record<AppRole, string> = {
  platform_admin: "Consultor",
  company_admin: "Administrador",
  manager: "Gestor",
  learner: "Colaborador",
};

export function roleOf(r: AppRole | undefined): Role {
  if (r === "platform_admin" || r === "company_admin") return "admin";
  if (r === "manager") return "gestor";
  return "colaborador";
}
export function allowedRoles(r: AppRole | undefined): Role[] {
  const real = roleOf(r);
  if (real === "admin") return ["colaborador", "gestor", "admin"];
  if (real === "gestor") return ["colaborador", "gestor"];
  return ["colaborador"];
}

export function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "";
  const date = d.length === 10 ? new Date(`${d}T12:00:00`) : new Date(d);
  return date.toLocaleDateString("pt-BR", opts ?? { day: "numeric", month: "long" });
}
export function timeAgo(d: string | null | undefined) {
  if (!d) return "nunca";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)}h`;
  const days = Math.round(s / 86400);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return fmtDate(d, { day: "numeric", month: "short", year: "numeric" });
}
export const minutes = (m: number | null | undefined) => (m ? `${m} min` : "—");
export function hours(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}` : `${m} min`;
}

export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Estado carregado do banco
// ---------------------------------------------------------------------------
type Loaded = {
  profile: Profile | null;
  company: Company | null;
  categories: Map<string, string>;
  contents: ContentRow[];
  tracks: TrackFull[];
  progress: Map<string, Progress>;
  myEnrollments: Enrollment[];
  favorites: Set<string>;
  notifications: Notification[];
  certificates: Certificate[];
  activityDays: string[];
  // equipe / empresa (gestor e admin)
  profiles: Profile[];
  departments: Tables<"departments">[];
  groups: Tables<"groups">[];
  invitations: Tables<"invitations">[];
  enrollments: Enrollment[];
  teamProgress: Progress[];
  report: ReportRow[];
  overview: Views<"report_company_overview"> | null;
  companies: (Company & { people: number; trails: number })[];
  quizStats: Map<string, { questions: number; attempts: number; avg: number | null }>;
  myAssignments: Tables<"assignments">[];
  supportRequests: Tables<"support_requests">[];
};

const EMPTY: Loaded = {
  profile: null,
  company: null,
  categories: new Map(),
  contents: [],
  tracks: [],
  progress: new Map(),
  myEnrollments: [],
  favorites: new Set(),
  notifications: [],
  certificates: [],
  activityDays: [],
  profiles: [],
  departments: [],
  groups: [],
  invitations: [],
  enrollments: [],
  teamProgress: [],
  report: [],
  overview: null,
  companies: [],
  quizStats: new Map(),
  myAssignments: [],
  supportRequests: [],
};

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

async function loadAll(userId: string): Promise<Loaded> {
  const profile = must(
    await supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  ) as Profile | null;
  if (!profile || !profile.company_id) return { ...EMPTY, profile };
  const companyId = profile.company_id;
  const real = roleOf(profile.role);
  const staff = real !== "colaborador";
  const admin = real === "admin";

  const [
    company,
    categories,
    contents,
    tracks,
    modules,
    items,
    progress,
    myEnrollments,
    favorites,
    notifications,
    certificates,
    activity,
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", companyId).maybeSingle(),
    supabase.from("categories").select("id,name"),
    supabase.from("contents").select("*").order("title"),
    supabase.from("tracks").select("*").order("created_at"),
    supabase.from("track_modules").select("*").order("position"),
    supabase.from("track_items").select("*").order("position"),
    supabase.from("content_progress").select("*").eq("user_id", userId),
    supabase.from("enrollments").select("*").eq("user_id", userId),
    supabase.from("favorites").select("*").eq("user_id", userId),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("certificates").select("*").eq("user_id", userId).order("issued_at", { ascending: false }),
    supabase
      .from("user_activity_days")
      .select("day")
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(60),
  ]);

  const mods = must(modules);
  const its = must(items);
  const fullTracks: TrackFull[] = must(tracks)
    // consultor vê tudo: na tela, mostramos o que é da empresa ou licenciado/visível
    .filter((t) => t.company_id === companyId || t.company_id === null)
    .map((t) => ({
      ...t,
      modules: mods
        .filter((m) => m.track_id === t.id)
        .map((m) => ({
          id: m.id,
          title: m.title,
          position: m.position,
          items: its
            .filter((i) => i.module_id === m.id)
            .map((i) => ({ contentId: i.content_id, required: i.required, position: i.position })),
        })),
    }));

  const out: Loaded = {
    ...EMPTY,
    profile,
    company: must(company) as Company | null,
    categories: new Map(must(categories).map((c) => [c.id, c.name])),
    contents: must(contents).filter((c) => c.company_id === companyId || c.company_id === null),
    tracks: fullTracks,
    progress: new Map(must(progress).map((p) => [p.content_id, p])),
    myEnrollments: must(myEnrollments),
    favorites: new Set(
      must(favorites).map((f) => (f.content_id ? `c:${f.content_id}` : `t:${f.track_id}`)),
    ),
    notifications: must(notifications),
    certificates: must(certificates),
    activityDays: must(activity).map((a) => a.day),
  };

  // Consultor da plataforma: só mostra conteúdo global licenciado para esta empresa
  if (profile.role === "platform_admin") {
    const lic = must(
      await supabase.from("library_licenses").select("*").eq("company_id", companyId),
    );
    const licTracks = new Set(lic.map((l) => l.track_id).filter(Boolean));
    const licContents = new Set(lic.map((l) => l.content_id).filter(Boolean));
    out.tracks = out.tracks.filter((t) => t.company_id === companyId || licTracks.has(t.id));
    const inLicTracks = new Set(
      out.tracks.flatMap((t) => t.modules.flatMap((m) => m.items.map((i) => i.contentId))),
    );
    out.contents = out.contents.filter(
      (c) => c.company_id === companyId || licContents.has(c.id) || inLicTracks.has(c.id),
    );
  }

  if (!staff) return out;

  const [profiles, departments, groups, enrollments, teamProgress, report, overview, myAssignments] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("company_id", companyId).order("full_name"),
      supabase.from("departments").select("*").eq("company_id", companyId).order("name"),
      supabase.from("groups").select("*").eq("company_id", companyId).order("name"),
      supabase.from("enrollments").select("*").eq("company_id", companyId),
      supabase.from("content_progress").select("*").eq("company_id", companyId),
      supabase.from("report_learner_progress").select("*").eq("company_id", companyId),
      supabase.from("report_company_overview").select("*").eq("company_id", companyId).maybeSingle(),
      supabase.from("assignments").select("*").eq("assigned_by", userId).order("created_at", { ascending: false }),
    ]);
  out.profiles = must(profiles);
  out.departments = must(departments);
  out.groups = must(groups);
  out.enrollments = must(enrollments);
  out.teamProgress = must(teamProgress);
  out.report = must(report);
  out.overview = must(overview) as Views<"report_company_overview"> | null;
  out.myAssignments = must(myAssignments);

  if (admin) {
    const quizIds = out.contents.filter((c) => c.type === "quiz").map((c) => c.id);
    const [invitations, companies, allProfiles, questions, attempts, support] = await Promise.all([
      supabase.from("invitations").select("*").eq("company_id", companyId).is("accepted_at", null),
      supabase.from("companies").select("*").order("name"),
      profile.role === "platform_admin"
        ? supabase.from("profiles").select("id,company_id")
        : Promise.resolve({ data: [] as { id: string; company_id: string | null }[], error: null }),
      quizIds.length
        ? supabase.from("quiz_questions").select("id,content_id").in("content_id", quizIds)
        : Promise.resolve({ data: [] as { id: string; content_id: string }[], error: null }),
      quizIds.length
        ? supabase.from("quiz_attempts").select("content_id,score").in("content_id", quizIds)
        : Promise.resolve({ data: [] as { content_id: string; score: number }[], error: null }),
      supabase.from("support_requests").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    out.invitations = must(invitations);
    const ap = must(allProfiles);
    out.companies = must(companies).map((c) => ({
      ...c,
      people:
        c.id === companyId && !ap.length
          ? out.profiles.length
          : ap.filter((p) => p.company_id === c.id).length,
      trails: fullTracks.filter((t) => t.company_id === c.id).length,
    }));
    const qs = must(questions);
    const at = must(attempts);
    for (const id of quizIds) {
      const scores = at.filter((a) => a.content_id === id).map((a) => Number(a.score));
      out.quizStats.set(id, {
        questions: qs.filter((q) => q.content_id === id).length,
        attempts: scores.length,
        avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      });
    }
    out.supportRequests = must(support);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------
type Ctx = Loaded & {
  session: Session | null;
  ready: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // derivados
  lessons: Lesson[];
  lessonById: (id: string) => Lesson | undefined;
  trails: Trail[];
  trailById: (id: string) => Trail | undefined;
  people: Person[];
  team: Person[];
  streak: number;
  // ações
  signOut: () => Promise<void>;
  setProgress: (
    contentId: string,
    status: "in_progress" | "completed",
    pct?: number,
    extra?: { last_position?: string; time_spent_seconds?: number },
  ) => Promise<void>;
  toggleFavorite: (contentId: string) => Promise<boolean>;
  enrollTrack: (trackId: string) => Promise<void>;
  loadQuiz: (contentId: string) => Promise<QuizQuestion[]>;
  submitQuiz: (
    contentId: string,
    answers: Record<string, string[]>,
  ) => Promise<{ score: number; passed: boolean; pass_score: number; questions: { question_id: string; correct: boolean }[] }>;
  fileUrl: (path: string) => Promise<string | null>;
  markAllRead: () => Promise<void>;
  updateMyProfile: (fields: { full_name?: string; job_title?: string | null; unit?: string | null }) => Promise<void>;
  sendSupport: (subject: string, message: string) => Promise<void>;
  invite: (inv: {
    full_name: string;
    email: string;
    role: AppRole;
    department_id: string | null;
    job_title?: string | null;
    manager_id?: string | null;
  }) => Promise<void>;
  createContent: (c: {
    title: string;
    type: Enums<"content_type">;
    description: string;
    body?: string;
    external_url?: string;
    category_id?: string | null;
    duration_minutes?: number | null;
    audience: Enums<"audience">;
    status: Enums<"publish_status">;
    file?: File | null;
  }) => Promise<void>;
  createTrack: (t: {
    title: string;
    description: string;
    audience: Enums<"audience">;
    status: Enums<"publish_status">;
    sequential: boolean;
    contentIds: string[];
  }) => Promise<void>;
  createQuiz: (q: {
    title: string;
    description: string;
    pass_score: number;
    status: Enums<"publish_status">;
    questions: { prompt: string; options: { label: string; correct: boolean }[] }[];
  }) => Promise<void>;
  setContentStatus: (id: string, status: Enums<"publish_status">) => Promise<void>;
  setTrackStatus: (id: string, status: Enums<"publish_status">) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  assign: (a: {
    target_type: Enums<"assignment_target">;
    target_ids: (string | null)[];
    content_id?: string | null;
    track_id?: string | null;
    mandatory: boolean;
    due_date: string | null;
    message: string | null;
  }) => Promise<number>;
  sendReminder: (userIds: string[], message?: string) => Promise<number>;
  updatePerson: (id: string, fields: Partial<Pick<Profile, "role" | "status" | "department_id" | "manager_id" | "job_title">>) => Promise<void>;
  cancelInvite: (id: string) => Promise<void>;
  saveCompany: (id: string | null, fields: Partial<Company>) => Promise<void>;
};

const DataContext = createContext<Ctx | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData fora do DataProvider");
  return ctx;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Loaded>(EMPTY);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setData(await loadAll(userId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    supabase.rpc("touch_activity").then(() =>
      loadAll(userId)
        .then((r) => {
          if (!alive) return;
          setData(r);
          setError(null);
        })
        .catch((e) => alive && setError(e instanceof Error ? e.message : String(e))),
    );
    return () => {
      alive = false;
    };
  }, [userId]);

  // Marca de cor da empresa (white-label)
  useEffect(() => {
    const c = data.company?.primary_color;
    if (!c) return;
    document.documentElement.style.setProperty("--purple", c);
    document.documentElement.style.setProperty("--purple-dark", shade(c, -0.14));
  }, [data.company?.primary_color]);

  // ---- derivados ----------------------------------------------------------
  const derived = useMemo(() => {
    const cat = data.categories;
    const lessons: Lesson[] = data.contents.map((c) => {
      const p = data.progress.get(c.id);
      return {
        id: c.id,
        title: c.title,
        type: TYPE_LABEL[c.type],
        time: minutes(c.duration_minutes),
        progress: p ? (p.status === "completed" ? 100 : Math.round(Number(p.progress_pct))) : 0,
        color: colorFor(c.id),
        tag: (c.category_id && cat.get(c.category_id)) || "Geral",
        content: c,
      };
    });
    const lessonMap = new Map(lessons.map((l) => [l.id, l]));

    const enrollCount = new Map<string, number>();
    for (const e of data.enrollments) if (e.track_id) enrollCount.set(e.track_id, (enrollCount.get(e.track_id) ?? 0) + 1);

    const trails: Trail[] = data.tracks.map((t) => {
      const enrollment = data.myEnrollments.find((e) => e.track_id === t.id);
      const ids = t.modules.flatMap((m) => m.items.filter((i) => i.required).map((i) => i.contentId));
      const done = ids.filter((id) => data.progress.get(id)?.status === "completed").length;
      return {
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        modules: t.modules.reduce((n, m) => n + m.items.length, 0),
        progress: enrollment ? Math.round(Number(enrollment.progress_pct)) : ids.length ? Math.round((done * 100) / ids.length) : 0,
        people: enrollCount.get(t.id) ?? 0,
        status: STATUS_LABEL[t.status],
        tone: toneFor(t.id),
        track: t,
        enrollment,
      };
    });
    const trailMap = new Map(trails.map((t) => [t.id, t]));

    const depName = new Map(data.departments.map((d) => [d.id, d.name]));
    const people: Person[] = data.profiles.map((p) => {
      const rows = data.enrollments.filter((e) => e.user_id === p.id);
      const avg = rows.length ? rows.reduce((a, e) => a + Number(e.progress_pct), 0) / rows.length : 0;
      const today = new Date().toISOString().slice(0, 10);
      const late = rows.some((e) => e.status !== "completed" && e.due_date && e.due_date < today);
      return {
        id: p.id,
        name: p.full_name || p.email,
        initials: initialsOf(p.full_name || p.email),
        role: p.job_title || ROLE_LABEL[p.role],
        progress: Math.round(avg),
        status: late ? "Atrasado" : rows.length && avg < 50 ? "Atenção" : "Em dia",
        color: avatarFor(p.id),
        email: p.email,
        department: (p.department_id && depName.get(p.department_id)) || "Sem equipe",
        appRole: p.role,
        userStatus: p.status,
        lastActive: p.last_active_at,
        profile: p,
      };
    });
    const me = data.profile?.id;
    const team = people.filter((p) => p.profile.manager_id === me);

    // sequência de dias seguidos com acesso
    let streak = 0;
    const days = new Set(data.activityDays);
    const d = new Date();
    for (;;) {
      const key = d.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }

    return {
      lessons,
      lessonById: (id: string) => lessonMap.get(id),
      trails,
      trailById: (id: string) => trailMap.get(id),
      people,
      team,
      streak,
    };
  }, [data]);

  // ---- ações --------------------------------------------------------------
  const companyId = data.profile?.company_id ?? null;

  const actions = useMemo(() => {
    const ensure = (res: { error: { message: string } | null }) => {
      if (res.error) throw new Error(res.error.message);
    };
    return {
      signOut: async () => {
        await supabase.auth.signOut();
        setData(EMPTY);
      },
      setProgress: async (
        contentId: string,
        status: "in_progress" | "completed",
        pct?: number,
        extra?: { last_position?: string; time_spent_seconds?: number },
      ) => {
        if (!userId) return;
        const cur = data.progress.get(contentId);
        if (cur?.status === "completed" && !extra) return;
        const value = status === "completed" ? 100 : Math.max(Number(cur?.progress_pct ?? 0), pct ?? 5);
        ensure(
          await supabase.from("content_progress").upsert(
            {
              user_id: userId,
              content_id: contentId,
              status: cur?.status === "completed" ? "completed" : status,
              progress_pct: value,
              ...(extra?.last_position !== undefined ? { last_position: extra.last_position } : {}),
              ...(extra?.time_spent_seconds !== undefined
                ? { time_spent_seconds: (cur?.time_spent_seconds ?? 0) + extra.time_spent_seconds }
                : {}),
            },
            { onConflict: "user_id,content_id" },
          ),
        );
        await refresh();
      },
      toggleFavorite: async (contentId: string) => {
        if (!userId) return false;
        const on = data.favorites.has(`c:${contentId}`);
        if (on) ensure(await supabase.from("favorites").delete().eq("user_id", userId).eq("content_id", contentId));
        else ensure(await supabase.from("favorites").insert({ user_id: userId, content_id: contentId }));
        setData((d) => {
          const f = new Set(d.favorites);
          if (on) f.delete(`c:${contentId}`);
          else f.add(`c:${contentId}`);
          return { ...d, favorites: f };
        });
        return !on;
      },
      enrollTrack: async (trackId: string) => {
        if (!userId || !companyId) return;
        ensure(await supabase.from("enrollments").insert({ user_id: userId, company_id: companyId, track_id: trackId }));
        await refresh();
      },
      loadQuiz: async (contentId: string) => {
        const qs = must(
          await supabase.from("quiz_questions").select("*").eq("content_id", contentId).order("position"),
        );
        const opts = qs.length
          ? must(await supabase.from("quiz_options").select("*").in("question_id", qs.map((q) => q.id)).order("position"))
          : [];
        return qs.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          allowMultiple: q.allow_multiple,
          options: opts.filter((o) => o.question_id === q.id).map((o) => ({ id: o.id, label: o.label })),
        }));
      },
      submitQuiz: async (contentId: string, answers: Record<string, string[]>) => {
        const res = await supabase.rpc("submit_quiz", { p_content_id: contentId, p_answers: answers });
        if (res.error) throw new Error(res.error.message);
        await refresh();
        return res.data as unknown as {
          score: number;
          passed: boolean;
          pass_score: number;
          questions: { question_id: string; correct: boolean }[];
        };
      },
      fileUrl: async (path: string) => {
        const { data: signed } = await supabase.storage.from("content").createSignedUrl(path, 60 * 60);
        return signed?.signedUrl ?? null;
      },
      markAllRead: async () => {
        if (!userId) return;
        ensure(
          await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", userId)
            .is("read_at", null),
        );
        await refresh();
      },
      updateMyProfile: async (fields: { full_name?: string; job_title?: string | null; unit?: string | null }) => {
        if (!userId) return;
        ensure(await supabase.from("profiles").update(fields).eq("id", userId));
        await refresh();
      },
      sendSupport: async (subject: string, message: string) => {
        if (!userId) return;
        ensure(await supabase.from("support_requests").insert({ user_id: userId, subject, message }));
      },
      invite: async (inv: {
        full_name: string;
        email: string;
        role: AppRole;
        department_id: string | null;
        job_title?: string | null;
        manager_id?: string | null;
      }) => {
        if (!companyId) return;
        ensure(
          await supabase.from("invitations").insert({
            ...inv,
            email: inv.email.trim().toLowerCase(),
            company_id: companyId,
            invited_by: userId,
          }),
        );
        await refresh();
      },
      createContent: async (c: {
        title: string;
        type: Enums<"content_type">;
        description: string;
        body?: string;
        external_url?: string;
        category_id?: string | null;
        duration_minutes?: number | null;
        audience: Enums<"audience">;
        status: Enums<"publish_status">;
        file?: File | null;
      }) => {
        if (!companyId) return;
        let file_path: string | null = null;
        if (c.file) {
          const safe = c.file.name.normalize("NFD").replace(/[^\w.-]+/g, "-");
          file_path = `${companyId}/${crypto.randomUUID()}-${safe}`;
          ensure(await supabase.storage.from("content").upload(file_path, c.file, { upsert: false }));
        }
        const { file: _f, ...rest } = c;
        void _f;
        ensure(
          await supabase.from("contents").insert({
            ...rest,
            body: rest.body || null,
            external_url: rest.external_url || null,
            file_path,
            company_id: companyId,
            created_by: userId,
          }),
        );
        await refresh();
      },
      createTrack: async (t: {
        title: string;
        description: string;
        audience: Enums<"audience">;
        status: Enums<"publish_status">;
        sequential: boolean;
        contentIds: string[];
      }) => {
        if (!companyId) return;
        const track = await supabase
          .from("tracks")
          .insert({
            title: t.title,
            description: t.description,
            audience: t.audience,
            status: t.status,
            sequential: t.sequential,
            company_id: companyId,
            created_by: userId,
          })
          .select("id")
          .single();
        if (track.error) throw new Error(track.error.message);
        const mod = await supabase
          .from("track_modules")
          .insert({ track_id: track.data.id, title: "Conteúdos", position: 1 })
          .select("id")
          .single();
        if (mod.error) throw new Error(mod.error.message);
        if (t.contentIds.length)
          ensure(
            await supabase
              .from("track_items")
              .insert(t.contentIds.map((id, i) => ({ module_id: mod.data.id, content_id: id, position: i + 1 }))),
          );
        await refresh();
      },
      createQuiz: async (q: {
        title: string;
        description: string;
        pass_score: number;
        status: Enums<"publish_status">;
        questions: { prompt: string; options: { label: string; correct: boolean }[] }[];
      }) => {
        if (!companyId) return;
        const content = await supabase
          .from("contents")
          .insert({
            title: q.title,
            description: q.description,
            type: "quiz",
            pass_score: q.pass_score,
            status: q.status,
            duration_minutes: Math.max(5, q.questions.length * 2),
            company_id: companyId,
            created_by: userId,
          })
          .select("id")
          .single();
        if (content.error) throw new Error(content.error.message);
        for (const [i, question] of q.questions.entries()) {
          const correct = question.options.filter((o) => o.correct).length;
          const qr = await supabase
            .from("quiz_questions")
            .insert({ content_id: content.data.id, prompt: question.prompt, position: i + 1, allow_multiple: correct > 1 })
            .select("id")
            .single();
          if (qr.error) throw new Error(qr.error.message);
          const opts = await supabase
            .from("quiz_options")
            .insert(question.options.map((o, j) => ({ question_id: qr.data.id, label: o.label, position: j + 1 })))
            .select("id,position");
          if (opts.error) throw new Error(opts.error.message);
          ensure(
            await supabase.from("quiz_answer_keys").insert(
              opts.data.map((o) => ({ option_id: o.id, is_correct: question.options[o.position - 1]?.correct ?? false })),
            ),
          );
        }
        await refresh();
      },
      setContentStatus: async (id: string, status: Enums<"publish_status">) => {
        ensure(await supabase.from("contents").update({ status }).eq("id", id));
        await refresh();
      },
      setTrackStatus: async (id: string, status: Enums<"publish_status">) => {
        ensure(await supabase.from("tracks").update({ status }).eq("id", id));
        await refresh();
      },
      deleteContent: async (id: string) => {
        ensure(await supabase.from("contents").delete().eq("id", id));
        await refresh();
      },
      deleteTrack: async (id: string) => {
        ensure(await supabase.from("tracks").delete().eq("id", id));
        await refresh();
      },
      assign: async (a: {
        target_type: Enums<"assignment_target">;
        target_ids: (string | null)[];
        content_id?: string | null;
        track_id?: string | null;
        mandatory: boolean;
        due_date: string | null;
        message: string | null;
      }) => {
        if (!companyId) return 0;
        const rows = a.target_ids.map((target_id) => ({
          company_id: companyId,
          target_type: a.target_type,
          target_id: a.target_type === "company" ? null : target_id,
          content_id: a.content_id ?? null,
          track_id: a.track_id ?? null,
          mandatory: a.mandatory,
          due_date: a.due_date,
          message: a.message,
          assigned_by: userId,
        }));
        ensure(await supabase.from("assignments").insert(rows));
        await refresh();
        return rows.length;
      },
      sendReminder: async (userIds: string[], message?: string) => {
        const res = await supabase.rpc("send_reminder", { p_user_ids: userIds, p_message: message });
        if (res.error) throw new Error(res.error.message);
        return res.data ?? 0;
      },
      updatePerson: async (
        id: string,
        fields: Partial<Pick<Profile, "role" | "status" | "department_id" | "manager_id" | "job_title">>,
      ) => {
        ensure(await supabase.from("profiles").update(fields).eq("id", id));
        await refresh();
      },
      cancelInvite: async (id: string) => {
        ensure(await supabase.from("invitations").delete().eq("id", id));
        await refresh();
      },
      saveCompany: async (id: string | null, fields: Partial<Company>) => {
        if (id) ensure(await supabase.from("companies").update(fields).eq("id", id));
        else
          ensure(
            await supabase.from("companies").insert({
              name: fields.name ?? "Nova empresa",
              slug: fields.slug ?? `empresa-${Date.now()}`,
              ...fields,
            }),
          );
        await refresh();
      },
    };
  }, [userId, companyId, data.progress, data.favorites, refresh]);

  const value: Ctx = {
    ...data,
    ...derived,
    ...actions,
    session,
    ready,
    loading,
    error,
    refresh,
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amount)));
  const r = f((n >> 16) & 255),
    g = f((n >> 8) & 255),
    b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
