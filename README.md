# Luxo Hair Beauty — site

Site estático (HTML + CSS + JS, sem build). Para ver localmente:

```bash
python -m http.server 4173
```

e abra `http://localhost:4173`.

## Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | Página única, com todo o conteúdo e o SEO (title, description, Open Graph, schema `BeautySalon`) |
| `404.html` | Página de erro, com estilos embutidos |
| `assets/css/style.css` | Identidade visual, layout e animações |
| `assets/js/main.js` | Menu, entradas ao rolar, parallax, serviços, perfil da equipe, galeria ampliada |
| `assets/js/team.js` | **Dados da equipe — edite aqui** |
| `assets/img/` | Fotos otimizadas (AVIF + WebP + JPG), geradas pelo script |
| `fotos-site/` | Fotos originais, usadas pelo script para gerar `assets/img` |
| `fotos-equipe/` | Fotos originais dos profissionais |
| `tools/` | Scripts de apoio (não fazem parte do site) |

## Antes de publicar

Não há build. O teste do projeto é:

```bash
python tools/check.py
```

Ele confere estrutura do HTML, arquivos referenciados, srcset, SEO, dados
estruturados, nomes da equipe, serviços e links de contato. Precisa de Python
com Pillow (`pip install pillow`).

### Endereço do site

Canonical, Open Graph, schema, sitemap e robots usam um endereço fixo. Hoje ele
aponta para o GitHub Pages do repositório. Se o site for publicado em outro
lugar (domínio próprio, Vercel, Netlify), troque com:

```bash
python tools/set_domain.py https://www.seudominio.com.br
```

### GitHub Pages

Em **Settings → Pages**, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
O arquivo `.nojekyll` já está no repositório.

## Conferir em vários tamanhos de tela

Com o servidor local rodando:

```
http://localhost:4173/tools/preview.html?w=390&h=844
http://localhost:4173/tools/preview.html?w=1440&h=900
```

mostra a página inteira em quadros lado a lado, cada um do tamanho pedido.

Para uma checagem numérica (rolagem horizontal, textos cortados, áreas de toque
pequenas, fotos acima da resolução real), rode no console do navegador:

```js
(await import('/tools/audit.js')).default()
```

## Equipe: fotos e especialidades

Hoje cada profissional aparece com um retrato tipográfico (a inicial em dourado),
porque ainda não há foto nem especialidades cadastradas.

**Fotos** — salve em `fotos-equipe/` com estes nomes e rode o script:

```
fotos-equipe/ryan.jpg
fotos-equipe/liany.jpg
fotos-equipe/glaucia.jpg
fotos-equipe/marli.jpg
```

```bash
python tools/build_images.py
```

Retrato vertical, rosto no terço superior, pelo menos 1200 px de largura.
A foto entra sozinha no cartão e no perfil.

**Textos** — em `assets/js/team.js`, preencha `role`, `bio` e `specialties`.
Campo vazio não aparece.

## Trocar ou adicionar fotos da galeria

1. Coloque o arquivo em `fotos-site/`.
2. Acrescente a linha em `PHOTOS` no `tools/build_images.py` (arquivo → nome final).
3. Rode `python tools/build_images.py`.
4. Copie um bloco `<a class="shot …">` em `index.html` e ajuste nomes, `alt` e legenda.

O script nunca amplia uma foto além do tamanho original. As fotos atuais têm
cerca de 1100–1270 px de largura, e o layout foi desenhado para esse limite.
