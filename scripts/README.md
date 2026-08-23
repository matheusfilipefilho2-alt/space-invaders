# Space Invaders - Deployment Scripts

Scripts para fazer deploy do token SPACE e outros componentes na blockchain Solana.

## 📋 Pré-requisitos

1. **Node.js** instalado (v16 ou superior)
2. **Solana CLI** instalado (opcional, mas recomendado)
3. **SOL na wallet** para pagar as taxas de transação

### Instalar dependências

```bash
npm install @solana/web3.js @solana/spl-token
```

### Configurar Wallet

#### Opção 1: Usar Solana CLI (Recomendado)

```bash
# Criar nova keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Verificar endereço
solana address

# Para devnet, pegar SOL grátis
solana airdrop 2
```

#### Opção 2: Usar keypair customizada

Crie um arquivo JSON com sua private key no formato:
```json
[123,45,67,89,...]
```

## 🚀 Deploy do Token SPACE

### Deploy em Devnet (Teste)

```bash
# Usando wallet padrão do Solana CLI
node scripts/deploy-token.js --network devnet

# Usando keypair customizada
node scripts/deploy-token.js --network devnet --keypair /caminho/para/keypair.json
```

### Deploy em Mainnet (Produção)

⚠️ **ATENÇÃO**: Mainnet usa SOL real! Certifique-se de ter SOL suficiente.

```bash
# Usando wallet padrão do Solana CLI
node scripts/deploy-token.js --network mainnet-beta

# Usando keypair customizada
node scripts/deploy-token.js --network mainnet-beta --keypair /caminho/para/keypair.json
```

## 📊 O que o script faz

1. ✅ Carrega sua keypair (wallet)
2. ✅ Conecta na rede Solana (devnet/mainnet)
3. ✅ Verifica saldo de SOL
4. ✅ Cria o token SPL (SPACE)
5. ✅ Minta o supply inicial (1 bilhão de tokens)
6. ✅ Atualiza automaticamente `src/config/solana-config.js`
7. ✅ Salva informações do deploy em `deployments/`

## 📁 Arquivos Gerados

Após o deploy, você encontrará:

- `src/config/solana-config.js` - Atualizado com endereços
- `deployments/devnet-{timestamp}.json` - Info do deploy
- Link do Explorer para verificar o token

## 🔍 Verificar Deploy

Após o deploy, o script mostra um link do Solana Explorer:

**Devnet:**
```
https://explorer.solana.com/address/{MINT_ADDRESS}?cluster=devnet
```

**Mainnet:**
```
https://explorer.solana.com/address/{MINT_ADDRESS}
```

## 💡 Dicas

### Devnet
- Grátis para testar
- Use `solana airdrop` para pegar SOL grátis
- Ideal para desenvolvimento

### Mainnet
- Custa SOL real (~0.01-0.1 SOL)
- Certifique-se de ter SOL suficiente
- Teste tudo em devnet primeiro!

## 🆘 Troubleshooting

### Erro: "Keypair file not found"
```bash
# Criar nova keypair
solana-keygen new --outfile ~/.config/solana/id.json
```

### Erro: "Insufficient balance"
```bash
# Devnet: pegar SOL grátis
solana airdrop 2

# Mainnet: comprar SOL em uma exchange
```

### Erro: "Connection refused"
- Verifique sua conexão com internet
- Tente outro RPC endpoint (configure no script)

## 📝 Configuração do Token

Para mudar as configurações do token, edite em `deploy-token.js`:

```javascript
const TOKEN_CONFIG = {
    name: 'Space Invaders Token',
    symbol: 'SPACE',
    decimals: 9,
    initialSupply: 1000000000, // 1 bilhão
    description: 'In-game currency for Space Invaders'
};
```

## 🔐 Segurança

⚠️ **NUNCA compartilhe sua keypair!**
- Não commite keypairs no git
- Use `.gitignore` para excluir arquivos de chaves
- Em produção, use hardware wallet ou serviço seguro

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do script
2. Confira o `deployments/*.json` para detalhes
3. Use o link do Explorer para verificar na blockchain
