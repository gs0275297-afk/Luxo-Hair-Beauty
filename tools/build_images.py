"""
Gera as imagens otimizadas do site Luxo Hair Beauty.

Uso:  python tools/build_images.py

- fotos-site/    -> assets/img/<slug>-<largura>.{avif,webp,jpg}
- fotos-equipe/  -> assets/img/equipe/<nome>-<largura>.{avif,webp,jpg}
                    (ryan, liany, glaucia, marli — qualquer .jpg/.png/.webp)
                    e atualiza assets/js/team-photos.js
- favicons e imagem de compartilhamento (Open Graph)

Nunca amplia uma foto além da resolução original.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "fotos-site"
SRC_TEAM = ROOT / "fotos-equipe"
OUT = ROOT / "assets" / "img"
OUT_TEAM = OUT / "equipe"

# arquivo original -> nome final (descritivo, bom para SEO)
PHOTOS = {
    "a1b8b01f-75d6-4cb0-bbad-8acc32be9b77": "castanho-iluminado-ondas",
    "fdec376b-25a3-41cc-afe7-0ea11b3e99a0": "ruivo-borgonha-ondas",
    "ef75f004-1256-46d4-ba17-53df519f5df0": "ruivo-acobreado-luxo-hair",
    "99d091a2-917d-4c07-b1d9-e67cb6c50752": "loiro-longo-ondulado",
    "983d24d6-5b73-49a5-9828-aa33937ef056": "morena-iluminada-mechas",
    "2f7c90e5-fdc3-4d8f-ad00-4c5752048aaf": "balayage-mel-ondas",
    "d20730b6-0b7e-4ece-84a7-61eb333ecf1e": "corte-camadas-castanho",
    "13c05958-45d3-488c-bc06-6b5f02700814": "morena-escova-ondas",
    "43586f32-2a6c-4255-b1ca-85cc461706ae": "castanho-caramelo-longo",
}

WIDTHS = (480, 800)          # + largura original
TEAM = ("ryan", "liany", "glaucia", "marli")
TEAM_WIDTHS = (480, 900)

INK = (12, 11, 10)
GOLD = (201, 169, 106)
BONE = (242, 236, 225)


def save_all(img: Image.Image, base: Path, jpg: bool) -> None:
    img.save(base.with_suffix(".avif"), quality=62, speed=3)
    img.save(base.with_suffix(".webp"), quality=82, method=6)
    if jpg:
        img.save(base.with_suffix(".jpg"), quality=84, optimize=True, progressive=True)


def variants(src: Path, slug: str, out: Path, widths) -> list[int]:
    out.mkdir(parents=True, exist_ok=True)
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    w0, h0 = img.size
    done = sorted({*(w for w in widths if w < w0), min(w0, 1280)})
    jpg_at = 800 if 800 in done else done[-1]   # um único JPG de reserva por foto
    for w in done:
        if w == w0:
            im = img
        else:
            im = img.resize((w, round(h0 * w / w0)), Image.LANCZOS)
            # recupera a nitidez perdida na redução, sem criar halo
            im = im.filter(ImageFilter.UnsharpMask(radius=0.6, percent=45, threshold=2))
        save_all(im, out / f"{slug}-{w}", jpg=(w == jpg_at))
    r, g, b = img.resize((1, 1), Image.BOX).getpixel((0, 0))
    print(f"{slug:32} {w0}x{h0}  larguras={done}  cor=#{r:02x}{g:02x}{b:02x}")
    return done


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    for candidate in (name, "georgiai.ttf", "times.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def favicons() -> None:
    """Monograma L dourado sobre preto."""
    size = 512
    im = Image.new("RGB", (size, size), INK)
    d = ImageDraw.Draw(im)
    f = font("GARAIT.TTF", 400)
    box = d.textbbox((0, 0), "L", font=f)
    d.text(((size - (box[2] - box[0])) / 2 - box[0], (size - (box[3] - box[1])) / 2 - box[1]),
           "L", font=f, fill=GOLD)
    for s, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png"),
                    (32, "favicon-32.png")):
        im.resize((s, s), Image.LANCZOS).save(ROOT / "assets" / name, optimize=True)
    im.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("favicons ok")


def og_image() -> None:
    """1200x630 para WhatsApp / Instagram / Facebook."""
    W, H, split = 1200, 630, 520
    canvas = Image.new("RGB", (W, H), INK)
    src = Image.open(SRC / "a1b8b01f-75d6-4cb0-bbad-8acc32be9b77.png").convert("RGB")
    photo = ImageOps.fit(src, (W - split, H), Image.LANCZOS, centering=(0.5, 0.28))
    canvas.paste(photo, (split, 0))
    # transição suave entre o painel preto e a foto
    fade = Image.linear_gradient("L").rotate(270, expand=True).resize((220, H))
    canvas.paste(Image.new("RGB", (220, H), INK), (split, 0), fade)
    d = ImageDraw.Draw(canvas)
    d.text((64, 196), "Luxo", font=font("GARA.TTF", 150), fill=BONE)
    d.text((70, 340), "Hair Beauty", font=font("GARAIT.TTF", 64), fill=GOLD)
    d.line((70, 440, 150, 440), fill=GOLD, width=2)
    d.text((70, 466), "Salão de beleza · Três Lagoas-MS", font=font("GARA.TTF", 30), fill=BONE)
    canvas.save(ROOT / "assets" / "og-image.jpg", quality=88, optimize=True, progressive=True)
    print("og-image ok")


def team() -> None:
    found = {}
    if SRC_TEAM.exists():
        for name in TEAM:
            src = next((p for p in SRC_TEAM.iterdir()
                        if p.stem.lower() == name and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")), None)
            if src:
                found[name] = variants(src, name, OUT_TEAM, TEAM_WIDTHS)
    js = ROOT / "assets" / "js" / "team-photos.js"
    js.parent.mkdir(parents=True, exist_ok=True)
    body = ", ".join(f"{n}: {w}" for n, w in found.items())
    js.write_text(
        "/* Gerado por tools/build_images.py — não editar à mão. */\n"
        f"window.LUXO_TEAM_PHOTOS = {{ {body} }};\n" if body else
        "/* Gerado por tools/build_images.py — não editar à mão. */\n"
        "window.LUXO_TEAM_PHOTOS = {};\n",
        encoding="utf-8",
    )
    print(f"equipe: {len(found)} foto(s)")


if __name__ == "__main__":
    for stem, slug in PHOTOS.items():
        variants(SRC / f"{stem}.png", slug, OUT, WIDTHS)
    team()
    favicons()
    og_image()
    total = sum(p.stat().st_size for p in OUT.rglob("*.avif"))
    print(f"AVIF total: {total / 1024:.0f} KB")
