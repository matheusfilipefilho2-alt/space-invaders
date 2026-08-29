# Setup Manual da Instância OCI

A instância está com carga alta devido à atualização do sistema. Execute estes comandos manualmente via SSH.

## 1. Conectar à Instância

```bash
ssh -i ~/.ssh/space-invaders-oci opc@152.67.55.84
```

## 2. Verificar Carga do Sistema

```bash
# Aguarde até que o load average fique abaixo de 2.0
uptime
top  # pressione 'q' para sair
```

## 3. Instalar Docker (passo a passo)

### 3.1 Adicionar repositório Docker

```bash
sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
```

### 3.2 Instalar Docker

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io
```

### 3.3 Iniciar Docker

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker opc
```

### 3.4 Verificar instalação

```bash
sudo docker --version
```

## 4. Instalar Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose

docker-compose --version
```

## 5. Configurar Firewall

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## 6. Instalar Ferramentas Adicionais

```bash
sudo dnf install -y git wget curl make vim
```

## 7. Instalar Goose (para migrações)

```bash
wget https://github.com/pressly/goose/releases/download/v3.18.0/goose_linux_x86_64 -O /tmp/goose
sudo mv /tmp/goose /usr/local/bin/goose
sudo chmod +x /usr/local/bin/goose
goose --version
```

## 8. Criar Diretório da Aplicação

```bash
sudo mkdir -p /opt/space-invaders
sudo chown opc:opc /opt/space-invaders
```

## 9. IMPORTANTE: Logout e Login

```bash
exit
ssh -i ~/.ssh/space-invaders-oci opc@152.67.55.84
```

## 10. Verificar Setup Completo

```bash
# Deve funcionar sem sudo
docker ps

# Deve mostrar versões
docker --version
docker-compose --version
goose --version
```

## Próximo Passo: Deploy

Após completar o setup, execute localmente (na sua máquina):

```bash
cd /Users/matheuscarmo/Desktop/projects/space-invaders/backend
./scripts/deploy-oci.sh
```

## Troubleshooting

### Se Docker não iniciar

```bash
sudo systemctl status docker
sudo journalctl -u docker --no-pager | tail -50
```

### Se firewall não funcionar

```bash
sudo systemctl status firewalld
sudo systemctl start firewalld
```

### Se estiver sem memória

```bash
free -h
# Se swap=0, considere adicionar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```
