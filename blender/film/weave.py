"""Film `weave` (07-redesign §4): close on yarn; warps are strung, wefts interlace into plain-weave cloth, the camera
pulls back, the cloth flies up over the Nối Bag rising behind it and drops into its mouth, the band weaves round the
rim from where it went in and the handle is drawn over, then the camera travels down to the Nếp Keychain lying beside
it. Alpha, lit to sit on plum. The two products are GIEO's Nối Nếp collection, modelled after their photographs (a
pleated canvas bag under a band of the cloth, one handle of it; a flat sleeve with a cloth front, a rounded canvas
flap, a wooden button and a brass clasp).
Beats (0-based frames): thread 0-30, warps 30-50, weave 50-89, drape 89-109, bag 109-129, lipstick 129-149.
Every cloth here is real yarn geometry in PLAIN WEAVE with one mint end (the seed's thread): no motif, no brocade
pattern, until GIEO sends a scan (07-redesign §1).

  blender -b --factory-startup -P blender/film/weave.py -- --quality draft|final [--frames ...] [--resume]
"""
import math
import sys
import types
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig  # noqa: E402
from rig import T, chroma, lerp, lin, mix, ss, track  # noqa: E402

SETS = {"s": (960, 960)}
FRAMES = 150
P, R = 0.015, 0.0062  # yarn pitch and radius
PF, RF = P / 2, R / 2  # the finer cloth of the bag's band and handle and of the keychain's front
NW = NF = 48
SIZE = NW * P  # 0.72 m of cloth
MINT = 31  # the warp that is the seed's thread
MX = (MINT - (NW - 1) / 2) * P
LOOM = np.array([0.0, -0.25, 0.40])  # cloth centre while it is woven
FRINGE = SIZE / 2 + 0.025
TAIL = 0.62  # how far up the warps hang from before they are cut
WARP_COL, WEFT_COL = mix(T["peach-glow"], T["cream"], 0.3), mix(T["petal-soft"], T["cream"], 0.25)
CANVAS = tuple(c * 0.9 for c in mix(T["petal-soft"], T["lotus-pink"], 0.3))  # the soft pink canvas of both products
THREAD = mix(T["lotus-pink"], T["plum-ink"], 0.2)  # sewing thread
CORD = mix(T["petal-soft"], T["lotus-pink"], 0.25)  # the plied cord that finishes the cloth's edges
WOOD = chroma(mix(T["peach-glow"], T["ink"], 0.70), 2.2)  # the keychain's button: dark, like a coconut shell
BRASS = chroma(mix(T["peach-glow"], T["ink"], 0.12), 2.2)  # its clasp


def smoother(t):
    t = min(1.0, max(0.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)


def oval(A, B, n=3.0):
    """A plan |x/A|^n + |y/B|^n = 1 measured by arclength s from the front centre (0, -B), anticlockwise (towards +x
    first). Returns at(s) -> (x, y, outward nx, ny) for any array s (it wraps), the perimeter, and (angle, s) tables."""
    ph = np.linspace(0, 2 * np.pi, 40001)
    rho = (np.abs(np.sin(ph)) ** n + np.abs(np.cos(ph)) ** n) ** (-1 / n)
    x, y = A * rho * np.sin(ph), -B * rho * np.cos(ph)
    cum = np.concatenate([[0], np.cumsum(np.hypot(np.diff(x), np.diff(y)))])
    tx, ty = np.gradient(x), np.gradient(y)
    k = np.hypot(tx, ty)
    nx, ny = ty / k, -tx / k

    def at(s):
        s = np.mod(s, cum[-1])
        px, py, qx, qy = (np.interp(s, cum, c) for c in (x, y, nx, ny))
        q = np.maximum(np.hypot(qx, qy), 1e-12)
        return px, py, qx / q, qy / q
    return at, cum[-1], (ph, cum)


# The Nối Bag, at the film's scale (its products are larger than life): a canvas body gathered into soft pleats under
# a straight band of the cloth that makes the oval mouth, and one handle of the same cloth arching from end to end.
BAG_W, BAG_H, BAG_D = 0.74, 0.46, 0.34  # widest, foot to rim, deepest
BAND_NF = 9  # picks up the band: with a cord along each edge it is about a sixth of the bag's height
OFF = 2 * RF + 0.0006  # the band's yarns run this far out from the canvas under them
SEAM = BAG_H - BAND_NF * PF - 0.010  # where the body is gathered into the band
ZB = (SEAM + BAG_H) / 2  # the band's middle
ARCH = 0.25  # how high the handle rises over the rim
_L0 = oval(0.335, 0.11)[1]
BAND_NW = 2 * round(_L0 / (2 * PF))  # warps round the band: an even count closes the plain weave
BAND_A, BAND_B = (c * BAND_NW * PF / _L0 for c in (0.335, 0.11))  # the plan the band's yarns run on
BAND_MINT = round(0.10 / PF + (BAND_NW - 1) / 2)  # its one mint end, front right, where the flying cloth's was
STRAP_NW, STRAP_TH = 8, 0.005  # warps across the handle, and the thickness of its canvas core
# The Nếp Keychain lies where the camera ends: its width, length, thickness, and how its top is turned from +y
KEY_X, KEY_W, KEY_L, KEY_T, KEY_TURN = 0.95, 0.13, 0.26, 0.012, -0.45
KPF, KRF = 0.0048, 0.0048 / P * R  # its front is the same plain weave, finer: a small thing is woven fine
KEY_AIM = 0.04  # how far up its own length the camera aims, so the sleeve and the clasp are framed together
KX, KY = KEY_X - KEY_AIM * math.sin(KEY_TURN), KEY_AIM * math.cos(KEY_TURN)

# (frame, target x, y, z, view height, pitch, yaw, f-stop): macro and oblique on the yarn, square-on for the cloth,
# then the bag, and a travelling shot down onto the keychain. Targets sit on the surface in focus, not the object's
# axis. Key 100 keeps its view height and yaw: they set the curve's slope at 89, so the frames before it are unchanged.
CAM = [(0, MX, -0.256, 0.20, 0.075, 2, 30, 14), (16, MX, -0.256, 0.20, 0.10, 2, 28, 11), (30, MX - 0.01, -0.256, 0.20, 0.17, 3, 24, 6),
       (50, 0.06, -0.256, 0.19, 0.34, 4, 18, 3.4), (62, 0.04, -0.256, 0.21, 0.44, 4, 14, 3.0), (76, 0.0, -0.256, 0.34, 0.80, 3, 6, 2.4),
       (89, 0.0, -0.256, 0.42, 1.0, 3, 0, 2.4), (100, 0.0, -0.20, 0.40, 1.06, 5, -6, 2.4), (109, -0.02, -0.15, 0.37, 1.08, 7, -12, 2.8),
       (129, -0.015, -0.15, 0.37, 1.06, 8, -5, 2.8), (140, KX - 0.02, KY - 0.03, 0.016, 0.44, 46, 10, 8), (149, KX - 0.015, KY - 0.03, 0.016, 0.41, 50, 4, 8)]
DRAPE = (89, 103)  # the cloth's flight from the loom into the bag
RISE = (89, 97)  # the bag comes up out of the ground behind it
WEAVE_ROUND = (99, 105)  # the band weaves round from where the cloth landed
HANDLE = (103, 109)  # the handle is drawn over, left end to right


# ---- canvas, sewing, cord ---------------------------------------------------------------
def canvas_mat(name="Canvas", colour=CANVAS, axes="uv", pitch=0.007):
    """Canvas: a plain-weave relief at thread scale over broad soft wrinkles, matte with a little sheen. The threads
    run along the mesh's UVs in metres ("uv": round the bag and up it), or along the object's x and y ("flat": a
    piece lying in its xy plane). pitch: the canvas's thread, finer on a small thing seen close."""
    m = rig.mat(name, colour, rough=0.9, noise=(7, 0.07), bump=(5, 0.5, 0.012), **{"Sheen Weight": 0.5, "Sheen Roughness": 0.5})
    nt = m.node_tree
    N, L = nt.nodes.new, nt.links.new
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    soft = b.inputs["Normal"].links[0].from_socket
    sep = N("ShaderNodeSeparateXYZ")
    if axes == "uv":
        L(N("ShaderNodeUVMap").outputs[0], sep.inputs[0])
    else:
        L(N("ShaderNodeTexCoord").outputs["Object"], sep.inputs[0])

    def op(kind, a, bv=None):
        n = N("ShaderNodeMath")
        n.operation = kind
        for sock, v in zip(n.inputs, (a, bv)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            elif v is not None:
                L(v, sock)
        return n.outputs[0]

    k = 2 * math.pi / pitch
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value, bp.inputs["Distance"].default_value = 0.6, 0.0012 * pitch / 0.007
    L(op("MULTIPLY", op("SINE", op("MULTIPLY", sep.outputs[0], k)), op("SINE", op("MULTIPLY", sep.outputs[1], k))), bp.inputs["Height"])
    L(soft, bp.inputs["Normal"])
    L(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def stitches(Pl, Nl, gap=0.009, ln=0.006, r=0.0011):
    """Dashes of sewing thread along polyline Pl (M, 3) lying on a surface with normals Nl: verts (S, 4, 5, 3)."""
    Pl, Nl = np.asarray(Pl, float), rig.unit(np.broadcast_to(Nl, np.shape(Pl)))
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(Pl, axis=0), axis=1))])
    s = np.arange(gap / 2, cum[-1] - ln, gap)[:, None] + ln * np.linspace(0, 1, 4)[None, :]
    at = lambda A: np.stack([np.interp(s, cum, A[:, c]) for c in range(3)], -1)
    n = at(Nl)
    return rig.tube(at(Pl) + n * (r * np.array([0.2, 1.0, 1.0, 0.2]))[None, :, None], r, 4, n)


def ply(P, s, r, K, nref, twist, depth=0.2):
    """rig.tube's two-ply section round centreline P (M, 3), the turn of its plies fixed to arclength s along the
    cord's own path, so a cord that is drawn on does not crawl as it grows. r: scalar or (M,); nref: (3,) or (M, 3)."""
    P = np.asarray(P, float)
    t = rig.unit(np.gradient(P, axis=0))
    b = rig.unit(np.cross(t, np.broadcast_to(nref, P.shape)))
    n = np.cross(b, t)
    a = np.linspace(0, 2 * np.pi, K + 1)
    rr = np.broadcast_to(np.asarray(r, float), P.shape[:1])[:, None] * (1 - depth + depth * np.cos(2 * (a[None, :] - twist * np.asarray(s)[:, None])))
    return P[:, None, :] + rr[..., None] * (np.cos(a)[None, :, None] * n[:, None, :] + np.sin(a)[None, :, None] * b[:, None, :])


class Cord:
    """A plied cord along a fixed path (M, 3), evenly spaced: the cloth's finished edges. show(lo, hi) draws only the
    stretch between two arclengths along it, with domed ends, the rest gathered there with no radius."""

    def __init__(self, name, yarn, path, r, colour, nref=(0, 0, 1.0), parent=None):
        self.P, self.r, self.nref = np.asarray(path, float), r, np.asarray(nref, float)
        self.s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(self.P, axis=0), axis=1))])
        self.L, M = self.s[-1], len(self.P)
        self.ob = rig.mesh(name, np.zeros((M * 13, 3)), rig.grid_faces(M, 13), yarn, uv=rig.tube_uv(M, 12, self.L, 2.4 * r),
                           col=np.tile([*lin(colour), 1.0], (M * 13, 1)), parent=parent)
        self.show(0.0, self.L)

    def show(self, lo, hi):
        s = np.clip(self.s, lo, hi)
        at = lambda A: np.stack([np.interp(s, self.s, A[:, k]) for k in range(3)], -1)
        nref = self.nref if self.nref.ndim == 1 else at(self.nref)
        dome = 1.5 * self.r
        rr = self.r * np.sqrt((ss(0, dome, self.s - lo) if lo > 0 else 1.0) * (ss(0, dome, hi - self.s) if hi < self.L else 1.0))
        rig.set_co(self.ob, ply(at(self.P), self.s, rr, 12, nref, 2 * np.pi / (self.r * 9)))
        self.ob.hide_render = bool(hi - lo < 1e-4)


# ---- the Nối Bag ------------------------------------------------------------------------
_LIN = oval(BAND_A - OFF, BAND_B - OFF)  # the canvas under the band: the body is gathered up to it


def _profile(points, top):
    """A smooth curve through (t, value) points from the foot (t 0) to the seam (t 1), ending exactly on `top`."""
    t, v = np.array(points, float).T
    c = np.polyfit(t, v, min(4, len(t) - 1))
    return lambda x: np.polyval(c, x) + (top - np.polyval(c, 1.0)) * x ** 4


_HALF_W = _profile([(0, 0.975 * BAG_W / 2), (0.15, 0.995 * BAG_W / 2), (0.30, BAG_W / 2), (0.55, 0.985 * BAG_W / 2), (0.80, 0.95 * BAG_W / 2)],
                   BAND_A - OFF)
_HALF_D = _profile([(0, 0.92 * BAG_D / 2), (0.15, 0.985 * BAG_D / 2), (0.32, BAG_D / 2), (0.6, 0.95 * BAG_D / 2), (0.85, 0.83 * BAG_D / 2)],
                   BAND_B - OFF)
_POWER = _profile([(0, 2.6), (0.4, 2.3), (0.8, 2.5)], 3.0)


def wall(u, z):
    """Point on the bag's canvas (arrays broadcast): u round it, 0..1 from the front centre by the band's own
    arclength (so the pleats are even along the band), z up it. Below SEAM: a rounded foot, a full belly, and soft
    pleats gathered into the band, deepest under it and gone by the belly, none at the two ends where the handle is
    sewn. From SEAM to BAG_H it stands straight up behind the band, as its lining."""
    ph = np.interp(np.mod(u, 1.0) * _LIN[1], _LIN[2][1], _LIN[2][0])
    t = np.clip(z / SEAM, 0, 1)
    A, B, n = _HALF_W(t), _HALF_D(t), _POWER(t)
    foot = 0.84 + 0.16 * np.sqrt(1 - (1 - np.clip(z / 0.08, 0, 1)) ** 2)  # a soft round edge onto a flat base
    rho = (np.abs(np.sin(ph)) ** n + np.abs(np.cos(ph)) ** n) ** (-1 / n)
    x, y = A * foot * rho * np.sin(ph), -B * foot * rho * np.cos(ph)
    gx, gy = np.sign(x) * np.abs(x / A) ** (n - 1) / A, np.sign(y) * np.abs(y / B) ** (n - 1) / B  # the plan's normal
    k = np.maximum(np.hypot(gx, gy), 1e-9)
    v = 16 * u + 0.25 * np.sin(2 * np.pi * 5 * u + 0.7) + 0.12 * np.sin(2 * np.pi * 3 * u + 1.3) * (1 - t)  # 16 round, uneven
    g = 0.5 + 0.5 * np.cos(2 * np.pi * v)
    deep = 1 + 0.3 * np.sin(2 * np.pi * 4 * u + 0.8) + 0.15 * np.sin(2 * np.pi * 7 * u + 2.1)  # no two alike
    amp = 0.02 * ss(0.3, 0.93, t) ** 1.2 * np.sqrt(ss(1.0, 0.965, t)) * np.abs(np.cos(ph)) ** 0.8 * deep  # gone by the belly
    d = amp * (g ** 0.45 - 0.6) + 0.003 * np.sin(2 * np.pi * 5 * u + 3 * t) * np.sin(np.pi * t)  # crests round, folds sharp
    return np.stack(np.broadcast_arrays(x + d * gx / k, y + d * gy / k, z), -1)


def wall_normal(u, z, e=1e-4):
    du, dz = wall(u + e, z) - wall(u - e, z), wall(u, z + e) - wall(u, z - e)
    return rig.unit(np.cross(du, dz))


def body(m, root):
    """The bag's canvas in one piece: a flat base closed in two rings, the wall, and its lining up to the rim."""
    C = 385
    u = np.linspace(0.5, 1.5, C)  # the mesh's seam, and the relief's, at the back
    z = np.concatenate([SEAM * (0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 1, 76))), np.linspace(SEAM, BAG_H, 7)[1:]])
    w = wall(u[None, :], z[:, None])
    base = w[0] * [0.5, 0.5, 1.0]
    rows = np.concatenate([np.zeros((1, C, 3)), base[None], w])
    round_ = np.concatenate([np.zeros((len(rows), 1)), np.cumsum(np.linalg.norm(np.diff(rows, axis=1), axis=2), axis=1)], 1)  # metres round each row
    up = np.concatenate([[-0.2, -0.1], z])  # and up the wall (the base, unseen, below it)
    uv = np.stack([round_, np.broadcast_to(up[:, None], round_.shape)], -1).reshape(-1, 2)
    ob = rig.mesh("BagBody", rows.reshape(-1, 3), rig.grid_faces(len(z) + 2, C), m, uv=uv, parent=root)
    ob.modifiers.new("Weld", "WELD").merge_threshold = 1e-5  # close the seam so shading runs across it
    sol = ob.modifiers.new("Solidify", "SOLIDIFY")
    sol.thickness, sol.offset = 0.004, -1
    return ob


class Band:
    """The band round the mouth: a ring of the plain-weave cloth on the canvas, a plied cord along each edge.
    show(k): k of it, woven round from the front centre both ways (0 none, 1 the whole ring)."""

    def __init__(self, yarn, root, **cloth):
        self.at, self.L, _ = oval(BAND_A, BAND_B)
        self.half = BAND_NF * PF / 2
        self.cloth = rig.Cloth("Band", BAND_NW, BAND_NF, PF, RF, yarn, WARP_COL, WEFT_COL, rings=(48, 1000),
                               accents={BAND_MINT: T["stem-mint"]}, parent=root, **cloth)
        self.sw0 = np.tile(np.linspace(-self.half - 0.003, self.half + 0.003, 48), (BAND_NW, 1))
        self.sf0 = np.tile(np.linspace(-self.L / 2, self.L / 2, 1000), (BAND_NF, 1))
        self.ai = (np.arange(BAND_NW) - (BAND_NW - 1) / 2) * PF
        x, y, nx, ny = self.at(np.linspace(-self.L / 2, self.L / 2, 1400))
        self.cords = [Cord(f"BandCord{i}", yarn, np.stack([x + nx * 0.001, y + ny * 0.001, np.full_like(x, z)], -1), 0.0042, CORD, parent=root)
                      for i, z in enumerate((ZB - self.half - 0.005, ZB + self.half + 0.005))]
        self.show(1.0)

    def place(self, Q):
        x, y, nx, ny = self.at(Q[..., 0])
        h = Q[..., 2]
        return np.stack([x + nx * h, y + ny * h, ZB + Q[..., 1]], -1), np.stack([nx, ny, np.zeros_like(nx)], -1)

    def show(self, k):
        go = k * (self.L / 2 + 0.1)  # how far round each way the leading pick has got
        lim = (go - 0.01 * np.arange(BAND_NF))[:, None]  # each pick a little behind the one under it
        sf = np.clip(self.sf0, -lim, lim)
        rf = ss(0, 0.6 * RF, lim - np.abs(self.sf0))
        rw = np.broadcast_to(ss(0, 2 * PF, go - 0.01 * BAND_NF - np.abs(self.ai))[:, None], self.sw0.shape)  # warps once the picks cross them
        self.cloth.update(self.sw0, sf, self.place, None, rw, rf)
        for ob in self.cloth.obs:
            ob.hide_render = bool(k <= 0)
        for c in self.cords:
            c.show(c.L / 2 - (go - 0.005), c.L / 2 + (go - 0.005))


def strap_path(n=700, lean=0.38):
    """The handle's centreline, left end to right: flat on the band's end, up off the rim, over the mouth along its
    length and down onto the other end; evenly spaced. Returns points, the face's outward normal, the direction across
    the strap, and the length."""
    xe = BAND_A + 2 * RF + 0.0003 + STRAP_TH / 2  # on the band's yarns at its end
    z0 = SEAM - 0.004
    th = np.linspace(np.pi, 0, 240)
    e = 2 / 2.3  # a squarer shoulder and a flatter crown than an ellipse: a soft strap of cloth, not a hoop
    arch = np.stack([xe * np.sign(np.cos(th)) * np.abs(np.cos(th)) ** e, 0 * th, BAG_H + ARCH * np.abs(np.sin(th)) ** e], -1)
    leg = np.linspace(z0, BAG_H, 40)[:-1]
    c = np.vstack([np.stack([np.full_like(leg, -xe), 0 * leg, leg], -1), arch, np.stack([np.full_like(leg, xe), 0 * leg, leg[::-1]], -1)])
    # off the rim it falls a little towards the front, as a soft handle does, and shows the camera its face
    h = np.maximum(c[:, 2] - BAG_H, 0)
    al = lean * ss(0, 0.08, h)
    c = np.stack([c[:, 0], -h * np.sin(al), np.where(h > 0, BAG_H + h * np.cos(al), c[:, 2])], -1)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(c, axis=0), axis=1))])
    c = rig.resample(c, np.linspace(0, s[-1], n))
    al = lean * ss(0, 0.08, np.hypot(c[:, 1], np.maximum(c[:, 2] - BAG_H, 0)))
    t = rig.unit(np.gradient(c, axis=0))
    nn = rig.unit(np.cross(t, np.stack([0 * al, np.cos(al), np.sin(al)], -1)))  # out of the arch, in its leaning plane
    return c, nn, rig.unit(np.cross(nn, t)), s[-1]


class Strap:
    """The handle: a canvas core, the cloth on its outer face, a plied cord along each edge, the two ends sewn to the
    band's ends with a box and a cross. show(k): drawn over from the left end to the right, k 0..1."""

    def __init__(self, yarn, m, root, **cloth):
        self.c, self.n, self.w, self.L = strap_path()
        self.s = np.linspace(0, self.L, len(self.c))
        self.cw = STRAP_NW * PF  # the cloth's width
        self.ws = self.cw + 0.004  # the core's
        self.nf = int(round(self.L / PF))
        self.cloth = rig.Cloth("Strap", STRAP_NW, self.nf, PF, RF, yarn, WARP_COL, WEFT_COL, rings=(int(self.L / (PF / 5)), 36), parent=root, **cloth)
        self.sw0 = np.tile(np.linspace(-self.L / 2, self.L / 2, int(self.L / (PF / 5))), (STRAP_NW, 1))
        self.sf0 = np.tile(np.linspace(-self.cw / 2 - 0.002, self.cw / 2 + 0.002, 36), (self.nf, 1))
        self.bj = (np.arange(self.nf) - (self.nf - 1) / 2) * PF
        self.core = rig.mesh("StrapCore", np.zeros((len(self.c) * 13, 3)), rig.grid_faces(len(self.c), 13), m, parent=root,
                             uv=np.stack(np.meshgrid(np.linspace(0, 2 * self.ws, 13), self.s), -1).reshape(-1, 2)[:, ::-1])
        self.cords = [Cord(f"StrapCord{i}", yarn, self.c + self.w * side * (self.ws / 2 - 0.0008) + self.n * (STRAP_TH / 2 + 1.6 * RF), 0.0045, CORD,
                           nref=self.n, parent=root) for i, side in enumerate((-1, 1))]
        # the box and cross that hold each end: on the cloth's face, over the band
        e, top = self.ws / 2 - 0.007, BAG_H - SEAM - 0.006
        face = lambda s, dx: self.frame(np.array(s))[0] + self.frame(np.array(s))[2] * dx + self.frame(np.array(s))[1] * (STRAP_TH / 2 + 4 * RF + 0.0008)
        thread = rig.mat("StrapThread", THREAD, rough=0.8, **{"Sheen Weight": 0.4})
        self.boxes = []
        for i, (s0, s1) in enumerate(((0.010, top), (self.L - top, self.L - 0.010))):
            nrm = self.frame(np.array(s0))[1]
            sv = [stitches(np.linspace(face(sa, da), face(sb, db), 10), nrm, gap=0.007, ln=0.005)
                  for (sa, da), (sb, db) in (((s0, -e), (s0, e)), ((s1, -e), (s1, e)), ((s0, -e), (s1, -e)), ((s0, e), (s1, e)),
                                             ((s0, -e), (s1, e)), ((s0, e), (s1, -e)))]
            sv = np.concatenate([v.reshape(-1, 4, 5, 3) for v in sv])
            self.boxes.append(rig.mesh(f"StrapBox{i}", sv, rig.grid_faces(4, 5, len(sv)), thread, parent=root))
        self.show(1.0)

    def frame(self, s):
        """Point, outward normal and across-direction at arclengths s (any shape)."""
        at = lambda A: np.stack([np.interp(s, self.s, A[:, k]) for k in range(3)], -1)
        return at(self.c), rig.unit(at(self.n)), rig.unit(at(self.w))

    def place(self, Q):
        c, n, w = self.frame(Q[..., 1] + self.L / 2)
        return c + w * Q[..., 0:1] + n * (STRAP_TH / 2 + 2 * RF + 0.0003 + Q[..., 2:3]), n

    def show(self, k):
        tip = k * (self.L + self.ws)  # the growing end; past the far end once done, so nothing tapers there
        blunt = 0.6 * RF
        rw = ss(0, blunt, tip - self.L / 2 - self.sw0) * ss(0, blunt, self.L / 2 - np.abs(self.sw0))
        rf = ss(0, PF, tip - self.L / 2 - self.bj)[:, None] * ss(0, blunt, self.cw / 2 + 0.002 - np.abs(self.sf0))
        self.cloth.update(np.minimum(self.sw0, tip - self.L / 2), self.sf0, self.place, None, rw, rf)
        c, n, w = self.frame(np.minimum(self.s, tip))
        end = np.sqrt(ss(0, self.ws / 2, tip - self.s))[:, None]  # a round end where it is growing
        a = np.linspace(0, 2 * np.pi, 13)
        sq = lambda q: np.sign(q) * np.abs(q) ** 0.3  # a flat section with rounded edges
        rig.set_co(self.core, c[:, None] + w[:, None] * (self.ws / 2 * end * sq(np.cos(a))[None])[..., None]
                   + n[:, None] * (STRAP_TH / 2 * end * sq(np.sin(a))[None])[..., None])
        for c_ in self.cords:
            c_.show(0.0, tip - 0.006)
        for ob in (*self.cloth.obs, self.core):
            ob.hide_render = bool(k <= 0)
        self.boxes[0].hide_render, self.boxes[1].hide_render = bool(tip < 0.08), bool(tip < self.L)


def noi_bag(yarn, at=(0.0, 0.0), **cloth):
    """The Nối Bag standing at `at`, after GIEO's photographs: wider than tall, deep, a rounded foot, the canvas
    gathered into soft pleats under a straight band of the plain-weave cloth that makes the oval mouth, and one handle
    of the same cloth arching over it from end to end. cloth: rig.Cloth options (K, ply) for a closer view than the
    film's. Built whole; returns root, band, strap, so the film can weave the band round and draw the handle on."""
    m = canvas_mat()
    root = rig.empty("Bag", loc=(at[0], at[1], 0))
    body(m, root)
    band = Band(yarn, root, **cloth)
    strap = Strap(yarn, m, root, **cloth)
    # a row of stitching along the canvas just under the band, over the pleats (it starts and ends at the back)
    u = np.linspace(0.5, 1.5, 1400)
    zs = SEAM - 0.011
    sv = stitches(wall(u, zs), wall_normal(u, zs))
    rig.mesh("BagStitching", sv, rig.grid_faces(4, 5, len(sv)), rig.mat("Thread", THREAD, rough=0.8, **{"Sheen Weight": 0.4}), parent=root)
    return types.SimpleNamespace(root=root, band=band, strap=strap)


# The cloth's flight: up off the loom and back over the bag as it rises, then down into its mouth, where the walls
# hide it; the band weaves round from where it went in. (share of the flight, centre y, centre z, size)
FLIGHT = [(0.0, LOOM[1], LOOM[2], 1.0), (0.55, 0.0, 0.67, 0.42), (1.0, 0.0, 0.22, 0.40)]


def panel_place(tau):
    """Where the cloth is: flat on the loom plane at tau 0; flying up and back, billowing and shrinking, until it hangs
    over the bag's mouth; then it drops in, and at 1 all of it is below the rim, out of sight."""
    tau = min(1.0, max(0.0, tau))
    e, fl = smoother(tau), math.sin(math.pi * tau)
    cy, cz, s = track(FLIGHT, e)
    c = np.array([0.0, cy, cz])
    ang = 0.32 * fl
    up, n = np.array([0, -math.sin(ang), math.cos(ang)]), np.array([0, -math.cos(ang), -math.sin(ang)])

    def place(Q):
        a, b, h = Q[..., 0], Q[..., 1], Q[..., 2]
        off = s * fl * (0.05 * (np.cos(np.pi * b / SIZE) - 0.55) + 0.012 * np.sin(3 * np.pi * (a / SIZE + 0.5) - 9 * tau))
        return c + a[..., None] * s * np.array([1.0, 0, 0]) + b[..., None] * s * up + (h * s + off)[..., None] * n, n
    return place, s


# ---- the Nếp Keychain -------------------------------------------------------------------
def rounded_rect(hw, hl, rc, m):
    """m points evenly spaced round a rectangle of half sizes hw, hl with corners of radius rc, anticlockwise from the
    middle of its lower edge, and their outward normals."""
    pts = [(0.0, -hl)]
    for (cx, cy), a0 in (((hw - rc, -hl + rc), -np.pi / 2), ((hw - rc, hl - rc), 0.0), ((-hw + rc, hl - rc), np.pi / 2), ((-hw + rc, -hl + rc), np.pi)):
        a = np.linspace(a0, a0 + np.pi / 2, 48)
        pts += list(zip(cx + rc * np.cos(a), cy + rc * np.sin(a)))
    P = np.array(pts + [(0.0, -hl)])
    cum = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
    s = np.linspace(0, cum[-1], m, endpoint=False)
    Q = np.stack([np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1])], -1)
    t = np.roll(Q, -1, 0) - np.roll(Q, 1, 0)
    return Q, rig.unit(np.stack([t[:, 1], -t[:, 0]], -1))


def key_dome(x, y):
    """How far the keychain's front swells above its edges: a little, in the middle."""
    hw, hl = KEY_W / 2 - KEY_T / 2, KEY_L / 2 - KEY_T / 2
    r = (np.abs(x / hw) ** 6 + np.abs(y / hl) ** 6) ** (1 / 6)
    return 0.004 * (1 - np.clip(r, 0, 1) ** 2) ** 2


def lipstick_holder(yarn, at=(KEY_X, 0.0), turn=KEY_TURN, lean=None, **cloth):
    """The Nếp Keychain, after GIEO's photographs: a flat sleeve about twice as tall as wide with the plain-weave cloth
    on its front and canvas behind; a canvas flap folded over the top with its lower edge rounded, over the top third;
    a wooden four-hole button just under it, held by a cord loop from under the flap; a canvas tab out of the top
    through the eye of a brass lobster clasp. Lies on its back at `at`, its top turned `turn` from +y; or, with `lean`
    (radians), stands on its lower edge leaning back that far. Local axes: x across, y up it, z out of the front.
    cloth: rig.Cloth options, as for noi_bag(). Returns its root."""
    W, L, Tk = KEY_W, KEY_L, KEY_T
    hw, hl = W / 2 - Tk / 2, L / 2 - Tk / 2
    root = rig.empty("Keychain", loc=(at[0], at[1], 0))
    if lean is None:
        root.rotation_euler = (0, 0, turn)
    else:
        b = math.pi / 2 - lean
        root.rotation_euler = (b, 0, turn)
        root.location.z = hl * math.sin(b) - Tk / 2 * math.cos(b) + Tk / 2
    m = canvas_mat("KeyCanvas", axes="flat", pitch=0.003)
    brass = rig.mat("Brass", BRASS, rough=0.26, **{"Metallic": 1.0})
    yarn_col = lambda n, colour: np.tile([*lin(colour), 1.0], (n, 1))

    # the sleeve: flat on its back, its edge a half round all the way round, its front swelling a little
    ring, nrm = rounded_rect(hw, hl, 0.006, 200)
    ring, nrm = np.vstack([ring, ring[:1]]), np.vstack([nrm, nrm[:1]])
    rows = [np.c_[ring * s, np.zeros(len(ring))] for s in np.linspace(0, 1, 12)]
    rows += [np.c_[ring + nrm * Tk / 2 * math.cos(p), np.full(len(ring), Tk / 2 + Tk / 2 * math.sin(p))] for p in np.linspace(-np.pi / 2, np.pi / 2, 15)[1:]]
    rows += [np.c_[ring * s, Tk + key_dome(ring[:, 0] * s, ring[:, 1] * s)] for s in np.linspace(1, 0, 12)[1:]]
    sleeve = rig.mesh("KeySleeve", np.stack(rows).reshape(-1, 3), rig.grid_faces(len(rows), len(ring)), m, parent=root)
    sleeve.modifiers.new("Weld", "WELD").merge_threshold = 1e-5

    # the front: the same fine plain weave, its cut edges under a cord of the canvas's colour along the seam
    def front(x, y):
        e = 1e-4
        gx = (key_dome(x + e, y) - key_dome(x - e, y)) / (2 * e)
        gy = (key_dome(x, y + e) - key_dome(x, y - e)) / (2 * e)
        return np.stack([x, y, Tk + key_dome(x, y)], -1), rig.unit(np.stack([-gx, -gy, np.ones_like(x)], -1))

    def place(Q):
        p, n = front(Q[..., 0], Q[..., 1])
        return p + n * (2 * KRF + Q[..., 2:3]), n
    nwk, nfk = int(2 * hw / KPF), int(2 * hl / KPF)
    nw_r, nf_r = int(2 * hl / (KPF / 5)), int(2 * hw / (KPF / 5))  # rings a fifth of a pitch apart, as the yarn's twist expects
    top = rig.Cloth("KeyCloth", nwk, nfk, KPF, KRF, rig.yarn_mat("YarnKey", plies=3, r=KRF), WARP_COL, WEFT_COL, rings=(nw_r, nf_r),
                    accents={int(nwk * 0.68): T["stem-mint"]}, parent=root, **cloth)
    sw, sf = np.tile(np.linspace(-hl, hl, nw_r), (nwk, 1)), np.tile(np.linspace(-hw, hw, nf_r), (nfk, 1))
    top.update(sw, sf, place, rw=ss(0, 0.6 * KRF, hl - np.abs(sw)), rf=ss(0, 0.6 * KRF, hw - np.abs(sf)))
    Cord("KeyPiping", yarn, np.c_[ring + nrm * 0.001, np.full(len(ring), Tk + 0.0024)], 0.0037, CANVAS, parent=root)

    # the flap: canvas over the top third, its lower edge round, folded over the top onto the back
    hwf, yc, eh, lift = hw + 0.004, hl - 0.040, 0.047, 4 * KRF + 0.0026
    rf_ = Tk / 2 + lift
    cols = []
    for x in np.linspace(-hwf, hwf, 41):
        ys = np.linspace(yc - eh * math.sqrt(max(0.0, 1 - (x / hwf) ** 2)), hl, 24)
        th = np.linspace(np.pi / 2, -np.pi / 2, 17)[1:]
        cols.append(np.vstack([np.stack([np.full(24, x), ys, Tk + key_dome(x, ys) + lift], -1),
                               np.stack([np.full(16, x), hl + rf_ * np.cos(th), Tk / 2 + rf_ * np.sin(th)], -1)]))
    flap = rig.mesh("KeyFlap", np.stack(cols, 1).reshape(-1, 3), rig.grid_faces(40, 41), m, parent=root)
    so = flap.modifiers.new("Solidify", "SOLIDIFY")
    so.thickness, so.offset = 0.004, 0.0
    rig.subsurf(flap, 1)
    e_ = 0.0048  # its topstitching, just inside the edge
    th = np.linspace(np.pi, 2 * np.pi, 60)
    side = np.stack([np.full(12, -(hwf - e_)), np.linspace(hl - 0.002, yc, 12)], -1)
    line = np.vstack([side, np.stack([(hwf - e_) * np.cos(th), yc + (eh - e_) * np.sin(th)], -1), side[::-1] * [-1, 1]])
    sew = [stitches(np.c_[line, Tk + key_dome(line[:, 0], line[:, 1]) + lift + 0.0022], (0, 0, 1.0), gap=0.0065, ln=0.0045, r=0.0008)]

    # the button, under the flap's lowest point, and the cord loop that holds it
    yb = yc - eh - 0.0150
    zc = Tk + key_dome(0.0, yb) + 4 * KRF  # the cloth's top there
    wood = rig.mat("Button", WOOD, rough=0.55, noise=(90, 0.25), bump=(160, 0.3, 0.0006))
    v, f = rig.lathe([(0, 0.0027), (0.0062, 0.0030), (0.0103, 0.0040), (0.0126, 0.0042), (0.0137, 0.0029), (0.0132, 0.0004), (0.0118, 0), (0, 0)], 48)
    rig.subsurf(rig.mesh("KeyButton", v + [0, yb, zc], f, wood, parent=root), 1)
    holes = [(0.0038 * math.cos(a), yb + 0.0038 * math.sin(a)) for a in np.pi / 4 + np.pi / 2 * np.arange(4)]
    v, f = rig.lathe([(0, 0.0030), (0.0012, 0.0030), (0.0012, 0.0024), (0, 0.0024)], 16)
    rig.mesh("KeyButtonHoles", np.vstack([v + [hx, hy, zc] for hx, hy in holes]), np.vstack([f + i * len(v) for i in range(4)]),
             rig.mat("ButtonHole", mix(T["ink"], WOOD, 0.25), rough=0.9), parent=root)
    thread = rig.yarn_mat("KeyThread", plies=2, r=0.0007)
    for i, (j, k) in enumerate(((0, 2), (1, 3))):  # sewn on with an X
        a_, b_ = np.array([*holes[j], zc + 0.0030]), np.array([*holes[k], zc + 0.0030])
        c = a_ + (b_ - a_) * np.linspace(0, 1, 12)[:, None] + [0, 0, 0.0008] * np.sin(np.pi * np.linspace(0, 1, 12))[:, None]
        rig.mesh(f"KeyButtonThread{i}", rig.tube(c, 0.0007, 6, (0, 0, 1.0)), rig.grid_faces(12, 7), thread,
                 uv=rig.tube_uv(12, 6, rig.arclen(c), 0.0017), col=yarn_col(12 * 7, THREAD), parent=root)
    y0 = yc - eh  # the flap's lowest point
    zl = zc + 0.0016
    loop = rig.catmull([(-0.0032, y0 + 0.008, Tk + lift - 0.001), (-0.0045, y0 - 0.002, zl), (-0.0110, yb + 0.004, zl), (-0.0151, yb - 0.005, zl),
                        (-0.0082, yb - 0.0146, zl), (0.0, yb - 0.0163, zl), (0.0082, yb - 0.0146, zl), (0.0151, yb - 0.005, zl), (0.0110, yb + 0.004, zl),
                        (0.0045, y0 - 0.002, zl), (0.0032, y0 + 0.008, Tk + lift - 0.001)], 10)
    rig.mesh("KeyLoop", rig.tube(loop, 0.0015, 8, (0, 0, 1.0), lobes=2, twist=2 * np.pi / (0.0015 * 9), depth=0.2), rig.grid_faces(len(loop), 9), yarn,
             uv=rig.tube_uv(len(loop), 8, rig.arclen(loop), 2.4 * 0.0015), col=yarn_col(len(loop) * 9, THREAD), parent=root)

    # the tab: two layers of canvas out of the top seam, round where it turns. Lying, it runs on down onto the ground
    # and the clasp lies beyond it; standing, it flops forward over the top and the clasp lies on the flap.
    xt, wt, tt = 0.024, 0.024, 0.0055
    if lean is None:
        go, z0 = 1.0, 0.0  # the way the clasp runs (local y), and the surface it lies on
        key = [(xt, hl - 0.010, Tk / 2), (xt, hl + rf_ + 0.002, Tk / 2 - 0.0005), (xt, hl + 0.042, 0.0046), (xt, hl + 0.056, tt / 2 + 0.0004),
               (xt, hl + 0.066, tt / 2 + 0.0004)]
    else:
        go, z0 = -1.0, Tk + lift + 0.0022
        key = [(xt, hl - 0.010, Tk / 2), (xt, hl + rf_ + 0.003, Tk / 2 + 0.002), (xt, hl + rf_ + 0.007, z0 + 0.010), (xt, hl + rf_ - 0.004, z0 + 0.017),
               (xt, hl + 0.004, z0 + tt / 2 + 0.006), (xt, hl - 0.010, z0 + tt / 2 + 0.0006), (xt, hl - 0.016, z0 + tt / 2 + 0.0005)]
    key = rig.catmull(key, 12)
    sk = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(key, axis=0), axis=1))])
    c = rig.resample(key, np.linspace(0, sk[-1], 80))
    s = np.linspace(0, sk[-1], 80)
    tg = rig.unit(np.gradient(c, axis=0))
    wv = np.tile([1.0, 0, 0], (80, 1))
    nv = rig.unit(np.cross(wv, tg))
    end = np.sqrt(np.clip(1 - ((s - (sk[-1] - wt / 2)) / (wt / 2)).clip(0, None) ** 2, 0, 1))[:, None]  # a half round in plan
    a = np.linspace(0, 2 * np.pi, 13)
    sq = lambda q: np.sign(q) * np.abs(q) ** 0.3
    rig.mesh("KeyTab", c[:, None] + wv[:, None] * (wt / 2 * end * sq(np.cos(a))[None])[..., None] + nv[:, None] * (tt / 2 * np.sqrt(end) * sq(np.sin(a))[None])[..., None],
             rig.grid_faces(80, 13), m, parent=root)
    tip = c[-1]

    # the clasp: an eye through the tab's turn, a swivel, and the lobster claw, lying on their side
    Y = lambda d: tip[1] + go * d  # local y, d along the clasp from the tab's tip
    a = np.linspace(0, 2 * np.pi, 49)
    eye = np.stack([xt + 0.0080 * np.cos(a), Y(0.004) + 0.0088 * np.sin(a), z0 + 0.0034 + 0.0012 * np.sin(a)], -1)
    rig.mesh("ClaspEye", rig.tube(eye, 0.0017, 10, (0, 0, 1.0)), rig.grid_faces(49, 11), brass, parent=root)
    v, f = rig.lathe([(0, 0), (0.0022, 0), (0.0030, 0.0015), (0.0030, 0.0055), (0.0044, 0.0062), (0.0044, 0.0078), (0.0034, 0.0086), (0, 0.0086)], 20)
    d1 = 0.004 + 0.0088 + 0.0010
    rig.subsurf(rig.mesh("ClaspSwivel", np.stack([xt + v[:, 0], Y(d1 + v[:, 2]), z0 + 0.0044 + v[:, 1]], -1), f, brass, parent=root), 1)
    d2 = d1 + 0.0086
    th = np.linspace(0, 2 * np.pi, 97)
    claw = np.stack([xt + 0.0150 * np.sin(th) * (0.45 + 0.275 * (1 - np.cos(th))), Y(d2 + 0.0445 * (1 - np.cos(th)) / 2), np.zeros_like(th)], -1)
    rr = 0.0030 + 0.0009 * np.sin(th)  # the back is the thick side, the gate the thin one
    v = rig.tube(claw, rr, 14, (0, 0, 1.0))
    v[..., 2] = 0.8 * v[..., 2] + z0 + 0.0038  # a little flat, lying on its side
    rig.mesh("ClaspClaw", v, rig.grid_faces(97, 15), brass, parent=root)
    nub = np.linspace([xt + 0.0060, Y(d2 + 0.0075), z0 + 0.0038], [xt + 0.0108, Y(d2 + 0.0090), z0 + 0.0038], 8)
    rig.subsurf(rig.mesh("ClaspTrigger", rig.tube(nub, 0.0021 * np.sqrt(ss(0, 0.002, 0.0055 - np.linalg.norm(nub - nub[0], axis=1)) + 0.3), 8, (0, 0, 1.0)),
                         rig.grid_faces(8, 9), brass, parent=root), 1)

    sv = np.concatenate([s_.reshape(-1, 4, 5, 3) for s_ in sew])
    rig.mesh("KeyStitching", sv, rig.grid_faces(4, 5, len(sv)), rig.mat("KeyStitch", THREAD, rough=0.8, **{"Sheen Weight": 0.4}), parent=root)
    return root


def main():
    a = rig.parse(SETS)
    rig.setup(a, mix(T["plum-ink"], T["cream"], 0.4), 0.2)
    rng = np.random.default_rng(11)
    rig.catcher(0.0, T["plum-ink"])
    rig.lights((0.8, -0.1, 0.3), 1.7, key=0.95, fill=0.7, rim=1.5)
    cam = rig.camera(60)
    yarn, fine = rig.yarn_mat("Yarn", plies=3, r=R), rig.yarn_mat("YarnFine", plies=3, r=RF)
    cloth = rig.Cloth("Panel", NW, NF, P, R, yarn, WARP_COL, WEFT_COL, rings=(300, 250), K=18, accents={MINT: T["stem-mint"]}, ply=(3, 0.09))
    bag = noi_bag(fine)
    lipstick_holder(fine)

    sw0 = np.linspace(-FRINGE, TAIL, 300)  # warp rings, evenly spaced so the ply twist is even
    sf0 = np.linspace(-SIZE / 2 - 0.004, SIZE / 2 + 0.004, 250)
    ai = (np.arange(NW) - (NW - 1) / 2) * P

    # stray fibres, in cloth coordinates so they travel with the cloth: a soft halo on the warps the macro sees, and a
    # little fray at every cut end. A fibre shows once its warp's tip has passed its root.
    fv, froot, fyarn, fcol = [], [], [], []
    for i in range(NW):
        colour = [*lin(mix(T["stem-mint"] if i == MINT else WARP_COL, T["cream"], 0.25)), 1.0]
        lines = [(np.linspace(-FRINGE + 0.012, -FRINGE + 0.001, 8), 1600, 1.3)]  # the fray, leaning past the cut
        if abs(i - MINT) <= 8:
            lines.append((np.linspace(-FRINGE, 0.12 if i == MINT else -0.03, 60), 900 if i == MINT else 350, 1.0))
        for b, per_len, length in lines:
            v, _ = rig.fuzz(np.stack([np.full_like(b, ai[i]), b, np.zeros_like(b)], -1), R, per_len, rng, length=length, thick=0.03, curl=0.8)
            fv.append(v)
            froot.append(v[:, 0].mean(1)[:, 1])
            fyarn.append(np.full(len(v), i))
            fcol.append(np.tile(colour, (v.shape[0] * 20, 1)))
    fv, froot, fyarn = np.concatenate(fv), np.concatenate(froot), np.concatenate(fyarn)
    fuzz = rig.mesh("Fuzz", fv, rig.grid_faces(5, 4, len(fv)), rig.mat("FuzzMat", vcol=True, rough=1.0, **{"Sheen Weight": 1.0}), col=np.vstack(fcol))
    blunt = 0.6 * R  # cut ends are domed, not pointed

    def pose(f, sid, aspect):
        tx, ty, tz, H, pitch, yaw, fstop = track(CAM, f)
        tb = tz - LOOM[2]  # the camera target in cloth coordinates
        # warps: the mint thread comes first (it is in frame at 0), the rest are strung outward from it
        start = 30 + 14 * (np.abs(np.arange(NW) - MINT) / MINT) ** 0.8
        e = ss(0, 5, f - start)
        tip = np.where(e > 0, lerp(tb + 0.7 * H, -FRINGE, e), 2.0)
        tip[MINT] = lerp(tb - 0.2 * 0.075, -FRINGE, float(ss(0, 18, f)))
        top = lerp(TAIL, FRINGE, float(ss(80, 88, f)))
        sw = np.clip(sw0[None, :], tip[:, None], top)
        rw = ss(0, blunt, sw - tip[:, None]) * ss(0, blunt, top - sw) * (e > 0)[:, None]
        rw[MINT] = ss(0, blunt, sw[MINT] - tip[MINT]) * ss(0, blunt, top - sw[MINT])
        # wefts: the fell climbs row by row, each pick shot from alternate sides
        F = (NF + 3) * min(1.0, max(0.0, (f - 50) / 36)) ** 1.7
        ej = np.clip((F - np.arange(NF)) / 3, 0, 1)
        front = ej * (SIZE + 0.02)  # how far each pick has travelled
        from_left = (np.arange(NF) % 2 == 0)[:, None]
        dist = np.where(from_left, sf0[None, :] + SIZE / 2 + 0.004, SIZE / 2 + 0.004 - sf0[None, :])
        sf = np.where(from_left, np.minimum(sf0[None, :], -SIZE / 2 - 0.004 + front[:, None]), np.maximum(sf0[None, :], SIZE / 2 + 0.004 - front[:, None]))
        rf = ss(0, blunt, front[:, None] - dist) * ss(0, blunt, dist) * (ej > 0)[:, None]
        wd = np.where(from_left.T, ai[:, None] + SIZE / 2, SIZE / 2 - ai[:, None])  # (warps, picks): distance the pick must go
        reach = ss(0.0, 2 * P, front[None, :] - wd)
        place, s = panel_place((f - DRAPE[0]) / (DRAPE[1] - DRAPE[0]))
        cloth.update(sw, sf, place, reach, rw, rf, s)
        shown = froot > tip[fyarn]
        rig.set_co(fuzz, place(np.where(shown[:, None, None, None], fv, fv[:, :1, :1, :]))[0])
        for ob in (*cloth.obs, fuzz):  # it has gone into the bag
            ob.hide_render = f >= DRAPE[1]
        # the bag comes up out of the ground behind the flying cloth (the catcher hides what is still below it); the
        # band weaves round from where the cloth landed, then the handle is drawn over
        bag.root.location.z = lerp(-1.0, 0.0, float(ss(*RISE, f)))
        for ob in bag.root.children:
            ob.hide_render = f < 89
        bag.band.show(smoother((f - WEAVE_ROUND[0]) / (WEAVE_ROUND[1] - WEAVE_ROUND[0])))
        bag.strap.show(smoother((f - HANDLE[0]) / (HANDLE[1] - HANDLE[0])))
        # as the camera leaves it for the keychain, the bag steps aside (once it is out of frame): the shadow it throws
        # to the right would otherwise lie beside the keychain as a dark band with nothing in frame to explain it
        bag.root.location.x = -1.2 * smoother((f - 135) / 7)
        rig.frame_cam(cam, aspect, (tx, ty, tz), H, pitch, yaw, fstop=fstop)

    rig.render(a, "weave", SETS, FRAMES, pose)


if __name__ == "__main__":
    main()
