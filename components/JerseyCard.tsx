import Link from "next/link";

import { JerseyImage } from "@/components/JerseyImage";
import { formatPrice, type Jersey } from "@/lib/catalog";

type JerseyCardProps = {
  jersey: Jersey;
};

export function JerseyCard({ jersey }: JerseyCardProps) {
  return (
    <article className="jersey-card">
      <Link
        href={`/maillots/${jersey.slug}`}
        className="jersey-card__stretched-link"
        aria-label={`Voir le maillot ${jersey.team} ${jersey.name}`}
      />
      <div className="jersey-card__image-wrap">
        <JerseyImage src={jersey.imageUrl} team={jersey.team} name={jersey.name} />
      </div>
      <div className="jersey-card__body">
        <p className="jersey-card__team">{jersey.team}</p>
        <h3 className="jersey-card__name">{jersey.name}</h3>
        <p className="jersey-card__meta">{jersey.competition}</p>
        <p className="jersey-card__price">{formatPrice(jersey.price)}</p>
      </div>
    </article>
  );
}
