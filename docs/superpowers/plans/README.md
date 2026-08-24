# Space Invaders - Plano de Implementação Modular

Plano completo de migração dividido em 6 fases independentes.

## Estrutura do Plano

| Fase | Arquivo | Duração | Tasks | Status |
|------|---------|---------|-------|--------|
| **Fase 0** | [Preparação e Migração](./fase-0-migracao.md) | 1 semana | ~15 tasks | 🟡 Em progresso |
| **Fase 1** | [Backend Base](./fase-1-base.md) | 2 semanas | ~30 tasks | ⚪ Pendente |
| **Fase 2** | [Economia](./fase-2-economia.md) | 2 semanas | ~25 tasks | ⚪ Pendente |
| **Fase 3** | [Progressão](./fase-3-progressao.md) | 3 semanas | ~35 tasks | ⚪ Pendente |
| **Fase 4** | [Social & PvP](./fase-4-social-pvp.md) | 2 semanas | ~25 tasks | ⚪ Pendente |
| **Fase 5+6** | [Admin & Polish](./fase-5-6-admin-polish.md) | 2-3 semanas | ~25 tasks | ⚪ Pendente |

**Total:** 12-14 semanas, ~155 tasks

## Como Usar Este Plano

### Execução Recomendada: Subagent-Driven Development

```bash
# Fase 0: Migração de Dados
claude-code --skill superpowers:subagent-driven-development \
  --plan docs/superpowers/plans/fase-0-migracao.md

# Após completar Fase 0, continuar com Fase 1
claude-code --skill superpowers:subagent-driven-development \
  --plan docs/superpowers/plans/fase-1-base.md

# E assim por diante...
```

### Execução Alternativa: Inline

```bash
# Executar todas tasks de uma fase em uma sessão
claude-code --skill superpowers:executing-plans \
  --plan docs/superpowers/plans/fase-0-migracao.md
```

## Ordem de Execução

**Obrigatório seguir ordem:**
- ✅ Fase 0 → Fase 1 → Fase 2 (dependências críticas)

**Paralelizável (após Fase 2):**
- Fase 3 (Progressão) pode ser paralela com Fase 4 (Social) se houver 2 devs

**Final:**
- Fase 5+6 deve ser executada por último (depende de todas anteriores)

## Checkpoints de Validação

Após cada fase, validar:

**Fase 0:**
- [ ] Migração Supabase → PostgreSQL 100% validada
- [ ] Counts matching em todas tabelas críticas
- [ ] Backup Supabase completo criado

**Fase 1:**
- [ ] Backend roda localmente sem erros
- [ ] Frontend conecta ao backend
- [ ] Auth funcional (register + login)
- [ ] Gameplay básico funcionando

**Fase 2:**
- [ ] Conversão Gold→SPACE funcional
- [ ] Treasury emission limits respeitados
- [ ] Shop PIX payment completo

**Fase 3:**
- [ ] Battle Pass XP progression funcionando
- [ ] NFT mint via Solana testado
- [ ] Achievements unlock funcionando

**Fase 4:**
- [ ] Guilds create/join funcionando
- [ ] SPACE locking validado
- [ ] PvP matchmaking testado

**Fase 5+6:**
- [ ] CI/CD pipelines funcionando
- [ ] Deploy staging validado
- [ ] Load tests passando

## Recursos

- **Spec Original:** `docs/superpowers/specs/2026-08-24-space-invaders-go-migration-design.md`
- **Análise Econômica:** `docs/rebase.md`
- **go-scaffold Reference:** `https://github.com/braiphub/go-scaffold`

## Suporte

Para dúvidas sobre o plano ou execução:
1. Revisar spec original
2. Verificar comentários nos arquivos de fase
3. Consultar documentação go-scaffold

---

**Status Atual:** 🟡 Fase 0 em desenvolvimento
**Última Atualização:** 2026-08-24
