"""Film `seed` (07-redesign §4): a seed hovers, falls into a bed of real earth, splits; the sprout and two leaves open;
the stem grows and thins to a thread that arcs over, lands on the earth and runs out of the bottom of the frame.
Beats (0-based frames): fall 0-40, sprout 40-95, thread 95-149. Rendered on a transparent film: the sky is alpha, and
scripts/encode-film.mjs lays it on flat --cream with the peach sun, so the top and sides of the opaque film meet the page.

  blender -b --factory-startup -P blender/film/seed.py -- --quality draft|final [--set l,p] [--frames ...] [--resume]
Also writes <out>/seed/meta.json (threadExit per set, measured from the real camera) for the manifest.
"""
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector, noise

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig  # noqa: E402
from rig import T, chroma, lerp, lin, mix, pchip, ss, track  # noqa: E402

SETS = {"l": (1920, 1080), "p": (900, 1200)}  # `ls` is a downscale of `l`, made by the encoder
FRAMES = 150
SEED_H, SEED_W, SEED_REST, SEED_YAW = 0.34, 0.225, 0.115, 0.45
S_STEM = 1.0  # stem arclength; past it the tube is thread
LAND = 34  # the seed touches the soil; settled by 40 (end of `fall`)
HOLD = 138  # thread laid and camera at rest: the last frames hold for the handoff to the page thread
EARTH = [chroma(mix(T["ink"], T["peach-glow"], t), 1.7) for t in (0.2, 0.27, 0.34, 0.42)]  # warm taupe to brown
SHELL = chroma(mix(T["ink"], T["peach-glow"], 0.17), 2.6)  # the darkest thing in the frame

# Camera: (frame, target z, view height at the target, pitch, target's screen x, y from the top-left, f-stop).
# It stays close: the seed is a third of the frame, the sprout is shot from soil level, then it cranes with the stem.
# The earth is a ground, not a pile: its horizon sits a quarter to a third up the frame at the sprout beat, and the
# cream sky above it stays calm for the copy (textSafe).
CAM = {
    "l": [(0, 1.05, 0.96, 4, 0.63, 0.47, 1.4), (10, 0.98, 0.96, 5, 0.63, 0.46, 1.4), (20, 0.74, 1.0, 6, 0.63, 0.46, 1.2),
          (28, 0.44, 1.02, 7, 0.63, 0.47, 1.0), (LAND, 0.24, 0.9, 8, 0.63, 0.50, 0.8), (44, 0.21, 0.8, 8, 0.63, 0.50, 0.6),
          (64, 0.22, 0.76, 6, 0.635, 0.49, 0.45), (95, 0.33, 0.96, 6, 0.63, 0.45, 0.5), (118, 0.55, 1.52, 9, 0.62, 0.52, 1.6),
          (HOLD, 0.60, 1.62, 11, 0.60, 0.50, 4.0), (149, 0.60, 1.635, 11, 0.60, 0.50, 4.0)],
    "p": [(0, 1.05, 1.06, 4, 0.50, 0.57, 1.4), (10, 0.98, 1.06, 5, 0.50, 0.56, 1.4), (20, 0.74, 1.12, 6, 0.50, 0.57, 1.2),
          (28, 0.44, 1.2, 7, 0.50, 0.60, 1.0), (LAND, 0.24, 1.12, 8, 0.50, 0.63, 0.8), (44, 0.21, 1.04, 8, 0.50, 0.65, 0.6),
          (64, 0.22, 1.0, 6, 0.50, 0.66, 0.45), (95, 0.33, 1.25, 6, 0.50, 0.56, 0.5), (118, 0.55, 2.0, 9, 0.52, 0.60, 1.6),
          (HOLD, 0.60, 2.12, 11, 0.55, 0.60, 4.0), (149, 0.60, 2.14, 11, 0.55, 0.60, 4.0)],
}
FOCUS = {"l": [0.63, 0.55], "p": [0.5, 0.66]}
TEXT_SAFE = {"l": [0.0, 0.0, 0.45, 0.64], "p": [0.0, 0.0, 1.0, 0.42]}  # the bed of earth runs under both
SIDE = {"l": 1, "p": -1}  # the thread arcs away from the copy: right on desktop, left (the gutter) on phones


# ---- soil -------------------------------------------------------------------
def terrain(x, y):
    """Height of the bed of earth. It runs edge to edge under the camera, crests just behind the seed and falls away,
    so its far edge is a low horizon against the cream sky. A slight rise with a planting hollow marks the middle."""
    r = np.hypot(x, y)
    z = -0.10 * ss(-0.1, -1.6, y) - 0.9 * ss(0.3, 1.6, y)
    z = z + 0.035 * np.sin(1.7 * x + 0.8) * np.sin(1.3 * y + 0.3) + 0.02 * np.sin(4.1 * x - 1.0 + 2.0 * y) + 0.012 * np.sin(9.3 * x + 1.7) * np.sin(7.7 * y + 0.4)
    return z + 0.05 * np.exp(-(r / 0.32) ** 2) - 0.045 * np.exp(-(r / 0.10) ** 2)


def soil(name, rng, n=32000, clods=9000, hollow=0.14, at=(0.0, 0.0), reach=0.8, bed=True):
    """Real earth: a lumpy ground with fine crumbs heaped round the seed (the macro sees every grain) and clods across
    the rest of the bed. Returns (ground, grains, loose): `loose` are the hollow's grains, shoved aside by the landing.
    bed=False gives only the crumbs within `reach` of `at`, on a flat z = 0 (the stills fill a tray with it)."""
    m = rig.mat(f"{name}Soil", vcol=True, rough=0.95, noise=(90, 0.3), bump=(420, 0.5, 0.002))
    tone = np.array([lin(t) for t in EARTH])
    ground, h = None, (terrain if bed else (lambda x, y: np.zeros_like(x)))
    if bed:
        gm = rig.mat(f"{name}Ground", vcol=True, rough=0.95, noise=(40, 0.35), bump=(300, 0.6, 0.003), cells=(170, 1.0, 0.012))
        X, Y = np.meshgrid(np.linspace(-3.8, 3.8, 500), np.linspace(-2.8, 1.7, 296), indexing="ij")
        lump = np.array([noise.noise(Vector((a * 17, b * 17, 1.3))) for a, b in zip(X.ravel(), Y.ravel())]).reshape(X.shape)
        k = (0.5 + 0.9 * lump).clip(0, 1)[..., None]
        col = np.concatenate([tone[0] + (tone[2] - tone[0]) * k, np.ones_like(k)], -1).reshape(-1, 4)
        ground = rig.mesh(f"{name}Ground", np.stack([X, Y, terrain(X, Y) + 0.007 * lump], -1), rig.grid_faces(500, 296)[:, ::-1], gm, col=col)
    else:
        clods = 0
    r, a = reach * rng.uniform(0, 1, n) ** 0.62, rng.uniform(0, 2 * np.pi, n)
    kind = rng.uniform(0, 1, n)
    size = np.where(kind < 0.88, rng.uniform(0.002, 0.006, n), np.where((kind < 0.994) | (r < 0.36), rng.uniform(0.006, 0.012, n), rng.uniform(0.015, 0.028, n)))
    cx, cy = np.r_[r * np.cos(a), rng.uniform(-3.5, 3.5, clods)], np.r_[r * np.sin(a), rng.uniform(-2.5, 0.8, clods)]
    big = rng.uniform(0, 1, clods)
    size = np.r_[size, np.where(big < 0.985, rng.uniform(0.004, 0.014, clods), rng.uniform(0.02, 0.04, clods))]
    N = n + clods
    c = np.stack([cx + at[0], cy + at[1], h(cx, cy) + 0.3 * size + rng.uniform(0, 0.006, N)], -1)
    gcol = np.hstack([tone[rng.integers(0, len(tone), N)] * rng.uniform(0.75, 1.15, (N, 1)), np.ones((N, 1))])
    v, f = rig.blobs(c, size, rng, jitter=0.22, squash=(0.5, 1.3))  # crumbs, not beads
    V, F = v.shape[1], len(f) // N
    hole = np.hypot(cx, cy) < hollow
    grains = rig.mesh(f"{name}Grains", v[~hole], f[: (~hole).sum() * F], m, col=np.repeat(gcol[~hole], V, 0))
    loose = rig.mesh(f"{name}Loose", v[hole], f[: hole.sum() * F], m, col=np.repeat(gcol[hole], V, 0)) if hole.any() else None
    return ground, grains, (loose, c[hole] - [at[0], at[1], 0], v[hole], rng.uniform(0.3, 1.0, hole.sum()))


def shove(loose, k, hop):
    """Push the hollow's grains out and up as the seed lands: k 0..1 how far, hop 0..1 a ballistic bounce."""
    ob, c, v, rnd = loose
    d = rig.unit(c * [1, 1, 0] + [1e-6, 0, 0])
    r = np.linalg.norm(c[:, :2], axis=1)
    off = d * ((0.125 - r).clip(0) * 1.1 * k)[:, None] + [0, 0, 1] * (0.035 * k * (r < 0.11) + 0.06 * hop * rnd)[:, None]
    rig.set_co(ob, v + off[:, None, :])


# ---- seed ---------------------------------------------------------------------
def seed_half(name, sign, mat_, parent, rows=48, cols=71, hinge=0.05):
    """Half of a finely ridged seed, in hinge coordinates: outer shell smooth, the split face flat. A groove runs
    down the seam, so the closed seed shows no slit."""
    t = (1 - np.cos(np.pi * np.linspace(0, 1, rows))) / 2
    ph = np.linspace(-np.pi / 2, np.pi / 2, cols)
    w = SEED_W / 2 * np.sin(np.pi * t ** 0.8) ** 0.7 * (1 - 0.2 * t)
    wr = w[:, None] * (1 + 0.016 * np.cos(14 * ph)[None, :] * np.sin(np.pi * t)[:, None] ** 0.5)
    z = np.broadcast_to((t * SEED_H - SEED_H / 2 + hinge)[:, None], wr.shape)
    outer = np.stack([sign * wr * np.cos(ph), 0.8 * wr * np.sin(ph), z], -1).reshape(-1, 3)
    inner = np.stack([np.zeros((rows, 2)), 0.8 * w[:, None] * [-1, 1], z[:, :2]], -1).reshape(-1, 3)
    f = rig.grid_faces(rows, cols)
    base = rows * cols + np.arange(rows - 1)[:, None] * 2
    fi = np.hstack([base, base + 2, base + 3, base + 1])
    if sign < 0:
        f = f[:, ::-1]
    else:
        fi = fi[:, ::-1]
    flesh = lin(chroma(mix(T["peach-glow"], T["ink"], 0.45), 1.6))  # cream-tan: a shell half, not a white speck
    ridge = (0.72 + 0.28 * (0.5 + 0.5 * np.cos(14 * ph)))[None, :, None] * np.ones((rows, 1, 1))
    col = np.vstack([np.concatenate([ridge * lin(SHELL), np.ones((rows, cols, 1))], -1).reshape(-1, 4), np.tile([*flesh, 1.0], (rows * 2, 1))])
    ob = rig.mesh(name, np.vstack([outer, inner]), np.vstack([f, fi]), mat_, col=col, parent=parent)
    ob.data.polygons.foreach_set("use_smooth", [True] * len(f) + [False] * len(fi))
    return ob


class Seed:
    def __init__(self, name="Seed"):
        m = rig.mat(f"{name}Coat", vcol=True, rough=0.5, noise=(70, 0.25), bump=(160, 0.22, 0.002),
                    **{"Coat Weight": 0.1, "Coat Roughness": 0.35, "Sheen Weight": 0.15})
        self.root = rig.empty(name)
        self.hinge = {}
        for tag, sign in (("L", -1), ("R", 1)):
            self.hinge[tag] = rig.empty(f"{name}Hinge{tag}", self.root, (0, 0, -SEED_H / 2 + 0.05))
            seed_half(f"{name}Half{tag}", sign, m, self.hinge[tag])

    def set(self, z, yaw=SEED_YAW, tilt=0.0, open_l=0.0, open_r=0.0, at=(0.0, 0.0)):
        self.root.location = (at[0], at[1], z)
        self.root.rotation_euler = (0.25 * tilt, tilt, yaw)
        self.hinge["L"].rotation_euler = (0, -open_l, 0)
        self.hinge["R"].rotation_euler = (0, open_r, 0)


# ---- sprout: stem, leaves, thread ------------------------------------------------
class Sprout:
    """Stem tube that grows by arclength L: a hooked shoot at first, straight later, and past S_STEM a plied thread
    laid along `thread` (a 3D polyline starting at the stem top). Leaves ride the stem and unfold."""
    K, NU, NV = 12, 29, 35

    def __init__(self, name, origin, phase=0.6, leaves=((0.21, 1, 1.0), (0.25, -1, 0.9), (0.50, -1, 0.7), (0.57, 1, 0.62)), rings=720):
        self.o, self.phase, self.leaf_def, self.N = np.asarray(origin, float), phase, leaves, rings
        sm = rig.mat(f"{name}Stem", vcol=True, rough=0.5,
                     **{"Subsurface Weight": 0.3, "Subsurface Radius": (0.02, 0.03, 0.02), "Subsurface Scale": 1.0})
        nt = sm.node_tree  # the 'Col' alpha marks the thread: it glows a little, like the page thread it becomes
        vc, b = (next(n for n in nt.nodes if n.type == k) for k in ("VERTEX_COLOR", "BSDF_PRINCIPLED"))
        mul = nt.nodes.new("ShaderNodeMath")
        mul.operation, mul.inputs[1].default_value = "MULTIPLY", 0.12
        nt.links.new(vc.outputs["Alpha"], mul.inputs[0])
        nt.links.new(mul.outputs[0], b.inputs["Emission Strength"])
        nt.links.new(vc.outputs["Color"], b.inputs["Emission Color"])
        lm = rig.mat(f"{name}Leaf", vcol=True, rough=0.4, translucent=0.5, bump=(900, 0.12, 0.001), **{"Sheen Weight": 0.25})
        self.stem = rig.mesh(f"{name}Stem", np.zeros((self.N * (self.K + 1), 3)), rig.grid_faces(self.N, self.K + 1), sm,
                             col=np.ones((self.N * (self.K + 1), 4)))
        v = (np.linspace(0, 1, self.NV)[:, None] * np.ones((1, self.NU))).ravel()
        u = (np.ones((self.NV, 1)) * np.linspace(-1, 1, self.NU)[None, :]).ravel()
        mint = np.array(lin(T["stem-mint"]))
        vein = 0.3 * np.exp(-(u / 0.07) ** 2) * (1 - 0.5 * v) + 0.1 * np.exp(-(((v * 7 - np.abs(u) * 2.2) % 1 - 0.5) / 0.13) ** 2) * (np.abs(u) > 0.1)
        col = mint * (0.82 + 0.26 * ss(0.05, 1.0, v) + 0.1 * np.abs(u))[:, None] * (1 - vein)[:, None]  # midrib, side veins, paler rim
        col = np.hstack([col.clip(0, 1), np.ones((len(v), 1))])
        self.leaves = [rig.subsurf(rig.mesh(f"{name}Leaf{i}", np.zeros((self.NV * self.NU, 3)), rig.grid_faces(self.NV, self.NU), lm, col=col), 1)
                       for i in range(len(leaves))]
        self.thread = None
        self.hook = 1.0  # the young shoot's hook; the stills set 0 for seedlings that stand straight

    def stem_line(self, L):
        """Dense stem centreline for growth L: (arclengths, points, headings). 0 heading is up, + leans to +X."""
        n = max(3, int(min(L, S_STEM) / 0.004) + 2)
        s = np.linspace(0, min(L, S_STEM), n)
        hook = self.hook * 1.5 * ss(0.05, 0.16, L) * (1 - ss(0.22, 0.5, L))
        th = 0.2 * np.sin(2.1 * s + self.phase) * ss(0.1, 0.5, s) + hook * ss(L - 0.15, L, s)
        d = np.diff(s, prepend=0)
        return s, self.o + np.stack([np.cumsum(np.sin(th) * d), np.zeros(n), np.cumsum(np.cos(th) * d)], -1), th

    def top(self):
        return self.stem_line(S_STEM)[1][-1]

    def update(self, L, opens, sway=0.0):
        """L: grown arclength. opens: one 0..1 per leaf."""
        s, P, th = self.stem_line(L)
        sj = np.linspace(0, 1, self.N) ** 0.8 * max(L, 1e-4)  # a little denser toward the tip, where the thread curls
        pts = np.stack([np.interp(sj, s, P[:, c]) for c in range(3)], -1)
        if self.thread is not None and L > S_STEM:
            past = sj > S_STEM
            pts[past] = rig.resample(self.thread, sj[past] - S_STEM)
        tip = np.sqrt(1 - (1 - np.clip((L - sj) / np.interp(L, [0.3, 1.0, 1.2], [0.07, 0.07, 0.03]), 0, 1)) ** 2)  # a rounded growing tip
        r = np.interp(sj, [0, 0.5, 0.82, 1.02, 1.3], [0.019, 0.014, 0.009, 0.0064, 0.0054]) * tip * (L > 1e-3)
        yarn = ss(0.9, 1.15, sj)  # 0 stem, 1 thread
        rig.set_co(self.stem, rig.tube(pts, r, self.K, rig.transport(pts), lobes=2, twist=2 * np.pi / 0.07, depth=(0.22 * yarn)[:, None]))
        mint, dark, deep = (np.array(lin(c)) for c in (T["stem-mint"], mix(T["stem-mint"], T["plum-ink"], 0.3), chroma(mix(T["stem-mint"], T["plum-ink"], 0.06), 1.15)))
        col = dark + (mint - dark) * ss(0.0, 0.4, sj)[:, None] + (deep - mint) * yarn[:, None]
        self.stem.data.color_attributes["Col"].data.foreach_set(
            "color", np.repeat(np.hstack([col, yarn[:, None]]), self.K + 1, 0).astype(np.float32).ravel())
        u = np.linspace(-1, 1, self.NU)[None, :]
        v = np.linspace(0, 1, self.NV)[:, None]
        for ob, (sa, side, size), op in zip(self.leaves, self.leaf_def, opens):
            grow = float(ss(0, 0.1, L - sa)) * size * (0.35 + 0.65 * op)
            O = np.array([np.interp(sa, s, P[:, c]) for c in range(3)])
            h = float(np.interp(sa, s, th)) + side * lerp(0.12, 1.12, op) + sway * side
            A = np.array([math.sin(h), 0, math.cos(h)])
            U = math.copysign(1, h) * np.array([-math.cos(h), 0, math.sin(h)])
            Nn = rig.unit(0.6 * U + [0, -0.8, 0])  # the blade faces half up, half to the camera
            C = np.cross(Nn, A)
            yaw = side * 0.5 + 0.25
            rot = np.array([[math.cos(yaw), -math.sin(yaw), 0], [math.sin(yaw), math.cos(yaw), 0], [0, 0, 1]])
            A, C, Nn = rot @ A, rot @ C, rot @ Nn
            hw = 0.062 * np.sin(np.pi * v ** 0.85) ** 0.65
            across = u * hw * (0.3 + 0.7 * op)
            lift = (u * u * hw * (1.0 - 0.55 * op) - 0.008 * np.exp(-(u / 0.1) ** 2) * np.sin(np.pi * v)  # cupped, creased midrib
                    - 0.07 * op * v ** 2.5 + 0.02 * np.sin(np.pi * v) * op + 0.004 * op * np.sin(v * 9 + u * 3) * np.abs(u))  # tip curls over
            rig.set_co(ob, O + grow * (A * (v * 0.25 * np.ones_like(u))[..., None] + C * across[..., None] + Nn * lift[..., None]))


def thread_path(top, side):
    """From the stem top: up, over to one side, down to the earth, then along it towards the viewer and out of frame."""
    x, _, z = top

    def lay(px, py):  # lying on the earth, clear of the crumbs
        return px, py, float(terrain(px, py)) + 0.014

    pts = [(x, 0, z), (x + 0.03 * side, -0.01, z + 0.10), (x + 0.12 * side, -0.05, z + 0.17), (x + 0.27 * side, -0.11, z + 0.18),
           (x + 0.41 * side, -0.18, z + 0.07), (x + 0.50 * side, -0.25, z - 0.16), (x + 0.54 * side, -0.31, 0.42),
           (x + 0.60 * side, -0.37, 0.16), (x + 0.66 * side, -0.43, 0.03), lay(x + 0.70 * side, -0.50),
           lay(x + 0.66 * side, -0.60), lay(x + 0.58 * side, -0.74), lay(x + 0.64 * side, -1.0),
           lay(x + 0.60 * side, -1.4), lay(x + 0.66 * side, -1.95), lay(x + 0.63 * side, -2.7)]
    P = rig.catmull(pts, 24)
    P[:, 2] = np.maximum(P[:, 2], terrain(P[:, 0], P[:, 1]) + 0.014)
    return P


def main():
    a = rig.parse(SETS)
    sc = rig.setup(a, T["cream"], rig.AMBIENT)
    rng = np.random.default_rng(7)
    rig.lights((0, 0, 0.35), 1.0)
    cam = rig.camera(60)
    _, _, loose = soil("Soil", rng)
    seed = Seed()
    sprout = Sprout("Sprout", (0, 0, 0.0))
    top = sprout.top()
    state = {}

    def set_cam(f, sid, aspect):
        tz, H, pitch, X, Y, fstop = track(CAM[sid], f)
        rig.frame_cam(cam, aspect, (0, 0, tz), H, pitch, at=(X - 0.5, 0.5 - Y), fstop=fstop)

    def exit_of(sid, aspect):
        """Arclength and screen point where the laid thread leaves the bottom of the final frame."""
        sprout.thread = thread_path(top, SIDE[sid])
        set_cam(FRAMES - 1, sid, aspect)
        bpy.context.view_layer.update()
        cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(sprout.thread, axis=0), axis=1))])
        uv = [world_to_camera_view(sc, cam, Vector(p)) for p in sprout.thread]
        i = next(i for i, q in enumerate(uv) if q.y < 0 and sprout.thread[i][1] < -0.5)  # after it has landed
        k = uv[i - 1].y / (uv[i - 1].y - uv[i].y)
        return S_STEM + lerp(cum[i - 1], cum[i], k), [round(lerp(uv[i - 1].x, uv[i].x, k), 3), 1.0]

    meta = {}
    for sid, (w, h) in SETS.items():
        sc.render.resolution_x, sc.render.resolution_y = w, h
        state[sid], xy = exit_of(sid, w / h)
        meta[sid] = dict(threadExit=xy, focus=FOCUS[sid], textSafe=TEXT_SAFE[sid])
    meta["ls"] = meta["l"]
    out = Path(a.out) / "seed"
    out.mkdir(parents=True, exist_ok=True)
    (out / "meta.json").write_text(json.dumps(meta, indent=1))
    print("FILM seed meta", json.dumps(meta), flush=True)

    def pose(f, sid, aspect):
        sprout.thread = thread_path(top, SIDE[sid])
        e = min(1.0, max(0.0, (f - 2) / (LAND - 2))) ** 1.8  # the drop: slow off the mark, then gravity
        tau = min(1.0, max(0.0, (f - LAND) / 6))
        z = lerp(1.05, SEED_REST, e) + 0.01 * math.sin(f * 0.6) * (1 - e) - 0.012 * math.sin(math.pi * tau) * (1 - tau)
        seed.set(z, yaw=lerp(-1.1, SEED_YAW, float(ss(0, LAND, f))), tilt=0.5 * (1 - float(ss(6, LAND, f))),
                 open_l=0.5 * float(ss(44, 68, f)), open_r=0.7 * float(ss(42, 64, f)))
        shove(loose, float(ss(LAND - 1, LAND + 4, f)), math.sin(math.pi * min(1.0, max(0.0, (f - LAND) / 7))))
        L = pchip([42, 56, 70, 95, 116, HOLD - 2, HOLD], [0, 0.12, 0.30, 0.56, S_STEM, state[sid] + 0.1, state[sid] + 0.3], f)
        still = 1 - float(ss(HOLD - 8, HOLD, f))
        sprout.update(L, [float(ss(66, 90, f)), float(ss(70, 94, f)), float(ss(100, 122, f)), float(ss(106, 128, f))],
                      0.03 * math.sin(f * 0.21) * still)
        set_cam(f, sid, aspect)

    rig.render(a, "seed", SETS, FRAMES, pose)


if __name__ == "__main__":
    main()
