# Fork foundry-vtt-mcp-sra2

Ce dépôt est un **fork** de [foundry-vtt-mcp](https://github.com/adambdooley/foundry-vtt-mcp) avec support **Shadowrun Anarchy 2 (SRA2)** en plus de D&D 5e et Pathfinder 2e.

## Différences avec le repo d’origine

- **Systèmes supportés** : D&D 5e, Pathfinder 2e, **Shadowrun Anarchy 2 (sra2)**.
- **Index créatures** : l’Enhanced Creature Index fonctionne aussi pour les mondes SRA2 (personnages, véhicules, ICE).
- **Outils compendium** : `list-creatures-by-criteria` et recherche compendium avec filtres SRA2 (actorType, hasAwakened, keyword).

Le module Foundry conserve l’ID `foundry-mcp-bridge` pour rester compatible avec la config MCP existante.

---

## Tenir le fork à jour avec le repo de base

### 1. Configurer les remotes (une seule fois)

- **upstream** = repo d’origine (déjà ajouté) :
  ```bash
  git remote -v
  # upstream  https://github.com/adambdooley/foundry-vtt-mcp.git (fetch)
  # upstream  https://github.com/adambdooley/foundry-vtt-mcp.git (push)
  ```

- **origin** = ton fork GitHub (après création du repo `foundry-vtt-mcp-sra2`) :
  ```bash
  git remote set-url origin https://github.com/scardrail/foundry-vtt-mcp-sra2.git
  ```

### 2. Récupérer les mises à jour du repo de base

À chaque fois que tu veux intégrer les changements du repo d’origine :

```bash
# Récupérer les branches du repo d’origine
git fetch upstream

# Fusionner master d’origine dans ta branche courante (souvent master ou main)
git merge upstream/master
```

En cas de conflits, les résoudre dans les fichiers indiqués, puis :

```bash
git add .
git commit -m "Merge upstream/master, resolve conflicts"
```

### 3. Pousser tes changements vers ton fork

```bash
git push origin master
```

(Remplace `master` par ta branche courante si besoin.)

### 4. Workflow récap

| Action | Commande |
|--------|----------|
| Voir les remotes | `git remote -v` |
| Récupérer les mises à jour du repo de base | `git fetch upstream` |
| Fusionner le repo de base dans ta branche | `git merge upstream/master` |
| Envoyer tes commits vers ton fork | `git push origin master` |

---

## Créer le repo fork sur GitHub

1. Sur GitHub : **Create a new repository**.
2. Nom : **foundry-vtt-mcp-sra2** (ou autre si tu préfères).
3. Ne pas initialiser avec un README (le projet en a déjà un).
4. Créer le repo, puis dans ton dépôt local :
   ```bash
   git remote set-url origin https://github.com/scardrail/foundry-vtt-mcp-sra2.git
   git push -u origin master
   ```

Après ça, `origin` pointe vers ton fork et `upstream` vers le repo d’origine ; tu peux suivre la section « Tenir le fork à jour » ci-dessus.
