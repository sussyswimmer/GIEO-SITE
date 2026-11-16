"""Animation 2 weave: threads, a neutral cloth panel, and the tote, mug and coaster it becomes. Run:
blender -b --factory-startup -P blender/scripts/weave.py -- --export out.glb [--render dir] [--blend file.blend]
Authored in glTF axes (Y up, camera at +Z) and converted by gb(); Blender is Z up, front = -Y.
Deterministic, no randomness. No modifiers and no glTF animation: the runtime writes morph weights and empties.
Also writes weave-cloth.png (a flat 64x64 tone) next to the glb. The cloth carries no pattern: TODO(products)."""
import argparse
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


def smoother(t):
    t = min(1.0, max(0.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)


def lerp(a, b, t):
    return a + (b - a) * t


def clamp01(x):
    return min(1.0, max(0.0, x))


def gb(x, y, z):
    """glTF -> Blender axes."""
    return (x, -z, y)


def ig(v):
    """Blender -> glTF axes."""
    return (v[0], v[2], -v[1])


def rgba(c, a=1.0):
    return (*lin(c), a)


# ---- tuned numbers -------------------------------------------------------
PANEL_N, PANEL_SIZE = 28, 0.72  # quads per side
DRAPE_KEYS = 8
CLOTH_TONE = mixc(T["peach-glow"], T["cream"], 0.35)  # TODO(products): replaced by GIEO's real scan
WHITE = (1.0, 1.0, 1.0, 1.0)
OFF = [-0.0085, -0.0027, 0.0, 0.0027, 0.0085]
ALPHA = [0.0, 0.6, 1.0, 0.6, 0.0]
HERO_X, HERO_Y0, HERO_Y1, HERO_ROWS = 0.12, 3.4, -0.36, 47
SLOTS = [-0.34, -0.24, -0.12, 0.0, 0.24, 0.34]  # the hero takes +0.12; the outer two sit inside the cloth's edge
THREAD_Z = -0.003
CAROUSEL_Z, CAROUSEL_R = -1.3, 1.3
STATION_DEG = {"Tote": 0.0, "Mug": 25.0, "Coaster": 50.0}
TOTE_W, TOTE_H, TOTE_D, TOTE_Y0, TOTE_P = 0.60, 0.56, 0.12, -0.34, 5
MUG_R, MUG_H, BAND_R, BAND_Y0, BAND_Y1 = 0.20, 0.50, 0.203, -0.11, 0.13
HANDLE_DEG = 100.0  # 10 deg back of +X
COASTER_R, COASTER_T, TOP_R = 0.29, 0.05, 0.27
TOL_QUAD, TOL_SURF, TOL_FLIGHT = 0.03, 0.02, 0.12

common.reset_scene()
scene = bpy.context.scene
scene.name = "Weave"


def empty(name, parent, loc=(0, 0, 0), deg=0.0):
    ob = bpy.data.objects.new(name, None)
    scene.collection.objects.link(ob)
    ob.parent = parent
    ob.location = gb(*loc)
    ob.rotation_euler = (0, 0, math.radians(deg))  # about glTF Y
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


def set_uv(me, uvs):
    """uvs: (u, v_gltf) per vertex. Blender stores 1 - v, the exporter flips it back."""
    vi = [0] * len(me.loops)
    me.loops.foreach_get("vertex_index", vi)
    layer = me.uv_layers.new(name="UVMap")
    layer.data.foreach_set("uv", [c for v in vi for c in (uvs[v][0], 1.0 - uvs[v][1])])


def new_obj(name, me, parent):
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.parent = parent
    return ob


def dedupe(face):
    out = [v for i, v in enumerate(face) if v != face[i - 1]]
    return tuple(out)


def tri_list(faces):
    for f in faces:
        for k in range(1, len(f) - 1):
            yield f[0], f[k], f[k + 1]


def signed_volume(verts, faces):
    vol = 0.0
    for a, b, c in tri_list(faces):
        pa, pb, pc = (Vector(verts[i]) for i in (a, b, c))
        vol += pa.dot(pb.cross(pc)) / 6
    return vol


def check_solid(name, verts, faces):
    """Closed, consistently wound, outward: every directed edge once and its reverse once, volume positive."""
    ids, canon = {}, []
    for v in verts:
        canon.append(ids.setdefault(tuple(round(c, 6) for c in v), len(ids)))
    seen = {}
    for f in faces:
        for i in range(len(f)):
            e = (canon[f[i]], canon[f[(i + 1) % len(f)]])
            seen[e] = seen.get(e, 0) + 1
    for (a, b), n in seen.items():
        assert n == 1 and seen.get((b, a)) == 1, f"{name}: edge {a}-{b} not manifold or inconsistent"
    assert signed_volume(verts, faces) > 0, f"{name}: faces point inward"


def lathe(profile, n, cols=None):
    """profile: (r, y) from bottom centre, up the outside, over the lip, down the inside. Returns verts, faces, vertex colours."""
    verts, rows, cl = [], [], []
    for pi, (r, y) in enumerate(profile):
        c = cols[pi] if cols else WHITE
        if r < 1e-9:
            verts.append((0.0, y, 0.0))
            cl.append(c)
            rows.append([len(verts) - 1] * n)
            continue
        row = []
        for j in range(n):
            th = 2 * math.pi * j / n
            verts.append((r * math.sin(th), y, r * math.cos(th)))
            cl.append(c)
            row.append(len(verts) - 1)
        rows.append(row)
    faces = []
    for a, b in zip(rows, rows[1:]):
        for j in range(n):
            j1 = (j + 1) % n
            faces.append(dedupe((a[j], a[j1], b[j1], b[j])))  # (A, D, C, B)
    return verts, faces, cl


# ---- cloth tone png ---------------------------------------------------------
png = Path(args.export).with_name("weave-cloth.png")
png.parent.mkdir(parents=True, exist_ok=True)
img = bpy.data.images.new("weave-cloth", 64, 64, alpha=False)
img.colorspace_settings.name = "Non-Color"  # write the sRGB tone as is
img.pixels = [*CLOTH_TONE, 1.0] * (64 * 64)
img.filepath_raw = str(png)
img.file_format = "PNG"
img.save()

root = empty("WeaveScene", None)


# ---- threads ----------------------------------------------------------------
def ribbon(points, colour, stagger, alpha_fn):
    """points: [(x, y, s)] top to bottom. Returns verts, uvs, colours (5 columns each)."""
    verts, uvs, cols = [], [], []
    for i, (x, y, s) in enumerate(points):
        a, b = points[max(i - 1, 0)], points[min(i + 1, len(points) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        n = math.hypot(tx, ty)
        nx, ny = -ty / n, tx / n  # right of travel, +x when heading down
        for o, al in zip(OFF, ALPHA):
            verts.append((x + o * nx, y + o * ny, THREAD_Z))
            uvs.append((stagger, s))
            cols.append((*lin(colour), al * alpha_fn(s)))
    return verts, uvs, cols


mint = mixc(T["stem-mint"], T["cream"], 0.12)  # the seed's thread
# TODO(products): tonal stand-ins, replaced by colours sampled from GIEO's real scan
OTHERS = [mixc(T["petal-soft"], T["cream"], 0.25), T["peach-glow"], T["blush-line"],
          mixc(T["petal-soft"], T["cream"], 0.5), mixc(T["peach-glow"], T["cream"], 0.3), mixc(T["blush-line"], T["cream"], 0.3)]

t_verts, t_uvs, t_cols, t_faces = [], [], [], []


def add_ribbon(points, colour, stagger, alpha_fn):
    base = len(t_verts)
    v, u, c = ribbon(points, colour, stagger, alpha_fn)
    t_verts.extend(v)
    t_uvs.extend(u)
    t_cols.extend(c)
    for r in range(len(points) - 1):
        for k in range(4):
            a = base + r * 5 + k
            t_faces.append((a, a + 5, a + 6, a + 1))  # faces +Z


hero_pts = []
for r in range(HERO_ROWS):
    y = lerp(HERO_Y0, HERO_Y1, r / (HERO_ROWS - 1))
    hero_pts.append((HERO_X + 0.012 * math.sin(3.1 * (y - 0.36)), y, (HERO_Y0 - y) / (HERO_Y0 - HERO_Y1)))
add_ribbon(hero_pts, mint, 0.0, lambda s: 1.0)

for k, (slot, colour) in enumerate(zip(SLOTS, OTHERS), start=1):
    x0, y0 = (-0.64 if slot <= 0 else 0.64), 0.46 + 0.03 * k  # slot 0 from the left, or it would cross the hero thread
    p0, p1, p2, p3 = (x0, y0), (lerp(x0, slot, 0.6), y0), (slot, 0.36 + 0.12), (slot, 0.36)
    path = []
    for i in range(13):
        t = i / 12
        w = ((1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3)
        path.append((sum(w[m] * q[0] for m, q in enumerate((p0, p1, p2, p3))), sum(w[m] * q[1] for m, q in enumerate((p0, p1, p2, p3)))))
    path += [(slot, 0.36 - 0.70 * i / 16) for i in range(1, 17)]  # tails end behind the cloth
    cum = [0.0]
    for a, b in zip(path, path[1:]):
        cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    pts = [(x, y, c / cum[-1]) for (x, y), c in zip(path, cum)]
    add_ribbon(pts, colour, 0.02 * k, lambda s: smoothstep(0, 0.06, s) * (1 - smoothstep(0.94, 1.0, s)))

me = make_mesh("Threads", t_verts, t_faces)
paint(me, t_cols)
set_uv(me, t_uvs)
new_obj("Threads", me, root)

carousel = empty("Carousel", root, (0, 0, CAROUSEL_Z))
stations, turns = {}, {}
for name, deg in STATION_DEG.items():
    a = math.radians(deg)
    stations[name] = empty(f"Station{name}", carousel, (CAROUSEL_R * math.sin(a), 0, CAROUSEL_R * math.cos(a)), deg)
    turns[name] = empty(f"Turn{name}", stations[name])

# ---- panel -------------------------------------------------------------------
def drape(tau, u, v):
    """Closed-form pose of the cloth, glTF axes. tau 0 is the flat loom pose, 1 the print on the tote."""
    e = smoother(tau)
    s = lerp(1, 0.667, e)
    fl = math.sin(math.pi * tau)
    cy, cz = lerp(0, -0.06, e), lerp(0, 0.0635, e) + 0.16 * fl
    x, y = (u - 0.5) * PANEL_SIZE * s, (0.5 - v) * PANEL_SIZE * s
    a = -0.3 * fl
    off = 0.05 * fl * (math.cos(math.pi * (v - 0.5)) - 0.55) + 0.012 * fl * math.sin(2 * math.pi * 1.5 * u - 9 * tau)
    settle = clamp01((tau - 0.82) / 0.18)
    off += 0.008 * math.sin(math.pi * settle * 2.5) * (1 - settle) * math.sin(math.pi * u)
    off += 0.003 * smoother(settle) * math.sin(math.pi * u) * math.sin(math.pi * v)
    return x, cy + y * math.cos(a), cz + y * math.sin(a) + off


N1 = PANEL_N + 1
panel_uv = [(i / PANEL_N, j / PANEL_N) for j in range(N1) for i in range(N1)]  # row 0 is the top
panel_faces = [(j * N1 + i, (j + 1) * N1 + i, (j + 1) * N1 + i + 1, j * N1 + i + 1) for j in range(PANEL_N) for i in range(PANEL_N)]


def panel_verts(tau):
    return [drape(tau, u, v) for u, v in panel_uv]


me = make_mesh("Panel", panel_verts(0.0), panel_faces)
paint(me, [WHITE] * len(me.vertices))
set_uv(me, panel_uv)
panel = new_obj("Panel", me, turns["Tote"])
panel.shape_key_add(name="Basis", from_mix=False)
for k in range(1, DRAPE_KEYS + 1):
    kb = panel.shape_key_add(name=f"Drape{k}", from_mix=False)
    kb.data.foreach_set("co", [c for v in panel_verts(k / DRAPE_KEYS) for c in gb(*v)])

# ---- tote ---------------------------------------------------------------------
tote_body_col = mixc(T["peach-glow"], T["cream"], 0.6)
tote_cap_col = mixc(tote_body_col, T["plum-ink"], 0.35)
N_T, ROWS_T = 64, 20


def sp(c, e):
    return math.copysign(abs(c) ** e, c)


ring = []
for j in range(N_T):
    ph = 2 * math.pi * j / N_T
    ring.append((TOTE_W / 2 * sp(math.sin(ph), 2 / TOTE_P), TOTE_D / 2 * sp(math.cos(ph), 2 / TOTE_P)))
verts, faces, cols = [], [], []
for i in range(ROWS_T + 1):
    y = TOTE_Y0 + TOTE_H * i / ROWS_T
    t = i / ROWS_T
    b = 1 + 0.025 * math.sin(math.pi * t)  # a soft belly, 0 at both end rows so the caps still close
    col = mixc(mixc(tote_body_col, T["blush-line"], 0.22), mixc(tote_body_col, T["cream"], 0.35), t)  # airbrushed, foot to mouth
    for x, z in ring:
        verts.append((x * b, y, z))
        cols.append(rgba(col))
for i in range(ROWS_T):
    for j in range(N_T):
        j1 = (j + 1) % N_T
        a, b, c, d = i * N_T + j, (i + 1) * N_T + j, (i + 1) * N_T + j1, i * N_T + j1
        faces.append((a, d, c, b))
for top in (False, True):  # caps get their own vertices so the edge stays sharp
    y = TOTE_Y0 + (TOTE_H if top else 0)
    c0 = len(verts)
    verts.append((0.0, y, 0.0))
    cols.append(rgba(tote_cap_col if top else tote_body_col))
    for x, z in ring:
        verts.append((x, y, z))
        cols.append(rgba(tote_cap_col if top else tote_body_col))
    for j in range(N_T):
        j1 = (j + 1) % N_T
        faces.append((c0, c0 + 1 + j, c0 + 1 + j1) if top else (c0, c0 + 1 + j1, c0 + 1 + j))
check_solid("ToteBody", verts, faces)
me = make_mesh("ToteBody", verts, faces)
paint(me, cols)
new_obj("ToteBody", me, turns["Tote"])

# handles: flat straps standing on the mouth, the arch in the XY plane
HANDLE_RINGS, HANDLE_HALF_X, HANDLE_ARCH, HANDLE_W, HANDLE_T = 26, 0.12, 0.20, 0.04, 0.006
handle_col = mixc(tote_body_col, T["blush-line"], 0.18)
for side, tag in ((1, "F"), (-1, "B")):
    pv = empty(f"HandlePivot_{tag}", turns["Tote"], (0, TOTE_Y0 + TOTE_H, side * 0.045))
    verts, faces, cols = [], [], []
    arch = HANDLE_ARCH * (1.0 if side == 1 else 0.72)  # the back strap reads as a clean inner arch, so the two don't fuse at the crown
    for r in range(HANDLE_RINGS):
        ph = math.pi * (1 - r / (HANDLE_RINGS - 1))
        px, py = HANDLE_HALF_X * math.cos(ph), arch * math.sin(ph) - 0.004
        tx, ty = -HANDLE_HALF_X * math.sin(ph), arch * math.cos(ph)  # true d/dph: a wrong sign skews the width and flips the strap at the shoulders
        n = math.hypot(tx, ty)
        nx, ny = -ty / n, tx / n  # in-plane normal: the strap's wide face lies along the arch, facing the camera
        for hw, ht in ((1, 1), (1, -1), (-1, -1), (-1, 1)):
            verts.append((px + nx * HANDLE_W / 2 * hw, py + ny * HANDLE_W / 2 * hw, ht * HANDLE_T / 2))
            cols.append(rgba(handle_col))
    for r in range(HANDLE_RINGS - 1):
        for k in range(4):
            a, b = r * 4 + k, r * 4 + (k + 1) % 4
            faces.append((a, b, b + 4, a + 4))
    for end, r in ((0, 0), (1, HANDLE_RINGS - 1)):  # end caps, hidden in the bag
        base = r * 4
        faces.append((base + 3, base + 2, base + 1, base) if end == 0 else (base, base + 1, base + 2, base + 3))
    try:
        check_solid(f"Handle_{tag}", verts, faces)
    except AssertionError:
        faces = [f[::-1] for f in faces]
        check_solid(f"Handle_{tag}", verts, faces)
    me = make_mesh(f"Handle_{tag}", verts, faces)
    paint(me, cols)
    new_obj(f"Handle_{tag}", me, pv)

# ---- mug -------------------------------------------------------------------------
mug_col = mixc(T["cream"], T["peach-glow"], 0.4)
mug_in = mixc(mug_col, T["plum-ink"], 0.10)
Y0, Y1 = -MUG_H / 2, MUG_H / 2
profile = [(0.0, Y0), (0.12, Y0), (0.17, Y0), (0.188, Y0 + 0.006), (0.197, Y0 + 0.02), (MUG_R, Y0 + 0.045)]
profile += [(MUG_R, lerp(Y0 + 0.045, Y1 - 0.02, i / 8)) for i in range(1, 9)]
profile += [(0.197, Y1 - 0.006), (0.188, Y1), (0.178, Y1 - 0.006), (0.172, Y1 - 0.02)]
profile += [(0.172, lerp(Y1 - 0.02, Y0 + 0.07, i / 4)) for i in range(1, 5)]
profile += [(0.14, Y0 + 0.06), (0.07, Y0 + 0.06), (0.0, Y0 + 0.06)]
assert len(profile) == 25, len(profile)
pcol = [rgba(mug_col)] * 13 + [rgba(mixc(mug_col, T["blush-line"], 0.3))] * 3 + [rgba(mug_in)] * 9  # the lip faces the light and would clip
verts, faces, cols = lathe(profile, 64, pcol)
check_solid("MugBody lathe", verts, faces)

# handle: an 8-sided tube swept along a C in the (radial, y) plane, capped at both ends inside the wall
HA = math.radians(HANDLE_DEG)
er, et = (math.sin(HA), 0.0, math.cos(HA)), (math.cos(HA), 0.0, -math.sin(HA))
H_RINGS, H_SIDES, H_R = 13, 8, 0.022
hv, hf = [], []
for r in range(H_RINGS):
    t = r / (H_RINGS - 1)
    cr, cy = 0.19 + 0.13 * math.sin(math.pi * t) ** 0.8, lerp(0.16, -0.13, t)
    dr = 0.13 * 0.8 * math.pi * math.cos(math.pi * t) * max(math.sin(math.pi * t), 1e-3) ** -0.2
    dy = -0.29
    n = math.hypot(dr, dy)
    nr, ny = -dy / n, dr / n
    for s in range(H_SIDES):
        a = 2 * math.pi * s / H_SIDES
        rr, yy, tt = cr + H_R * math.cos(a) * nr, cy + H_R * math.cos(a) * ny, H_R * math.sin(a)
        hv.append((rr * er[0] + tt * et[0], yy, rr * er[2] + tt * et[2]))
for r in range(H_RINGS - 1):
    for s in range(H_SIDES):
        s1 = (s + 1) % H_SIDES
        hf.append((r * H_SIDES + s, r * H_SIDES + s1, (r + 1) * H_SIDES + s1, (r + 1) * H_SIDES + s))
for end, r in ((0, 0), (1, H_RINGS - 1)):
    c0 = len(hv)
    hv.append(tuple(sum(hv[r * H_SIDES + s][k] for s in range(H_SIDES)) / H_SIDES for k in range(3)))
    for s in range(H_SIDES):
        s1 = (s + 1) % H_SIDES
        hf.append((c0, r * H_SIDES + s1, r * H_SIDES + s) if end == 0 else (c0, r * H_SIDES + s, r * H_SIDES + s1))
try:
    check_solid("Mug handle", hv, hf)
except AssertionError:
    hf = [f[::-1] for f in hf]
    check_solid("Mug handle", hv, hf)
base = len(verts)
verts += hv
faces += [tuple(i + base for i in f) for f in hf]
cols += [rgba(mug_col)] * len(hv)
me = make_mesh("MugBody", verts, faces)
paint(me, cols)
new_obj("MugBody", me, turns["Mug"])

# band: u runs round from the handle (the seam), v down from the top edge, one UV unit = one circumference both ways
verts, uvs, faces = [], [], []
BAND_ROWS, BAND_COLS = 3, 64
for i in range(BAND_ROWS + 1):
    y = lerp(BAND_Y1, BAND_Y0, i / BAND_ROWS)
    for j in range(BAND_COLS + 1):
        th = HA + 2 * math.pi * j / BAND_COLS
        verts.append((BAND_R * math.sin(th), y, BAND_R * math.cos(th)))
        uvs.append((j / BAND_COLS, (BAND_Y1 - y) / (2 * math.pi * BAND_R)))
for i in range(BAND_ROWS):
    for j in range(BAND_COLS):
        a, b = i * (BAND_COLS + 1) + j, (i + 1) * (BAND_COLS + 1) + j
        faces.append((a, b, b + 1, a + 1))  # outward; asserted below
me = make_mesh("MugBand", verts, faces)
paint(me, [WHITE] * len(verts))
set_uv(me, uvs)
new_obj("MugBand", me, turns["Mug"])

# ---- coaster -----------------------------------------------------------------------
c_col = mixc(T["cream"], T["peach-glow"], 0.3)
h = COASTER_T / 2
profile = [(0.0, -h), (0.15, -h), (0.28, -h), (0.289, -h + 0.005), (COASTER_R, -h + 0.015), (COASTER_R, h - 0.015),
           (0.289, h - 0.005), (0.28, h), (0.15, h), (0.0, h)]
verts, faces, cols = lathe(profile, 48, [rgba(c_col)] * len(profile))
check_solid("CoasterBody", verts, faces)
me = make_mesh("CoasterBody", verts, faces)
paint(me, cols)
new_obj("CoasterBody", me, turns["Coaster"])

verts, uvs, faces = [(0.0, h + 0.001, 0.0)], [(0.5, 0.5)], []
for k in range(1, 6):
    for j in range(48):
        th = 2 * math.pi * j / 48
        x, z = TOP_R * k / 5 * math.sin(th), TOP_R * k / 5 * math.cos(th)
        verts.append((x, h + 0.001, z))
        uvs.append((x / 0.58 + 0.5, 0.5 + z / 0.58))  # glTF v: the top of the picture is the far edge once tilted
for j in range(48):
    faces.append((0, 1 + j, 1 + (j + 1) % 48))
for k in range(1, 5):
    for j in range(48):
        j1 = (j + 1) % 48
        a, b = 1 + (k - 1) * 48, 1 + k * 48
        faces.append((a + j, b + j, b + j1, a + j1))
me = make_mesh("CoasterTop", verts, faces)
paint(me, [WHITE] * len(verts))
set_uv(me, uvs)
new_obj("CoasterTop", me, turns["Coaster"])

bpy.context.view_layer.update()


# ---- self-checks ---------------------------------------------------------------------
def tris_with_uv(ob):
    me_ = ob.data
    me_.calc_loop_triangles()
    uv = me_.uv_layers.active.data
    return [([lt.vertices[i] for i in range(3)], [(uv[lt.loops[i]].uv[0], 1.0 - uv[lt.loops[i]].uv[1]) for i in range(3)])
            for lt in me_.loop_triangles]


def surface_report(ob, pos, view_dir, tol_quad, tol_surf=None):
    """Per triangle: world length per UV unit along U and V agree, the image is not mirrored, and the winding faces the viewer.
    Returns the mean U/V ratio over the surface."""
    su = sv = 0.0
    n = 0
    for vs, uvs_ in tris_with_uv(ob):
        p0, p1, p2 = (Vector(pos[i]) for i in vs)
        (u0, v0), (u1, v1), (u2, v2) = uvs_
        det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)
        assert abs(det) > 1e-12, f"{ob.name}: degenerate UV triangle"
        pu = ((p1 - p0) * (v2 - v0) - (p2 - p0) * (v1 - v0)) / det
        pv = ((p2 - p0) * (u1 - u0) - (p1 - p0) * (u2 - u0)) / det
        nrm = (p1 - p0).cross(p2 - p0)
        assert nrm.dot(view_dir((p0 + p1 + p2) / 3)) > 0, f"{ob.name}: winding faces away from the viewer"
        assert pu.cross(pv).dot(nrm) < 0, f"{ob.name}: mirrored triangle"
        ratio = pu.length / pv.length
        assert abs(ratio - 1) <= tol_quad, f"{ob.name}: U/V stretch {ratio:.3f}"
        su, sv, n = su + pu.length, sv + pv.length, n + 1
    mean = su / sv
    assert tol_surf is None or abs(mean - 1) <= tol_surf, f"{ob.name}: mean U/V {mean:.3f}"
    return mean


def glt(ob, kb=None):
    return [ig(v.co) for v in kb.data] if kb else [ig(v.co) for v in ob.data.vertices]


# panel: every key, vertex count and order fixed
keys = panel.data.shape_keys.key_blocks
assert len(keys) == DRAPE_KEYS + 1 and all(len(kb.data) == len(panel.data.vertices) == N1 * N1 for kb in keys)
means = {}
for idx, kb in enumerate(keys):
    final = idx in (0, DRAPE_KEYS)
    means[kb.name] = surface_report(panel, glt(panel, kb), lambda c: Vector((0, 0, 1)), TOL_QUAD if final else TOL_FLIGHT,
                                    TOL_SURF if final else None)
band_ob, top_ob = bpy.data.objects["MugBand"], bpy.data.objects["CoasterTop"]
m_band = surface_report(band_ob, glt(band_ob), lambda c: Vector((c.x, 0, c.z)), TOL_QUAD, TOL_SURF)
m_top = surface_report(top_ob, glt(top_ob), lambda c: Vector((0, 1, 0)), TOL_QUAD, TOL_SURF)
fl_max = max(abs(m - 1) for m in means.values())

tris = 0
for ob in scene.objects:
    if ob.type == "MESH":
        assert not ob.modifiers, f"{ob.name}: modifier"
        ob.data.calc_loop_triangles()
        tris += len(ob.data.loop_triangles)
        assert ob.data.color_attributes.active_color is not None, f"{ob.name}: no active colour"
        assert ob.data.color_attributes.active_color.data_type == "FLOAT_COLOR", ob.name
assert tris <= 16000, f"{tris} triangles"
print(f"WEAVE checks ok: {tris} triangles, panel mean U/V {means['Drape8']:.4f} (worst key {fl_max:.4f}), "
      f"band {m_band:.4f}, top {m_top:.4f}")

common.export_glb(args.export, morphs=True, uvs=True)
print("WEAVE exported", args.export)

# ---- lookdev -------------------------------------------------------------------------
if not (args.render or args.blend):
    sys.exit(0)

import numpy as np  # noqa: E402

# a chart for judging orientation and stretch: circles and an upright F in every cell, never shipped
S, CELL = 512, 64
yy, xx = np.mgrid[0:S, 0:S]
cx, cy = xx % CELL - CELL / 2 + 0.5, yy % CELL - CELL / 2 + 0.5  # yy grows up in Blender images
chart = np.ones((S, S, 4))
chart[..., :3] = (0.93, 0.88, 0.82)
ring_ = np.abs(np.hypot(cx, cy) - 28) < 1.6
fx, fy = cx + 14, cy + 17
glyph = (((np.abs(fx - 3) < 3) & (fy >= 0) & (fy < 34)) | ((fy > 28) & (fy < 34) & (fx >= 0) & (fx < 22)) |
         ((fy > 14) & (fy < 20) & (fx >= 0) & (fx < 16)))
chart[ring_ | glyph, :3] = (0.18, 0.14, 0.25)
chart[(xx % CELL == 0) | (yy % CELL == 0), :3] = (0.7, 0.55, 0.55)
cimg = bpy.data.images.new("chart", S, S, alpha=False)
cimg.pixels = chart.ravel().tolist()
cimg.pack()


def lookdev_mat(name, blended=False, emissive=False, chart_tex=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    if chart_tex:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = cimg
        nt.links.new(tex.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
        nt.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
        return mat
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
        bsdf.inputs["Roughness"].default_value = 0.8
    if blended and hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    return mat


solid, cloth, thread_mat = lookdev_mat("Look"), lookdev_mat("LookCloth", chart_tex=True), lookdev_mat("LookThread", True, True)
for ob in scene.objects:
    if ob.type == "MESH":
        ob.data.materials.append(cloth if ob.name in ("Panel", "MugBand", "CoasterTop") else thread_mat if ob.name == "Threads" else solid)

cream = lin(T["cream"])
world = bpy.data.worlds.new("W")
world.use_nodes = True
nt = world.node_tree
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
scene.render.resolution_x = scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"


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
scene.camera = cam

for ob in [*turns.values(), carousel]:
    ob.rotation_mode = "QUATERNION"


def pose(show, key=None, carousel_deg=0.0, turn=None, cy=0.0, half=0.5):
    """show: object names rendered; key: drape key index (1..8) at full weight."""
    for ob in scene.objects:
        if ob.type == "MESH":
            ob.hide_render = ob.name not in show
    for i, kb in enumerate(keys):
        kb.value = 1.0 if i == key else 0.0
    carousel.rotation_quaternion = Quaternion((0, 0, 1), math.radians(-carousel_deg))
    for n, t in turns.items():
        t.rotation_quaternion = turn[1] if turn and turn[0] == n else Quaternion()
    d = half / math.tan(math.radians(17.5))
    cam.location = (0, -d, cy)
    aim(cam, (0, 0, cy))
    bpy.context.view_layer.update()


def qx(deg):
    return Quaternion((1, 0, 0), math.radians(deg))


def qy(deg):
    return Quaternion((0, 0, 1), math.radians(deg))  # glTF Y is Blender Z


tote_all = ("ToteBody", "Handle_F", "Handle_B", "Panel")
POSES = [
    ("warps", dict(show=("Threads",), cy=0.7, half=1.2)),
    ("weave", dict(show=("Threads", "Panel"), key=0, cy=0.2, half=0.7)),
    ("drape050", dict(show=("Panel",), key=4, cy=-0.05, half=0.45)),
    ("tote", dict(show=tote_all, key=8, turn=("Tote", qx(3.4) @ qy(-12)), cy=-0.06, half=0.5)),
    ("tote_front", dict(show=tote_all, key=8, cy=-0.06, half=0.5)),
    ("mug_a", dict(show=("MugBody", "MugBand"), carousel_deg=25, turn=("Mug", qy(-14)), cy=0, half=0.42)),
    ("mug_b", dict(show=("MugBody", "MugBand"), carousel_deg=25, turn=("Mug", qy(12)), cy=0, half=0.42)),
    ("coaster", dict(show=("CoasterBody", "CoasterTop"), carousel_deg=50, turn=("Coaster", qx(62) @ qy(18)), cy=0, half=0.4)),
]

if args.blend:
    Path(args.blend).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=args.blend)

if args.render:
    out = Path(args.render)
    out.mkdir(parents=True, exist_ok=True)
    for name, kw in POSES:
        pose(**kw)
        scene.render.filepath = str(out / f"{name}.png")
        bpy.ops.render.render(write_still=True)
    print("WEAVE renders", out)
