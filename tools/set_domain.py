"""
Define o endereço oficial do site (canonical, Open Graph, schema, sitemap, robots).

Uso:
  python tools/set_domain.py https://www.seudominio.com.br
  python tools/set_domain.py https://usuario.github.io/repositorio
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = ("index.html", "sitemap.xml", "robots.txt")
PLACEHOLDER = "https://www.SEU-DOMINIO.com.br"

if len(sys.argv) != 2 or not re.match(r"^https://[\w.-]+(/[\w./-]*)?$", sys.argv[1]):
    sys.exit("Informe o endereço com https://  —  ex.: python tools/set_domain.py https://www.seudominio.com.br")

new = sys.argv[1].rstrip("/")
state = ROOT / "tools" / ".domain"
old = state.read_text(encoding="utf-8").strip() if state.exists() else PLACEHOLDER

for name in FILES:
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    path.write_text(text.replace(old, new), encoding="utf-8", newline="\n")
    print(f"{name}: {count} ocorrência(s)")

state.write_text(new, encoding="utf-8")
print(f"Endereço definido: {new}")
