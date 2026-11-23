"""The weave models: threads, a neutral cloth panel, and GIEO's two products, the Nối Bag and the Nếp Keychain (a
lipstick holder), modelled after GIEO's photos. Run:
blender -b --factory-startup -P blender/scripts/weave.py -- --export out.glb [--render dir] [--blend file.blend]
  [--only bag,lip_a] (look-dev only those poses) [--cpu-lookdev] (Cycles on the CPU, where Eevee has no GPU)
Authored in glTF axes (Y up, camera at +Z) and converted by gb(); Blender is Z up, front = -Y.
Deterministic, no randomness. No modifiers and no glTF animation: the runtime writes morph weights and empties.
Also writes weave-cloth.png (a flat 64x64 tone) next to the glb; the runtime colours the cloth in its shader.

Contract (ShowroomScene reads the products, the unmounted WeaveScene the threads, panel and carousel):
  WeaveScene > Threads, Carousel > StationBag > Panel, TurnBag > NoiBody, NoiBand, NoiHandlePivot > NoiHandle
                                  StationLipstick > TurnLipstick > LipBody, LipFront, LipFlap, LipButton, LipLoop,
                                                                   LipClaspPivot > LipClasp
The brocade parts (NoiBand, NoiHandle, LipFront) carry UVs in cloth units: one UV unit is one diamond of the lattice,
BROC_BAG or BROC_LIP world units, the same along and across, and the band's UVs close round the ring on a whole
number of units so the pattern meets itself at the seam. The bodies carry no UVs (the runtime grains them in
object space)."""
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
ap.add_argument("--only", help="look-dev only these poses, comma-separated")
ap.add_argument("--cpu-lookdev", action="store_true", help="look-dev with Cycles on the CPU (no GPU, e.g. a headless box)")
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
STATION_DEG = {"Bag": 0.0, "Lipstick": 25.0}
TOL_QUAD, TOL_SURF, TOL_FLIGHT = 0.03, 0.02, 0.12
TRI_BUDGET = 26000

# Nối Bag (GIEO's photos): wider than tall, a pleated canvas body gathered under a straight brocade band that forms
# an oval opening, one brocade strap arching from one end of the band to the other.
BAG_FOOT, BAG_RC = -0.30, 0.08  # the flat base and the radius of its rounded edge
BAND_Y, BAND_H, BAND_T = 0.18, 0.09, 0.022  # the band: centre height, height, thickness
BAND_A, BAND_B, BAND_P = 0.352, 0.075, 2.6  # the opening (the band's centreline): half-width, half-depth, squareness
BAND_DIP = 0.012  # the band sags a little between the handle's ends
# The belly from the top of the foot's curve to the band's lower edge: y, half-width, half-depth, squareness.
BAG_SIDE = [(-0.220, 0.400, 0.165, 2.0), (-0.140, 0.418, 0.174, 2.0), (-0.050, 0.416, 0.168, 2.05),
            (0.040, 0.398, 0.148, 2.15), (0.100, 0.368, 0.110, 2.35), (0.135, BAND_A - 0.004, BAND_B - 0.004, BAND_P)]
BAG_N, PLEATS, PLEAT_AMP = 80, 12, 0.017  # columns round the body, folds round it, their depth
HANDLE_W, HANDLE_T = 0.058, 0.018  # the strap: width (front to back) and thickness
HANDLE_RISE, HANDLE_ARCH, HANDLE_SQ = 0.245, 0.27, 2.3  # where the legs turn into the arch, its height, its squareness
BROC_BAG = 0.03  # world size of one diamond on the bag's brocade: three across the band

# Nếp Keychain (GIEO's photos): a flat sleeve about 2:1 tall, brocade front, a canvas flap with a rounded lower edge
# and a wooden button, a canvas loop tab at the top holding a brass lobster clasp.
LIP_A, LIP_B, LIP_C, LIP_Y = 0.19, 0.37, 0.036, -0.09  # half-width, half-height, half-thickness, centre
LIP_Q, LIP_P, LIP_N = 9.0, 4.0, 64  # outline squareness, pillow profile, columns round it
FRONT_R, FRONT_T = 0.9, 0.0035  # the brocade covers the face out to this fraction, standing this proud
FLAP_HW, FLAP_SIDE, FLAP_MID, FLAP_BACK = 0.95 * LIP_A, 0.40 * LIP_B, 0.80 * LIP_B, 0.07
FLAP_G, FLAP_T = 0.0058, 0.009  # its gap over the body (clears the brocade) and its thickness
BTN_R, BTN_T = 0.034, 0.012
TAB_W, TAB_T, TAB_H, TAB_Z = 0.10, 0.010, 0.10, 0.013  # the loop tab: width, thickness, rise, half-gap at its eye
BROC_LIP = 0.075  # one diamond on the holder's front: five across

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


def sp(c, e):
    """Signed power: the superellipse's coordinate."""
    return math.copysign(abs(c) ** e, c)


def ring_xz(a, b, p, th):
    """A superellipse in the XZ plane: th 0 at the front (+Z), rising toward +X."""
    return a * sp(math.sin(th), 2 / p), b * sp(math.cos(th), 2 / p)


def ring_normal(a, b, p, th, h=1e-5):
    """Its outward normal in XZ, by central difference."""
    x0, z0 = ring_xz(a, b, p, th - h)
    x1, z1 = ring_xz(a, b, p, th + h)
    tx, tz = x1 - x0, z1 - z0
    n = math.hypot(tx, tz)
    return -tz / n, tx / n


def even_th(a, b, p, n, start=0.0, dense=8000):
    """n parameters evenly spaced by arc length round the superellipse, from `start`; and its perimeter."""
    ths = [start + 2 * math.pi * i / dense for i in range(dense + 1)]
    pts = [ring_xz(a, b, p, t) for t in ths]
    cum = [0.0]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        cum.append(cum[-1] + math.hypot(x1 - x0, z1 - z0))
    out, k = [], 0
    for j in range(n):
        s = cum[-1] * j / n
        while cum[k + 1] < s:
            k += 1
        out.append(lerp(ths[k], ths[k + 1], (s - cum[k]) / (cum[k + 1] - cum[k])))
    return out, cum[-1]


def resample(points, n):
    """n points evenly spaced by arc length along an open polyline (both ends kept)."""
    P = [Vector(q) for q in points]
    cum = [0.0]
    for a, b in zip(P, P[1:]):
        cum.append(cum[-1] + (b - a).length)
    out, k = [], 0
    for j in range(n):
        s = cum[-1] * j / (n - 1)
        while k < len(cum) - 2 and cum[k + 1] < s:
            k += 1
        out.append(P[k].lerp(P[k + 1], (s - cum[k]) / max(cum[k + 1] - cum[k], 1e-12)))
    return out


def catmull(keys, t):
    """Uniform Catmull-Rom through tuples `keys`, t from 0 to len - 1, ends clamped."""
    n = len(keys)
    i = min(int(t), n - 2)
    f = t - i
    p0, p1, p2, p3 = (keys[max(0, min(n - 1, j))] for j in (i - 1, i, i + 1, i + 2))
    return tuple(0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f ** 3)
                 for a, b, c, d in zip(p0, p1, p2, p3))


def loft(rows):
    """rows: closed rings of the same length, or single points (poles), joined in order. Returns verts, faces."""
    verts, idx = [], []
    m = max(len(r) for r in rows)
    for r in rows:
        if len(r) == 1:
            verts.append(tuple(r[0]))
            idx.append([len(verts) - 1] * m)
        else:
            idx.append(list(range(len(verts), len(verts) + m)))
            verts.extend(tuple(q) for q in r)
    faces = []
    for a, b in zip(idx, idx[1:]):
        for j in range(m):
            j1 = (j + 1) % m
            f = dedupe((a[j], a[j1], b[j1], b[j]))
            if len(set(f)) >= 3:
                faces.append(f)
    return verts, faces


def sweep(path, outs, sides, section, closed):
    """A strap or tube: `section` is a closed loop of (out, side) offsets whose first point is repeated at its end (the v
    seam). path: points; outs/sides: unit vectors per point. closed: path[-1] repeats path[0] (the u seam); otherwise
    both ends are capped. Returns verts, faces, and the (path, section) index of every vertex (None for cap centres)."""
    m = len(section)
    verts, where = [], []
    for i, (p, o, s) in enumerate(zip(path, outs, sides)):
        for k, (a, b) in enumerate(section):
            verts.append(tuple(Vector(p) + Vector(o) * a + Vector(s) * b))
            where.append((i, k))
    n = len(path)
    faces = [(i * m + k, i * m + k + 1, (i + 1) * m + k + 1, (i + 1) * m + k) for i in range(n - 1) for k in range(m - 1)]
    if not closed:
        for end, i in ((0, 0), (1, n - 1)):
            c = len(verts)
            ring = [Vector(verts[i * m + k]) for k in range(m - 1)]
            verts.append(tuple(sum(ring, Vector()) / len(ring)))
            where.append(None)
            for k in range(m - 1):
                f = (c, i * m + k + 1, i * m + k) if end == 0 else (c, i * m + k, i * m + k + 1)
                faces.append(f)
    return verts, faces, where


def slab(outer, inner):
    """A closed thin solid from two grids [i][j] of the same shape: outer and inner faces and the rim between."""
    ni, nj = len(outer), len(outer[0])
    verts = [tuple(q) for row in outer for q in row] + [tuple(q) for row in inner for q in row]
    O = lambda i, j: i * nj + j  # noqa: E731
    I = lambda i, j: ni * nj + i * nj + j  # noqa: E731
    faces = []
    for i in range(ni - 1):
        for j in range(nj - 1):
            faces.append((O(i, j), O(i + 1, j), O(i + 1, j + 1), O(i, j + 1)))
            faces.append((I(i, j), I(i, j + 1), I(i + 1, j + 1), I(i + 1, j)))
    for i in range(ni - 1):
        faces.append((O(i + 1, 0), O(i, 0), I(i, 0), I(i + 1, 0)))
        faces.append((O(i, nj - 1), O(i + 1, nj - 1), I(i + 1, nj - 1), I(i, nj - 1)))
    for j in range(nj - 1):
        faces.append((O(0, j), O(0, j + 1), I(0, j + 1), I(0, j)))
        faces.append((O(ni - 1, j + 1), O(ni - 1, j), I(ni - 1, j), I(ni - 1, j + 1)))
    return verts, faces


def solid(name, verts, faces):
    """check_solid, turning the whole surface inside out once if it was wound the other way."""
    try:
        check_solid(name, verts, faces)
    except AssertionError:
        faces = [f[::-1] for f in faces]
        check_solid(name, verts, faces)
    return faces


def merge(*parts):
    """Several (verts, faces, cols) into one mesh's lists."""
    verts, faces, cols = [], [], []
    for v, f, c in parts:
        base = len(verts)
        verts += v
        faces += [tuple(i + base for i in q) for q in f]
        cols += c
    return verts, faces, cols


def uv_check(name, verts, uvs, faces, unit=None, tol_quad=None, tol_unit=0.12):
    """Per triangle of an outward-wound surface: the image is not mirrored seen from outside and, given `unit`, world
    length per UV unit agrees along U and V and one UV unit is about `unit` world units. Returns the mean U/V ratio."""
    su = sv = 0.0
    for f in faces:
        for a, b, c in ((f[0], f[k], f[k + 1]) for k in range(1, len(f) - 1)):
            p0, p1, p2 = (Vector(verts[i]) for i in (a, b, c))
            nrm = (p1 - p0).cross(p2 - p0)
            if nrm.length < 1e-12:
                continue
            (u0, v0), (u1, v1), (u2, v2) = uvs[a], uvs[b], uvs[c]
            det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)
            assert abs(det) > 1e-12, f"{name}: degenerate UV triangle"
            pu = ((p1 - p0) * (v2 - v0) - (p2 - p0) * (v1 - v0)) / det
            pv = ((p2 - p0) * (u1 - u0) - (p1 - p0) * (u2 - u0)) / det
            assert pu.cross(pv).dot(nrm) < 0, f"{name}: mirrored triangle"
            if unit is None:
                continue
            ratio = pu.length / pv.length
            assert abs(ratio - 1) <= tol_quad, f"{name}: U/V stretch {ratio:.3f} at {tuple(round(c, 3) for c in p0)}"
            assert abs(pv.length / unit - 1) <= tol_unit, f"{name}: {pv.length:.4f} world units per UV unit"
            su, sv = su + pu.length, sv + pv.length
    return su / sv if sv else None


def mesh_obj(name, verts, faces, cols, parent, uvs=None, offset=(0, 0, 0)):
    """A mesh object under `parent`, its vertices moved by -offset (the parent's position in glTF axes)."""
    o = Vector(offset)
    me_ = make_mesh(name, [tuple(Vector(v) - o) for v in verts], faces)
    paint(me_, cols)
    if uvs is not None:
        set_uv(me_, uvs)
    return new_obj(name, me_, parent)


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
    """Closed-form pose of the cloth, glTF axes. tau 0 is the flat loom pose, 1 a smaller settled cloth in front of the
    bag's station (the legacy WeaveScene fades it out as the bag comes in)."""
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
panel = new_obj("Panel", me, stations["Bag"])  # not under the turn: the showroom's bag carries no panel
panel.shape_key_add(name="Basis", from_mix=False)
for k in range(1, DRAPE_KEYS + 1):
    kb = panel.shape_key_add(name=f"Drape{k}", from_mix=False)
    kb.data.foreach_set("co", [c for v in panel_verts(k / DRAPE_KEYS) for c in gb(*v)])

# ---- Nối Bag -------------------------------------------------------------------------
bag_pink = mixc(mixc(T["petal-soft"], T["lotus-pink"], 0.3), T["peach-glow"], 0.12)  # GIEO's pink bag, softened
bag_deep = mixc(bag_pink, T["plum-ink"], 0.2)  # the foot, under the band
bag_fold = mixc(bag_pink, T["plum-ink"], 0.3)  # deep in a fold
bag_in = mixc(bag_pink, T["plum-ink"], 0.55)  # inside
bag_turn = turns["Bag"]


def dip(x):
    """The band's sag at x: none at the handle's ends, BAND_DIP in the middle."""
    return BAND_DIP * (1 - min(1.0, (x / BAND_A) ** 2))


cols_th, _ = even_th(BAND_A, BAND_B, BAND_P, BAG_N)  # body columns, even round the opening, the first at the front
A0, B0 = BAG_SIDE[0][1] - BAG_RC, BAG_SIDE[0][2] - BAG_RC  # the flat base


def pleat(j):
    """A column's fold: + on a crest, - in a valley (broad crests, creased valleys), weaker at the band's ends, the
    folds a little uneven in width as gathered cloth is."""
    s = j / BAG_N
    ph = 2 * math.pi * PLEATS * s + 0.45 * math.sin(2 * math.pi * 3 * s) + 0.25 * math.sin(2 * math.pi * 5 * s + 1.0)
    d = 0.5 + 0.5 * math.cos(ph)
    return (d ** 0.6 - 0.55) * (0.3 + 0.7 * abs(math.cos(2 * math.pi * s)) ** 0.7)


def fold_low(j):
    """Where a column's fold has faded out, going down: the folds run to uneven lengths."""
    s = j / BAG_N
    return -0.24 + 0.09 * math.sin(2 * math.pi * 2 * s + 0.7) + 0.05 * math.sin(2 * math.pi * 5 * s)


def body_ring(y, a, b, p, amp=None, inset=0.0, wdip=0.0):
    """One ring of the body: the superellipse (a, b, p) inset by `inset`, each column pushed out along its normal by its
    fold times amp(y, column), lowered by the band's sag times `wdip`. Returns points and each column's fold depth."""
    pts, folds = [], []
    for j, th in enumerate(cols_th):
        x, z = ring_xz(a - inset, b - inset, p, th)
        nx, nz = ring_normal(a, b, p, th)
        off = amp(y, j) * pleat(j) if amp else 0.0
        pts.append((x + nx * off, y - wdip * dip(x), z + nz * off))
        folds.append(off)
    return pts, folds


def pleat_amp(y, j):
    """The folds are deepest just under the band and fade toward the foot; at the band's edge they tuck in."""
    lo = fold_low(j)
    return PLEAT_AMP * smoothstep(lo, lo + 0.3, y) * (1 - 0.65 * smoothstep(0.112, 0.135, y))


rows, rcols = [[(0.0, BAG_FOOT, 0.0)]], [[rgba(mixc(bag_deep, bag_pink, 0.3))]]


def add_row(pts, cols_):
    rows.append(pts)
    rcols.append(cols_)


for r in (0.35, 0.65, 0.88):  # the flat base
    add_row(body_ring(BAG_FOOT, A0 * r, B0 * r, 2.0)[0], [rgba(mixc(bag_deep, bag_pink, 0.3))] * BAG_N)
for k in range(5):  # its rounded edge, a quarter turn
    al = math.pi / 2 * k / 4
    y = BAG_FOOT + BAG_RC * (1 - math.cos(al))
    add_row(body_ring(y, A0 + BAG_RC * math.sin(al), B0 + BAG_RC * math.sin(al), 2.0)[0],
            [rgba(mixc(bag_deep, bag_pink, 0.3 + 0.5 * k / 4))] * BAG_N)
SIDE_STEPS = 22
for k in range(1, SIDE_STEPS + 1):  # the belly, up to the band's lower edge
    y, a, b, p = catmull(BAG_SIDE, (len(BAG_SIDE) - 1) * k / SIDE_STEPS)
    pts, folds = body_ring(y, a, b, p, pleat_amp, wdip=smoothstep(-0.05, 0.135, y))
    shade = 0.15 * (1 - smoothstep(BAG_SIDE[0][0], -0.1, y)) + 0.4 * smoothstep(0.09, 0.135, y)  # the foot; under the band
    cl = []
    for off in folds:
        valley = max(0.0, -off) / (0.55 * PLEAT_AMP)
        crest = max(0.0, off) / (0.45 * PLEAT_AMP)
        c = mixc(mixc(bag_pink, bag_deep, min(1.0, shade)), bag_fold, 0.75 * valley)
        cl.append(rgba(mixc(c, T["cream"], 0.16 * crest)))
    add_row(pts, cl)
RIM_Y = BAND_Y - 0.01  # the body's top edge, hidden inside the band
add_row(body_ring(RIM_Y, BAND_A - 0.002, BAND_B - 0.002, BAND_P, wdip=1.0)[0], [rgba(bag_deep)] * BAG_N)
# inside: over the edge and down, an even 9 mm in under the band (inside its thickness) and 2 cm below it
add_row(body_ring(RIM_Y, BAND_A - 0.002, BAND_B - 0.002, BAND_P, inset=0.007, wdip=1.0)[0], [rgba(bag_in)] * BAG_N)
for t in (5.0, 4.5, 4.0, 3.0, 2.0, 1.0, 0.0):
    y, a, b, p = catmull(BAG_SIDE, t)
    inset = 0.0105 + 0.0095 * (1 - smoothstep(0.08, 0.115, y))
    add_row(body_ring(y, a, b, p, inset=inset, wdip=smoothstep(-0.05, 0.135, y))[0], [rgba(bag_in)] * BAG_N)
for al in (60, 30):
    al = math.radians(al)
    r = BAG_RC - 0.02
    add_row(body_ring(BAG_FOOT + 0.02 + r * (1 - math.cos(al)), A0 + r * math.sin(al), B0 + r * math.sin(al), 2.0)[0],
            [rgba(bag_in)] * BAG_N)
add_row(body_ring(BAG_FOOT + 0.02, A0 * 0.6, B0 * 0.6, 2.0)[0], [rgba(bag_in)] * BAG_N)
rows.append([(0.0, BAG_FOOT + 0.02, 0.0)])
rcols.append([rgba(bag_in)])
verts, faces = loft(rows)
cols = [c for row, cl in zip(rows, rcols) for c in (cl if len(row) > 1 else cl[:1])]
assert len(cols) == len(verts)
faces = solid("NoiBody", verts, faces)
bag_body_verts = verts
mesh_obj("NoiBody", verts, faces, cols, bag_turn)

# band: the centreline round the opening (seam at the back), a section with a rolled top edge and a soft outer face
BAND_N = 96
band_th, _ = even_th(BAND_A, BAND_B, BAND_P, BAND_N, start=math.pi)
band_th.append(band_th[0])
path, outs = [], []
for th in band_th[:-1]:
    x, z = ring_xz(BAND_A, BAND_B, BAND_P, th)
    path.append((x, BAND_Y - dip(x), z))
    nx, nz = ring_normal(BAND_A, BAND_B, BAND_P, th)
    outs.append((nx, 0.0, nz))
path.append(path[0])
outs.append(outs[0])
ups = [(0.0, 1.0, 0.0)] * len(path)
T2, H2, RB = BAND_T / 2, BAND_H / 2, 0.006
section = [(-T2, -H2 + RB), (-T2, 0.0)]  # up the inner face from its lower corner (the v seam, hidden on the body)
section += [(T2 * math.cos(math.pi * (1 - k / 4)), H2 - T2 + T2 * math.sin(math.pi * (1 - k / 4))) for k in range(5)]
section += [(T2 + 0.003 * math.sin(math.pi * f), lerp(H2 - T2, -H2 + RB, f)) for f in (1 / 3, 2 / 3)]  # down the outside
section += [(T2 - RB + RB * math.cos(math.radians(a)), -H2 + RB + RB * math.sin(math.radians(a))) for a in (0, -45, -90)]
section += [(-T2 + RB + RB * math.cos(math.radians(a)), -H2 + RB + RB * math.sin(math.radians(a))) for a in (-90, -135)]
section.append(section[0])
verts, faces, where = sweep(path, outs, ups, section, closed=True)
faces = solid("NoiBand", verts, faces)
# u: the outer face's own arc length, scaled to close on a whole number of diamonds, the same for every line so nothing
# shears (the hidden inner face takes the squeeze at the ends); v: round the section.
seg = [0.0]
for a_, b_ in zip(path, path[1:]):
    seg.append(seg[-1] + (Vector(b_) - Vector(a_)).length)
L_BAND = seg[-1]
ang = [math.atan2(o[2], o[0]) for o in outs]
turn_ = [0.0]
for a0, a1 in zip(ang, ang[1:]):
    turn_.append(turn_[-1] + abs((a1 - a0 + math.pi) % (2 * math.pi) - math.pi))
O_REF = T2 + 0.002  # the outer face, with its bulge
K_BAND = round((L_BAND + 2 * math.pi * O_REF) / BROC_BAG)
vsec = [0.0]
for (a0, b0), (a1, b1) in zip(section, section[1:]):
    vsec.append(vsec[-1] + math.hypot(a1 - a0, b1 - b0))
uvs, cols = [], []
for i, k in where:
    o = section[k][0]
    uvs.append(((seg[i] + O_REF * turn_[i]) * K_BAND / (L_BAND + 2 * math.pi * O_REF), vsec[k] / BROC_BAG))
    shade = 1.0 if o > 0 else 0.74  # the inner face is in the bag's shade
    shade *= 1 - 0.25 * smoothstep(-H2 + 0.02, -H2, section[k][1])  # and the lower edge, where it meets the body
    cols.append((shade, shade, shade, 1.0))
outer_faces = [f for f in faces if all(section[where[i][1]][0] >= T2 - 1e-9 for i in f)]
m_band = uv_check("NoiBand outer face", verts, uvs, outer_faces, BROC_BAG, 0.06)
uv_check("NoiBand", verts, uvs, faces)  # everywhere: not mirrored (the hidden inner face squeezes at the ends)
mesh_obj("NoiBand", verts, faces, cols, bag_turn, uvs)

# handle: one strap from one end of the band to the other, its wide face outward; its legs wrap the band's ends
X_LEG = BAND_A + T2 + HANDLE_T / 2 - 0.002
Y_LEG = BAND_Y - H2 + 0.008
dense = [(-X_LEG, lerp(Y_LEG, HANDLE_RISE, i / 20), 0.0) for i in range(20)]
for i in range(201):
    ph = math.pi * (1 - i / 200)
    dense.append((X_LEG * sp(math.cos(ph), 2 / HANDLE_SQ), HANDLE_RISE + HANDLE_ARCH * sp(math.sin(ph), 2 / HANDLE_SQ), 0.0))
dense += [(X_LEG, lerp(HANDLE_RISE, Y_LEG, i / 20), 0.0) for i in range(1, 21)]
path = resample(dense, 64)
tans = [(path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized() for i in range(len(path))]
outs = [(-t.y, t.x, 0.0) for t in tans]  # in the arch's plane, away from the bag
fronts = [(0.0, 0.0, 1.0)] * len(path)
TH2, W2, RCH = HANDLE_T / 2, HANDLE_W / 2, 0.0055
section = [(-TH2, 0.0), (-TH2, -W2 / 2), (-TH2, -W2 + RCH)]  # from the middle of the underside (the v seam)
section += [(-TH2 + RCH + RCH * math.cos(math.radians(a)), -W2 + RCH + RCH * math.sin(math.radians(a))) for a in (225, 270)]
section += [(TH2 - RCH + RCH * math.cos(math.radians(a)), -W2 + RCH + RCH * math.sin(math.radians(a))) for a in (270, 315, 360)]
section += [(TH2, w) for w in (-W2 / 2, 0.0, W2 / 2)]  # the outer face, front-to-back
section += [(TH2 - RCH + RCH * math.cos(math.radians(a)), W2 - RCH + RCH * math.sin(math.radians(a))) for a in (0, 45, 90)]
section += [(-TH2 + RCH + RCH * math.cos(math.radians(a)), W2 - RCH + RCH * math.sin(math.radians(a))) for a in (90, 135)]
section += [(-TH2, W2 - RCH), (-TH2, W2 / 2)]
section.append(section[0])


def band_end_x(w):
    """How far the band's end falls back from its tip at a distance w across it (for the legs to wrap it)."""
    return BAND_A * (1 - abs(w / BAND_B) ** BAND_P) ** (1 / BAND_P) - BAND_A


wrapped = []
for i, p in enumerate(path):
    wf = 1 - smoothstep(BAND_Y + H2 - 0.005, BAND_Y + H2 + 0.03, p.y)
    wrapped.append([(o + wf * band_end_x(w), w) for o, w in section])
verts, faces, where = [], [], []
m = len(section)
for i in range(len(path)):  # sweep() with a section that changes along the path
    for k, (o, w) in enumerate(wrapped[i]):
        verts.append(tuple(path[i] + Vector(outs[i]) * o + Vector(fronts[i]) * w))
        where.append((i, k))
faces = [(i * m + k, i * m + k + 1, (i + 1) * m + k + 1, (i + 1) * m + k) for i in range(len(path) - 1) for k in range(m - 1)]
sides_ = list(faces)
for end, i in ((0, 0), (1, len(path) - 1)):
    c = len(verts)
    verts.append(tuple(sum((Vector(verts[i * m + k]) for k in range(m - 1)), Vector()) / (m - 1)))
    where.append((i, None))
    faces += [(c, i * m + k + 1, i * m + k) if end == 0 else (c, i * m + k, i * m + k + 1) for k in range(m - 1)]
try:
    check_solid("NoiHandle", verts, faces)
except AssertionError:
    faces, sides_ = [f[::-1] for f in faces], [f[::-1] for f in sides_]
    check_solid("NoiHandle", verts, faces)
seg = [0.0]
for a_, b_ in zip(path, path[1:]):
    seg.append(seg[-1] + (b_ - a_).length)
turn_ = [0.0]
for t0, t1 in zip(tans, tans[1:]):
    turn_.append(turn_[-1] + math.acos(max(-1.0, min(1.0, t0.dot(t1)))))
vsec = [0.0]
for (a0, b0), (a1, b1) in zip(section, section[1:]):
    vsec.append(vsec[-1] + math.hypot(a1 - a0, b1 - b0))
uvs, cols = [], []
for i, k in where:
    kk = (m - 1) // 2 if k is None else k
    o = section[kk][0]
    uvs.append(((seg[i] + TH2 * turn_[i]) / BROC_BAG, vsec[kk] / BROC_BAG))  # the outer face's arc length: no shear
    shade = 1.0 - 0.2 * (1 - smoothstep(Y_LEG, Y_LEG + 0.06, path[i].y))  # darker where it is sewn on
    shade *= 1.0 if o > 0 else 0.86
    cols.append((shade, shade, shade, 1.0))
free = [f for f in sides_ if all(path[where[i][0]].y > BAND_Y + H2 + 0.03 for i in f)]  # above the wrap
m_handle = uv_check("NoiHandle", verts, uvs, free, BROC_BAG, 0.15)
uv_check("NoiHandle", verts, uvs, sides_)  # everywhere: not mirrored (the wrap squeezes the hidden corners)
HANDLE_PIVOT = (0.0, BAND_Y, 0.0)
hpv = empty("NoiHandlePivot", bag_turn, HANDLE_PIVOT)
mesh_obj("NoiHandle", verts, faces, cols, hpv, uvs, HANDLE_PIVOT)
handle_low = min(v[1] for v in verts)

# ---- Nếp Keychain (lipstick holder) ------------------------------------------------------------
lip_pink = mixc(bag_pink, T["lotus-pink"], 0.08)
lip_deep = mixc(lip_pink, T["plum-ink"], 0.2)
wood = mixc(T["peach-glow"], T["ink"], 0.42)
brass = T["peach-glow"]  # the runtime makes it metal and warms it
lip_turn = turns["Lipstick"]


def lip_r(x, y):
    """Which outline (as a fraction of the full one) passes through (x, y)."""
    return (abs(x / LIP_A) ** LIP_Q + abs((y - LIP_Y) / LIP_B) ** LIP_Q) ** (1 / LIP_Q)


def lip_h(r):
    """The sleeve's half-thickness on outline r: a pillow, full in the middle, closing at the seam."""
    return LIP_C * max(0.0, 1 - r ** LIP_P) ** (1 / LIP_P)


def lip_top(x):
    return LIP_Y + LIP_B * max(0.0, 1 - abs(x / LIP_A) ** LIP_Q) ** (1 / LIP_Q)


TOP = lip_top(0.0)
outline = [ring_xz(LIP_A, LIP_B, LIP_Q, th) for th in even_th(LIP_A, LIP_B, LIP_Q, LIP_N, start=0.0)[0]]  # (x, y-LIP_Y)


def lip_ring(r, z):
    return [(r * x, LIP_Y + r * y, z) for x, y in outline]


RS = (0.3, 0.55, 0.72, 0.84, 0.92, 0.965, 0.99)
rows = [[(0.0, LIP_Y, -LIP_C)]] + [lip_ring(r, -lip_h(r)) for r in RS] + [lip_ring(1.0, 0.0)]
rows += [lip_ring(r, lip_h(r)) for r in reversed(RS)] + [[(0.0, LIP_Y, LIP_C)]]
verts, faces = loft(rows)
faces = solid("LipBody", verts, faces)
cols = [rgba(mixc(lip_pink, lip_deep, 0.5 * (1 - smoothstep(LIP_Y - LIP_B, LIP_Y - 0.6 * LIP_B, v[1])))) for v in verts]
mesh_obj("LipBody", verts, faces, cols, lip_turn)


def flap_edge(x):
    """The flap's lower edge at x: straight sides, then a rounded curve to its lowest point in the middle."""
    ys, yc = TOP - FLAP_SIDE, TOP - FLAP_MID
    return ys - (ys - yc) * max(0.0, 1 - abs(x / FLAP_HW) ** 2.2) ** (1 / 2.2)


# front: the brocade over the face out to FRONT_R, a hair proud of it (its inner face sits just inside the body)
RF = (0.15, 0.3, 0.45, 0.6, 0.72, 0.82, FRONT_R)
rows = [[(0.0, LIP_Y, LIP_C - 0.002)]] + [lip_ring(r, lip_h(r) - 0.002) for r in RF]
rows += [lip_ring(r, lip_h(r) + FRONT_T) for r in reversed(RF)] + [[(0.0, LIP_Y, LIP_C + FRONT_T)]]
verts, faces = loft(rows)
faces = solid("LipFront", verts, faces)
uvs = [(x / BROC_LIP + 0.5, (TOP - y) / BROC_LIP) for x, y, z in verts]  # a diamond centred on the middle line
outer_faces = [f for f in faces if all(verts[i][2] > lip_h(lip_r(verts[i][0], verts[i][1])) for i in f)]
m_front = uv_check("LipFront", verts, uvs, outer_faces, BROC_LIP, 0.07)
cols = []
for x, y, z in verts:
    below = flap_edge(x) - y  # > 0 below the flap's edge
    shade = 0.66 if below < 0 else 1 - 0.3 * (1 - smoothstep(0.0, 0.07, below))
    cols.append((shade, shade, shade, 1.0))
mesh_obj("LipFront", verts, faces, cols, lip_turn, uvs)

# flap: from the back, over the top seam, down the front to its rounded edge; columns at fixed x
NXF, NSF = 24, 28
outer, inner, fcols = [], [], []
for i in range(NXF + 1):
    x = FLAP_HW * -math.cos(math.pi * i / NXF)  # denser at the sides, where the flap curls round the pillow
    r_front, r_back = lip_r(x, flap_edge(x)), lip_r(x, lip_top(x) - FLAP_BACK)

    def y_at(r):
        return LIP_Y + LIP_B * max(0.0, r ** LIP_Q - abs(x / LIP_A) ** LIP_Q) ** (1 / LIP_Q)

    line = [(y_at(r), lip_h(r)) for r in (r_front + (1 - r_front) * (1 - (1 - t / 200) ** 3) for t in range(201))]
    line += [(y_at(r), -lip_h(r)) for r in (r_back + (1 - r_back) * (1 - (1 - t / 200) ** 3) for t in range(199, -1, -1))]
    pts = resample([(0.0, y, z) for y, z in line], NSF + 1)
    o_row, i_row, c_row = [], [], []
    for j, p in enumerate(pts):
        t = (pts[min(j + 1, NSF)] - pts[max(j - 1, 0)]).normalized()
        n = Vector((0.0, -t.z, t.y))  # outward in the YZ plane (the path climbs the front and goes down the back)
        i_row.append((x, p.y + n.y * FLAP_G, p.z + n.z * FLAP_G))
        o_row.append((x, p.y + n.y * (FLAP_G + FLAP_T), p.z + n.z * (FLAP_G + FLAP_T)))
        c_row.append(rgba(mixc(lip_pink, T["cream"], 0.08 * smoothstep(TOP - 0.1, TOP, p.y))))
    outer.append(o_row)
    inner.append(i_row)
    fcols.append(c_row)
verts, faces = slab(outer, inner)
faces = solid("LipFlap", verts, faces)
cols = [c for row in fcols for c in row] * 2
mesh_obj("LipFlap", verts, faces, cols, lip_turn)

# button: a wooden disc with a raised rim, a dished middle and four holes, on a short shank, just under the flap's edge
prof = [(0.0, -0.006), (0.008, -0.006), (0.008, 0.0), (BTN_R * 0.85, 0.0), (BTN_R, 0.003), (BTN_R, BTN_T - 0.004),
        (BTN_R - 0.003, BTN_T), (BTN_R * 0.78, BTN_T - 0.0012), (BTN_R * 0.72, BTN_T - 0.004), (BTN_R * 0.4, BTN_T - 0.0045),
        (0.0, BTN_T - 0.0045)]
pcol = [rgba(mixc(wood, T["ink"], 0.15))] * 4 + [rgba(wood), rgba(mixc(wood, T["peach-glow"], 0.12)), rgba(wood),
                                                  rgba(mixc(wood, T["peach-glow"], 0.18)), rgba(wood),
                                                  rgba(mixc(wood, T["ink"], 0.08)), rgba(mixc(wood, T["ink"], 0.12))]
parts = [lathe(prof, 32, pcol)]
for hx, hz in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
    v_, f_, c_ = lathe([(0.0, BTN_T - 0.006), (0.0042, BTN_T - 0.006), (0.0042, BTN_T - 0.004), (0.0, BTN_T - 0.004)], 10,
                       [rgba(mixc(wood, T["ink"], 0.65))] * 4)
    parts.append(([(x + 0.0085 * hx, y, z + 0.0085 * hz) for x, y, z in v_], f_, c_))
parts = [(v_, solid("LipButton part", v_, f_), c_) for v_, f_, c_ in parts]
verts, faces, cols = merge(*parts)
BTN_Y = flap_edge(0.0) - 0.6 * BTN_R
dh = (lip_h(lip_r(0, BTN_Y + 0.001)) - lip_h(lip_r(0, BTN_Y - 0.001))) / 0.002
tilt = Quaternion((1, 0, 0), -math.asin(-dh / math.sqrt(1 + dh * dh))) @ Quaternion((1, 0, 0), math.radians(90))
btn_at = Vector((0.0, BTN_Y, lip_h(lip_r(0, BTN_Y)) + FRONT_T + 0.006))
verts = [tuple(btn_at + tilt @ Vector(v)) for v in verts]  # its axis turned from +Y to the sleeve's normal
mesh_obj("LipButton", verts, faces, cols, lip_turn)

# loop tab: up out of the flap's fold, round an eye at the top, and back down; ends hidden in the sleeve
Y_EYE = TOP + TAB_H
y0 = TOP - 0.03
dense = [(0.0, lerp(y0, Y_EYE, i / 30), TAB_Z) for i in range(30)]
dense += [(0.0, Y_EYE + TAB_Z * math.sin(math.pi * i / 40), TAB_Z * math.cos(math.pi * i / 40)) for i in range(41)]
dense += [(0.0, lerp(Y_EYE, y0, i / 30), -TAB_Z) for i in range(1, 31)]
path = resample(dense, 40)
tans = [(path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized() for i in range(len(path))]
outs = [(0.0, -t.z, t.y) for t in tans]  # up the front: +Z; over the eye: +Y; down the back: -Z
xs = [(1.0, 0.0, 0.0)] * len(path)
TT2, TW2, RT = TAB_T / 2, TAB_W / 2, 0.0045
section = [(-TT2 + RT + RT * math.cos(math.radians(a)), -TW2 + RT + RT * math.sin(math.radians(a))) for a in (180, 225, 270)]
section += [(TT2 - RT + RT * math.cos(math.radians(a)), -TW2 + RT + RT * math.sin(math.radians(a))) for a in (270, 315, 360)]
section += [(TT2 - RT + RT * math.cos(math.radians(a)), TW2 - RT + RT * math.sin(math.radians(a))) for a in (0, 45, 90)]
section += [(-TT2 + RT + RT * math.cos(math.radians(a)), TW2 - RT + RT * math.sin(math.radians(a))) for a in (90, 135, 180)]
section.append(section[0])
verts, faces, where = sweep(path, outs, xs, section, closed=False)
faces = solid("LipLoop", verts, faces)
mesh_obj("LipLoop", verts, faces, [rgba(lip_pink)] * len(verts), lip_turn)

# clasp (brass, simplified): a D-ring through the tab's eye, a swivel, and the lobster body with its lever
CLASP_PIVOT = (0.0, Y_EYE, 0.0)
DX, DY, DRC, WIRE = 0.06, 0.04, 0.012, 0.0055


def tube(points, radius, sides, flat=1.0):
    """A closed ring tube along a closed loop in the XY plane; radius(i) per point; squashed in Z by `flat`."""
    pts = resample(points, 48)[:-1]
    n = len(pts)
    pts.append(pts[0])
    tans = [(pts[(i + 1) % n] - pts[(i - 1) % n]).normalized() for i in range(n)]
    tans.append(tans[0])
    outs_ = [(t.y, -t.x, 0.0) for t in tans]
    vs = []
    for i, (p, o) in enumerate(zip(pts, outs_)):
        r = radius(i / n) if i < n else radius(0.0)
        for k in range(sides + 1):
            a = 2 * math.pi * (k % sides) / sides
            vs.append(tuple(p + Vector(o) * (r * math.cos(a)) + Vector((0, 0, flat * r * math.sin(a)))))
    m_ = sides + 1
    return vs, [(i * m_ + k, i * m_ + k + 1, (i + 1) * m_ + k + 1, (i + 1) * m_ + k) for i in range(n) for k in range(sides)]


Yb = Y_EYE
dring = [(lerp(-DX + DRC, DX - DRC, i / 10), Yb, 0.0) for i in range(11)]
dring += [(DX - DRC + DRC * math.cos(math.radians(a)), Yb + DRC + DRC * math.sin(math.radians(a)), 0.0) for a in range(-80, 1, 10)]
dring += [(DX * sp(math.cos(ph), 2 / 2.4), Yb + DRC + (DY - DRC) * sp(math.sin(ph), 2 / 2.4), 0.0)
          for ph in (math.pi * i / 40 for i in range(1, 40))]
dring += [(-DX + DRC + DRC * math.cos(math.radians(a)), Yb + DRC + DRC * math.sin(math.radians(a)), 0.0) for a in range(180, 261, 10)]
dring.append(dring[0])
v1, f1 = tube(dring, lambda t: WIRE, 8)
f1 = solid("LipClasp ring", v1, f1)
SW_Y0 = Yb + DY - 0.004
v2, f2, _ = lathe([(0.0, SW_Y0), (0.0075, SW_Y0), (0.0075, SW_Y0 + 0.022), (0.0105, SW_Y0 + 0.025),
                   (0.0105, SW_Y0 + 0.030), (0.0075, SW_Y0 + 0.033), (0.0, SW_Y0 + 0.033)], 12)
f2 = solid("LipClasp swivel", v2, f2)
LB_Y0, LL, LW = SW_Y0 + 0.028, 0.15, 0.085
lob = [(0.5 * LW * math.sin(t) * (0.42 + 0.58 * (1 - math.cos(t)) / 2), LB_Y0 + LL * (1 - math.cos(t)) / 2, 0.0)
       for t in (2 * math.pi * i / 200 for i in range(201))]
v3, f3 = tube(lob, lambda t: 0.008 - 0.003 * math.sin(2 * math.pi * t), 10, 0.75)  # thick spine left, thin gate right
f3 = solid("LipClasp body", v3, f3)
v4, f4, _ = lathe([(0.0, -0.007), (0.005, -0.006), (0.0075, -0.003), (0.0075, 0.003), (0.005, 0.006), (0.0, 0.007)], 10)
v4 = [(x * 0.8 + 0.5 * LW * 0.55, y + LB_Y0 + 0.028, z * 0.7) for x, y, z in v4]  # the lever on the gate side
f4 = solid("LipClasp lever", v4, f4)
verts, faces, cols = merge((v1, f1, [rgba(brass)] * len(v1)), (v2, f2, [rgba(mixc(brass, T["ink"], 0.1))] * len(v2)),
                           (v3, f3, [rgba(brass)] * len(v3)), (v4, f4, [rgba(mixc(brass, T["ink"], 0.12))] * len(v4)))
cpv = empty("LipClaspPivot", lip_turn, CLASP_PIVOT)
mesh_obj("LipClasp", verts, faces, cols, cpv, None, CLASP_PIVOT)
clasp_top = max(v[1] for v in verts)

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
fl_max = max(abs(m - 1) for m in means.values())

# the products read as GIEO's: the bag wider than tall (body and band), the holder's sleeve about twice as tall as wide
bag_w = max(v[0] for v in bag_body_verts) - min(v[0] for v in bag_body_verts)
bag_h = BAND_Y + H2 - BAG_FOOT
assert 1.5 <= bag_w / bag_h <= 1.7, f"bag {bag_w / bag_h:.2f}:1"
assert abs(LIP_B / LIP_A - 2) < 0.1, "sleeve proportions"
assert BAND_Y - H2 < handle_low < BAND_Y, "the handle's legs end on the band"
assert clasp_top > Y_EYE + DY + 0.1, "the clasp stands above the tab"

tris, per = 0, {}
for ob in scene.objects:
    if ob.type == "MESH":
        assert not ob.modifiers, f"{ob.name}: modifier"
        ob.data.calc_loop_triangles()
        per[ob.name] = len(ob.data.loop_triangles)
        tris += per[ob.name]
        assert ob.data.color_attributes.active_color is not None, f"{ob.name}: no active colour"
        assert ob.data.color_attributes.active_color.data_type == "FLOAT_COLOR", ob.name
assert tris <= TRI_BUDGET, f"{tris} triangles: {per}"
print(f"WEAVE checks ok: {tris} triangles, panel mean U/V {means['Drape8']:.4f} (worst key {fl_max:.4f}), "
      f"band {m_band:.4f} ({K_BAND} diamonds round), handle {m_handle:.4f}, front {m_front:.4f}, "
      f"bag {bag_w:.3f} x {bag_h:.3f} ({bag_w / bag_h:.2f}:1), holder {2 * LIP_A:.2f} x {2 * LIP_B:.2f} up to {clasp_top:.3f}")

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


plain, cloth, thread_mat = lookdev_mat("Look"), lookdev_mat("LookCloth", chart_tex=True), lookdev_mat("LookThread", True, True)
for ob in scene.objects:
    if ob.type == "MESH":
        ob.data.materials.append(cloth if ob.name in ("Panel", "NoiBand", "NoiHandle", "LipFront") else
                                 thread_mat if ob.name == "Threads" else plain)

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

for engine in (("CYCLES",) if args.cpu_lookdev else ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "BLENDER_WORKBENCH")):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        pass
if args.cpu_lookdev:
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = False
try:
    scene.eevee.taa_render_samples = 32
except AttributeError:
    pass
scene.view_settings.view_transform = "Standard"
scene.render.film_transparent = True  # judged composited on the page's own colours, never on black
scene.render.image_settings.color_mode = "RGBA"
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


bag_all = ("NoiBody", "NoiBand", "NoiHandle")
lip_all = ("LipBody", "LipFront", "LipFlap", "LipButton", "LipLoop", "LipClasp")
POSES = [
    ("warps", dict(show=("Threads",), cy=0.7, half=1.2)),
    ("weave", dict(show=("Threads", "Panel"), key=0, cy=0.2, half=0.7)),
    ("drape050", dict(show=("Panel",), key=4, cy=-0.05, half=0.45)),
    ("bag", dict(show=bag_all, turn=("Bag", qx(8) @ qy(-28)), cy=0.1, half=0.52)),
    ("bag_front", dict(show=bag_all, turn=("Bag", qx(4)), cy=0.1, half=0.52)),
    ("bag_side", dict(show=bag_all, turn=("Bag", qx(10) @ qy(-80)), cy=0.1, half=0.52)),
    ("bag_top", dict(show=bag_all, turn=("Bag", qx(55) @ qy(-20)), cy=0.0, half=0.55)),
    ("lip_a", dict(show=lip_all, carousel_deg=25, turn=("Lipstick", qx(4) @ qy(-24)), cy=0.05, half=0.6)),
    ("lip_front", dict(show=lip_all, carousel_deg=25, turn=("Lipstick", qx(2)), cy=0.05, half=0.6)),
    ("lip_side", dict(show=lip_all, carousel_deg=25, turn=("Lipstick", qx(6) @ qy(-70)), cy=0.05, half=0.6)),
    ("lip_detail", dict(show=lip_all, carousel_deg=25, turn=("Lipstick", qx(6) @ qy(-20)), cy=0.12, half=0.22)),
]

if args.blend:
    Path(args.blend).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=args.blend)

if args.render:
    out = Path(args.render)
    out.mkdir(parents=True, exist_ok=True)
    for name, kw in POSES:
        if args.only and name not in args.only.split(","):
            continue
        pose(**kw)
        scene.render.filepath = str(out / f"{name}.png")
        bpy.ops.render.render(write_still=True)
    print("WEAVE renders", out)
