import Image from "next/image";

type JerseyImageProps = {
  src: string;
  team: string;
  name: string;
  priority?: boolean;
};

export function JerseyImage({ src, team, name, priority = false }: JerseyImageProps) {
  return (
    <div className="jersey-image">
      <Image
        src={src}
        alt={`Maillot ${team} ${name}`}
        fill
        sizes="(max-width: 768px) 90vw, (max-width: 1200px) 42vw, 420px"
        priority={priority}
      />
    </div>
  );
}
