"""Page art (docs/08-fuller.md): three stills on transparent. One PNG each at <out>/art/<name>/f0000.png;
scripts/encode-film.mjs --scenes art turns them into public/art/products/*.webp and public/art/seam/roots.webp.
  bag, lipstick        one product each, GIEO's Nối Nếp collection (the Nối Bag, the Nếp Keychain): the weave film's
                       models, materials and plain weave (no motif), lit and framed like the still-lifes in stills.py;
                       the bag in three-quarter view, the keychain lying on its back seen from above
  roots                the seam under the hero film, 2400 x 900: the seed film's earth turning over a lip into a cut
                       face that crumbles away into loose crumbs, with a few pale roots hanging into empty space

  blender -b --factory-startup -P blender/film/art.py -- --quality draft|final [--set bag,lipstick,roots]
"""
import math
import sys
from pathlib import Path

import numpy as np
from mathutils import Vector, noise

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig  # noqa: E402
import stills  # noqa: E402  (blender/scripts has no stills.py, so this is the one next to this file)
from rig import T, lin, mix, ss  # noqa: E402

weave, seedfilm = stills.weave, stills.seedfilm
SETS = ("bag", "lipstick", "roots")
CLOSE = dict(K=18, ply=(3, 0.09))  # yarn as the film models it for its close-ups: 18-sided, the plies in the geometry


# ---- product portraits -------------------------------------------------------------------------
def portrait(a, name, cam, **view):
    stills.STILLS[name] = (1600, 1600)  # only where shoot() starts: it fits the frame to the product
    stills.shoot(a, name, cam, scene="art", **view)


def bag(a):
    at = (0.0, -0.05, 0.35)
    cam = stills.stage(a, at, 1.0)
    weave.noi_bag(rig.yarn_mat("YarnFine", plies=3, r=weave.RF), **CLOSE)
    portrait(a, "bag", cam, target=at, height=1.0, pitch=10, yaw=28, fstop=11)


def lipstick(a):
    at = (0.0, 0.03, 0.01)
    cam = stills.stage(a, at, 0.4)
    weave.lipstick_holder(rig.yarn_mat("YarnFine", plies=3, r=weave.RF), at=(0.0, 0.0), turn=-0.42, **CLOSE)
    portrait(a, "lipstick", cam, target=at, height=0.42, pitch=52, yaw=16, fstop=16)


# ---- the seam: earth in section, with roots ------------------------------------------------------
ROOTS = (2400, 900)
SPAN = 2.76  # metres across the frame: what the seed film's last frame shows of its soil along its bottom edge
PITCH = 12.0  # the seed film's closing pitch is 11: the ground behind the lip is seen as the film sees its own
TOP = 0.13  # metres of frame above the lip: the ground there is scattered crumbs, laid over the film's soil
FACE = math.radians(82)  # the cut leans a little towards the light
# roots: (x, length, base radius); uneven on purpose, and nothing is centred, so the piece crops anywhere
MAIN = [(-1.24, 0.36, 0.0040), (-0.93, 0.66, 0.0047), (-0.66, 0.21, 0.0034), (-0.22, 0.47, 0.0042), (0.05, 0.74, 0.0050),
        (0.39, 0.29, 0.0036), (0.80, 0.55, 0.0046), (0.97, 0.17, 0.0032), (1.26, 0.42, 0.0040)]


def profile():
    """The bank in section, by distance s from the lip along the surface: ground behind it (s < 0), the cut below."""
    s = np.linspace(-1.0, 0.8, 3601)
    th = FACE * ss(-0.035, 0.035, s)
    y, z = -np.cumsum(np.cos(th)) * (s[1] - s[0]), -np.cumsum(np.sin(th)) * (s[1] - s[0])
    return s, y - y[2000], z - z[2000], th


PROF = profile()


def edge(x):
    """How far down the cut the earth holds together at x: an irregular line, never level for long."""
    e = (0.14 + 0.04 * np.sin(2.1 * x + 0.4) + 0.027 * np.sin(5.3 * x + 1.9) + 0.018 * np.sin(11.7 * x + 0.7) + 0.011 * np.sin(29 * x + 2.5)
         + 0.018 * np.sin(17.3 * x + 4.1) * np.sin(3.1 * x))
    return np.clip(e, 0.10, 0.20)  # never shallower than 0.10: the film's bottom edge has to stay behind earth


def bank(x, s, h=0.0):
    """World position of the point `s` along the bank at x, `h` off its surface. The lip wanders with x, and the
    ground rolls like the film's bed (seed.terrain's sines)."""
    s = s - 0.05 * np.sin(2.9 * x + 1.3) - 0.025 * np.sin(7.1 * x + 0.2)
    y, z, th = (np.interp(s, PROF[0], c) for c in PROF[1:])
    h = h + 0.035 * np.sin(1.7 * x + 0.8) * np.sin(4.3 * s + 0.3) + 0.02 * np.sin(4.1 * x - 1.0 + 6.0 * s) + 0.012 * np.sin(9.3 * x + 1.7) * np.sin(17.7 * s + 0.4)
    return np.stack([x, y - h * np.sin(th), z + h * np.cos(th)], -1)


def crumbs(rng, n, clods=False):
    """seed.soil's sizes: fine crumbs with a few larger ones, or the clods it scatters across the bed."""
    k = rng.uniform(0, 1, n)
    if clods:
        return np.where(k < 0.985, rng.uniform(0.004, 0.014, n), rng.uniform(0.02, 0.04, n))
    return np.where(k < 0.88, rng.uniform(0.002, 0.006, n), np.where(k < 0.994, rng.uniform(0.006, 0.012, n), rng.uniform(0.015, 0.028, n)))


def root(name, m, rng, start, length, r0, lean=0.0, settle=0.7):
    """A fine root from `start`: it wanders as it goes down, a kink every few centimetres, and thins to a hair.
    lean: heading it sets off on (radians from straight down); settle: how fast it gives in to gravity."""
    n = max(4, int(length / 0.035))
    phi = np.empty(n)
    phi[0] = lean
    for k in range(1, n):
        phi[k] = settle * phi[k - 1] + rng.normal(0, 0.27)
    step = length / n
    key = np.vstack([start, start + np.cumsum(np.stack([np.sin(phi) * step, rng.normal(0, 0.004, n), -np.cos(phi) * step], -1), 0)])
    c = rig.catmull(key, 8)
    t = np.linspace(0, 1, len(c))
    r = r0 * (0.2 + 0.8 * (1 - t) ** 0.7) * np.sqrt(ss(1.0, 0.98, t))
    cream, mint = mix(T["cream"], T["peach-glow"], 0.2), mix(T["stem-mint"], T["cream"], 0.3)
    col = np.array([[*lin(mix(cream, mint, float(k))), 1.0] for k in ss(0.08, 0.85, t)])
    rig.mesh(name, rig.tube(c, r, 8, rig.transport(c)), rig.grid_faces(len(c), 9), m, col=np.repeat(col, 9, 0))
    return c


def roots(a):
    a.set = "roots"
    rig.setup(a, T["cream"], rig.AMBIENT)
    rng = np.random.default_rng(29)
    p = math.radians(PITCH)
    # twice the film's light distance: the same softness and exposure, but even across a frame that is cropped anywhere
    rig.lights((0, 0, -0.1), 2.0, key=1.0)
    cam = rig.camera(60)
    cam.data.type, cam.data.ortho_scale = "ORTHO", SPAN  # no vanishing point: any crop is a whole picture
    centre = Vector((0, 0, (TOP - SPAN * ROOTS[1] / ROOTS[0] / 2) / math.cos(p)))
    cam.location = centre + 8 * Vector((0, -math.cos(p), math.sin(p)))
    rig.aim(cam, centre)

    # the earth itself, exactly as seed.soil makes it: the same two materials, tones and crumb shapes
    tone = np.array([lin(t) for t in seedfilm.EARTH])
    gm = rig.mat("SeamGround", vcol=True, rough=0.95, noise=(40, 0.35), bump=(300, 0.6, 0.003), cells=(170, 1.0, 0.012))
    m = rig.mat("SeamSoil", vcol=True, rough=0.95, noise=(90, 0.3), bump=(420, 0.5, 0.002))
    half = SPAN / 2 + 0.17
    start = lambda q: -0.10 + 0.025 * np.sin(6.3 * q + 0.9) + 0.012 * np.sin(15.1 * q + 2.0)  # where the solid ground starts, just behind the lip
    X, S = np.meshgrid(np.linspace(-half, half, 520), np.linspace(-0.14, 0.21, 70), indexing="ij")
    S = np.clip(S, start(X), edge(X) - 0.03)  # solid only round the lip and down the cut, not to its edge: beyond both ends it is crumbs alone
    lump = np.array([noise.noise(Vector((u * 17, v * 17, 1.3))) for u, v in zip(X.ravel(), S.ravel())]).reshape(X.shape)
    k = (0.5 + 0.9 * lump).clip(0, 1)[..., None]
    col = np.concatenate([tone[0] + (tone[2] - tone[0]) * k, np.ones_like(k)], -1).reshape(-1, 4)
    rig.mesh("SeamGround", bank(X, S, 0.007 * lump), rig.grid_faces(520, 70), gm, col=col)

    def scatter(n, clods=False):
        return n, rng.uniform(-half, half, n), crumbs(rng, n, clods)

    # A bed of crumbs down the cut, as dense as the film's round the seed. Behind the lip the same bed thins out with
    # distance, with nothing under it: the film's own soil shows between the crumbs, so there is no line where this
    # picture starts. Along the edge a crust several crumbs deep outlasts the solid ground and thins away into the
    # loose crumbs, falling. A few clods lie anywhere.
    n, x, z = scatter(20000)
    lay = [(x, z, rng.uniform(0, 1, n) * edge(x), 0.3 * z + rng.uniform(0, 0.006, n))]
    n, x, z = scatter(17000)
    lay.append((x, z, -np.minimum(rng.exponential(0.22, n), 0.9), 0.3 * z + rng.uniform(0, 0.006, n)))
    n, x, z = scatter(17000)
    lay.append((x, z, edge(x) + np.where(rng.uniform(0, 1, n) < 0.6, -rng.uniform(0, 0.06, n), rng.exponential(0.012, n)), rng.uniform(-0.025, 0.012, n)))
    n, x, z = scatter(1800)
    fall = 0.01 + np.minimum(rng.exponential(0.085, n), 0.42)
    # what has come loose is the fine stuff, finer the further it has fallen
    lay.append((x, np.minimum(z, 0.012) * (1 - 0.5 * fall / 0.43), edge(x) + fall, rng.normal(0, 0.03, n)))
    n, x, z = scatter(300, clods=True)
    lay.append((x, z, -0.9 + rng.uniform(0, 1, n) * (edge(x) + 0.9), 0.3 * z))
    x, size, s, h = (np.concatenate(c) for c in zip(*lay))
    N = len(x)
    gcol = np.hstack([tone[rng.integers(0, len(tone), N)] * rng.uniform(0.75, 1.15, (N, 1)), np.ones((N, 1))])
    v, f = rig.blobs(bank(x, s, h), size, rng, jitter=0.22, squash=(0.5, 1.3))
    rig.mesh("SeamGrains", v, f, m, col=np.repeat(gcol, v.shape[1], 0))

    rm = rig.mat("Root", vcol=True, rough=0.5, **{"Subsurface Weight": 0.3, "Subsurface Radius": (0.02, 0.03, 0.02)})
    for i, (x0, length, r0) in enumerate(MAIN):
        e = float(edge(np.array(x0)))
        c = root(f"Root{i}", rm, rng, bank(np.array(x0), np.array(e - 0.05), -0.004), min(length, 0.985 - TOP - e), r0)
        for j in range(int(rng.integers(1, 4))):  # side roots: they leave at an angle and turn down
            at = int(len(c) * rng.uniform(0.2, 0.75))
            root(f"Root{i}Side{j}", rm, rng, c[at], rng.uniform(0.05, 0.15), r0 * 0.4 * (1 - at / len(c)) + 0.0006,
                 lean=rng.choice([-1, 1]) * rng.uniform(0.7, 1.1), settle=0.75)

    rig.render(a, "art", {"roots": ROOTS}, 1, lambda f, sid, aspect: None)


def main():
    a = rig.parse(SETS)
    for name in a.set.split(","):
        {"bag": bag, "lipstick": lipstick, "roots": roots}[name](a)


if __name__ == "__main__":
    main()
