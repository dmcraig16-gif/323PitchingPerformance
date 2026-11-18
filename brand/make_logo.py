"""Cut the 323 logo out of its white sticker background and turn the navy white, for use on black."""
import sys
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(float) / 255
mn, mx = a.min(axis=2), a.max(axis=2)
chroma = mx - mn

# Ink has a dark channel and some colour; white, the sticker outline and the gray shadow have neither.
alpha = np.clip((0.80 - mn) / (0.80 - 0.30), 0, 1)
alpha *= np.clip((chroma - 0.05) / 0.10, 0, 1)

# Un-mix from white so anti-aliased edges keep their true colour
safe = np.where(alpha > 0, alpha, 1)[..., None]
col = np.clip((a - (1 - alpha[..., None])) / safe, 0, 1)

# Navy (every channel low) becomes white; blue and red each keep one strong channel
peak = col.max(axis=2)
t = np.clip((0.55 - peak) / (0.55 - 0.30), 0, 1)[..., None]
col = col * (1 - t) + t

# Drop stray specks: detached pieces far smaller than the smallest real letter (~1,200 px)
lab, n = ndimage.label(alpha > 0.08)
sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
keep = ndimage.binary_dilation(np.isin(lab, np.where(sizes >= 600)[0] + 1), iterations=2)
alpha = np.where(keep, alpha, 0)
print(f'pieces {n}, removed {(sizes < 600).sum()} specks (largest removed {int(sizes[sizes < 600].max())} px), kept {(sizes >= 600).sum()}')

img = Image.fromarray((np.dstack([col, alpha]) * 255).round().astype(np.uint8), 'RGBA')
bbox = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
pad = 6
img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad)))
img.save(out)
print('saved', out, img.size)
