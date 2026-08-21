/**
 * Replaces the original app's `self.project_dir` filesystem folder.
 * Since a browser app cannot assume filesystem access (see CLAUDE.md),
 * every asset (background, hand images, font-strip glyphs) is kept in
 * memory here, keyed by the same relative path/filename that would
 * have been used on disk (e.g. "hour.png", "date/0.png").
 */
export class ProjectFiles {
  private files = new Map<string, Blob>();

  set(path: string, blob: Blob) {
    this.files.set(path, blob);
  }

  get(path: string): Blob | undefined {
    return this.files.get(path);
  }

  has(path: string): boolean {
    return this.files.has(path);
  }

  delete(path: string) {
    this.files.delete(path);
  }

  clear() {
    this.files.clear();
  }

  /** All [path, blob] pairs whose path starts with `${folder}/`. */
  entriesUnderFolder(folder: string): [string, Blob][] {
    const prefix = `${folder}/`;
    const out: [string, Blob][] = [];
    for (const [path, blob] of this.files) {
      if (path.startsWith(prefix)) out.push([path, blob]);
    }
    return out;
  }

  /** Object URL cache keyed by path, so <img>/canvas draws don't re-allocate. */
  private urlCache = new Map<string, string>();

  objectUrl(path: string): string | undefined {
    if (this.urlCache.has(path)) return this.urlCache.get(path);
    const blob = this.files.get(path);
    if (!blob) return undefined;
    const url = URL.createObjectURL(blob);
    this.urlCache.set(path, url);
    return url;
  }

  revokeAll() {
    for (const url of this.urlCache.values()) URL.revokeObjectURL(url);
    this.urlCache.clear();
  }
}
