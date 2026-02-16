# Configuration MCP Foundry pour Cursor

## ✅ Installation terminée

Le projet a été cloné et construit avec succès dans :
```
C:\Users\tperquis\Dev\foundry-vtt-mcp
```

Le fichier du serveur MCP est disponible à :
```
C:\Users\tperquis\Dev\foundry-vtt-mcp\packages\mcp-server\dist\index.js
```

## Configuration Cursor

### 1. Accéder aux paramètres MCP de Cursor

1. Ouvrez **Cursor Settings** (Ctrl+,)
2. Allez dans **Features** > **MCP** 
3. Ajoutez ou modifiez la configuration du serveur `foundry-mcp`

### 2. Configuration JSON

Utilisez cette configuration exacte :

```json
{
  "mcpServers": {
    "foundry-mcp": {
      "command": "node",
      "args": [
        "C:\\Users\\tperquis\\Dev\\foundry-vtt-mcp\\packages\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "FOUNDRY_HOST": "82.66.201.244",
        "FOUNDRY_PORT": "49261",
        "FOUNDRY_NAMESPACE": "/foundry-mcp",
        "FOUNDRY_CONNECTION_TYPE": "auto"
      }
    }
  }
}
```

### 3. Configuration avec redirection de ports

Votre configuration utilise une **redirection de ports** :
- **FOUNDRY_HOST** : `82.66.201.244` (IP publique)
- **FOUNDRY_PORT** : `49261` (port externe de la redirection)
  - Ce port externe redirige vers le port interne `31415` du module Foundry MCP sur votre serveur LXC
  - Le port HTTP de Foundry VTT (`8080` local / `49161` distant) est différent du port MCP

**Architecture avec redirection de ports :**
```
Internet → 82.66.201.244:49261 (port externe)
    ↓ (redirection NAT/port forwarding)
Serveur LXC → 192.168.1.4:31415 (port interne du module Foundry MCP)
    ↓
Module Foundry MCP Bridge (écoute sur 31415)
    ↓
Foundry VTT (LXC Linux - 192.168.1.4:8080 / 82.66.201.244:49161)
```

### 4. Vérification

1. **Redémarrez Cursor** après avoir modifié la configuration
2. Vérifiez les logs MCP dans Cursor pour voir si la connexion est établie
3. Dans Foundry VTT, vérifiez que le module "Foundry MCP Bridge" est activé et connecté

### 5. Notes importantes

- Le module Foundry doit être activé dans Foundry VTT et le serveur doit être démarré
- Le module Foundry écoute sur le port `31415` par défaut pour les connexions MCP (WebSocket)
- Pour une connexion locale (même réseau), utilisez `FOUNDRY_HOST: "192.168.1.4"` et `FOUNDRY_PORT: "31415"`

## Architecture complète

```
Cursor (Windows) 
    ↓ (MCP Protocol)
Serveur MCP Local (Windows - C:\Users\tperquis\Dev\foundry-vtt-mcp) 
    ↓ (WebSocket/WebRTC via Internet)
82.66.201.244:49261 (port externe - redirection NAT)
    ↓ (redirection de ports)
Serveur LXC → 192.168.1.4:31415 (port interne)
    ↓
Module Foundry MCP Bridge (écoute sur 31415)
    ↓
Foundry VTT (LXC Linux - 192.168.1.4:8080 / 82.66.201.244:49161)
```

Le serveur MCP local sur Windows communique avec le module Foundry sur votre serveur LXC via WebSocket ou WebRTC, en passant par votre redirection de ports.
