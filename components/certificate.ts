import type { Certificate, Company } from "@/lib/data";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Abre o certificado pronto para imprimir ou salvar em PDF pelo navegador. */
export function printCertificate(cert: Certificate, company: Company | null) {
  const color = company?.primary_color ?? "#6658D5";
  const date = new Date(cert.issued_at).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hours = cert.workload_minutes ? Math.max(1, Math.round(cert.workload_minutes / 60)) : null;
  const verify = `${window.location.origin}/?verificar=${cert.code}`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Certificado · ${esc(cert.title)}</title>
<style>
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#1d2428;background:#f5f4f0}
.sheet{width:297mm;height:210mm;margin:0 auto;background:#fff;padding:22mm 26mm;position:relative;display:flex;flex-direction:column;justify-content:space-between;border-top:10mm solid ${color}}
.brand{font-weight:750;font-size:20px;letter-spacing:-.4px}.brand em{color:${color};font-style:normal}
.kicker{letter-spacing:.18em;font-size:12px;color:#72797e;font-weight:700;margin:0 0 10px}
h1{font-size:46px;margin:0 0 6px;letter-spacing:-1px}h2{font-size:28px;margin:6px 0 0;color:${color}}
p{font-size:16px;line-height:1.6;margin:0}.foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:13px;color:#72797e}
.code{font-family:ui-monospace,monospace;color:#1d2428;font-size:14px}
@media print{body{background:#fff}.no-print{display:none}}
.no-print{position:fixed;top:16px;right:16px;padding:10px 16px;border-radius:10px;border:0;background:${color};color:#fff;font-weight:600;cursor:pointer}
</style></head><body>
<button class="no-print" onclick="window.print()">Salvar em PDF / imprimir</button>
<div class="sheet">
<div class="brand">desenvolve<em>.</em>${company ? ` · ${esc(company.name)}` : ""}</div>
<div><p class="kicker">CERTIFICADO DE CONCLUSÃO</p><p>Certificamos que</p><h1>${esc(cert.recipient_name)}</h1>
<p>concluiu a trilha de desenvolvimento</p><h2>${esc(cert.title)}</h2>
<p style="margin-top:14px">em ${date}${hours ? `, com carga horária de ${hours} hora${hours > 1 ? "s" : ""}` : ""}.</p></div>
<div class="foot"><div>Código de verificação<br><span class="code">${cert.code}</span></div><div style="text-align:right">Confira a autenticidade em<br>${esc(verify)}</div></div>
</div></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
