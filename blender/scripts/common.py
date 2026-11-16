"""Shared helpers for the GIEO Blender scene scripts (run inside Blender)."""
import re
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]


def read_tokens():
    """{name: (r, g, b)} sRGB 0-1 for every `--x: #HEX;` line in tokens.css."""
    css = (ROOT / "src" / "styles" / "tokens.css").read_text(encoding="utf-8")
    out = {}
    for name, hx in re.findall(r"--([\w-]+):\s*#([0-9A-Fa-f]{6})\b", css):
        out[name] = tuple(int(hx[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return out


def mix(a, b, t):
    """sRGB mix, same as CSS color-mix(in srgb)."""
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def to_linear(c):
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def export_glb(path, animated=False, morphs=False, uvs=False):
    """animated=True keeps shape keys and bakes the scene animation (export_apply=True drops shape keys).
    morphs=True keeps shape keys with no animation; uvs=True writes TEXCOORD_0."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    extra = dict(export_animation_mode="SCENE", export_force_sampling=True, export_morph=True,
                 export_morph_normal=True, export_anim_scene_split_object=False) if animated else {}
    if morphs and not animated:
        extra = dict(export_morph=True, export_morph_normal=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_yup=True,
        export_apply=not (animated or morphs),
        export_vertex_color="ACTIVE",
        export_materials="NONE",
        export_normals=True,
        export_texcoords=uvs,
        export_tangents=False,
        export_animations=animated,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        **extra,
    )
