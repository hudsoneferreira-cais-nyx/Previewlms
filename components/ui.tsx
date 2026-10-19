"use client";

import { useData, type Lesson } from "@/lib/data";

export type DrawerKind =
  | "content"
  | "trail"
  | "person"
  | "create-content"
  | "create-trail"
  | "notifications"
  | "profile"
  | "company"
  | "support"
  | "actions"
  | "invite"
  | "assessment"
  | "certificate"
  | "report"
  | "recommend"
  | "generic";

/** id: identificador real (conteúdo, trilha, pessoa…); title/body: textos de apoio */
export type DrawerState = { kind: DrawerKind; id?: string; title?: string; body?: string } | null;

export type PageProps = {
  open: (kind: DrawerKind, opts?: { id?: string; title?: string; body?: string }) => void;
  notify: (m: string) => void;
  navigate: (p: string) => void;
  /** executa uma ação assíncrona mostrando o erro, se houver */
  run: (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    route: (
      <>
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3-9 5 9 5 9-5-9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    play: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="m10 9 5 3-5 3V9Z" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="M8.5 12 7 22l5-3 5 3-1.5-10" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    spark: (
      <>
        <path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z" />
        <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" />
        <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
      </>
    ),
    check: <path d="m4 12 5 5L20 6" />,
    building: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M9 21v-4h6v4M8 7h2M14 7h2M8 11h2M14 11h2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.3 3h-4.6L9.3 6a8 8 0 0 0-1.7 1L5.1 6l-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.4 3h4.6l.4-3a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.grid}
    </svg>
  );
}

export function Progress({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <div className={`progress ${compact ? "compact" : ""}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Heading({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
  onClick,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && onClick && (
        <button onClick={onClick}>
          {action}
          <Icon name="arrow" size={16} />
        </button>
      )}
    </div>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-full panel">
      <span>
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && onClick && (
        <button className="primary" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}

export function Quick({
  icon,
  title,
  text,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick}>
      <span>
        <Icon name={icon} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      <Icon name="arrow" />
    </button>
  );
}

export function MetricGrid({ items }: { items: [string, string, string, string, string][] }) {
  return (
    <div className="metric-grid">
      {items.map((x) => (
        <article key={x[2]}>
          <span className={`metric-icon ${x[1]}`}>
            <Icon name={x[0]} />
          </span>
          <div>
            <small>{x[2]}</small>
            <strong>{x[3]}</strong>
            <p>{x[4]}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function LessonGrid({ items, open, notify, run }: PageProps & { items: Lesson[] }) {
  const { favorites, toggleFavorite } = useData();
  return (
    <div className="journey-grid">
      {items.map((x) => (
        <article className="content-card" key={x.id}>
          <button className="card-main" onClick={() => open("content", { id: x.id })}>
            <div className={`content-cover ${x.color}`}>
              <span className="content-tag">{x.tag}</span>
              <span className="cover-icon">
                <Icon name={x.type === "PDF" || x.type === "Artigo" ? "book" : x.type === "Avaliação" ? "check" : "play"} size={28} />
              </span>
              {x.progress > 0 && <span className="resume">{x.progress === 100 ? "Concluído" : "Continuar"}</span>}
            </div>
            <div className="content-body">
              <p>
                {x.type} <span>•</span> {x.time}
              </p>
              <h3>{x.title}</h3>
              {x.progress > 0 ? (
                <div className="card-progress">
                  <Progress value={x.progress} compact />
                  <small>{x.progress}%</small>
                </div>
              ) : (
                <span className="start-link">
                  Começar agora <Icon name="arrow" size={15} />
                </span>
              )}
            </div>
          </button>
          <button
            className={`favorite-button ${favorites.has(`c:${x.id}`) ? "selected" : ""}`}
            onClick={() =>
              run(async () => {
                const on = await toggleFavorite(x.id);
                notify(on ? "Conteúdo adicionado aos favoritos." : "Removido dos favoritos.");
              })
            }
            aria-label="Favoritar"
          >
            <Icon name="heart" size={16} />
          </button>
        </article>
      ))}
    </div>
  );
}

export function Loading({ text = "Carregando…" }: { text?: string }) {
  return (
    <div className="empty-full panel loading-panel">
      <span className="spinner" />
      <p>{text}</p>
    </div>
  );
}
