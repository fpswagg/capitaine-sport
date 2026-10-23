import { ChatWidget } from "@/components/ChatWidget";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackClicks } from "@/components/TrackClicks";

/** The public shop: header, footer and the Capitaine chat. The dashboard has its own frame. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <ChatWidget />
      <TrackClicks />
    </>
  );
}
