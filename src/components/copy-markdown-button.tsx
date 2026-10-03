import { Button } from "@cloudflare/kumo/components/button";
import { CopyIcon } from "@phosphor-icons/react";
import type { Upload } from "@/db/schema";
import { buildShareMarkdown } from "@/lib/share-markdown";

export function CopyMarkdownButton({
  upload,
  origin,
  onNotify,
}: {
  upload: Upload;
  origin: string;
  onNotify: (message: string, variant?: "error") => void;
}) {
  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(buildShareMarkdown(upload, origin));
      onNotify("Markdown copied");
    } catch {
      onNotify("Failed to copy Markdown", "error");
    }
  }

  return (
    <Button
      variant="secondary"
      icon={<CopyIcon weight="bold" />}
      onClick={() => void copyMarkdown()}
    >
      Copy Markdown
    </Button>
  );
}
