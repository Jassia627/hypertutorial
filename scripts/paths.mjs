import fs from 'node:fs';
import path from 'node:path';

/** Resolve through existing ancestors, rejecting symlinks even within the project.
 * Managed output directories must belong exclusively to this tool. */
export function containedPath(root, relative) {
  const base = fs.realpathSync(root);
  const target = path.resolve(base, relative);
  const rel = path.relative(base, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path must be contained in project');
  let cursor = base;
  for (const part of rel.split(path.sep)) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) || fs.lstatSync(cursor, { throwIfNoEntry: false })) {
      if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Managed paths cannot contain symlinks');
    }
  }
  return target;
}
