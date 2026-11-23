"""Film `weave` (07-redesign §4): close on yarn; warps are strung, wefts interlace into plain-weave cloth, the camera
pulls back, the cloth drapes onto a tote, then the camera travels to the mug and the coaster. Alpha, lit to sit on plum.
Beats (0-based frames): thread 0-30, warps 30-50, weave 50-89, drape 89-109, tote 109-129, mug 129-149, coaster 149-169.
Every cloth here is real yarn geometry in PLAIN WEAVE with one mint end (the seed's thread): no motif, no brocade
pattern, until GIEO sends a scan (07-redesign §1).

  blender -b --factory-startup -P blender/film/weave.py -- --quality draft|final [--frames ...] [--resume]
"""
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig  # noqa: E402
from rig import T, lerp, lin, mix, ss, track  # noqa: E402

SETS = {"s": (960, 960)}
FRAMES = 170
P, R = 0.015, 0.0062  # yarn pitch and radius
PF, RF = P / 2, R / 2  # the finer cloth on the mug and the coaster
NW = NF = 48
SIZE = NW * P  # 0.72 m of cloth
MINT = 31  # the warp that is the seed's thread
MX = (MINT - (NW - 1) / 2) * P
LOOM = np.array([0.0, -0.25, 0.40])  # cloth centre while it is woven
FRINGE = SIZE / 2 + 0.025
TAIL = 0.62  # how far up the warps hang from before they are cut
TOTE_W, TOTE_H, TOTE_D = 0.60, 0.62, 0.12
PANEL_Z = 0.28  # centre of the cloth once it is on the tote
MUG_X, MUG_R, MUG_H = 0.95, 0.118, 0.28
COASTER_X, COASTER_R = 1.75, 0.15
WARP_COL, WEFT_COL = mix(T["peach-glow"], T["cream"], 0.3), mix(T["petal-soft"], T["cream"], 0.25)
CANVAS = tuple(c * 0.9 for c in mix(T["peach-glow"], T["cream"], 0.6))
THREAD = mix(T["lotus-pink"], T["plum-ink"], 0.2)  # sewing thread

# (frame, target x, y, z, view height, pitch, yaw, f-stop): macro and oblique on the yarn, square-on for the cloth,
# then a travelling shot along the three products. Targets sit on the surface in focus, not the object's axis.
CAM = [(0, MX, -0.256, 0.20, 0.075, 2, 30, 14), (16, MX, -0.256, 0.20, 0.10, 2, 28, 11), (30, MX - 0.01, -0.256, 0.20, 0.17, 3, 24, 6),
       (50, 0.06, -0.256, 0.19, 0.34, 4, 18, 3.4), (62, 0.04, -0.256, 0.21, 0.44, 4, 14, 3.0), (76, 0.0, -0.256, 0.34, 0.80, 3, 6, 2.4),
       (89, 0.0, -0.256, 0.42, 1.0, 3, 0, 2.4), (100, 0.0, -0.18, 0.41, 1.06, 5, -6, 2.4), (109, 0.0, -0.085, 0.40, 1.04, 7, -12, 2.8),
       (129, 0.0, -0.085, 0.40, 1.02, 8, -5, 2.8), (140, MUG_X, -MUG_R, 0.15, 0.46, 12, 12, 5.6), (149, MUG_X + 0.005, -MUG_R, 0.15, 0.45, 12, 6, 5.6),
       (159, COASTER_X, 0.0, 0.02, 0.46, 38, 2, 8), (169, COASTER_X, 0.0, 0.02, 0.44, 42, -4, 8)]


def smoother(t):
    t = min(1.0, max(0.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)


# ---- the tote: a sewn canvas bag ---------------------------------------------------
def depth_at(t):
    """Half depth of the bag at height fraction t: full low down, nearly closed at the mouth, as cloth hangs."""
    return TOTE_D / 2 * (1 + 0.30 * np.sin(np.pi * t ** 0.7)) * (1 - 0.35 * t ** 3)


def tote_front(x, z):
    """How far the bag's front face stands out from its axis at (x, z): the cloth panel and the straps lie on this."""
    return depth_at(np.clip(z / TOTE_H, 0, 1)) * (1 - np.clip(np.abs(2 * x / TOTE_W), 0, 1) ** 5) ** 0.2


def body_pt(ph, t):
    """Point on the bag wall. ph runs round it (0 = middle of the front), t up it: a soft-cornered section, a rounded
    foot, side gussets that fold in towards the top, and a hem that sags between the corners."""
    rho = (np.abs(np.sin(ph)) ** 2.5 + np.abs(np.cos(ph)) ** 2.5) ** -0.4  # superellipse by angle: even spacing
    xn, yn = rho * np.sin(ph), rho * np.cos(ph)
    foot = 0.75 + 0.25 * np.sqrt(1 - (1 - np.clip(t / 0.05, 0, 1)) ** 2)
    x = TOTE_W / 2 * xn * foot * (1 - 0.06 * t ** 2 * np.exp(-(yn / 0.5) ** 2))
    y = -depth_at(t) * yn * foot
    z = t * TOTE_H - 0.012 * t ** 4 * (1 - (2 * x / TOTE_W) ** 2)
    return np.stack(np.broadcast_arrays(x, y, z), -1)


def canvas_mat():
    """Canvas: a plain-weave relief at thread scale over broad soft wrinkles, matte with a little sheen."""
    m = rig.mat("Canvas", CANVAS, rough=0.9, noise=(7, 0.07), bump=(5, 0.5, 0.012), **{"Sheen Weight": 0.5, "Sheen Roughness": 0.5})
    nt = m.node_tree
    N, L = nt.nodes.new, nt.links.new
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    soft = b.inputs["Normal"].links[0].from_socket
    co, sep = N("ShaderNodeTexCoord"), N("ShaderNodeSeparateXYZ")
    L(co.outputs["Object"], sep.inputs[0])

    def op(kind, a, bv=None):
        n = N("ShaderNodeMath")
        n.operation = kind
        for sock, v in zip(n.inputs, (a, bv)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            elif v is not None:
                L(v, sock)
        return n.outputs[0]

    k = 2 * math.pi / 0.007  # thread pitch
    across = op("SINE", op("MULTIPLY", op("ADD", sep.outputs[0], sep.outputs[1]), k))  # x on the faces, y on the gussets
    bp = N("ShaderNodeBump")
    bp.inputs["Strength"].default_value, bp.inputs["Distance"].default_value = 0.6, 0.0012
    L(op("MULTIPLY", across, op("SINE", op("MULTIPLY", sep.outputs[2], k))), bp.inputs["Height"])
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


def strap(m, root, side, arch, lean, shift):
    """A fabric handle: sewn flat to the bag for 7 cm with a boxed cross, then up and over in a loose arch that leans
    and turns a little along its length. side -1 = front. Returns its stitch dashes."""
    x0, H, Ws, Th = 0.12, TOTE_H, 0.034, 0.006
    yf = lambda z: side * (tote_front(x0, z) + Th / 2 + 0.001)
    top = side * depth_at(1.0)
    legs = (H - 0.075, H - 0.05, H - 0.025)
    key = ([(-x0, yf(z), z) for z in legs]
           + [(-x0 + 0.003, top + 0.2 * lean, H + 0.03), (-0.106 + 0.3 * shift, top + 0.6 * lean, H + 0.55 * arch),
              (-0.062 + 0.7 * shift, top + 0.9 * lean, H + 0.9 * arch), (shift, top + lean, H + arch),
              (0.062 + 0.7 * shift, top + 0.9 * lean, H + 0.9 * arch), (0.106 + 0.3 * shift, top + 0.6 * lean, H + 0.55 * arch),
              (x0 - 0.003, top + 0.2 * lean, H + 0.03)]
           + [(x0, yf(z), z) for z in legs[::-1]])
    c = rig.catmull(key, 10)
    t = rig.unit(np.gradient(c, axis=0))
    w = rig.unit(np.stack([-t[:, 2], np.zeros(len(c)), t[:, 0]], -1))  # across the strap, in the plane of the arch
    n = np.cross(w, t)
    n = n * np.sign((n[:, 1] * side).mean())  # the face that looks away from the bag
    free = ss(H, H + 0.08, c[:, 2])
    th = (0.32 * np.sin(np.linspace(0, 2 * np.pi, len(c)) * 1.5 + 0.7 + side) * free)[:, None]  # the turn of a soft strap
    w, n = w * np.cos(th) + n * np.sin(th), n * np.cos(th) - w * np.sin(th)
    a = np.linspace(0, 2 * np.pi, 13)
    sq = lambda q: np.sign(q) * np.abs(q) ** 0.3  # a flat section with rounded edges
    v = c[:, None] + w[:, None] * (Ws / 2 * sq(np.cos(a)))[None, :, None] + n[:, None] * (Th / 2 * sq(np.sin(a)))[None, :, None]
    rig.mesh("Strap", v, rig.grid_faces(len(c), 13), m, parent=root)
    face = lambda i, dx: c[i] + w[i] * dx + n[i] * (Th / 2 + 0.0002)
    e = Ws / 2 - 0.005
    out = [stitches(face(slice(None), dx), n) for dx in (-e, e)]  # a row down each edge
    for i0, i1 in ((2, 18), (len(c) - 19, len(c) - 3)):  # the box and cross that hold each end to the bag
        for (ia, da), (ib, db) in (((i0, -e), (i0, e)), ((i1, -e), (i1, e)), ((i0, -e), (i1, e)), ((i0, e), (i1, -e))):
            out.append(stitches(np.linspace(face(ia, da), face(ib, db), 8), n[i0], gap=0.007, ln=0.005))
    return out


def tote(at=(0.0, 0.0)):
    """Canvas tote standing on the ground at `at`: soft body, hemmed mouth, two sewn straps. Returns its root."""
    m = canvas_mat()
    root = rig.empty("Tote", loc=(at[0], at[1], 0))
    ph = np.linspace(0, 2 * np.pi, 193)
    wall = body_pt(ph[None, :], np.linspace(0, 1, 40)[:, None])
    base = wall[0] * [0.5, 0.5, 1.0]  # the bottom, closed in two rings
    body = rig.mesh("ToteBody", np.vstack([np.zeros((193, 3)), base, wall.reshape(-1, 3)]), rig.grid_faces(42, 193), m, parent=root)
    body.modifiers.new("Weld", "WELD").merge_threshold = 1e-5  # close the seam so shading runs across it
    sol = body.modifiers.new("Solidify", "SOLIDIFY")
    sol.thickness, sol.offset = 0.004, -1
    sew = strap(m, root, -1, 0.21, -0.03, 0.012) + strap(m, root, 1, 0.175, 0.02, -0.012)
    for drop in (0.026, 0.032):  # the hem: two rows of stitching round the mouth
        hem = body_pt(np.linspace(0, 2 * np.pi, 700), 1 - drop / TOTE_H)
        sew.append(stitches(hem, np.cross(np.gradient(hem, axis=0), [0, 0, 1.0])))
    sv = np.concatenate([s.reshape(-1, 4, 5, 3) for s in sew])
    rig.mesh("Stitching", sv, rig.grid_faces(4, 5, len(sv)), rig.mat("Thread", THREAD, rough=0.8, **{"Sheen Weight": 0.4}), parent=root)
    return root


def panel_place(tau):
    """Where the cloth is: flat on the loom plane at tau 0, flying and billowing, then sewn to the tote's front at 1."""
    tau = min(1.0, max(0.0, tau))
    e, fl = smoother(tau), math.sin(math.pi * tau)
    s = lerp(1.0, 0.667, e)
    c = np.array([0.0, lerp(LOOM[1], -TOTE_D / 2 - 0.010, e) - 0.16 * fl, lerp(LOOM[2], PANEL_Z, e)])
    ang = 0.32 * fl
    up, n = np.array([0, -math.sin(ang), math.cos(ang)]), np.array([0, -math.cos(ang), -math.sin(ang)])

    def place(Q):
        a, b, h = Q[..., 0], Q[..., 1], Q[..., 2]
        off = fl * (0.05 * (np.cos(np.pi * b / SIZE) - 0.55) + 0.012 * np.sin(3 * np.pi * (a / SIZE + 0.5) - 9 * tau))
        off = off + e * (tote_front(a * s, c[2] + b * s) - TOTE_D / 2)  # lie on the bag's belly, not through it
        return c + a[..., None] * s * np.array([1.0, 0, 0]) + b[..., None] * s * up + (h * s + off)[..., None] * n, n
    return place, s


# ---- mug and coaster ---------------------------------------------------------------
def cord(name, mat_, centre, radius, r, colour):
    """A ring of plied cord: the hem of the mug's band, the coaster's piping."""
    a = np.linspace(0, 2 * np.pi, 400)
    c = np.asarray(centre) + np.stack([radius * np.cos(a), radius * np.sin(a), np.zeros_like(a)], -1)
    return rig.mesh(name, rig.tube(c, r, 12, (0, 0, 1), lobes=2, twist=2 * np.pi / (r * 9), depth=0.2), rig.grid_faces(400, 13), mat_,
                    uv=rig.tube_uv(400, 12, 2 * np.pi * radius, 2.4 * r), col=np.tile([*lin(colour), 1.0], (400 * 13, 1)))


def mug(yarn, at=(MUG_X, 0.0), **cloth):
    """Glazed ceramic mug with a band of the same plain-weave cloth round it. cloth: rig.Cloth options (K, ply) for a
    closer view than the film's."""
    glaze = rig.mat("Glaze", mix(T["cream"], T["peach-glow"], 0.3), rough=0.16, noise=(3, 0.04),
                    **{"Coat Weight": 1.0, "Coat Roughness": 0.06, "Subsurface Weight": 0.15, "Subsurface Radius": (0.01, 0.006, 0.004)})
    Rm, H = MUG_R, MUG_H
    prof = [(0, 0), (Rm - 0.022, 0), (Rm - 0.006, 0.003), (Rm, 0.016), (Rm, H - 0.012), (Rm - 0.002, H - 0.003), (Rm - 0.006, H),
            (Rm - 0.010, H - 0.003), (Rm - 0.012, H - 0.012), (Rm - 0.012, 0.035), (Rm - 0.022, 0.022), (0, 0.022)]
    v, f = rig.lathe(prof, 72)
    body = rig.subsurf(rig.mesh("MugBody", v + [at[0], at[1], 0], f, glaze), 2)
    t = np.linspace(0, 1, 40)
    c = np.stack([at[0] + Rm - 0.012 + 0.088 * np.sin(np.pi * t) ** 0.8, np.full_like(t, at[1]), lerp(H - 0.06, 0.065, t)], -1)
    rig.subsurf(rig.mesh("MugHandle", rig.tube(c, 0.0115 * (1 + 0.5 * (2 * t - 1) ** 2), 12, (0, 1, 0)), rig.grid_faces(40, 13), glaze), 1)
    nw, nf = 104, 16  # an even count closes the plain weave round the mug
    Rb, zb = nw * PF / (2 * np.pi), 0.145
    band = rig.Cloth("MugBand", nw, nf, PF, RF, yarn, WARP_COL, WEFT_COL, rings=(64, 624), accents={52: T["stem-mint"]}, **cloth)

    def place(Q):
        phi = Q[..., 0] / Rb
        n = np.stack([np.sin(phi), -np.cos(phi), np.zeros_like(phi)], -1)
        return np.array([at[0], at[1], zb]) + n * (Rb + Q[..., 2])[..., None] + Q[..., 1:2] * [0, 0, 1.0], n

    band.update(np.tile(np.linspace(-nf * PF / 2 - 0.003, nf * PF / 2 + 0.003, 64), (nw, 1)),
                np.tile(np.linspace(-np.pi * Rb, np.pi * Rb, 624), (nf, 1)), place)
    for i, z in enumerate((zb - nf * PF / 2 - 0.005, zb + nf * PF / 2 + 0.005)):
        cord(f"MugHem{i}", yarn, (at[0], at[1], z), Rb + 0.001, 0.0042, mix(T["petal-soft"], T["lotus-pink"], 0.25))
    return body


def coaster(yarn, at=(COASTER_X, 0.0), **cloth):
    """Round coaster: a padded base, a plain-weave top of real yarn, plied piping round the edge. cloth: as for mug()."""
    Rc, th = COASTER_R, 0.016
    m = rig.mat("Pad", CANVAS, rough=0.85, bump=(700, 0.4, 0.0015), **{"Sheen Weight": 0.5})
    v, f = rig.lathe([(0, 0), (Rc - 0.012, 0), (Rc - 0.003, 0.003), (Rc, th / 2), (Rc - 0.003, th - 0.003), (Rc - 0.012, th), (0, th)], 72)
    rig.mesh("CoasterPad", v + [at[0], at[1], 0], f, m)
    n = 40
    top = rig.Cloth("CoasterTop", n, n, PF, RF, yarn, WARP_COL, WEFT_COL, rings=(200, 200), accents={26: T["stem-mint"]}, **cloth)
    half = np.sqrt(np.clip((Rc - 0.002) ** 2 - ((np.arange(n) - (n - 1) / 2) * PF) ** 2, 1e-6, None))  # yarns end on a circle
    s = np.linspace(-1, 1, 200)[None, :] * half[:, None]
    top.update(s, s, lambda Q: (np.array([at[0], at[1], th + 2 * RF]) + Q, np.array([0, 0, 1.0])))
    cord("CoasterPiping", yarn, (at[0], at[1], th + 0.004), Rc - 0.003, 0.0075, mix(T["petal-soft"], T["lotus-pink"], 0.25))


def main():
    a = rig.parse(SETS)
    rig.setup(a, mix(T["plum-ink"], T["cream"], 0.4), 0.2)
    rng = np.random.default_rng(11)
    rig.catcher(0.0, T["plum-ink"])
    rig.lights((0.8, -0.1, 0.3), 1.7, key=0.95, fill=0.7, rim=1.5)
    cam = rig.camera(60)
    yarn, fine = rig.yarn_mat("Yarn", plies=3, r=R), rig.yarn_mat("YarnFine", plies=3, r=RF)
    cloth = rig.Cloth("Panel", NW, NF, P, R, yarn, WARP_COL, WEFT_COL, rings=(300, 250), K=18, accents={MINT: T["stem-mint"]}, ply=(3, 0.09))
    tote_root = tote()
    mug(fine)
    coaster(fine)

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
        place, s = panel_place((f - 89) / 20)
        cloth.update(sw, sf, place, reach, rw, rf, s)
        shown = froot > tip[fyarn]
        rig.set_co(fuzz, place(np.where(shown[:, None, None, None], fv, fv[:, :1, :1, :]))[0])
        # the tote comes up out of the ground behind the flying cloth (the catcher hides what is still below it)
        tote_root.location.z = lerp(-1.0, 0.0, float(ss(89, 104, f)))
        for ob in tote_root.children:
            ob.hide_render = f < 89
        # as the camera leaves it for the mug, the tote steps aside with its cloth: the shadow it throws to the
        # right would otherwise lie beside the mug as a dark band with nothing in frame to explain it
        away = -1.2 * smoother((f - 135) / 7)
        for ob in (tote_root, *cloth.obs, fuzz):
            ob.location.x = away
        rig.frame_cam(cam, aspect, (tx, ty, tz), H, pitch, yaw, fstop=fstop)

    rig.render(a, "weave", SETS, FRAMES, pose)


if __name__ == "__main__":
    main()
