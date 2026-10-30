"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/templates/template-editor";
import { buttonStyles } from "@/components/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { Icon } from "@/components/icons";

export default function TemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const { templates, loading } = useWorkspace();
  const template = templates.find((entry) => entry.id === params.id);

  if (loading && !templates.length) {
    return (
      <div className="panel flex h-[420px] items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-2">
          Opening template…
        </span>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="panel px-8 py-16 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line text-accent">
          <Icon name="templates" size={17} />
        </span>
        <h1 className="mt-4 text-[16px] font-medium text-paper">Template not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted-2">
          This template is not in the local workspace. It may have been deleted from this
          browser, or the link belongs to a different workspace.
        </p>
        <Link href="/templates" className={`${buttonStyles("secondary", "sm")} mt-5`}>
          <Icon name="arrowLeft" size={12} />
          Back to templates
        </Link>
      </div>
    );
  }

  return <TemplateEditor key={template.id} initial={template} />;
}
