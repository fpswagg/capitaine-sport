import Link from "next/link";
import { dashJerseys, dashMessages, dashSales, dashStore, fcfa, jerseyTitle, requireDash, when, inStock, dayMinus } from "@/lib/dashboard";
import { today } from "@/lib/stats";

function Stat({ label, value, note, href }: { label: string; value: string | number; note: string; href?: string }) {
  const content = <><span className="csd-stat-label">{label}</span><strong className="csd-stat-value">{value}</strong><span className="csd-stat-sub">{note}</span></>;
  return href ? <Link href={href} className="csd-stat" style={{ display: "block", textDecoration: "none" }}>{content}</Link> : <article className="csd-stat">{content}</article>;
}

export default async function DashboardHome() {
  const ctx = await requireDash();
  const [jerseys, sales, messages, store] = await Promise.all([dashJerseys(ctx), dashSales(ctx), dashMessages(ctx), dashStore(ctx)]);
  const day = today();
  const week = dayMinus(6);
  const todaySales = sales.filter((s) => s.paid && s.day === day);
  const weekSales = sales.filter((s) => s.paid && s.day >= week);
  const newMessages = messages.filter((m) => !m.handled);
  const low = jerseys.filter((j) => j.active && !j.unlimited && j.quantity > 0 && j.quantity <= 2);
  const soldOut = jerseys.filter((j) => j.active && !inStock(j));
  const stockUnits = jerseys.reduce((sum, j) => sum + (j.unlimited ? 0 : j.quantity), 0);
  const whatsappToday = jerseys.reduce((sum,j)=>sum+(j.wa[day]||0),0)+(store.waDaily[day]||0);
  const top = [...jerseys].sort((a, b) => b.views - a.views).slice(0, 5);
  return <div>
    <header className="csd-page-head"><div><p className="csd-kicker">LE VESTIAIRE · {new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Douala", weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()}</p><h1>Vue d’ensemble</h1><p>Le match du jour se joue ici. Voici l’activité de ta boutique.</p></div><Link className="csd-button csd-button--orange" href="/dashboard/maillots/nouveau">+ Ajouter un maillot</Link></header>
    <section className="csd-grid csd-grid--stats"><Stat label="Maillots au catalogue" value={jerseys.length} note={`${jerseys.filter(j => j.active).length} visibles sur le site`} href="/dashboard/maillots"/><Stat label="Ventes encaissées · aujourd’hui" value={todaySales.length} note={fcfa(todaySales.reduce((n,s)=>n+s.total,0))} href="/dashboard/ventes"/><Stat label="Chiffre · 7 derniers jours" value={fcfa(weekSales.reduce((n,s)=>n+s.total,0))} note={`${weekSales.length} vente${weekSales.length===1?"":"s"} réglée${weekSales.length===1?"":"s"}`} href="/dashboard/ventes"/><Stat label="Demandes à traiter" value={newMessages.length} note={`${messages.length} reçue${messages.length===1?"":"s"} au total`} href="/dashboard/messages"/></section>
    <section className="csd-grid csd-grid--stats"><Stat label="Stock physique" value={stockUnits} note="Pièces comptabilisées dans SSS" href="/dashboard/maillots"/><Stat label="Stock faible" value={low.length} note="Deux pièces ou moins" href="/dashboard/maillots?etat=stock-faible"/><Stat label="Épuisés" value={soldOut.length} note="Visibles mais sans stock" href="/dashboard/maillots?etat=epuise"/><Stat label="Clics WhatsApp · aujourd’hui" value={whatsappToday} note="Commandes et contact depuis le site"/></section>
    <div className="csd-grid csd-grid--two"><section className="csd-card"><div className="csd-row"><h2 className="csd-card-title">Demandes récentes</h2><Link className="csd-link" href="/dashboard/messages">Toutes les demandes →</Link></div>{newMessages.length===0?<p className="csd-empty">Tout est traité. Rien ne t’attend au bord du terrain.</p>:<div className="csd-table-wrap"><table className="csd-table"><thead><tr><th>Demandeur</th><th>Objet</th><th>Reçue</th><th/></tr></thead><tbody>{newMessages.slice(0,5).map(m=><tr key={m.id}><td><b>{m.name||"Visiteur"}</b><br/><small>{m.phone||m.email||m.channel||"—"}</small></td><td>{m.kind==="order_request"?"Demande de commande":m.subject||"Message"}</td><td>{when(m.at)}</td><td><Link className="csd-link" href={`/dashboard/messages/${m.id}`}>Ouvrir</Link></td></tr>)}</tbody></table></div>}</section>
    <section className="csd-card"><h2 className="csd-card-title">Les maillots les plus vus</h2>{top.length===0?<p className="csd-empty">Le catalogue est encore vide.</p>:<div className="csd-details">{top.map((j,i)=><div key={j.id} className="csd-row" style={{padding:"10px 0",borderBottom:"1px solid #efeeeb"}}><span><small style={{color:"#f97316",marginRight:8}}>0{i+1}</small>{jerseyTitle(j)}</span><b>{j.views}</b></div>)}</div>}<div className="csd-actions" style={{marginTop:16}}><Link className="csd-link" href="/dashboard/maillots">Gérer le catalogue →</Link><Link className="csd-link" href="/dashboard/boutique">Modifier la boutique →</Link></div></section></div>
    <p className="csd-help" style={{marginTop:16}}>Les ventes et stocks viennent de SSS. Les statistiques de visites sont calculées à partir du suivi du site. Dernière actualisation : {when(new Date().toISOString())}.</p>
  </div>;
}
