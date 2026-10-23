import Link from "next/link";
import { requireDash } from "@/lib/dashboard";
import { JerseyForm } from "@/components/dashboard/JerseyForm";
export default async function NewJerseyPage(){const ctx=await requireDash();return <><header className="csd-page-head"><div><p className="csd-kicker">CATALOGUE · NOUVELLE RÉFÉRENCE</p><h1>Ajouter un maillot</h1><p>Remplis la fiche, le stock initial sera enregistré dans SSS.</p></div><Link className="csd-link" href="/dashboard/maillots">← Tous les maillots</Link></header><JerseyForm canWrite={ctx.canWrite}/></>}
