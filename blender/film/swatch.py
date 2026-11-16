"""Exposure check for the film rig (07-redesign §4: "check rendered swatches against tokens.css").
Renders one matte card per brand token under the shared lights, upright and facing the camera, and prints rendered
sRGB against the token. A card should land within about 10 % of its hex: that is what "brand colours survive" means here.

  blender -b --factory-startup -P blender/film/swatch.py -- [--out DIR]     (writes <out>/swatch/s/f0000.png)
"""
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig  # noqa: E402
from rig import T  # noqa: E402

NAMES = ["cream", "peach-glow", "petal-soft", "blush-line", "lotus-pink", "stem-mint", "plum-ink"]
W, H = 1400, 300


def main():
    a = rig.parse({"s": (W, H)})
    a.scale, a.samples = 50, 48
    rig.setup(a, T["cream"], rig.AMBIENT)
    rig.lights((0, 0, 0.35), 1.0)
    cam = rig.camera(60)
    for i, n in enumerate(NAMES):
        x = (i - (len(NAMES) - 1) / 2) * 0.3
        rig.mesh(n, [(x - 0.12, 0, 0.23), (x + 0.12, 0, 0.23), (x + 0.12, 0, 0.47), (x - 0.12, 0, 0.47)], [(0, 1, 2, 3)],
                 rig.mat(n, T[n], 0.9, **{"Specular IOR Level": 0.0}), smooth=False)
    rig.render(a, "swatch", {"s": (W, H)}, 1, lambda f, sid, asp: rig.frame_cam(cam, asp, (0, 0, 0.35), 0.48, 0))
    img = bpy.data.images.load(str(Path(a.out) / "swatch" / "s" / "f0000.png"))
    img.colorspace_settings.name = "Non-Color"
    px = np.array(img.pixels[:]).reshape(img.size[1], img.size[0], 4)
    worst = 0.0
    for i, n in enumerate(NAMES):
        cx = int(img.size[0] * (0.5 + (i - (len(NAMES) - 1) / 2) * 0.3 / (0.48 * W / H)))
        got = px[img.size[1] // 2 - 8: img.size[1] // 2 + 8, cx - 8: cx + 8, :3].mean((0, 1))
        err = float(np.abs(got - T[n]).max())
        worst = max(worst, err)
        print(f"SWATCH {n:11s} token {tuple(round(c * 255) for c in T[n])} rendered {tuple(int(round(c * 255)) for c in got)} max diff {err * 255:.0f}")
    print(f"SWATCH worst channel diff {worst * 255:.0f}/255")


if __name__ == "__main__":
    main()
