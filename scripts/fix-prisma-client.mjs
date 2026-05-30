import { readFileSync, writeFileSync } from 'fs';

const path = 'generated/prisma/client.ts';
const content = readFileSync(path, 'utf8');
const fixed = content.replace(/\/\/ @ts-nocheck ?\r?\n/, '');
writeFileSync(path, fixed);
console.log('Removed @ts-nocheck from generated Prisma client');
