"""Still-lifes for the page (07-redesign §4): objects on transparent, lit like the films, with a soft contact shadow
in the alpha. One PNG each at <out>/stills/<name>/f0000.png; scripts/encode-film.mjs turns them into WebP.
  spools    three spools of thread, the mint one trailing its end
  cloth     plain-weave cloth with a corner folded over, a threaded needle resting on it
  products  tote, mug and coaster together (the page sets the partner credit beside it, as text)
  lotus-seeds  a few loose lotus seeds and two fallen petals (the petals of the lotus film)
  sprouts   a dish of earth with upright seedlings, one just breaking the soil
All cloth is plain weave of real yarn: no motif, no brocade pattern (07-redesign §1).

  blender -b --factory-startup -P blender/film/stills.py -- --quality draft|final [--set spools,cloth,...]
"""
import importlib.util
import math
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig  # noqa: E402
from rig import T, chroma, lin, mix, ss  # noqa: E402


def film(name):
    """The film scene next to this file, by path: blender/scripts/ has older modules of the same names on sys.path."""
    spec = importlib.util.spec_from_file_location(f"film_{name}", Path(__file__).with_name(f"{name}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


seedfilm, weave, lotus = film("seed"), film("weave"), film("lotus")

STILLS = {"spools": (1600, 1200), "cloth": (1600, 1200), "products": (1600, 1000), "lotus-seeds": (1600, 1200), "sprouts": (1600, 1200)}  # starting shapes: shoot() fits each frame to its subject
FILL, EDGE = 0.80, 1600  # the subject's share of the frame, and the frame's long edge in pixels
PF, RF = weave.PF, weave.RF
WOOD = chroma(mix(T["peach-glow"], T["ink"], 0.28), 1.5)


def stage(a, target, d):
    """Empty scene with the page under it (a shadow catcher) and the films' light."""
    rig.setup(a, T["cream"], rig.AMBIENT)
    rig.catcher(0.0, T["cream"])  # its shadow comes out as black in the alpha; the encoder thins it to a soft contact shadow
    rig.lights(target, d)
    return rig.camera(60)


def extent(cam, w, h):
    """Screen box (x0, y0, x1, y1), 0..1 from the bottom left, of every object but the page."""
    bpy.context.view_layer.update()
    m = np.array(cam.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(), x=w, y=h) @ cam.matrix_world.inverted())
    lo, hi = np.full(2, np.inf), np.full(2, -np.inf)
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH" or ob.is_shadow_catcher or not len(ob.data.vertices):
            continue
        v = np.empty(len(ob.data.vertices) * 3)
        ob.data.vertices.foreach_get("co", v)
        p = np.c_[v.reshape(-1, 3), np.ones(len(v) // 3)] @ (m @ np.array(ob.matrix_world)).T
        s = p[:, :2] / p[:, 3:]
        lo, hi = np.minimum(lo, s.min(0)), np.maximum(hi, s.max(0))
    return (*(lo + 1) / 2, *(hi + 1) / 2)


def shoot(a, name, cam, scene="stills", **view):
    """Frame the subject tight: centred, FILL of the frame both ways. The frame takes the subject's shape (within
    3:4 .. 16:9) with its long edge at EDGE pixels; the view's own height and `at` are only the starting point.
    scene: the folder under <out> the master goes to (art.py sends its portraits to `art`)."""
    a.set = name
    view.setdefault("at", (0.0, 0.0))
    w, h = STILLS[name]
    for _ in range(16):
        rig.frame_cam(cam, w / h, **view)
        x0, y0, x1, y1 = map(float, extent(cam, w, h))
        bw, bh = (x1 - x0) * w, (y1 - y0) * h  # the subject in pixels of this frame
        asp = min(max(bw / bh, 3 / 4), 16 / 9)
        w2, h2 = (EDGE, 2 * round(EDGE / asp / 2)) if asp >= 1 else (2 * round(EDGE * asp / 2), EDGE)
        k = FILL / max(bw / w2, bh / h2)  # how much larger the subject has to be drawn
        view["height"] *= h2 / (h * k)
        view["at"] = (view["at"][0] + 0.5 - (x0 + x1) / 2, view["at"][1] + 0.5 - (y0 + y1) / 2)
        w, h = w2, h2
    print(f"STILL {name} {w}x{h} subject {x1 - x0:.3f} x {y1 - y0:.3f} of the frame, centre {(x0 + x1) / 2:.3f}, {(y0 + y1) / 2:.3f}", flush=True)
    assert abs(max(x1 - x0, y1 - y0) - FILL) < 0.01 and abs((x0 + x1) / 2 - 0.5) < 0.01 and abs((y0 + y1) / 2 - 0.5) < 0.01, "framing did not settle"
    rig.render(a, scene, {name: (w, h)}, 1, lambda f, sid, aspect: rig.frame_cam(cam, aspect, **view))


def thread(name, yarn, points, r, colour, per_seg=24):
    """A loose length of plied thread through `points`."""
    c = rig.catmull(points, per_seg)
    return rig.mesh(name, rig.tube(c, r, 8, rig.transport(c), lobes=2, twist=2 * np.pi / (r * 9), depth=0.2), rig.grid_faces(len(c), 9), yarn,
                    uv=rig.tube_uv(len(c), 8, rig.arclen(c), 2.4 * r), col=np.tile([*lin(colour), 1.0], (len(c) * 9, 1)))


# ---- spools ----------------------------------------------------------------------------
def spool(name, at, rot, colour, yarn, wood):
    """A wooden spool wound with thread: the winding is one real helix of thread over a barrel of the same colour."""
    Rf, Rc, H, Rw, rt = 0.062, 0.030, 0.15, 0.050, 0.0022
    root = rig.empty(name, loc=at)
    root.rotation_euler = rot
    prof = [(0, 0), (Rf - 0.003, 0), (Rf, 0.003), (Rf, 0.009), (Rf - 0.003, 0.012), (Rc + 0.006, 0.016), (Rc, 0.022), (Rc, H - 0.022),
            (Rc + 0.006, H - 0.016), (Rf - 0.003, H - 0.012), (Rf, H - 0.009), (Rf, H - 0.003), (Rf - 0.003, H), (0.016, H), (0.013, H - 0.004), (0.013, H - 0.03), (0, H - 0.03)]
    v, f = rig.lathe(prof, 64)
    rig.mesh(f"{name}Wood", v, f, wood, parent=root)
    z = np.linspace(0.017, H - 0.017, 12)
    belly = lambda zz: (Rw - 0.7 * rt) * (1 + 0.05 * np.sin(np.pi * (zz - 0.017) / (H - 0.034)))
    v, f = rig.lathe(list(zip(belly(z), z)), 64)
    rig.mesh(f"{name}Barrel", v, f, rig.mat(f"{name}Fill", colour, rough=0.9), parent=root)
    turns = (H - 0.04) / (2.05 * rt)
    N = int(turns * 40)
    t = np.linspace(0, 1, N)
    zz, a = 0.020 + (H - 0.04) * t, 2 * np.pi * turns * t
    rr = belly(zz) + 0.7 * rt
    c = np.stack([rr * np.cos(a), rr * np.sin(a), zz], -1)
    rig.mesh(f"{name}Thread", rig.tube(c, rt, 6, (0, 0, 1)), rig.grid_faces(N, 7), yarn, uv=rig.tube_uv(N, 6, rig.arclen(c), 2.4 * rt),
             col=np.tile([*lin(colour), 1.0], (N * 7, 1)) * (1 + 0.06 * np.sin(np.repeat(a, 7) * 0.37)[:, None] * [1, 1, 1, 0]), parent=root)
    return rt


def spools(a):
    cam = stage(a, (0, 0, 0.08), 0.6)
    yarn = rig.yarn_mat("Thread", plies=2, r=0.0022)
    wood = rig.mat("Wood", WOOD, rough=0.55, noise=(18, 0.18), bump=(60, 0.25, 0.001))
    mint, pink, peach = T["stem-mint"], mix(T["petal-soft"], T["lotus-pink"], 0.45), mix(T["peach-glow"], T["cream"], 0.15)
    rt = spool("SpoolMint", (-0.04, 0.03, 0), (0, 0, 0.4), mint, yarn, wood)
    spool("SpoolPink", (-0.20, -0.04, 0), (0, 0, 1.3), pink, yarn, wood)
    spool("SpoolPeach", (0.13, -0.10, 0.062), (math.pi / 2, 0, 0.5), peach, yarn, wood)  # this one lies on its side
    # the mint spool's free end comes off the winding and wanders across the page
    thread("LooseEnd", yarn, [(-0.04, -0.022, 0.085), (0.0, -0.06, 0.06), (0.02, -0.11, 0.012), (0.0, -0.16, rt), (-0.07, -0.19, rt),
                              (-0.15, -0.17, rt), (-0.21, -0.20, rt), (-0.26, -0.24, rt), (-0.33, -0.235, rt)], rt, mint)
    shoot(a, "spools", cam, target=(-0.045, -0.06, 0.06), height=0.47, pitch=22, yaw=6, fstop=11)


# ---- folded cloth with a needle -----------------------------------------------------------
def cloth(a):
    cam = stage(a, (0, 0, 0.02), 0.7)
    n, N, rho, base = 56, 300, 0.0078, 2 * RF
    half = n * PF / 2
    yarn = rig.yarn_mat("YarnFine", plies=3, r=RF)
    c = rig.Cloth("Fold", n, n, PF, RF, yarn, weave.WARP_COL, weave.WEFT_COL, rings=(N, N), accents={37: T["stem-mint"]})
    d, p0, turn = rig.unit([1.0, 0.85]), 0.105, 0.3  # the fold: its normal in the cloth, its distance from the centre

    def place(Q):
        """Flat on the page, but past the fold line the cloth turns round a small radius and lies back on itself."""
        p, q, h = Q[..., 0] * d[0] + Q[..., 1] * d[1] - p0, -Q[..., 0] * d[1] + Q[..., 1] * d[0], Q[..., 2]
        th = np.clip(p / rho, 0, np.pi)
        along = np.where(p < 0, p, rho * np.sin(th) - np.maximum(p - np.pi * rho, 0)) + p0
        nd, nz = -np.sin(th), np.cos(th)
        x, y = (along + h * nd) * d[0] - q * d[1], (along + h * nd) * d[1] + q * d[0]
        cs, sn = math.cos(turn), math.sin(turn)
        pos = np.stack([x * cs - y * sn, x * sn + y * cs, base + rho * (1 - np.cos(th)) + h * nz], -1)
        return pos, np.stack([nd * (d[0] * cs - d[1] * sn), nd * (d[0] * sn + d[1] * cs), nz], -1)

    sw = np.tile(np.linspace(-half - 0.02, half + 0.02, N), (n, 1))  # the warps run on past the last pick: a fringe
    sf = np.tile(np.linspace(-half - 0.003, half + 0.003, N), (n, 1))
    end = lambda s, lim: ss(0, 0.6 * RF, lim - np.abs(s))  # blunt cut ends
    c.update(sw, sf, place, rw=end(sw, half + 0.02), rf=end(sf, half + 0.003))
    top = base + 2 * RF  # the cloth's upper surface
    # needle: lying across the open part of the cloth, eye end up-left
    A, B = np.array([-0.165, 0.05, top + 0.0032]), np.array([0.03, -0.09, top + 0.0032])
    t = np.linspace(0, 1, 60)
    r = 0.0034 * np.minimum(1, (1 - t) / 0.3) ** 0.7 * (0.75 + 0.25 * ss(0.0, 0.03, t))
    steel = rig.mat("Steel", mix(T["cream"], T["ink"], 0.18), rough=0.22, **{"Metallic": 1.0})
    rig.mesh("Needle", rig.tube(A + (B - A) * t[:, None], r, 10, (0, 0, 1)), rig.grid_faces(60, 11), steel)
    eye = A + (B - A) * 0.035
    ty = rig.yarn_mat("Sewing", plies=2, r=0.0016)
    z = top + 0.0016
    thread("NeedleThread", ty, [(-0.215, 0.12, z), (-0.19, 0.075, z), (eye[0] - 0.006, eye[1] + 0.012, z + 0.003), (eye[0], eye[1], z + 0.0072),
                                (eye[0] + 0.012, eye[1] - 0.004, z + 0.002), (-0.10, -0.03, z), (-0.13, -0.10, z), (-0.07, -0.16, z), (-0.10, -0.215, z),
                                (-0.14, -0.26, 0.012), (-0.10, -0.30, 0.0016), (-0.02, -0.315, 0.0016), (0.05, -0.30, 0.0016)], 0.0016, T["stem-mint"])
    shoot(a, "cloth", cam, target=(0.0, -0.02, 0.0), height=0.56, pitch=52, yaw=0, fstop=11)


# ---- the three products -----------------------------------------------------------------------
def products(a):
    cam = stage(a, (0.3, -0.2, 0.3), 1.5)
    yarn, fine = rig.yarn_mat("Yarn", plies=3, r=weave.R), rig.yarn_mat("YarnFine", plies=3, r=RF)
    weave.tote()
    panel = rig.Cloth("Panel", weave.NW, weave.NF, weave.P, weave.R, yarn, weave.WARP_COL, weave.WEFT_COL, rings=(160, 160),
                      accents={weave.MINT: T["stem-mint"]})
    place, s = weave.panel_place(1.0)
    sw = np.tile(np.linspace(-weave.FRINGE, weave.FRINGE, 160), (weave.NW, 1))
    sf = np.tile(np.linspace(-weave.SIZE / 2 - 0.004, weave.SIZE / 2 + 0.004, 160), (weave.NF, 1))
    end = lambda q, lim: ss(0, 0.6 * weave.R, lim - np.abs(q))
    panel.update(sw, sf, place, rw=end(sw, weave.FRINGE), rf=end(sf, weave.SIZE / 2 + 0.004), scale=s)
    weave.mug(fine, at=(0.50, -0.20))
    weave.coaster(fine, at=(0.14, -0.50))
    shoot(a, "products", cam, target=(0.20, -0.2, 0.34), height=1.12, pitch=13, yaw=10, fstop=11)


# ---- lotus seeds and fallen petals -------------------------------------------------------------
def lotus_seeds(a):
    cam = stage(a, (0, 0, 0.05), 0.7)
    rng = np.random.default_rng(3)
    pm = lotus.petal_mat()
    uv = np.stack(np.meshgrid(np.linspace(0, 1, lotus.NU), np.linspace(0, 1, lotus.NV)), -1).reshape(-1, 2)
    # two petals from the lotus film, fallen: each lies on its belly, cupped side up, base and tip off the page
    for i, (ri, x, y, heading, tilt, wave) in enumerate([(0, -0.21, 0.07, -0.30, 1.47, 0.4), (1, 0.31, 0.20, 2.62, 1.50, 2.1)]):
        v = lotus.petal(dict(lotus.RINGS[ri], r=0.0, z=0.0), 1.0, heading, tilt, 1.0, wave)
        v = v + [x, y, 0.003 - v[..., 2].min()]
        rig.subsurf(rig.mesh(f"Fallen{i}", v, rig.grid_faces(lotus.NV, lotus.NU), pm, uv=uv, col=lotus.petal_colour(ri)), 1)
    # loose seeds: plain ovals in the brown of the seed that was sown
    spots = [(-0.27, -0.20, 0.5), (-0.14, -0.28, 2.0), (0.02, -0.22, 1.1), (0.17, -0.30, 2.7), (0.31, -0.17, 0.2), (0.07, -0.37, 1.7)]
    sv, sf = rig.blobs(np.zeros((len(spots), 3)), np.full(len(spots), 0.017), rng, sub=2, jitter=0.03, squash=(0.95, 1.05))
    for i, (x, y, yaw) in enumerate(spots):
        p, cs, sn = sv[i] * [1.5, 1.0, 1.0], math.cos(yaw), math.sin(yaw)
        sv[i] = np.stack([p[:, 0] * cs - p[:, 1] * sn + x, p[:, 0] * sn + p[:, 1] * cs + y, p[:, 2] - p[:, 2].min() + 0.0005], -1)
    brown = mix(seedfilm.SHELL, T["peach-glow"], 0.3)
    rig.mesh("LotusSeeds", sv, sf, rig.mat("LotusSeed", brown, rough=0.4, noise=(60, 0.12), **{"Coat Weight": 0.25, "Coat Roughness": 0.3}))
    shoot(a, "lotus-seeds", cam, target=(0.03, -0.04, 0.03), height=0.80, pitch=38, yaw=0, fstop=11)


# ---- dish of seedlings -------------------------------------------------------------------------
def sprouts(a):
    cam = stage(a, (0, 0, 0.15), 1.0)
    rng = np.random.default_rng(21)
    glaze = rig.mat("Dish", mix(T["cream"], T["peach-glow"], 0.45), rough=0.2, noise=(4, 0.04), **{"Coat Weight": 1.0, "Coat Roughness": 0.08})
    Rd, floor = 0.44, 0.036
    v, f = rig.lathe([(0, 0), (Rd - 0.05, 0), (Rd - 0.015, 0.012), (Rd, 0.05), (Rd + 0.002, 0.064), (Rd - 0.006, 0.07), (Rd - 0.014, 0.062),
                      (Rd - 0.024, 0.03), (Rd - 0.05, 0.02), (0, 0.02)], 96)
    rig.subsurf(rig.mesh("Dish", v, f, glaze), 2)
    v, f = rig.lathe([(0, floor), (Rd - 0.03, floor), (Rd - 0.022, floor - 0.01)], 96)
    rig.mesh("Earth", v, f, rig.mat("EarthFloor", seedfilm.EARTH[1], rough=0.95, noise=(60, 0.3), bump=(300, 0.6, 0.003)))
    _, grains, _ = seedfilm.soil("Dish", rng, n=16000, hollow=0.0, reach=Rd - 0.04, bed=False)
    grains.location.z = floor
    # upright seedlings of slightly different heights, each with its first pair of leaves, like the hero sprout
    spots = [(-0.27, 0.04, 0.22), (-0.14, -0.13, 0.30), (-0.03, 0.15, 0.35), (0.09, -0.04, 0.39), (0.21, 0.13, 0.28), (0.28, -0.11, 0.24)]
    for i, (x, y, L) in enumerate(spots):
        sp = seedfilm.Sprout(f"Sprout{i}", (x, y, floor + 0.004), phase=0.6 + 1.9 * i, leaves=((L - 0.075, 1, 0.9), (L - 0.06, -1, 0.82)), rings=220)
        sp.hook = 0.0  # standing straight: no hooked shoots
        sp.update(L, [1.0, 0.9])
    # and one that is only just breaking the soil: a pale loop
    t = np.linspace(0, np.pi, 24)
    loop = np.stack([-0.02 - 0.03 * np.cos(t), np.full_like(t, -0.26), floor - 0.01 + 0.038 * np.sin(t)], -1)
    rig.mesh("Loop", rig.tube(loop, 0.011, 10, (0, 1, 0)), rig.grid_faces(24, 11),
             rig.mat("LoopMat", mix(T["stem-mint"], T["cream"], 0.45), rough=0.5, **{"Subsurface Weight": 0.3, "Subsurface Radius": (0.02, 0.03, 0.02)}))
    shoot(a, "sprouts", cam, target=(0.0, 0.0, 0.14), height=0.94, pitch=22, yaw=0, fstop=11)


def main():
    a = rig.parse(STILLS)
    for name in a.set.split(","):
        {"spools": spools, "cloth": cloth, "products": products, "lotus-seeds": lotus_seeds, "sprouts": sprouts}[name](a)


if __name__ == "__main__":
    main()
