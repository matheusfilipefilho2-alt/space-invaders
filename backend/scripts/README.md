# Space Invaders Backend - OCI Deployment Scripts

Scripts para provisionar e fazer deploy da aplicação no Oracle Cloud Infrastructure (OCI) usando free tier.

## 📋 Pré-requisitos

- OCI CLI instalado e configurado (`oci setup config`)
- Conta Oracle Cloud com free tier disponível  
- SSH configurado

## 🚀 Uso Rápido

### 1. Provisionar Instância no OCI

```bash
./scripts/provision-oci-instance.sh
```

Saída: IP público da instância e SSH key criado

### 2. Configurar a Instância

```bash
# Copiar e executar setup
scp -i ~/.ssh/space-invaders-oci scripts/setup-instance.sh opc@IP:/tmp/
ssh -i ~/.ssh/space-invaders-oci opc@IP "bash /tmp/setup-instance.sh"
```

### 3. Deploy da Aplicação

```bash
./scripts/deploy-oci.sh
```

## 📝 Documentação Completa

Consulte DEPLOY.md para instruções detalhadas.

## 🌐 Acesso

Após deploy: http://SEU_IP:8080
