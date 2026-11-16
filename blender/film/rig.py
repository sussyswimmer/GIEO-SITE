"""Shared rig for the GIEO films and still-lifes (docs/07-redesign.md §4).
Tokens, numpy mesh and yarn builders, materials, lights, shadow catcher, camera and the render loop.

Run a scene (never this file):
  blender -b --factory-startup -P blender/film/<scene>.py -- --quality draft|final
      [--set l,p] [--frames 0-149 | 0,45,95] [--out DIR] [--resume] [--samples N] [--scale PCT]
PNG masters land in <out>/<scene>/<set>/f0000.png ... (0-based like the manifest, RGBA, straight alpha); default out is
D:/claude-scratch/gieo/film/raw, never public/. scripts/encode-film.mjs turns them into the mp4s, keys and manifests. Blender is Z up, the camera sits at -Y.
"""
import argparse
import bisect
import math
import sys
import time
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import common  # noqa: E402  (tokens.css reader, sRGB mix, to_linear)

T = common.read_tokens()
mix = common.mix
lin = common.to_linear
OUT = "D:/claude-scratch/gieo/film/raw"
KEY_W = 262.0  # key light watts for a 1 m subject
AMBIENT = 0.30  # sky strength shared by the cream scenes; swatch.py checks it with the lights below
QUALITY = {"draft": dict(scale=50, samples=24, noise=0.03), "final": dict(scale=100, samples=256, noise=0.01)}


# ---- maths -----------------------------------------------------------------
def ss(a, b, x):
    """smoothstep, scalar or array; a > b gives the falling edge."""
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def pchip(xs, ys, x):
    """Monotone cubic through (xs, ys), flat outside: camera and growth curves with no overshoot."""
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    h = [b - a for a, b in zip(xs, xs[1:])]
    d = [(ys[i + 1] - ys[i]) / h[i] for i in range(len(h))]
    m = [d[0]]
    for i in range(1, len(d)):
        if d[i - 1] * d[i] <= 0:
            m.append(0.0)
        else:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m.append((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]))
    m.append(d[-1])
    i = bisect.bisect_right(xs, x) - 1
    t = (x - xs[i]) / h[i]
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i]
            + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1])


def track(keys, f):
    """keys: [(frame, v0, v1, ...)] -> the interpolated tuple at frame f."""
    xs = [k[0] for k in keys]
    return [pchip(xs, [k[c] for k in keys], f) for c in range(1, len(keys[0]))]


def chroma(c, k):
    """Push an sRGB colour away from its own grey by k: token mixes are pale, earth and seed coat need warmth."""
    g = sum(c) / 3
    return tuple(min(1.0, max(0.0, g + (x - g) * k)) for x in c)


def unit(v):
    v = np.asarray(v, float)
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def catmull(points, per_seg=16):
    """Catmull-Rom through points -> dense (M, 3)."""
    P = np.asarray(points, float)
    P = np.vstack([2 * P[0] - P[1], P, 2 * P[-1] - P[-2]])
    t = np.linspace(0, 1, per_seg, endpoint=False)[:, None]
    out = [0.5 * ((2 * P[i + 1]) + (-P[i] + P[i + 2]) * t + (2 * P[i] - 5 * P[i + 1] + 4 * P[i + 2] - P[i + 3]) * t * t
                  + (-P[i] + 3 * P[i + 1] - 3 * P[i + 2] + P[i + 3]) * t ** 3) for i in range(len(P) - 3)]
    return np.vstack(out + [P[-2][None]])


def resample(P, s):
    """Points at arclengths s along polyline P (clamped at both ends)."""
    P = np.asarray(P, float)
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    return np.stack([np.interp(s, cum, P[:, c]) for c in range(3)], -1)


def arclen(P):
    return float(np.linalg.norm(np.diff(np.asarray(P, float), axis=0), axis=1).sum())


# ---- meshes ----------------------------------------------------------------
def grid_faces(R, C, B=1):
    """Quads of B stacked R x C vertex grids. With rows along a tube and columns round it, normals face out."""
    i = (np.arange(R - 1)[:, None] * C + np.arange(C - 1)[None, :]).reshape(-1, 1)
    q = np.hstack([i, i + 1, i + C + 1, i + C])
    return (q[None] + (np.arange(B) * R * C)[:, None, None]).reshape(-1, 4)


def mesh(name, verts, faces, mat=None, uv=None, col=None, smooth=True, parent=None):
    """verts (N,3), faces (M,3|4) or a list of tuples; uv (N,2) and col (N,4 linear) are per vertex."""
    me = bpy.data.meshes.new(name)
    v = np.asarray(verts, float).reshape(-1, 3)
    if isinstance(faces, np.ndarray):  # uniform tris or quads: the fast path, soil is over a million faces
        me.vertices.add(len(v))
        me.vertices.foreach_set("co", v.astype(np.float32).ravel())
        me.loops.add(faces.size)
        me.loops.foreach_set("vertex_index", faces.astype(np.int32).ravel())
        me.polygons.add(len(faces))
        me.polygons.foreach_set("loop_start", np.arange(0, faces.size, faces.shape[1], dtype=np.int32))
        me.update(calc_edges=True)
        assert len(me.polygons) == len(faces) and me.polygons[-1].loop_total == faces.shape[1], name
    else:
        me.from_pydata(v.tolist(), [], faces)
        me.update()
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    if uv is not None or col is not None:
        vi = np.empty(len(me.loops), np.int32)
        me.loops.foreach_get("vertex_index", vi)
    if uv is not None:
        me.uv_layers.new(name="UVMap").data.foreach_set("uv", np.asarray(uv, np.float32)[vi].ravel())
    if col is not None:
        attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        attr.data.foreach_set("color", np.asarray(col, np.float32).ravel())
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        me.materials.append(mat)
    ob.parent = parent
    return ob


def set_co(ob, verts):
    ob.data.vertices.foreach_set("co", np.asarray(verts, np.float32).ravel())
    ob.data.update()


def empty(name, parent=None, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent, ob.location = parent, loc
    return ob


def subsurf(ob, levels=2):
    m = ob.modifiers.new("Subsurf", "SUBSURF")
    m.levels = m.render_levels = levels
    return ob


def tube(P, r, K, nref, lobes=0, twist=0.0, depth=0.16):
    """Tube vertices (..., N, K+1, 3) round centrelines P (..., N, 3). r: scalar or (..., N). nref: a direction never
    parallel to the path (broadcasts against P). lobes > 0 gives a plied section that turns `twist` rad per unit length."""
    P = np.asarray(P, float)
    t = unit(np.gradient(P, axis=-2))
    b = unit(np.cross(t, np.broadcast_to(nref, P.shape)))
    n = np.cross(b, t)
    a = np.linspace(0, 2 * np.pi, K + 1)
    r = np.asarray(r, float)
    R = r if r.ndim == P.ndim else np.broadcast_to(r, P.shape[:-1])[..., None]  # r may also be (..., N, K+1): a profiled section
    if lobes:
        s = np.cumsum(np.linalg.norm(np.gradient(P, axis=-2), axis=-1), axis=-1)[..., None]
        R = R * (1 - depth + depth * np.cos(lobes * (a - twist * s)))  # depth: scalar or (..., N, 1)
    return P[..., None, :] + R[..., None] * (np.cos(a)[:, None] * n[..., None, :] + np.sin(a)[:, None] * b[..., None, :])


def transport(P):
    """Parallel-transported normals along one 3D polyline (N, 3): a twist-free nref for tube()."""
    t = unit(np.gradient(np.asarray(P, float), axis=0))
    n = np.empty_like(t)
    v = np.cross(t[0], (0, 1, 0))
    n[0] = unit(v if np.linalg.norm(v) > 1e-3 else np.cross(t[0], (1, 0, 0)))
    for i in range(1, len(t)):
        n[i] = unit(n[i - 1] - t[i] * np.dot(n[i - 1], t[i]))
    return n


def tube_uv(N, K, length, pitch, B=1):
    """u round the yarn, v = arclength / ply pitch (the yarn material turns this into the twist)."""
    u, v = np.meshgrid(np.linspace(0, 1, K + 1), np.linspace(0, length / pitch, N))
    return np.tile(np.stack([u, v], -1).reshape(-1, 2), (B, 1))


def lathe(profile, segs):
    """profile [(radius, z)] -> verts (P*segs, 3), quad faces (wraps round; ends left open)."""
    pr = np.asarray(profile, float)
    a = np.linspace(0, 2 * np.pi, segs, endpoint=False)
    v = np.stack([pr[:, :1] * np.cos(a), pr[:, :1] * np.sin(a), np.repeat(pr[:, 1:], segs, 1)], -1).reshape(-1, 3)
    i = np.arange(len(pr) - 1)[:, None] * segs + np.arange(segs)[None, :]
    j = np.arange(len(pr) - 1)[:, None] * segs + (np.arange(segs)[None, :] + 1) % segs
    return v, np.stack([i, j, j + segs, i + segs], -1).reshape(-1, 4)


def icosphere(sub=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    v = np.array([x.co[:] for x in bm.verts])
    f = np.array([[x.index for x in face.verts] for face in bm.faces])
    bm.free()
    return v, f


def blobs(centres, sizes, rng, sub=1, jitter=0.22, squash=(0.7, 1.25)):
    """One mesh of lumpy pebbles: verts (B, V, 3), faces (B*F, 3). Soil granules, seeds, crumbs."""
    v, f = icosphere(sub)
    B = len(centres)
    lump = 1 + jitter * rng.uniform(-1, 1, (B, len(v), 1))
    squash = rng.uniform(*squash, (B, 1, 3))
    verts = np.asarray(centres)[:, None, :] + v[None] * lump * squash * np.asarray(sizes)[:, None, None]
    return verts, (f[None] + (np.arange(B) * len(v))[:, None, None]).reshape(-1, 3)


# ---- plain weave of real yarn -----------------------------------------------
def weave_paths(nw, nf, p, amp, sw, sf, reach=None):
    """Centrelines of a plain weave in cloth coordinates (a across the warps, b along them, h out of the plane).
    sw (nw, Nw): b of every warp ring; sf (nf, Nf): a of every weft ring. reach (nw, nf) in 0..1 is how far each
    crossing is woven (the crimp envelope), None = cloth finished. Plain weave only: no motif (07-redesign §1)."""
    ai, bj = (np.arange(nw) - (nw - 1) / 2) * p, (np.arange(nf) - (nf - 1) / 2) * p
    reach = np.ones((nw, nf)) if reach is None else reach

    def crimp(s, origin, n, env):  # s: positions along the yarn, env (yarns, n crossings)
        x = (s - origin) / p
        j0 = np.clip(np.floor(x), 0, n - 2).astype(int)
        fr = np.clip(x - j0, 0, 1)
        e = np.take_along_axis(env, j0, 1) * (1 - fr) + np.take_along_axis(env, j0 + 1, 1) * fr
        edge = ss(-1.0, -0.4, x) * ss(n, n - 0.6, x)  # no crimp out in the fringe
        return amp * e * edge * np.cos(np.pi * x)

    hw = crimp(sw, bj[0], nf, reach) * ((-1.0) ** np.arange(nw))[:, None]
    hf = -crimp(sf, ai[0], nw, reach.T) * ((-1.0) ** np.arange(nf))[:, None]
    warps = np.stack([np.broadcast_to(ai[:, None], sw.shape), sw, hw], -1)
    wefts = np.stack([sf, np.broadcast_to(bj[:, None], sf.shape), hf], -1)
    return warps, wefts


class Cloth:
    """A patch of plain-weave cloth as two meshes of yarn tubes (warps, wefts). place(abh) -> (world xyz, normal)."""

    def __init__(self, name, nw, nf, p, r, mat, col_warp, col_weft, rings=(240, 240), K=8, accents=None, parent=None, ply=None):
        """ply=(plies, depth): model the plies as geometry too, in step with yarn_mat's twist (for close-ups)."""
        self.nw, self.nf, self.p, self.r, self.K, self.ply = nw, nf, p, r, K, ply
        self.obs = []
        for tag, n, N, colour in (("Warp", nw, rings[0], col_warp), ("Weft", nf, rings[1], col_weft)):
            col = np.tile(np.array([*lin(colour), 1.0]), (n, 1))
            for i, c in (accents or {}).items() if tag == "Warp" else ():
                col[i] = (*lin(c), 1.0)
            col = col * (1 + 0.05 * np.sin(np.arange(n) * 12.9898)[:, None] * [1, 1, 1, 0])  # hand-dyed, not flat
            ob = mesh(f"{name}{tag}", np.zeros((n * N * (K + 1), 3)), grid_faces(N, K + 1, n), mat,
                      uv=tube_uv(N, K, N * p / 5, 2.4 * r, n), col=np.repeat(col, N * (K + 1), 0), parent=parent)
            self.obs.append(ob)

    def update(self, sw, sf, place, reach=None, rw=None, rf=None, scale=1.0):
        """sw/sf as in weave_paths; rw/rf: per-ring radius factor (tapered tips), scale: uniform cloth scale."""
        w, f = weave_paths(self.nw, self.nf, self.p, self.r * 1.02, sw, sf, reach)
        for ob, pts, rr in ((self.obs[0], w, rw), (self.obs[1], f, rf)):
            P, n = place(pts)
            rad = self.r * scale * (1 if rr is None else rr)
            if self.ply:  # the same u * plies + v as the material's bump, so ridge sits on ridge
                N = P.shape[-2]
                v = np.arange(N) * (N * self.p / (5 * 2.4 * self.r * (N - 1)))
                turn = self.ply[0] * np.linspace(0, 1, self.K + 1)[None, :] + v[:, None]
                rad = np.broadcast_to(rad, P.shape[:-1])[..., None] * (1 - self.ply[1] * (1 + np.cos(2 * np.pi * turn)))
            set_co(ob, tube(P, rad, self.K, n))


def fuzz(P, r, per_len, rng, length=3.0, thick=0.045, curl=0.0):
    """Stray fibres standing off a yarn centreline P (N, 3): verts (F, 5, 4, 3) and faces. Reads as wool up close.
    length and thick are in yarn radii; curl bends each fibre sideways, so the halo is soft and not a row of spikes."""
    L = arclen(P)
    F = max(1, int(L * per_len))
    root = resample(P, rng.uniform(0, L, F))
    along = unit(resample(P, np.full(F, L)) - resample(P, np.zeros(F)))
    out = unit(rng.normal(size=(F, 3)))
    out = unit(out - along * (out * along).sum(-1, keepdims=True))
    k = np.linspace(0, 1, 5)[None, :, None]
    ln = (r * length * rng.uniform(0.4, 1.0, F))[:, None, None]
    bend = rng.uniform(-0.6, 0.6, (F, 1, 1))
    pts = (root[:, None] + out[:, None] * r * 0.9 + out[:, None] * ln * k * (1 - 0.3 * k)
           + along[:, None] * ln * (rng.uniform(0.2, 1.2, (F, 1, 1)) * k + bend * k * k)
           + np.cross(along, out)[:, None] * ln * rng.uniform(-curl, curl, (F, 1, 1)) * k * k)
    return tube(pts, r * thick * (1 - 0.6 * k[..., 0]), 3, out[:, None]), grid_faces(5, 4, F)


# ---- materials ---------------------------------------------------------------
def mat(name, color=None, rough=0.5, vcol=False, noise=None, bump=None, cells=None, translucent=0.0, **inputs):
    """Principled material. color: sRGB token tuple, or vcol=True for the mesh's 'Col' attribute.
    noise=(scale, darken): mottled base colour. bump=(scale, strength, distance): fine procedural relief.
    cells=(scale, strength, distance): pebbled relief (Voronoi), for earth seen from further off than its grains.
    translucent: share of light let through a single-sided sheet (petals, leaves). inputs: Principled sockets by name."""
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    nt.nodes.clear()
    N, L = nt.nodes.new, nt.links.new
    out, b = N("ShaderNodeOutputMaterial"), N("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = rough
    for k, v in inputs.items():
        b.inputs[k].default_value = v
    if vcol:
        a = N("ShaderNodeVertexColor")
        a.layer_name = "Col"
        base = a.outputs["Color"]
    else:
        rgb = N("ShaderNodeRGB")
        rgb.outputs[0].default_value = (*lin(color), 1)
        base = rgb.outputs[0]
    if noise:
        nz, mx = N("ShaderNodeTexNoise"), N("ShaderNodeMix")
        nz.inputs["Scale"].default_value, nz.inputs["Detail"].default_value = noise[0], 6
        mx.data_type, mx.blend_type = "RGBA", "MULTIPLY"
        mx.inputs[7].default_value = (1 - noise[1],) * 3 + (1,)
        L(nz.outputs["Fac"], mx.inputs[0])
        L(base, mx.inputs[6])
        base = mx.outputs[2]
    L(base, b.inputs["Base Color"])
    normal = None
    for kind, spec in (("ShaderNodeTexNoise", bump), ("ShaderNodeTexVoronoi", cells)):
        if spec:
            tx, bp = N(kind), N("ShaderNodeBump")
            tx.inputs["Scale"].default_value = spec[0]
            tx.inputs["Detail"].default_value = 8 if kind.endswith("Noise") else 1
            bp.inputs["Strength"].default_value, bp.inputs["Distance"].default_value = spec[1], spec[2]
            bp.invert = kind.endswith("Voronoi")  # cell centres stand proud
            L(tx.outputs[0], bp.inputs["Height"])
            if normal:
                L(normal, bp.inputs["Normal"])
            normal = bp.outputs["Normal"]
    if normal:
        L(normal, b.inputs["Normal"])
    shader = b.outputs[0]
    if translucent:
        tr, mx = N("ShaderNodeBsdfTranslucent"), N("ShaderNodeMixShader")
        mx.inputs[0].default_value = translucent
        L(base, tr.inputs["Color"])
        L(shader, mx.inputs[1])
        L(tr.outputs[0], mx.inputs[2])
        shader = mx.outputs[0]
    L(shader, out.inputs["Surface"])
    return m


def yarn_mat(name, plies=3, r=0.006):
    """Spun yarn: colour from 'Col', ply twist and fibre grain as bump from the tube UVs, sheen for the fuzz."""
    m = mat(name, vcol=True, rough=0.9, **{"Sheen Weight": 0.6, "Sheen Roughness": 0.4, "Specular IOR Level": 0.2})
    nt = m.node_tree
    N, L = nt.nodes.new, nt.links.new
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    uv, sep = N("ShaderNodeUVMap"), N("ShaderNodeSeparateXYZ")
    L(uv.outputs[0], sep.inputs[0])

    def op(kind, a, bv=None, c=None):
        n = N("ShaderNodeMath")
        n.operation = kind
        for sock, v in zip(n.inputs, (a, bv, c)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                sock.default_value = v
            else:
                L(v, sock)
        return n.outputs[0]

    ply = op("SINE", op("MULTIPLY", op("FRACT", op("MULTIPLY_ADD", sep.outputs[0], float(plies), sep.outputs[1])), math.pi))
    fib, mp = N("ShaderNodeTexNoise"), N("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (plies * 14, 3.0, 1)  # streaks along the ply
    fib.inputs["Scale"].default_value, fib.inputs["Detail"].default_value = 6, 4
    L(uv.outputs[0], mp.inputs[0])
    L(mp.outputs[0], fib.inputs["Vector"])
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value, bp.inputs["Distance"].default_value = 0.9, r * 0.6
    L(op("MULTIPLY_ADD", fib.outputs["Fac"], 0.35, ply), bp.inputs["Height"])
    L(bp.outputs["Normal"], b.inputs["Normal"])
    return m


# ---- scene, light, camera -------------------------------------------------------
def parse(sets):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--quality", default="draft", choices=list(QUALITY))
    ap.add_argument("--set", default=",".join(sets))
    ap.add_argument("--frames")
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--samples", type=int)
    ap.add_argument("--scale", type=int)
    return ap.parse_args(argv)


def setup(a, ambient, strength):
    """Empty scene, Cycles on the GPU, transparent film, Standard view (brand hexes survive), dim tinted sky."""
    common.reset_scene()
    sc = bpy.context.scene
    r, c, q = sc.render, sc.cycles, QUALITY[a.quality]
    r.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for dev in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = dev
            prefs.refresh_devices()
            if any(d.type == dev for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == dev
                c.device = "GPU"
                break
        except Exception:
            pass
    c.samples = a.samples or q["samples"]
    c.use_adaptive_sampling, c.adaptive_threshold, c.adaptive_min_samples = True, q["noise"], 16
    c.use_denoising, c.denoiser = True, "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    try:
        c.denoising_use_gpu = True
    except Exception:
        pass
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces, c.transparent_max_bounces = 8, 3, 4, 6, 8
    c.caustics_reflective = c.caustics_refractive = False
    c.sample_clamp_indirect = 6.0
    r.film_transparent = True
    r.use_persistent_data = True
    r.resolution_percentage = a.scale or q["scale"]
    r.image_settings.file_format, r.image_settings.color_mode, r.image_settings.color_depth = "PNG", "RGBA", "8"
    r.image_settings.compression = 15
    sc.view_settings.view_transform, sc.view_settings.look = "Standard", "None"
    w = bpy.data.worlds.new("W")
    try:
        w.use_nodes = True
    except Exception:
        pass
    nt = w.node_tree
    nt.nodes.clear()
    bg, out = nt.nodes.new("ShaderNodeBackground"), nt.nodes.new("ShaderNodeOutputWorld")
    bg.inputs["Color"].default_value, bg.inputs["Strength"].default_value = (*lin(ambient), 1), strength
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    sc.world = w
    return sc


def aim(ob, target):
    ob.rotation_euler = (Vector(target) - Vector(ob.location)).to_track_quat("-Z", "Y").to_euler()


def light(name, loc, target, energy, size, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape, ld.size, ld.energy, ld.color = "DISK", size, energy, color
    ob = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    aim(ob, target)
    return ob


def lights(target, d, key=1.0, fill=1.0, rim=1.0):
    """The page's light: one large soft key from the top left (the peach sun), a warm bounce low right, a thin rim
    from behind. d is the subject size in metres; energies scale with d squared so every scene exposes alike."""
    t = Vector(target)
    warm = lin(mix(T["cream"], T["peach-glow"], 0.35))
    e = d * d
    return [light("Key", t + Vector((-1.9, -1.9, 3.0)) * d, t, KEY_W * e * key, 2.6 * d, lin(mix((1, 1, 1), T["cream"], 0.6))),
            light("Bounce", t + Vector((2.6, -1.6, 0.4)) * d, t, KEY_W * 0.16 * e * fill, 3.0 * d, warm),
            # the sun again, behind on the left: a warm edge on seed, leaves and yarn
            light("Rim", t + Vector((-1.7, 3.0, 2.0)) * d, t, KEY_W * 0.75 * e * rim, 1.0 * d, lin(mix((1, 1, 1), T["peach-glow"], 0.6)))]


def catcher(z, color, size=40.0):
    """Shadow catcher: objects sit on the page with soft contact shadows; its colour is the bounce the page gives back."""
    s = size / 2
    ob = mesh("Catcher", [(-s, -s, z), (s, -s, z), (s, s, z), (-s, s, z)], [(0, 1, 2, 3)], mat("Page", color, 0.9), smooth=False)
    ob.is_shadow_catcher = True
    return ob


def camera(lens=60.0):
    cd = bpy.data.cameras.new("Cam")
    cd.lens, cd.sensor_width, cd.clip_start, cd.clip_end = lens, 36.0, 0.01, 200.0
    ob = bpy.data.objects.new("Cam", cd)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def frame_cam(cam, aspect, target, height, pitch=10.0, yaw=0.0, at=(0.0, 0.0), focus=None, fstop=None):
    """Look at `target` so the view is `height` metres tall there. pitch: degrees looking down, yaw: orbit to the right.
    at: where the target lands on screen, in frame widths/heights from the centre (+x right, +y up), by lens shift."""
    cd = cam.data
    d = height * max(aspect, 1.0) * cd.lens / cd.sensor_width  # sensor fit AUTO: 36 mm spans the longer side
    p, y = math.radians(pitch), math.radians(yaw)
    cam.location = Vector(target) + d * Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    aim(cam, target)
    cd.shift_x = -at[0] * min(aspect, 1.0)
    cd.shift_y = -at[1] / max(aspect, 1.0)
    cd.dof.use_dof = fstop is not None
    if fstop is not None:
        cd.dof.focus_distance, cd.dof.aperture_fstop = (d if focus is None else focus), fstop
    return d


def frames_of(a, n):
    if not a.frames:
        return list(range(n))
    if "-" in a.frames:
        lo, hi = (int(x) for x in a.frames.split("-"))
        return list(range(lo, hi + 1))
    return [int(x) for x in a.frames.split(",")]


def render(a, name, sets, n, pose):
    """pose(frame, set id, aspect) puts the scene and camera in place; frames are written 0-based as f0000.png."""
    sc = bpy.context.scene
    t0, done = time.time(), 0
    for sid in a.set.split(","):
        w, h = sets[sid]
        sc.render.resolution_x, sc.render.resolution_y = w, h
        out = Path(a.out) / name / sid
        out.mkdir(parents=True, exist_ok=True)
        for f in frames_of(a, n):
            path = out / f"f{f:04d}.png"
            if a.resume and path.exists():
                continue
            pose(f, sid, w / h)
            sc.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            done += 1
            print(f"FILM {name}/{sid} f{f:04d} {time.time() - t0:.0f}s", flush=True)
    print(f"FILM_DONE {name} {done} frames {time.time() - t0:.0f}s ({(time.time() - t0) / max(done, 1):.1f}s/frame)", flush=True)
