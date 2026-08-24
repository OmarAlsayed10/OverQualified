const normalize = (path: string) => path.toLowerCase().replace(/\/+$/, '') || '/';

export const isActivePath = (pathname: string, href: string): boolean => {
  const current = normalize(pathname);
  const target = normalize(href);
  if (target === '/') return current === '/';
  return current === target || current.startsWith(`${target}/`);
};
