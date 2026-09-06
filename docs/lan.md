# LAN Mode — Mobile Cast

> MVP foca mesma rede Wi-Fi. P2P direto, sem TURN.

## Como funciona

1. Server sobe em `0.0.0.0:3000`, imprime IPs da máquina (ex: `192.168.1.3`).
2. Android conecta via `ws://192.168.1.3:3000/ws` → `create` → recebe `ABC123`.
3. App exibe `ABC123` + QR `http://192.168.1.3:3000/r/ABC123`.
4. PC abre URL ou digita código → `join` → troca SDP/ICE via server → WebRTC P2P.

Vídeo/áudio nunca passam pelo server — só signaling.

## Descoberta

| Método | MVP | Futuro |
|--------|-----|--------|
| Código 6 chars | ✅ sim | — |
| QR com URL | ✅ sim (MainActivity gera) | — |
| Digitar IP | ✅ long-press no app para editar | — |
| mDNS `mobilecast.local` | ❌ não | avaliar `bonjour` |
| Scan de rede | ❌ não | possível mas ruidoso |

## Requisitos de rede

- Mesmo SSID / mesma sub-rede (ex: 192.168.1.x).
- Roteador sem “AP isolation” / “Client isolation” ativado (comum em redes de hotel/empresa).
- Porta 3000 liberada no firewall do PC (`sudo ufw allow 3000`).
- Teste: `ping 192.168.1.3` do celular (via app PingTools) deve responder.

## Performance LAN

- Wi-Fi 5GHz: latência 60-150ms, 1080p@60 estável.
- Wi-Fi 2.4GHz: latência 150-400ms, recomenda 720p@30.
- STUN público ajuda em NAT hairpin, mas não é necessário na mesma sub-rede.

## Fora da LAN (Fase 7)

Precisa STUN + TURN (`coturn` self-hosted). Custo: banda do TURN. MVP não cobre.
