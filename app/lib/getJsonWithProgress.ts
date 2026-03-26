/**
 * GET JSON avec progression réelle du corps de réponse (XHR + lengthComputable).
 * Si le serveur envoie du chunked sans taille connue, onRatio n'est appelé qu'avec 1 à la fin.
 */

export type ProgressRatioCallback = (ratio: number) => void;

export async function getJsonWithProgress(
  url: string,
  onRatio: ProgressRatioCallback,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'text';

    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onRatio(Math.min(1, e.loaded / e.total));
      }
    };

    xhr.onload = () => {
      onRatio(1);
      let data: unknown = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      });
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send();
  });
}
