"use client";

import { YouTubeSubmitForm } from "@/components/content/youtube-submit-form";
import { useRouter } from "next/navigation";

export function YouTubeSubmitSection() {
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page to show the new content
    router.refresh();
  };

  return (
    <section>
      <YouTubeSubmitForm onSuccess={handleSuccess} />
    </section>
  );
}
