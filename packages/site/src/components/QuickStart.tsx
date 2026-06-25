import { FEATURE_ROWS, INSTALL_COMMANDS, SITE_LINKS } from "../data/site";

export function QuickStart() {
  return (
    <section id="quickstart" className="quickstart">
      <header>
        <p className="section-kicker">Quick start</p>
        <h2>From zero to council review</h2>
      </header>

      <div className="quickstart__commands">
        {INSTALL_COMMANDS.map((item) => (
          <figure key={item.label} className="quickstart__card">
            <figcaption>{item.label}</figcaption>
            <pre>
              <code>{item.cmd}</code>
            </pre>
          </figure>
        ))}
      </div>

      <ul className="quickstart__features">
        {FEATURE_ROWS.map((row) => (
          <li key={row.title}>
            <strong>{row.title}</strong>
            <span>{row.detail}</span>
          </li>
        ))}
      </ul>

      <div className="quickstart__links">
        <a href={SITE_LINKS.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={SITE_LINKS.npm} target="_blank" rel="noreferrer">
          npm @nuwajs
        </a>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>Nuwa — role-play review CLI · MIT</p>
      <a href={SITE_LINKS.github}>systembugtj/nuwa-reviewer</a>
    </footer>
  );
}
