# Gera os ícones e o ecrã inicial da APK (android/app/src/main/res) a partir de icons/.
# Uso: python scripts/android-icones.py
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
RES = RAIZ / 'android/app/src/main/res'
FUNDO = (5, 9, 31, 255)
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
icone = Image.open(RAIZ / 'icons/icon-512.png').convert('RGBA')
mascaravel = Image.open(RAIZ / 'icons/icon-maskable-512.png').convert('RGBA')

for nome, d in DENS.items():
    pasta = RES / f'mipmap-{nome}'
    lado = round(48 * d)
    icone.resize((lado, lado), Image.LANCZOS).save(pasta / 'ic_launcher.png')
    icone.resize((lado, lado), Image.LANCZOS).save(pasta / 'ic_launcher_round.png')
    # Ícone adaptativo: 108dp, com a zona segura do ícone mascarável (80%) dentro da zona visível (72dp).
    fg = round(108 * d)
    tela = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
    m = round(fg * 90 / 108)
    tela.paste(mascaravel.resize((m, m), Image.LANCZOS), ((fg - m) // 2, (fg - m) // 2))
    tela.save(pasta / 'ic_launcher_foreground.png')

def splash(largura, altura, destino):
    tela = Image.new('RGBA', (largura, altura), FUNDO)
    lado = round(min(largura, altura) * 0.32)
    tela.paste(icone.resize((lado, lado), Image.LANCZOS), ((largura - lado) // 2, (altura - lado) // 2), icone.resize((lado, lado), Image.LANCZOS))
    tela.convert('RGB').save(destino)

for p in RES.glob('drawable*/splash.png'):
    w, h = Image.open(p).size
    splash(w, h, p)

(RES / 'values/ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#05091F</color>\n</resources>\n', encoding='utf-8')
print('Ícones e ecrã inicial gerados')
