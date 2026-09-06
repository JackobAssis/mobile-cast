# PROJETO: MOBILE CAST — ANDROID SCREEN + AUDIO STREAMING

## PAPEL

Você é o arquiteto, engenheiro de software e líder técnico responsável por transformar esta ideia em um produto funcional.

Trabalhe de forma autônoma, prática e orientada a MVP.

Não implemente funcionalidades apenas porque parecem teoricamente possíveis. Antes de codificar uma funcionalidade relacionada ao Android, WebRTC, captura de tela, áudio interno ou gravação, valide tecnicamente se ela é suportada pelas APIs atuais.

Quando existir uma limitação do Android, documente claramente a limitação e adapte a arquitetura em vez de criar soluções frágeis ou hacks.

---

# 1. VISÃO DO PRODUTO

Criar um sistema simples para transmitir em tempo real a tela de um smartphone Android para outro dispositivo, principalmente:

* PC
* notebook
* monitor conectado ao PC
* Smart TV/Android TV compatível com navegador

O principal caso de uso é:

> O usuário está jogando no celular e quer visualizar a tela em uma tela maior e, opcionalmente, gravar o gameplay no computador.

O celular será a origem da transmissão.

O computador será o receptor.

O processamento pesado de gravação deve preferencialmente acontecer no computador, e não no smartphone.

---

# 2. FLUXO PRINCIPAL

O fluxo ideal do usuário deve ser extremamente simples:

1. Abrir o aplicativo Android.
2. O aplicativo apresenta uma opção "Transmitir tela".
3. O usuário escolhe iniciar transmissão.
4. O Android solicita a autorização oficial de captura de tela.
5. O usuário autoriza.
6. O aplicativo captura a tela.
7. O aplicativo captura áudio interno quando permitido pelo Android/aplicativo de origem.
8. O aplicativo estabelece conexão WebRTC.
9. O computador abre o receptor web.
10. O receptor recebe vídeo e áudio.
11. O usuário consegue assistir à tela do celular em tempo real.
12. O usuário pode iniciar/parar uma gravação no computador.
13. O arquivo final deve ser salvo localmente no computador.

---

# 3. OBJETIVO DO MVP

NÃO tente construir o produto completo inicialmente.

O primeiro objetivo é provar este fluxo:

ANDROID
↓
MediaProjection
↓
captura da tela
↓
WebRTC
↓
RECEPTOR WEB NO PC
↓
vídeo + áudio
↓
gravação opcional

O MVP deve funcionar prioritariamente dentro da mesma rede Wi-Fi.

Não começar pelo suporte à internet pública.

---

# 4. ARQUITETURA INICIAL

Avalie e implemente uma arquitetura semelhante a:

ANDROID APP
|
| WebRTC
|
v
SIGNALING SERVER
|
v
WEB RECEIVER

O servidor de signaling deve ser mínimo.

Ele não deve transportar o vídeo caso a conexão WebRTC P2P possa ser estabelecida.

Objetivo:

Android <========== WebRTC ==========> PC

O servidor deve servir principalmente para:

* descoberta
* criação de sessão
* troca de SDP
* troca de ICE candidates
* controle da conexão

Avaliar posteriormente:

* STUN
* TURN
* coturn

para conexões fora da rede local.

---

# 5. TECNOLOGIAS AVALIAR

## Android

Preferência:

* Kotlin
* Android Studio
* MediaProjection
* AudioPlaybackCapture
* Foreground Service apropriado para captura de mídia
* WebRTC

Verificar a documentação oficial atual do Android antes da implementação.

Investigar especificamente:

* Android 10+
* versões atuais do Android
* permissões necessárias
* foreground service
* media projection
* captura de áudio
* comportamento quando o usuário bloqueia a tela
* comportamento ao trocar de aplicativo
* limitações impostas por jogos
* aplicativos que bloqueiam captura
* codecs suportados

---

## WEB RECEIVER

Avaliar:

* HTML
* CSS
* JavaScript
* WebRTC
* MediaStream
* MediaRecorder
* Fullscreen API

Pode utilizar React/Vite se isso realmente simplificar o desenvolvimento.

Não utilizar frameworks desnecessários.

---

## BACKEND

Preferência:

* Node.js
* WebSocket

O backend deve ser pequeno e simples.

Evitar banco de dados no MVP.

As sessões podem ser temporárias em memória.

---

## GRAVAÇÃO

Avaliar duas estratégias:

### Opção A

MediaRecorder diretamente no navegador.

Vantagens:

* simples
* rápido
* sem processamento adicional

### Opção B

FFmpeg no computador.

Vantagens:

* maior controle
* formatos
* codecs
* bitrate
* qualidade
* possibilidade de pós-processamento

Para o MVP, começar pela solução mais simples que produza uma gravação funcional com áudio e vídeo sincronizados.

---

# 6. FUNCIONALIDADES DO MVP

Implementar:

## Android

* iniciar transmissão
* parar transmissão
* autorização de captura
* captura de tela
* captura de áudio interno quando suportado
* conexão WebRTC
* indicador de transmissão ativa
* tratamento de desconexão
* encerramento correto da captura
* reconexão quando possível

## Web Receiver

* conexão através de código/sessão
* exibição do vídeo
* reprodução do áudio
* botão fullscreen
* controle de volume
* status da conexão
* latência aproximada
* iniciar gravação
* parar gravação
* salvar arquivo localmente
* exibir duração da gravação

## Signaling

* criar sessão
* entrar em sessão
* SDP offer/answer
* ICE candidates
* desconectar sessão
* limpar sessões antigas

---

# 7. EXPERIÊNCIA DE USO

Prioridade máxima:

SIMPLICIDADE.

O usuário não deve precisar entender:

* WebRTC
* SDP
* ICE
* codecs
* IP
* portas
* NAT

A experiência ideal:

NO CELULAR:

[ TRANSMITIR ]

Código:

ABC-742

NO PC:

Digite o código:

[ ABC-742 ]

[ CONECTAR ]

Depois:

[ TELA DO CELULAR ]

[ ⛶ ]

[ 🔊 ]

[ ⏺ GRAVAR ]

---

# 8. MODO LAN

Criar primeiro um modo LAN.

Exemplo:

Celular:
192.168.1.20

PC:
192.168.1.10

Ambos conectados ao mesmo Wi-Fi.

A transmissão deve tentar estabelecer conexão direta.

Investigar mecanismos de descoberta local que possam simplificar a experiência.

Avaliar:

* QR Code
* código curto
* mDNS
* WebSocket
* IP local
* hostname

Escolher a solução mais simples e confiável.

---

# 9. QR CODE

Avaliar como funcionalidade importante.

O Android poderia gerar:

QR CODE

[████████]

"Escaneie com o PC"

O QR Code pode carregar uma URL de sessão temporária.

Exemplo conceitual:

https://cast.local/session/ABC742

Não assumir que o domínio precisa ser exatamente esse.

Projetar uma solução que funcione realmente na rede local.

---

# 10. QUALIDADE DE TRANSMISSÃO

Criar configurações:

Resolução:

* 720p
* 1080p

FPS:

* 30
* 60

Bitrate:

* baixo
* médio
* alto
* automático

Preset:

* Economia
* Equilibrado
* Qualidade
* Gaming

Porém:

NÃO implemente todos inicialmente.

Primeiro fazer uma configuração fixa funcional, por exemplo:

1080p
60 FPS
bitrate razoável

Depois criar controles.

---

# 11. FOCO EM GAMING

O principal caso de uso é gameplay.

Avaliar:

* latência
* estabilidade
* FPS
* consumo de bateria
* aquecimento
* bitrate
* compressão
* sincronização áudio/vídeo

Criar futuramente um modo:

GAMING

que priorize:

* baixa latência
* FPS
* estabilidade

em vez de máxima qualidade.

---

# 12. ÁUDIO

O áudio é uma parte crítica do projeto.

Investigar profundamente:

AudioPlaybackCapture

Determinar:

* quais versões do Android suportam
* quais tipos de áudio podem ser capturados
* quando o aplicativo de origem bloqueia captura
* limitações de jogos
* necessidade de permissões
* necessidade de configuração especial
* comportamento em diferentes fabricantes

Não afirmar que "todo áudio interno do Android pode ser capturado".

A interface deve informar claramente quando o áudio interno não estiver disponível.

Exemplo:

Áudio interno:
✓ disponível

ou:

Áudio interno:
⚠ indisponível neste aplicativo/dispositivo

---

# 13. MICROFONE

Não é prioridade do primeiro MVP.

Porém, projetar a arquitetura permitindo futuramente:

Áudio interno
+
Microfone

Possibilitando:

GAMEPLAY
+
VOZ DO JOGADOR

Avaliar posteriormente mixagem das fontes.

---

# 14. GRAVAÇÃO

A gravação deve acontecer preferencialmente no PC.

O usuário deve conseguir:

[ ⏺ INICIAR GRAVAÇÃO ]

Durante gravação:

🔴 REC 00:32

Depois:

[ ⏹ PARAR ]

E o arquivo deve ficar disponível localmente.

Exemplo:

~/Videos/MobileCast/

Nome:

mobilecast_2026-09-06_12-30-15.webm

Posteriormente avaliar MP4/H.264/AAC via FFmpeg.

---

# 15. TV

Depois que o receptor web funcionar no PC, avaliar compatibilidade com:

* Smart TVs
* Android TV
* Google TV

O objetivo é permitir:

TV abre o receptor
↓
digita código
↓
recebe transmissão

Não desenvolver aplicativo de TV no MVP.

Usar navegador quando possível.

---

# 16. SEGURANÇA

Mesmo sendo um projeto simples, não deixar o servidor aberto de forma insegura.

Implementar:

* IDs de sessão aleatórios
* sessões temporárias
* expiração
* limite de participantes
* validação de mensagens WebSocket
* não armazenar vídeo no servidor
* não armazenar áudio no servidor
* HTTPS quando necessário
* WSS quando necessário

Uma sessão deve desaparecer depois que a transmissão terminar.

---

# 17. PRIVACIDADE

O projeto deve deixar claro:

A transmissão não deve ser armazenada no servidor.

O vídeo deve ir diretamente do Android para o receptor sempre que possível.

O servidor deve atuar como signaling.

Gravações devem ficar no dispositivo escolhido pelo usuário.

---

# 18. INTERNET

Depois do MVP LAN funcionar, pesquisar e implementar suporte opcional para:

Android
↓
Internet
↓
PC

Utilizar:

STUN

e posteriormente:

TURN/coturn

Avaliar custo operacional.

Priorizar soluções gratuitas/self-hosted.

---

# 19. INTERFACE

A UI deve ser simples.

Não criar dashboard empresarial.

Não criar dezenas de menus.

Tela Android:

Mobile Cast

[ TRANSMITIR TELA ]

Áudio interno: ✓

Qualidade: 1080p

FPS: 60

Código: ABC742

Status:
● Transmitindo

[ PARAR ]

---

Receptor:

Mobile Cast

Sessão:
ABC742

┌─────────────────────────────┐
│                             │
│      STREAM DO CELULAR      │
│                             │
└─────────────────────────────┘

● Conectado

[ Tela cheia ]

[ 🔊 ]

[ ⏺ Gravar ]

---

# 20. ESTRUTURA DO PROJETO

Propor uma estrutura organizada semelhante a:

mobile-cast/
│
├── android/
│
├── server/
│
├── web/
│
├── docs/
│
├── scripts/
│
├── tests/
│
├── README.md
│
├── ARCHITECTURE.md
│
└── ROADMAP.md

Ajuste essa estrutura se uma arquitetura melhor for encontrada.

---

# 21. DOCUMENTAÇÃO

Antes ou durante a implementação, criar documentação clara:

docs/
├── architecture.md
├── android-capture.md
├── audio-capture.md
├── webrtc.md
├── signaling.md
├── recording.md
├── lan.md
├── security.md
├── troubleshooting.md
└── roadmap.md

A documentação deve explicar decisões técnicas.

---

# 22. DESENVOLVIMENTO AUTÔNOMO

Trabalhe em ciclos.

Para cada etapa:

1. analisar
2. planejar
3. implementar
4. testar
5. corrigir
6. documentar
7. avançar

Não fique solicitando confirmação a cada pequena decisão.

Se uma decisão for reversível e de baixo risco, tome a decisão sozinho.

Se houver uma decisão arquitetural crítica, documente a decisão e escolha a opção mais simples para o MVP.

---

# 23. ORDEM DE IMPLEMENTAÇÃO

## FASE 0 — RESEARCH

Antes de escrever o núcleo do sistema:

* validar MediaProjection
* validar AudioPlaybackCapture
* validar WebRTC no Android
* validar WebRTC no navegador
* validar MediaRecorder
* verificar requisitos atuais das versões modernas do Android
* identificar limitações

Produzir:

docs/technical-feasibility.md

---

## FASE 1 — WEBRTC BÁSICO

Criar:

Android
↓
WebRTC
↓
Browser

Primeiro transmitir somente vídeo.

Critério de sucesso:

Ver a tela do Android no navegador.

---

## FASE 2 — ÁUDIO

Adicionar:

AudioPlaybackCapture
↓
WebRTC AudioTrack
↓
Browser

Critério:

Jogo reproduzindo áudio
↓
PC recebe áudio

---

## FASE 3 — SIGNALING

Implementar servidor WebSocket simples.

Criar sessões.

Permitir:

Android criar sessão.

PC entrar usando código.

---

## FASE 4 — GRAVAÇÃO

Adicionar gravação no receptor.

Testar:

vídeo
+
áudio
+
sincronização

---

## FASE 5 — UX

Adicionar:

* QR Code
* fullscreen
* status
* configurações
* tratamento de erros
* reconexão

---

## FASE 6 — OTIMIZAÇÃO

Testar:

720p
1080p

30 FPS
60 FPS

Diferentes bitrates.

Avaliar:

CPU
RAM
bateria
temperatura
latência
estabilidade

---

## FASE 7 — INTERNET

Adicionar:

STUN

e posteriormente:

TURN.

---

# 24. TESTES

Criar testes reais.

Testar pelo menos:

* Android → Chrome
* Android → Firefox
* Android → Chromium
* Wi-Fi 2.4 GHz
* Wi-Fi 5 GHz
* tela estática
* vídeo
* jogo
* áudio interno
* desconexão
* reconexão
* iniciar/parar várias vezes
* gravação curta
* gravação longa

Documentar resultados.

---

# 25. LIMITAÇÕES

Criar uma seção explícita:

## LIMITAÇÕES CONHECIDAS

Não esconder problemas.

Exemplos:

* aplicativos podem bloquear captura de áudio
* alguns fabricantes Android podem apresentar comportamentos diferentes
* certas versões do Android possuem restrições adicionais
* WebRTC pode exigir TURN fora da LAN
* navegadores podem apresentar diferenças de codec
* gravação via browser pode depender do suporte do navegador

---

# 26. PRINCÍPIO FUNDAMENTAL

O produto deve ser:

SIMPLES
RÁPIDO
LEVE
GRATUITO
PRIVADO
LOCAL-FIRST

Não transformar o projeto em uma plataforma SaaS.

A primeira versão deve resolver uma única dor:

> "Quero mostrar a tela e o áudio do meu Android em uma tela maior e gravar no PC."

---

# 27. CRITÉRIO DE SUCESSO DO MVP

Considerar o MVP concluído quando for possível:

1. Abrir o app Android.
2. Autorizar captura.
3. Iniciar transmissão.
4. Abrir o receptor no PC.
5. Conectar usando código/QR.
6. Visualizar a tela do Android.
7. Ouvir o áudio interno quando permitido.
8. Manter transmissão estável.
9. Iniciar gravação no PC.
10. Parar gravação.
11. Encontrar o arquivo gravado no PC.
12. Encerrar transmissão corretamente.

---

# 28. IMPORTANTE

Não criar código fictício para APIs inexistentes.

Não assumir que uma biblioteca funciona sem verificar sua documentação.

Não implementar uma arquitetura excessivamente complexa antes de provar o fluxo principal.

Não colocar o vídeo no servidor sem necessidade.

Não começar pelo deploy.

Não começar por autenticação de usuários.

Não começar por banco de dados.

Não começar por monetização.

Primeiro:

ANDROID → WEBRTC → PC

Depois:

ÁUDIO

Depois:

GRAVAÇÃO

Depois:

UX

Depois:

INTERNET.

---

# 29. PRIMEIRA TAREFA

Comece agora.

Primeiro analise o ambiente atual da pasta.

Depois faça um levantamento técnico da viabilidade.

Crie:

docs/technical-feasibility.md

docs/architecture.md

docs/roadmap.md

README.md

Depois apresente internamente uma arquitetura recomendada.

Em seguida comece a implementar o FASE 1.

Não pare apenas no planejamento.

O objetivo é terminar com um protótipo funcional executável.

