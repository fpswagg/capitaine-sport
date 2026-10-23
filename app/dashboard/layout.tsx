import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { dashState } from "@/lib/dashboard";
import { authProblem } from "@/lib/sss-auth";
import "./dashboard.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tableau de bord | Capitaine Sport", robots: { index: false, follow: false } };

const links = [
  ["/dashboard", "Vue d'ensemble", "◫"],
  ["/dashboard/maillots", "Maillots", "▣"],
  ["/dashboard/ventes", "Ventes", "↗"],
  ["/dashboard/messages", "Demandes", "✉"],
  ["/dashboard/boutique", "Boutique", "⚙"],
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const state = await dashState();
  if (state.kind === "signed_out") {
    const issue = authProblem();
    return <div className="csd-auth"><div className="csd-auth-card"><Link href="/" className="csd-brand">CAPITAINE <i>SPORT</i></Link><p className="csd-kicker">ESPACE ÉQUIPE</p><h1>Le vestiaire, côté coulisses.</h1><p>Connecte-toi avec ton compte SSS pour gérer les maillots, les ventes et les demandes reçues.</p>{issue ? <div className="csd-alert">Connexion SSS indisponible. La configuration OAuth doit être terminée dans les variables du site.</div> : <a className="csd-button csd-button--orange csd-full" href="/auth/sss?next=/dashboard">Continuer avec SSS <span>↗</span></a>}<Link className="csd-back" href="/">← Retour à la boutique</Link></div></div>;
  }
  if (state.kind === "wrong_business") return <div className="csd-auth"><div className="csd-auth-card"><p className="csd-kicker">MAUVAISE BOUTIQUE</p><h1>Ce compte n’a pas accès à Capitaine Sport.</h1><p>Compte actuellement connecté : {state.session.user.business?.name || state.session.user.name || state.session.user.email || "SSS"}.</p><form action="/auth/sss/sign-out" method="post"><button className="csd-button csd-button--orange">Changer de compte</button></form><Link className="csd-back" href="/">← Retour à la boutique</Link></div></div>;
  const { session, canWrite, business } = state.ctx;
  return <div className="csd-shell"><aside className="csd-sidebar"><Link href="/dashboard" className="csd-brand">CAPITAINE <i>SPORT</i></Link><div className="csd-shop-chip"><span className="csd-shop-dot"/><span><b>{business.name || "Capitaine Sport"}</b><small>ESPACE DE GESTION</small></span></div><nav className="csd-nav">{links.map(([href, label, icon]) => <Link key={href} href={href} className="csd-nav-link"><span className="csd-nav-icon">{icon}</span>{label}</Link>)}</nav><div className="csd-sidebar-bottom"><div className="csd-user"><span className="csd-avatar">{(session.user.name || session.user.email || "C").slice(0, 1).toUpperCase()}</span><span><b>{session.user.name || session.user.email || "Équipe"}</b><small>{canWrite ? "Accès gestion" : "Lecture seule"}</small></span></div><a href={config.appUrl} className="csd-back" target="_blank" rel="noreferrer">Ouvrir SSS ↗</a><form action="/auth/sss/sign-out" method="post"><button className="csd-signout">Se déconnecter</button></form></div></aside><div className="csd-main"><header className="csd-topbar"><Link href="/" className="csd-back">← Voir la boutique</Link><span className="csd-status"><i/> SSS connecté</span></header><main className="csd-content">{!canWrite && <div className="csd-alert">Accès en lecture seule. Les modifications se font avec un rôle autorisé dans SSS.</div>}{children}</main><footer className="csd-footer">CAPITAINE SPORT <span>·</span> Propulsé par SSS</footer></div></div>;
}
