"""
Verificação do site antes de publicar. Não há build: este é o teste.

Uso:  python tools/check.py        (sai com código 1 se algo falhar)

Confere estrutura do HTML, arquivos referenciados, srcset, SEO básico,
dados estruturados, nomes da equipe, serviços e links de contato.
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from xml.dom import minidom

from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "assets/css/style.css").read_text(encoding="utf-8")

TEAM = ["Ryan", "Liany", "Glaucia", "Marli"]
SERVICES = [
    "Balayage", "Mechas", "Luzes", "Loiro", "Morena iluminada", "Corte de cabelo", "Escova",
    "Penteados", "Mega Hair", "Aplicação de cabelo", "Design de sobrancelhas", "Design com linha",
    "Brow lamination", "Alongamento de cílios", "Maquiagem", "Manicure", "Pedicure", "Spa dos pés",
    "Depilação a laser", "Depilação com cera", "Massagem", "Tratamentos para acne",
]
WHATSAPP = "5567984836484"
INSTAGRAM = "https://www.instagram.com/luxohairbeauty/"
IMG_BUDGET_KB = 140          # por arquivo AVIF
VOID = {"meta", "link", "img", "br", "source", "input", "hr", "use", "path", "rect", "circle"}

failures = []


def check(name, ok, detail=""):
    print(f"{'ok  ' if ok else 'FAIL'}  {name}{'  — ' + str(detail) if detail and not ok else ''}")
    if not ok:
        failures.append(name)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.errors, self.ids, self.links, self.imgs, self.h1 = [], [], [], [], [], 0
        self.blank_no_rel = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "a":
            self.links.append(a.get("href") or "")
            if a.get("target") == "_blank" and "noopener" not in (a.get("rel") or ""):
                self.blank_no_rel += 1
        if tag == "img":
            self.imgs.append(a)
        if tag == "h1":
            self.h1 += 1
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append((tag, self.getpos()[0]))


page = Page()
page.feed(html)

# --- estrutura
check("HTML bem formado", not page.errors and not page.stack, page.errors[:3] or page.stack[:3])
check("um único H1", page.h1 == 1, page.h1)
check("IDs únicos", len(page.ids) == len(set(page.ids)))
anchors = [h[1:] for h in page.links if h.startswith("#") and len(h) > 1]
check("âncoras internas existem", all(a in page.ids for a in anchors), [a for a in anchors if a not in page.ids])
check("links externos com rel=noopener", page.blank_no_rel == 0, page.blank_no_rel)

# --- imagens
check("todas as imagens têm alt", all((i.get("alt") or "").strip() for i in page.imgs))
check("todas as imagens têm width/height", all(i.get("width") and i.get("height") for i in page.imgs))
refs = set(re.findall(r'(?:src|href)="((?:assets/|favicon|site\.)[^"#?]+)"', html))
srcset_ok = True
for srcset in re.findall(r'srcset="([^"]+)"', html):
    for part in srcset.split(","):
        file, width = part.strip().split(" ")
        refs.add(file)
        if (ROOT / file).exists() and Image.open(ROOT / file).size[0] != int(width[:-1]):
            srcset_ok = False
missing = sorted(r for r in refs if not (ROOT / r).exists())
check("arquivos referenciados existem", not missing, missing[:5])
check("larguras do srcset conferem com os arquivos", srcset_ok)
heavy = [f"{p.name} {p.stat().st_size // 1024} KB" for p in (ROOT / "assets/img").rglob("*.avif")
         if p.stat().st_size > IMG_BUDGET_KB * 1024]
check(f"nenhuma foto AVIF acima de {IMG_BUDGET_KB} KB", not heavy, heavy)
lazy = sum(1 for i in page.imgs if i.get("loading") == "lazy")
check("fotos fora da primeira tela com lazy loading", lazy == len(page.imgs) - 1, f"{lazy}/{len(page.imgs)}")

# --- SEO
title = re.search(r"<title>(.*?)</title>", html).group(1)
desc = re.search(r'name="description" content="(.*?)"', html).group(1)
check("title entre 30 e 60 caracteres", 30 <= len(title) <= 60, len(title))
check("description entre 110 e 160 caracteres", 110 <= len(desc) <= 160, len(desc))
for tag in ('rel="canonical"', 'property="og:title"', 'property="og:description"', 'property="og:image"',
            'property="og:url"', 'name="twitter:card"', 'rel="icon"', 'rel="apple-touch-icon"', 'lang="pt-BR"'):
    check(f"presente: {tag}", tag in html)
canonical = re.search(r'rel="canonical" href="(.*?)"', html).group(1)
check("endereço do site definido (sem marcador)", "SEU-DOMINIO" not in html, "rode tools/set_domain.py")
ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1))
check("schema BeautySalon válido", ld["@type"] == "BeautySalon" and ld["url"] == canonical)
check("schema: telefone e CEP", ld["telephone"].replace("-", "").endswith("67984836484")
      and ld["address"]["postalCode"] == "79600-070")
check("schema: equipe", [e["name"] for e in ld["employee"]] == TEAM)
sitemap = minidom.parse(str(ROOT / "sitemap.xml"))
check("sitemap aponta para o canonical", sitemap.getElementsByTagName("loc")[0].firstChild.data == canonical)
check("robots.txt aponta para o sitemap", canonical + "sitemap.xml" in (ROOT / "robots.txt").read_text(encoding="utf-8"))
json.loads((ROOT / "site.webmanifest").read_text(encoding="utf-8"))
check("manifest válido", True)

# --- conteúdo
team_js = (ROOT / "assets/js/team.js").read_text(encoding="utf-8")
for name in TEAM:
    check(f"profissional: {name}", f'<h3 class="member__name">{name}</h3>' in html and f'name: "{name}"' in team_js
          and f"com%20{name}%20no" in html)
names_in_page = re.findall(r'<h3 class="member__name">(.*?)</h3>', html)
check("equipe na ordem e sem nomes a mais", names_in_page == TEAM, names_in_page)
absent = [s for s in SERVICES if f"<li>{s}</li>" not in html]
check("todos os serviços listados", not absent, absent)
wa = [h for h in page.links if "wa.me" in h]
check("links de WhatsApp com o número certo", wa and all(h.startswith(f"https://wa.me/{WHATSAPP}?text=") for h in wa), len(wa))
check("Instagram correto", INSTAGRAM in page.links)
check("endereço completo", "Rua Orestes Prata Tibery, 590" in html and "79600-070" in html and "Sala 03" in html)
check("CSS: chaves balanceadas", css.count("{") == css.count("}"), f'{css.count("{")} x {css.count("}")}')
check("CSS: respeita prefers-reduced-motion", "prefers-reduced-motion: reduce" in css)

print()
if failures:
    print(f"{len(failures)} verificação(ões) falharam.")
    sys.exit(1)
print("Tudo certo.")
