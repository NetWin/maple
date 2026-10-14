let stylesLoaded: Promise<void> | undefined;

/**
 * Monaco's stylesheet is emitted as the non-injected `monaco.css` bundle (see angular.json) and
 * only added to the page when the first editor is created.
 */
export function loadMonacoStyles(document: Document): Promise<void> {
  stylesLoaded ??= new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'monaco.css';
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => reject(new Error('Failed to load monaco.css')));
    document.head.append(link);
  });
  return stylesLoaded;
}
