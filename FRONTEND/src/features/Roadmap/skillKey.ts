const SKILL_ALIASES: Record<string, string> = {
  postgres: 'postgresql', postgresql: 'postgresql', 'postgre-sql': 'postgresql',
  'postgres-database': 'postgresql', 'postgresql-database': 'postgresql',
  'postgres-db': 'postgresql', 'postgres-sql': 'postgresql',
  'relational-database-postgresql': 'postgresql', 'relational-database': 'postgresql',
  js: 'javascript', javascript: 'javascript', ts: 'typescript', typescript: 'typescript',
  react: 'react', reactjs: 'react', 'react-js': 'react', node: 'nodejs', nodejs: 'nodejs',
  'node-js': 'nodejs', next: 'nextjs', nextjs: 'nextjs', 'next-js': 'nextjs',
  docker: 'docker', k8s: 'kubernetes', kubernetes: 'kubernetes',
};

export const normalizeSkillKey = (skillName: string): string => {
  if (!skillName || typeof skillName !== 'string') return '';
  const baseKey = skillName.trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  if (SKILL_ALIASES[baseKey]) return SKILL_ALIASES[baseKey];
  if (/postgres|pg-sql|pg-vector|postgre/.test(baseKey)) return 'postgresql';
  if (baseKey.includes('-')) return baseKey;
  if (/^react/.test(baseKey)) return 'react';
  if (/^node/.test(baseKey)) return 'nodejs';
  if (/^next/.test(baseKey)) return 'nextjs';
  if (/^vue/.test(baseKey)) return 'vuejs';
  if (/^express/.test(baseKey)) return 'expressjs';
  if (/^docker/.test(baseKey)) return 'docker';
  if (/^kubernetes|^k8s/.test(baseKey)) return 'kubernetes';
  if (/^ts$|^typescript/.test(baseKey)) return 'typescript';
  if (/^js$|^javascript/.test(baseKey)) return 'javascript';
  if (/^python/.test(baseKey)) return 'python';
  if (/^mongo/.test(baseKey)) return 'mongodb';
  return baseKey;
};
