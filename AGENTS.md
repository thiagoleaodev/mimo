<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Mimo - AI Agent Context

## Sobre o projeto
Mimo é uma plataforma de criação de eventos e gerenciamento de listas de presentes.

Os usuários podem:
- Criar eventos
- Adicionar sugestões de presentes
- Compartilhar listas
- Permitir que convidados reservem presentes

## Stack
- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma

## Objetivo do produto
Simplificar a organização de presentes para eventos sociais.

## Regras importantes
- Um presente pode ser reservado apenas uma vez
- Convidados precisam logar com conta Google para acessar uma lista
- Eventos podem ser públicos ou privados
- O organizador pode editar a lista a qualquer momento

## Padrões de código
- Utilizar componentes do shadcn UI quando possível
- Criar componentes reutilizáveis
- Utilizar tanstack query para lidar com requisições
- Utilizar Tailwind para estilização
- Validar formulários com Zod

## Estrutura esperada
- app/
- components/
- services/
- prisma/
- types/

## UX Guidelines
- Interface minimalista
- Fluxo simples e rápido
- Mobile first
- Poucos passos para reservar presentes
<!-- END:nextjs-agent-rules -->
