import Image from "next/image";

type JerseyImageProps = {
  src: string | null;
  title: string;
  priority?: boolean;
};

export function JerseyImage({ src, title, priority = false }: JerseyImageProps) {
  if (!src) {
    return (
      <div className="jersey-image jersey-image--empty" role="img" aria-label={title}>
        <span>CS</span>
      </div>
    );
  }

  return (
    <div className="jersey-image">
      <Image
        src={src}
        alt={title}
        fill
        sizes="(max-width: 768px) 90vw, (max-width: 1200px) 42vw, 420px"
        priority={priority}
        // SSS photos live on the business's storage host, which varies by deployment.
        unoptimized={/^https?:\/\//.test(src)}
      />
    </div>
  );
}
