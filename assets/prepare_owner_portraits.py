"""Create transparent portraits from the owner-supplied three-look image.

Usage: assets/.venv/bin/python assets/prepare_owner_portraits.py /path/to/triptych.png
Install assets/requirements-images.txt in a separate virtual environment first.
The model runs locally; the source image is never uploaded. Metadata is omitted.
"""
import argparse
import hashlib
import json
import os
from importlib.metadata import version
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps

os.environ.setdefault('OMP_NUM_THREADS', '4')

from rembg import new_session, remove

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
destination = Path(__file__).resolve().parents[1] / 'frontend' / 'public' / 'ritual'
destination.mkdir(parents=True, exist_ok=True)
model_name = 'birefnet-portrait'
source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
refinements = json.loads((Path(__file__).parent / 'owner_background_refinements.json').read_text())


def refine_inner_gaps(crop, mask, look):
    if source_hash != refinements['source_sha256']:
        return mask
    polygons = refinements['panels'].get(look, [])
    if not polygons:
        return mask
    scale = 4
    region = Image.new('L', (crop.width * scale, crop.height * scale))
    draw = ImageDraw.Draw(region)
    for polygon in polygons:
        draw.polygon([(x * scale, y * scale) for x, y in polygon], fill=255)
    region = region.resize(crop.size, Image.Resampling.LANCZOS)
    red, green, blue = crop.split()
    brightness = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    hair_alpha = brightness.point(lambda value: max(0, min(255, round((65 - value) / 35 * 255))))
    refined = ImageChops.multiply(mask, hair_alpha)
    return Image.composite(refined, mask, region)

with Image.open(args.source) as source:
    source = ImageOps.exif_transpose(source).convert('RGB')
    width, height = source.size
    if abs(width / height - 3) > 0.1:
        raise SystemExit('Expected three equal, square portrait panels arranged horizontally.')
    session = new_session(model_name, providers=['CPUExecutionProvider'])
    panels = []
    prepared = []
    for index, look in enumerate(['ponytail', 'bun', 'wrist']):
        bounds = (round(index * width / 3), 0, round((index + 1) * width / 3), height)
        crop = source.crop(bounds)
        mask = remove(crop, session=session, only_mask=True).convert('L')
        if mask.size != crop.size or mask.getextrema() != (0, 255):
            raise SystemExit(f'{look}: background mask is incomplete; no assets were written.')
        # Make confident foreground fully opaque while retaining soft hair edges.
        mask = mask.point(lambda value: 255 if value >= 250 else 0 if value <= 2 else value)
        mask = refine_inner_gaps(crop, mask, look)
        # Preserve the supplied RGB pixels. Segmentation changes only transparency.
        portrait = crop.convert('RGBA')
        portrait.putalpha(mask)
        prepared.append((look, portrait))
        panels.append({
            'look': look, 'file': f'owner-{look}.webp', 'crop': list(bounds),
            'width': portrait.width, 'height': portrait.height,
            'transparent_background': True,
        })

    for look, portrait in prepared:
        target = destination / f'owner-{look}.webp'
        portrait.save(target, format='WEBP', quality=94, method=6)
        small = portrait.copy()
        small.thumbnail((420, 420))
        small.save(destination / f'owner-{look}-small.webp', format='WEBP', quality=88, method=6)

(destination / 'owner-portraits.json').write_text(json.dumps({
    'source': 'Three-look image supplied by the user for the AKEYA website.',
    'source_sha256': source_hash,
    'source_dimensions': [width, height],
    'processing': 'Local panel crops, background removal via an alpha mask, resizing and WebP encoding. No facial, hair, body, or accessory edits.',
    'background_removal': {'model': model_name, 'rembg_version': version('rembg'), 'execution': 'local CPU', 'rgb_retouching': False},
    'inner_gap_refinement': source_hash == refinements['source_sha256'],
    'external_processing': False,
    'panels': panels,
}, indent=2) + '\n')
print('Saved three transparent owner portraits and three small-screen versions; no RGB retouching applied.')
