"""Animation 1 seed. Run:
blender -b --factory-startup -P blender/scripts/seed.py -- --export out.glb [--render dir] [--blend file.blend]
Authored in glTF axes (Y up, camera at +Z) and converted by gb(); Blender is Z up, front = -Y.
Deterministic, no randomness. No modifiers anywhere: the animated export needs export_apply=False."""
import argparse
import bisect
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--export", required=True)
ap.add_argument("--render")
ap.add_argument("--blend")
args = ap.parse_args(argv)

T = common.read_tokens()
lin = common.to_linear
mixc = common.mix


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def ease_p2(t):
    """gsap power2.inOut."""
    return 2 * t * t if t < 0.5 else 1 - 2 * (1 - t) ** 2


def pchip(xs, ys, x):
    """Monotone cubic through (xs, ys); flat outside."""
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


def lerp(a, b, t):
    return a + (b - a) * t


def gb(x, y, z):
    """glTF -> Blender axes."""
    return (x, -z, y)


def rgba(c, a=1.0):
    return (*lin(c), a)


# ---- tuned numbers -------------------------------------------------------
FPS, FRAMES = 24, 240
# shape keys: growth g of each key (Basis is g 0)
KEYS = [0.0, 0.06, 0.12, 0.20, 0.28, 0.35, 0.55, 0.78, 1.0]
G_Q, G_V = [0.0, 0.34, 0.60, 1.0], [0.0, 0.0, 0.35, 1.0]  # q -> g
L_G, L_V = [0.0, 0.12, 0.35, 1.0], [0.03, 0.20, 0.62, 3.4]  # g -> arclength
HOOK_MAX, WOBBLE = 2.2, 0.22
# asymmetric, like a bean: R opens wide and early so the hook clears it
HINGE_L_Q, HINGE_L_V = [0.0, 0.30, 0.38, 0.50, 1.0], [0.0, 0.0, 0.08, 0.20, 0.20]
HINGE_R_Q, HINGE_R_V = [0.0, 0.30, 0.36, 0.42, 1.0], [0.0, 0.0, 0.12, 0.46, 0.46]
BASE_Y, SMAX = 0.02, 3.4
STEM_S1, N_STEM, STEM_SIDES = 0.78, 38, 8  # N_STEM counts the rings from s 0 up
STEM_R_S, STEM_R_V = [0.0, 0.62, 0.78], [0.017, 0.006, 0.0025]  # ends at the ribbon core half-width
THREAD_S0, N_THREAD = 0.70, 46
THREAD_OFF, THREAD_ALPHA = [-0.0095, -0.003, 0.0, 0.003, 0.0095], [0.0, 0.6, 1.0, 0.6, 0.0]
SEED_H, SEED_W, SEED_D, HINGE_Y = 0.20, 0.13, 0.8, -0.10  # SeedRoot-local; depth as a fraction of the width
REST_Y, START_Y, SPIN, TILT = -0.235, 0.02, -1.2, 0.45
MOUND_R, MOUND_H, MOUND_TOP = 0.46, 0.085, -0.30
LEAF_LEN, LEAF_W, LEAF_NV, LEAF_NU = 0.24, 0.10, 17, 9
LEAVES = [("A", -1, 0.34, 1.00), ("B", 1, 0.40, 0.90)]  # name, side, attach arclength, size

# three root rings run straight down from the base so the stem leaves the soil instead of floating above it
STEM_S = [-0.11, -0.065, -0.03] + [STEM_S1 * (i / (N_STEM - 1)) ** 1.3 for i in range(N_STEM)]
N_STEM = len(STEM_S)
THREAD_S = [THREAD_S0 + (SMAX - THREAD_S0) * r / (N_THREAD - 1) for r in range(N_THREAD)]

common.reset_scene()
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 0, FRAMES
scene.name = "Sprout"  # the exporter names the single scene animation after the scene


def empty(name, parent, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    scene.collection.objects.link(ob)
    ob.parent = parent
    ob.location = gb(*loc)
    return ob


def make_mesh(name, verts, faces, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([gb(*v) for v in verts], [], faces)
    me.update()
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons) if isinstance(smooth, bool) else smooth)
    return me


def paint(me, cols):
    """cols: one linear RGBA per vertex."""
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attr.data.foreach_set("color", [c for col in cols for c in col])
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = me.color_attributes.find("Col")


def new_obj(name, me, parent):
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.parent = parent
    return ob


def add_keys(ob, builder, keys):
    """Basis plus one shape key per g in keys; builder(g) -> glTF-space vertices."""
    ob.shape_key_add(name="Basis", from_mix=False)
    for g in keys:
        kb = ob.shape_key_add(name=f"g{g:.2f}", from_mix=False)
        kb.data.foreach_set("co", [c for v in builder(g) for c in gb(*v)])


# ---- centreline -----------------------------------------------------------
def hook(g):
    return HOOK_MAX * smoothstep(0, 0.12, g) * (1 - smoothstep(0.12, 0.35, g))


def theta(s, g, L):
    """Heading (0 up, positive leans +X)."""
    return WOBBLE * math.sin(2.1 * s + 0.6) * smoothstep(0.1, 0.5, s) + hook(g) * smoothstep(L - 0.18, L, s)


def centreline(g):
    """(L, at) where at(s) -> (x, y, heading), clamped onto the tip when s > L."""
    L = pchip(L_G, L_V, g)
    n = max(2, math.ceil(L / 0.004))
    S = [L * i / n for i in range(n + 1)]
    X, Y = [0.0], [BASE_Y]
    for i in range(n):
        th, d = theta((S[i] + S[i + 1]) / 2, g, L), S[i + 1] - S[i]
        X.append(X[-1] + math.sin(th) * d)
        Y.append(Y[-1] + math.cos(th) * d)

    def at(s):
        if s < 0:
            return 0.0, BASE_Y + s, 0.0
        s = min(s, L)
        i = min(int(s / L * n), n - 1)
        f = (s - S[i]) / (S[i + 1] - S[i])
        return lerp(X[i], X[i + 1], f), lerp(Y[i], Y[i + 1], f), theta(s, g, L)
    return L, at


# ---- stem and thread --------------------------------------------------------
def stem_verts(g):
    L, at = centreline(g)
    out = []
    for s in STEM_S:
        x, y, th = at(s)
        r = pchip(STEM_R_S, STEM_R_V, s) * smoothstep(0, 0.03, L - s)  # rings past the tip collapse to r 0
        for j in range(STEM_SIDES):
            a = 2 * math.pi * j / STEM_SIDES
            out.append((x + r * math.cos(a) * math.cos(th), y - r * math.cos(a) * math.sin(th), r * math.sin(a)))
    return out


def thread_verts(g):
    L, at = centreline(g)
    out = []
    for s in THREAD_S:
        x, y, th = at(s)
        k = smoothstep(0, 0.03, L - s)
        out += [(x + o * k * math.cos(th), y - o * k * math.sin(th), 0.0) for o in THREAD_OFF]
    return out


common_stem = (*lin(T["stem-mint"]), 1.0)
thread_rgb = lin(mixc(T["stem-mint"], T["cream"], 0.12))

root = empty("SeedScene", None)

# stem
k = STEM_SIDES
faces = [(i * k + j, (i + 1) * k + j, (i + 1) * k + (j + 1) % k, i * k + (j + 1) % k)
         for i in range(N_STEM - 1) for j in range(k)]
me = make_mesh("Stem", stem_verts(0.0), faces)
paint(me, [common_stem] * len(me.vertices))
seed_root = empty("SeedRoot", root, (0, REST_Y, 0))
stem = new_obj("Stem", me, seed_root)
add_keys(stem, stem_verts, KEYS[1:])

# thread
C = len(THREAD_OFF)
faces = [(r * C + c, r * C + c + 1, (r + 1) * C + c + 1, (r + 1) * C + c)
         for r in range(N_THREAD - 1) for c in range(C - 1)]
me = make_mesh("Thread", thread_verts(0.0), faces)
paint(me, [(*[lerp(m, c, smoothstep(0.95, 1.6, s)) for m, c in zip(lin(T["stem-mint"]), thread_rgb)], a * smoothstep(0.60, 0.78, s)) for s in THREAD_S for a in THREAD_ALPHA])
thread = new_obj("Thread", me, seed_root)
add_keys(thread, thread_verts, KEYS[1:])


# ---- seed halves --------------------------------------------------------------
def seed_w(y):
    """Plump almond half-width at height y: rounded at both ends, belly a little low."""
    t = (y - -SEED_H / 2) / SEED_H
    return 0.0 if t <= 0 or t >= 1 else SEED_W / 2 * math.sin(math.pi * t ** 0.8) ** 0.7


def half_mesh(name, sign):
    """Outer shell (smooth) plus flat inner face at x = 0 (flat), sharp edge between."""
    rows_n, cols_n = 20, 24
    ys = [-SEED_H / 2 + SEED_H * (1 - math.cos(math.pi * i / rows_n)) / 2 for i in range(rows_n + 1)]
    outer = mixc(T["peach-glow"], T["plum-ink"], 0.5)
    verts, cols, rows, inner_rows = [], [], [], []
    for y in ys:
        w = seed_w(y)
        row = []
        for j in range(cols_n + 1) if w > 1e-9 else [None]:
            ph = 0.0 if j is None else -math.pi / 2 + math.pi * j / cols_n
            verts.append((sign * w * math.cos(ph), y - HINGE_Y, SEED_D * w * math.sin(ph)))
            cols.append(rgba(mixc(outer, T["plum-ink"], 0.28 * abs(math.sin(ph)) ** 4)))
            row.append(len(verts) - 1)
        rows.append(row)
    faces, smooth = [], []
    for a, b in zip(rows, rows[1:]):
        for j in range(cols_n):
            if len(a) == 1:
                f = (a[0], b[j], b[j + 1])
            elif len(b) == 1:
                f = (a[j], b[0], a[j + 1])
            else:
                f = (a[j], b[j], b[j + 1], a[j + 1])
            faces.append(f if sign > 0 else f[::-1])
            smooth.append(True)
    for y in ys:  # inner face: separate vertices so the edge stays sharp
        w, row = seed_w(y), []
        for z in ([-SEED_D * w, SEED_D * w] if w > 1e-9 else [0.0]):
            verts.append((0.0, y - HINGE_Y, z))
            cols.append(rgba(mixc(T["peach-glow"], T["plum-ink"], 0.18)))
            row.append(len(verts) - 1)
        inner_rows.append(row)
    for a, b in zip(inner_rows, inner_rows[1:]):
        if len(a) == 1:
            f = (a[0], b[1], b[0])
        elif len(b) == 1:
            f = (a[0], a[1], b[0])
        else:
            f = (a[0], a[1], b[1], b[0])
        faces.append(f if sign > 0 else f[::-1])
        smooth.append(False)
    me = make_mesh(name, verts, faces, smooth)
    paint(me, cols)
    return me


hinges = {}
for side, sign in (("L", -1), ("R", 1)):
    hinges[side] = empty(f"Hinge_{side}", seed_root, (0, HINGE_Y, 0))
    new_obj(f"Half_{side}", half_mesh(f"Half_{side}", sign), hinges[side])


# ---- mound -----------------------------------------------------------------------
def mound_h(r, ph):
    e = 1 - (r / MOUND_R) ** 2
    bump = 0.0045 * e * smoothstep(0, 0.15, r / MOUND_R) * (math.sin(5 * ph + 3 + r * 30) + 0.6 * math.sin(9 * ph - 1 + r * 55))
    return MOUND_H * e * e + bump


NR, NS = 12, 40
verts, cols, faces = [], [], []
base = mixc(T["peach-glow"], T["plum-ink"], 0.28)
for ring in range(NR + 1):
    r = MOUND_R * ring / NR
    for j in range(1 if ring == 0 else NS):
        ph = 2 * math.pi * j / NS
        verts.append((r * math.cos(ph), MOUND_TOP - MOUND_H + mound_h(r, ph), r * math.sin(ph)))
        shade = 0.18 * (1 - smoothstep(0.0, 0.20, r))  # soft contact shade
        cols.append(rgba(mixc(base, T["plum-ink"], shade), 1 - smoothstep(0.6, 1.0, r / MOUND_R)))
for j in range(NS):
    faces.append((0, 1 + (j + 1) % NS, 1 + j))
for ring in range(1, NR):
    a0, b0 = 1 + (ring - 1) * NS, 1 + ring * NS
    for j in range(NS):
        j1 = (j + 1) % NS
        faces.append((a0 + j, a0 + j1, b0 + j1, b0 + j))
me = make_mesh("Mound", verts, faces)  # flat shading read as scales under the site's lights
paint(me, cols)
new_obj("Mound", me, root)


# ---- leaves ------------------------------------------------------------------------
def leaf_builder(side, size):
    def build(open_):
        out = []
        Ll = LEAF_LEN * size
        for j in range(LEAF_NV):
            v = j / (LEAF_NV - 1)
            hw = LEAF_W / 2 * size * math.sin(math.pi * v ** 0.85) ** 0.65
            for i in range(LEAF_NU):
                u = -1 + 2 * i / (LEAF_NU - 1)
                out.append((u * hw * (0.28 + 0.72 * open_) + side * 0.055 * open_ * v * v,
                            v * Ll, u * u * hw * (1.0 - 0.75 * open_)))
        return out
    return build


pivots = []
for name, side, s_a, size in LEAVES:
    pv = empty(f"LeafPivot_{name}", seed_root)
    build = leaf_builder(side, size)
    faces = [(j * LEAF_NU + i, j * LEAF_NU + i + 1, (j + 1) * LEAF_NU + i + 1, (j + 1) * LEAF_NU + i)
             for j in range(LEAF_NV - 1) for i in range(LEAF_NU - 1)]
    me = make_mesh(f"Leaf_{name}", build(0.0), faces)
    mint, tip = lin(T["stem-mint"]), lin(mixc(T["stem-mint"], T["cream"], 0.25))
    paint(me, [(*[lerp(a, b, smoothstep(0.45, 1.0, j / (LEAF_NV - 1))) for a, b in zip(mint, tip)], 1.0)
               for j in range(LEAF_NV) for _ in range(LEAF_NU)])
    leaf = new_obj(f"Leaf_{name}", me, pv)
    add_keys(leaf, lambda g, b=build: b(g), [1.0])
    leaf.data.shape_keys.key_blocks[1].name = "open"
    pivots.append((pv, leaf, side, s_a))

bpy.context.view_layer.update()

# ---- bake ------------------------------------------------------------------------------
cl = [centreline(g) for g in KEYS]
KEY_L = [c[0] for c in cl]
KEY_RINGS = [[c[1](s)[:2] for s in STEM_S] for c in cl]  # ring centres per key, collapsed past the tip


def poly_at(rings, s):
    i = min(max(bisect.bisect_right(STEM_S, s) - 1, 0), N_STEM - 2)
    f = (s - STEM_S[i]) / (STEM_S[i + 1] - STEM_S[i])
    return [lerp(rings[i][c], rings[i + 1][c], f) for c in (0, 1)]


def quat_z(angle):
    """Rotation about the glTF depth axis."""
    return Quaternion((0, -1, 0), angle)


for ob in [seed_root, *hinges.values(), *(p[0] for p in pivots)]:
    ob.rotation_mode = "QUATERNION"
key_meshes = [stem.data.shape_keys.key_blocks, thread.data.shape_keys.key_blocks]
weights_log = []
prev_heading = {n: 0.0 for n, *_ in LEAVES}
for f in range(FRAMES + 1):
    q = f / FRAMES
    g = pchip(G_Q, G_V, q)
    a = min(max(bisect.bisect_right(KEYS, g) - 1, 0), len(KEYS) - 2)
    t = (g - KEYS[a]) / (KEYS[a + 1] - KEYS[a])
    w = [0.0] * (len(KEYS) - 1)  # weight of key i+1 (the Basis has none)
    if a > 0:
        w[a - 1] = 1 - t
    w[a] = t
    weights_log.append(w)
    for blocks in key_meshes:
        for i, kb in enumerate(blocks[1:]):
            kb.value = w[i]
            kb.keyframe_insert("value", frame=f)

    e = ease_p2(min(1.0, q / 0.30))  # the drop
    seed_root.location = gb(0, lerp(START_Y, REST_Y, e), 0)
    seed_root.rotation_quaternion = quat_z(TILT * (1 - e)) @ Quaternion((0, 0, 1), SPIN * (1 - e))
    seed_root.keyframe_insert("location", frame=f)
    seed_root.keyframe_insert("rotation_quaternion", frame=f)

    for side, sgn, hq, hv in (("L", 1, HINGE_L_Q, HINGE_L_V), ("R", -1, HINGE_R_Q, HINGE_R_V)):  # +angle about Z moves the top toward -X
        hinges[side].rotation_quaternion = quat_z(sgn * pchip(hq, hv, q))
        hinges[side].keyframe_insert("rotation_quaternion", frame=f)

    rings = [[lerp(KEY_RINGS[a][i][c], KEY_RINGS[a + 1][i][c], t) for c in (0, 1)] for i in range(N_STEM)]
    L = lerp(KEY_L[a], KEY_L[a + 1], t)
    open_ = smoothstep(0.46, 0.60, q)
    for pv, leaf, side, s_a in pivots:
        name = pv.name[-1]
        px, py = poly_at(rings, s_a)
        x0, y0 = poly_at(rings, s_a - 0.03)
        x1, y1 = poly_at(rings, s_a + 0.03)
        if math.hypot(x1 - x0, y1 - y0) > 1e-6:
            prev_heading[name] = math.atan2(x1 - x0, y1 - y0)
        heading = prev_heading[name] + side * lerp(0.15, 0.95, open_)
        sc = max(1e-3, smoothstep(0.40, 0.56, q) * smoothstep(0, 0.08, L - s_a))  # waits at the tip until the stem passes; never 0, the exporter inverts the parent matrix
        pv.location = gb(px, py, 0)
        pv.rotation_quaternion = quat_z(-heading)
        pv.scale = (sc, sc, sc)
        for path in ("location", "rotation_quaternion", "scale"):
            pv.keyframe_insert(path, frame=f)
        kb = leaf.data.shape_keys.key_blocks["open"]
        kb.value = open_
        kb.keyframe_insert("value", frame=f)
scene.frame_set(0)

# ---- self-checks -------------------------------------------------------------------------
tris = 0
for ob in scene.objects:
    if ob.type == "MESH":
        assert not ob.modifiers, f"{ob.name}: modifier"
        ob.data.calc_loop_triangles()
        tris += len(ob.data.loop_triangles)
        assert ob.data.color_attributes.active_color is not None, f"{ob.name}: no active colour"
        assert ob.data.color_attributes.active_color.data_type == "FLOAT_COLOR", ob.name
assert tris <= 25000, f"{tris} triangles"
n_keys = {ob.name: len(ob.data.shape_keys.key_blocks) - 1 for ob in (stem, thread)}
assert n_keys["Stem"] == n_keys["Thread"] >= 6, n_keys
top = max(v.co.z for v in thread.data.shape_keys.key_blocks[-1].data)  # Blender z = glTF y
assert top >= 3.0 and weights_log[-1][-1] == 1.0, f"thread tip y {top:.2f}"
for me_, ob in ((stem.data, "Stem"), (thread.data, "Thread")):
    for v in me_.vertices:  # frame 0: everything sits inside the closed seed
        x, y, z = v.co.x, v.co.z, -v.co.y
        assert abs(x) <= seed_w(y) + 1e-6 and abs(z) <= SEED_D * seed_w(y) + 1e-6, f"{ob} outside the seed at {x:.3f},{y:.3f}"
scene.frame_set(FRAMES)
bpy.context.view_layer.update()
for side, sgn in (("L", -1), ("R", 1)):
    tip = bpy.data.objects[f"Half_{side}"].matrix_world @ max(bpy.data.objects[f"Half_{side}"].data.vertices, key=lambda v: v.co.z).co
    assert tip.x * sgn > 0.02, f"hinge {side} opens the wrong way ({tip.x:.3f})"
scene.frame_set(0)
print(f"SEED checks ok: {tris} triangles, {n_keys['Stem']} morph targets on Stem/Thread, thread tip y {top:.2f}")

common.export_glb(args.export, animated=True)
print("SEED exported", args.export)

# ---- lookdev ------------------------------------------------------------------------------
if not (args.render or args.blend):
    sys.exit(0)


def lookdev_mat(name, blended=False, emissive=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    att = nt.nodes.new("ShaderNodeAttribute")
    att.attribute_name = "Col"
    if emissive:
        em, tr, mx = (nt.nodes.new(n) for n in ("ShaderNodeEmission", "ShaderNodeBsdfTransparent", "ShaderNodeMixShader"))
        nt.links.new(att.outputs["Color"], em.inputs["Color"])
        nt.links.new(att.outputs["Alpha"], mx.inputs["Fac"])
        nt.links.new(tr.outputs["BSDF"], mx.inputs[1])
        nt.links.new(em.outputs["Emission"], mx.inputs[2])
        nt.links.new(mx.outputs["Shader"], nt.nodes["Material Output"].inputs["Surface"])
    else:
        bsdf = nt.nodes["Principled BSDF"]
        nt.links.new(att.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(att.outputs["Alpha"], bsdf.inputs["Alpha"])
        bsdf.inputs["Roughness"].default_value = 0.8
    if blended and hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    return mat


mats = {"Mound": lookdev_mat("LookMound", blended=True), "Thread": lookdev_mat("LookThread", True, True)}
solid = lookdev_mat("Look")
for ob in scene.objects:
    if ob.type == "MESH":
        ob.data.materials.append(mats.get(ob.name, solid))

cream = lin(T["cream"])
world = bpy.data.worlds.new("W")
world.use_nodes = True
nt = world.node_tree  # full cream to the camera, dimmer cream as light
bg_cam, bg_lit = nt.nodes["Background"], nt.nodes.new("ShaderNodeBackground")
lp, mx = nt.nodes.new("ShaderNodeLightPath"), nt.nodes.new("ShaderNodeMixShader")
for b, st in ((bg_cam, 1.0), (bg_lit, 0.35)):
    b.inputs["Color"].default_value = (*cream, 1)
    b.inputs["Strength"].default_value = st
nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs["Fac"])
nt.links.new(bg_lit.outputs["Background"], mx.inputs[1])
nt.links.new(bg_cam.outputs["Background"], mx.inputs[2])
nt.links.new(mx.outputs["Shader"], nt.nodes["World Output"].inputs["Surface"])
scene.world = world

for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "BLENDER_WORKBENCH"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        pass
try:
    scene.eevee.taa_render_samples = 32
except AttributeError:
    pass
scene.view_settings.view_transform = "Standard"
scene.render.resolution_x = scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"

tilt = bpy.data.objects.new("Tilt", None)  # the site tips the model 0.2 rad toward the camera
scene.collection.objects.link(tilt)
root.parent = tilt
tilt.rotation_euler = (0.2, 0, 0)


def aim(ob, target):
    ob.rotation_euler = (Vector(target) - ob.location).to_track_quat("-Z", "Y").to_euler()


def add_light(name, kind, loc, color, energy, size=None):
    ld = bpy.data.lights.new(name, kind)
    ld.color, ld.energy = color, energy
    if size and kind == "AREA":
        ld.size = size
    lo = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(lo)
    lo.location = loc
    aim(lo, (0, 0, -0.1))


add_light("Key", "AREA", (-1.8, -2.6, 2.4), lin(mixc(T["cream"], T["peach-glow"], 0.4)), 260, 2)
add_light("Fill", "AREA", (2.4, -2.2, 0.6), (0.75, 0.85, 1.0), 60, 2)
add_light("Rim", "AREA", (1.2, 2.8, 1.6), lin(T["peach-glow"]), 150, 2)

cd = bpy.data.cameras.new("Cam")
cd.angle = math.radians(35)
cam = bpy.data.objects.new("Cam", cd)
scene.collection.objects.link(cam)
cam.location = (0, -0.75 / math.tan(math.radians(17.5)), 0)  # frames about +-0.75 around y 0
aim(cam, (0, 0, 0))
scene.camera = cam

if args.blend:
    Path(args.blend).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=args.blend)

if args.render:
    out = Path(args.render)
    out.mkdir(parents=True, exist_ok=True)
    for qq in (0, 15, 30, 45, 60, 75, 90, 100):
        scene.frame_set(round(qq / 100 * FRAMES))
        scene.render.filepath = str(out / f"q{qq:03d}.png")
        bpy.ops.render.render(write_still=True)
    print("SEED renders", out)
