"""Convert the three original Blender renders into small browser fallbacks."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
for look in ('ponytail', 'bun', 'wrist'):
    source = Path(__file__).resolve().parent / 'renders' / f'blender-{look}.png'
    target = root / 'frontend' / 'public' / 'ritual' / f'blender-{look}.webp'
    with Image.open(source) as image:
        image.save(target, format='WEBP', quality=88, method=6)
    print(f'{target.name}: {target.stat().st_size:,} bytes')
