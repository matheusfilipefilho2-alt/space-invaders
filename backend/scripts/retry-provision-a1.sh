#!/bin/bash
# Script de retry para provisionar A1.Flex
# Tenta a cada 10 minutos até conseguir

set -e

SUPPRESS_LABEL_WARNING=True
export SUPPRESS_LABEL_WARNING=True

REGION="sa-saopaulo-1"
TENANCY_ID=$(grep tenancy ~/.oci/config | cut -d= -f2)
COMPARTMENT_ID=$TENANCY_ID
AD="dCxL:SA-SAOPAULO-1-AD-1"
VCN_ID="ocid1.vcn.oc1.sa-saopaulo-1.amaaaaaacqrjunqauva7ubzgpu7rymvwrehrklywqfhodisvquyc7ymznvta"
SUBNET_ID="ocid1.subnet.oc1.sa-saopaulo-1.aaaaaaaaqzxbamjcr7huzgavw3xag2wqviyxgpw2hujdxsegcb2szjcjczya"
IMAGE_ID="ocid1.image.oc1.sa-saopaulo-1.aaaaaaaag6yfi6mpjrgjyw272oyzoudjjxvze2fdyoxsz4zs4gwqixjanxgq"

SHAPE="VM.Standard.A1.Flex"
OCPUS=2
MEMORY_GB=12
RETRY_INTERVAL=600  # 10 minutos

echo "========================================="
echo " Retry Script - A1.Flex Provisioning"
echo "========================================="
echo ""
echo "Configuração:"
echo "  Shape: $SHAPE"
echo "  OCPUs: $OCPUS"
echo "  RAM: ${MEMORY_GB} GB"
echo "  Região: $REGION"
echo "  Tentando a cada: $RETRY_INTERVAL segundos (10 min)"
echo ""
echo "💡 Dicas:"
echo "  - Deixe rodando durante a noite"
echo "  - Maior chance de sucesso: 2h-6h da manhã"
echo "  - Pressione Ctrl+C para cancelar"
echo ""

ATTEMPT=1

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$TIMESTAMP] Tentativa #$ATTEMPT..."

    # Tentar criar instância
    RESULT=$(oci compute instance launch \
        --compartment-id $COMPARTMENT_ID \
        --availability-domain $AD \
        --display-name "space-invaders-backend" \
        --shape $SHAPE \
        --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEMORY_GB}" \
        --image-id $IMAGE_ID \
        --subnet-id $SUBNET_ID \
        --assign-public-ip true \
        --ssh-authorized-keys-file "$HOME/.ssh/space-invaders-oci.pub" \
        --region $REGION \
        --wait-for-state RUNNING \
        --query 'data.id' \
        --raw-output 2>&1 || echo "FAILED")

    # Verificar sucesso
    if [[ $RESULT == ocid1.instance.* ]]; then
        echo ""
        echo "✓✓✓ SUCESSO! Instância criada na tentativa #$ATTEMPT"
        INSTANCE_ID=$RESULT

        # Obter IP público
        sleep 5
        PUBLIC_IP=$(oci compute instance list-vnics \
            --instance-id $INSTANCE_ID \
            --region $REGION \
            --query 'data[0]."public-ip"' \
            --raw-output 2>/dev/null)

        echo ""
        echo "========================================="
        echo " ✓ A1.Flex Provisionada!"
        echo "========================================="
        echo "Instance ID: $INSTANCE_ID"
        echo "Public IP: $PUBLIC_IP"
        echo "Shape: VM.Standard.A1.Flex (ARM64)"
        echo "OCPUs: $OCPUS"
        echo "RAM: ${MEMORY_GB} GB"
        echo ""
        echo "SSH: ssh -i ~/.ssh/space-invaders-oci opc@$PUBLIC_IP"
        echo ""

        # Salvar info
        cat > scripts/oci-instance-info.txt <<EOF
OCI Instance Information
========================
Instance ID: ${INSTANCE_ID}
Public IP: ${PUBLIC_IP}
Region: ${REGION}
Shape: VM.Standard.A1.Flex (ARM64)
OCPUs: ${OCPUS}
RAM: ${MEMORY_GB} GB
SSH Key: $HOME/.ssh/space-invaders-oci
SSH Command: ssh -i $HOME/.ssh/space-invaders-oci opc@${PUBLIC_IP}

VCN ID: ${VCN_ID}
Subnet ID: ${SUBNET_ID}

Created: $(date)
Architecture: ARM64 (aarch64)
Provisioned after: ${ATTEMPT} attempts
EOF

        echo "✓ Info salva em scripts/oci-instance-info.txt"

        # Enviar notificação (se tiver terminal-notifier instalado)
        if command -v terminal-notifier &> /dev/null; then
            terminal-notifier -title "OCI A1.Flex" -message "Instância provisionada com sucesso!" -sound default
        fi

        # Tocar beep
        printf '\a'

        echo ""
        echo "Próximo passo: executar setup"
        echo "  ./scripts/setup-instance.sh"

        exit 0
    fi

    # Verificar tipo de erro
    if echo "$RESULT" | grep -q "Out of host capacity"; then
        echo "  ⏳ Sem capacidade - tentando novamente em 10 minutos..."
    elif echo "$RESULT" | grep -q "LimitExceeded"; then
        echo "  ⚠️  Limite de recursos atingido"
        echo ""
        echo "Você pode ter:"
        echo "  - Instâncias A1 já rodando em outra região"
        echo "  - Limite do free tier atingido"
        echo ""
        echo "Verifique: https://cloud.oracle.com/compute/instances"
        exit 1
    else
        echo "  ❌ Erro: $RESULT"
    fi

    ATTEMPT=$((ATTEMPT + 1))

    # Aguardar antes da próxima tentativa
    sleep $RETRY_INTERVAL
done
