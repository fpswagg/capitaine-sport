"use client";

type AskCaptainButtonProps = {
  message: string;
};

// Opens the chat widget with a pre-filled question (see ChatWidget OPEN_CHAT_EVENT).
export function AskCaptainButton({ message }: AskCaptainButtonProps) {
  if (!process.env.NEXT_PUBLIC_SSS_BOT_KEY) return null;

  return (
    <button
      type="button"
      className="btn btn--secondary"
      onClick={() => window.dispatchEvent(new CustomEvent("cs-chat:open", { detail: { message } }))}
    >
      Poser une question
    </button>
  );
}
