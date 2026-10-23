/**
 * Save a generated file. When the app runs inside a claude.ai Artifact frame, direct
 * downloads are blocked, so the host's `downloads` capability is used instead; in a
 * normal browser tab this falls back to a temporary object URL.
 */
interface HostDownloads {
  save(req: { filename: string; data: Blob | string }): Promise<{ status: string }>;
}
interface HostClaude {
  use(name: 'downloads'): Promise<HostDownloads | null>;
}

export type SaveOutcome = 'saved' | 'declined' | 'failed';

export async function saveFile(data: Blob, filename: string): Promise<SaveOutcome> {
  const host = (window as unknown as { claude?: HostClaude }).claude;
  if (host?.use) {
    const downloads = await host.use('downloads').catch(() => null);
    if (downloads) {
      try {
        await downloads.save({ filename, data });
        return 'saved';
      } catch (e) {
        return (e as { code?: string })?.code === 'declined' ? 'declined' : 'failed';
      }
    }
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}

export function downloadText(text: string, filename: string, type = 'text/plain') {
  return saveFile(new Blob([text], { type }), filename);
}
