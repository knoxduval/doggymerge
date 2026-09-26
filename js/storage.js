// Collection persistence in localStorage. Every access is guarded because storage
// can be unavailable (private browsing, blocked site data).

const KEY = "doggymerge.collection.v1";

export function loadCollection() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Returns true if saved. If storage is full, retries without embedded thumbnails.
export function saveCollection(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    try {
      const slim = list.map(({ thumbnail, ...rest }) => rest);
      localStorage.setItem(KEY, JSON.stringify(slim));
      list.forEach((d) => delete d.thumbnail);
      return true;
    } catch {
      return false;
    }
  }
}
