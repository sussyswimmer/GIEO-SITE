"""Film `lotus` (07-redesign §4): a bud rises on its stem, the three pillar petals open one at a time, the rest bloom,
and the camera lifts to look into the open flower. Alpha, lit to sit on cream.
Beats (0-based frames): rise 0-20, p1 20-51, p2 51-82, p3 82-113, bloom 113-128, finale 128-159.
Petal layout (three rings, pillar petals at -150, -90, -30 degrees on the outer ring) follows blender/scripts/lotus.py.

  blender -b --factory-startup -P blender/film/lotus.py -- --quality draft|final [--frames ...] [--resume]
"""
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rig  # noqa: E402
from rig import T, lerp, lin, mix, ss, track  # noqa: E402

SETS = {"s": (960, 960)}
FRAMES = 160
# ring: azimuths (deg), pivot radius, base z, length, width, closed tilt, open tilt (rad from upright), bulge, cup
RINGS = [dict(az=[-150, -90, -30, 30, 90, 150], r=0.100, z=0.00, L=0.47, W=0.30, closed=-0.13, open=[0.94, 0.94, 0.94, 0.90, 0.90, 0.90], bulge=0.26, cup=0.55),
         dict(az=[-120, -60, 0, 60, 120, 180], r=0.085, z=0.01, L=0.41, W=0.24, closed=-0.12, open=[0.72] * 6, bulge=0.22, cup=0.55),
         dict(az=[-54, 18, 90, 162, 234], r=0.070, z=0.02, L=0.31, W=0.17, closed=-0.11, open=[0.50] * 5, bulge=0.17, cup=0.55)]
PILLAR = {-150: (20, 51), -90: (51, 82), -30: (82, 113)}  # outer-ring azimuth -> the beat it opens in
PILLAR_SCALE = 1.04
BLOOM = (113, 128)
NU, NV = 17, 33
POD_R, POD_Z = 0.060, 0.128

# (frame, target x, target z, view height, pitch, f-stop): close on the bud, pulling back as each petal opens,
# then up and in over the open flower.
CAM = [(0, 0.0, 0.26, 0.86, 6, 5.6), (20, 0.0, 0.26, 0.84, 9, 5.6), (51, -0.08, 0.25, 1.02, 14, 6.3), (82, -0.06, 0.24, 1.06, 18, 7),
       (113, 0.04, 0.23, 1.12, 20, 8), (128, 0.03, 0.22, 1.24, 23, 9), (140, 0.03, 0.20, 1.22, 34, 10), (149, 0.03, 0.19, 1.20, 40, 10),
       (159, 0.03, 0.19, 1.20, 40, 10)]  # the last ten frames hold: the film hands off to the cards there
TURN = 0.35  # the flower stands a little off square, so no pillar petal points straight down the lens


def smoother(t):
    t = min(1.0, max(0.0, t))
    return t * t * t * (t * (t * 6 - 15) + 10)


def petal(ring, scale, a, tilt, k, wave):
    """Vertices (NV, NU, 3) of one petal in the flower's frame. a: azimuth (rad), tilt: rad from upright (outward +),
    k: 0 bud .. 1 open (an open petal loses its belly and holds itself like a spoon), wave: phase of its ruffled edge."""
    L, W = ring["L"] * scale, ring["W"] * scale
    v, u = np.linspace(0, 1, NV)[:, None], np.linspace(-1, 1, NU)[None, :]
    w = np.maximum(0.03, np.sin(np.pi * v ** 1.16) ** 0.85 + 0.10 * (1 - v) ** 2)
    x = u * w * W / 2
    y = (lerp(ring["cup"], 0.85 * ring["cup"], k) * x * x / (W / 2)  # cupped: edges towards the centre (+y)
         - lerp(1.0, 0.3, k) * ring["bulge"] * L * np.sin(np.pi * v) ** 2  # the bud's belly, outward
         + lerp(0.05, 0.10, k) * L * v ** 3 + 0.07 * k * L * v * v  # the tip leans in; an open petal curves up
         + 0.012 * scale * np.sin(7 * v + wave) * np.abs(u) ** 3 * np.sin(np.pi * v))  # ruffled edge
    z = v * L + 0 * u
    y, z = y * math.cos(tilt) - z * math.sin(tilt), y * math.sin(tilt) + z * math.cos(tilt)
    ph = a + math.pi / 2
    return np.stack([x * math.cos(ph) - y * math.sin(ph) + ring["r"] * math.cos(a),
                     x * math.sin(ph) + y * math.cos(ph) + ring["r"] * math.sin(a), z + ring["z"]], -1)


def petal_mat():
    """Petal: colour painted along its length, light passing through, fine veins running to the tip."""
    m = rig.mat("Petal", vcol=True, rough=0.5, translucent=0.55, **{"Sheen Weight": 0.3, "Sheen Roughness": 0.4, "Specular IOR Level": 0.3})
    nt = m.node_tree
    N, L = nt.nodes.new, nt.links.new
    b = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    uv, sep, sine, bp = N("ShaderNodeUVMap"), N("ShaderNodeSeparateXYZ"), N("ShaderNodeMath"), N("ShaderNodeBump")
    sine.operation = "SINE"
    mul = N("ShaderNodeMath")
    mul.operation, mul.inputs[1].default_value = "MULTIPLY", 2 * math.pi * 17
    L(uv.outputs[0], sep.inputs[0])
    L(sep.outputs[0], mul.inputs[0])
    L(mul.outputs[0], sine.inputs[0])
    bp.inputs["Strength"].default_value, bp.inputs["Distance"].default_value = 0.22, 0.002
    L(sine.outputs[0], bp.inputs["Height"])
    L(bp.outputs["Normal"], b.inputs["Normal"])
    # a little of its own colour given back as light: the shadow side of the bud stays pink, never grey
    L(next(n for n in nt.nodes if n.type == "VERTEX_COLOR").outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 0.1
    return m


def petal_colour(ri):
    """Linear RGBA (NV*NU, 4): pale at the base, petal-soft through the body, lotus-pink at tip and edges; inner rings paler."""
    v, u = np.linspace(0, 1, NV)[:, None], np.linspace(-1, 1, NU)[None, :]
    base = np.array(lin(mix(T["petal-soft"], T["cream"], 0.7)))
    body, tip = np.array(lin(mix(T["petal-soft"], T["cream"], 0.15 + 0.1 * ri))), np.array(lin(T["lotus-pink"]))
    c = base + (body - base) * ss(0.0, 0.45, v)[..., None]
    c = c + (tip - c) * np.clip((0.9 - 0.12 * ri) * ss(0.55, 1.0, v) ** 1.3 + 0.14 * np.abs(u) ** 2 * ss(0.3, 0.8, v), 0, 1)[..., None]
    return np.concatenate([c, np.ones((NV, NU, 1))], -1).reshape(-1, 4)


def heart(root, rng):
    """Stem, receptacle, seed pod and stamens: everything that is not a petal."""
    mint = rig.mat("Stem", T["stem-mint"], rough=0.5, noise=(14, 0.06), **{"Subsurface Weight": 0.2, "Subsurface Radius": (0.02, 0.03, 0.02)})
    t = np.linspace(0, 1, 60)
    c = np.stack([0.09 * np.sin(2.2 * t) * t, 0.03 * t * t, lerp(-0.02, -2.2, t)], -1)
    rig.mesh("StemTube", rig.tube(c, 0.024 - 0.007 * t, 12, (0, 1, 0)), rig.grid_faces(60, 13), mint, parent=root)
    v, f = rig.lathe([(0.018, -0.07), (0.030, -0.045), (0.070, -0.018), (0.108, 0.002), (0.100, 0.012), (0, 0.012)], 48)
    rig.subsurf(rig.mesh("Receptacle", v, f, mint, parent=root), 1)
    pod = rig.mat("Pod", mix(T["peach-glow"], T["stem-mint"], 0.22), rough=0.6, noise=(30, 0.05), **{"Subsurface Weight": 0.2})
    v, f = rig.lathe([(0.022, 0.0), (0.034, 0.05), (0.054, 0.105), (POD_R, POD_Z - 0.006), (POD_R - 0.006, POD_Z), (0, POD_Z + 0.002)], 48)
    rig.subsurf(rig.mesh("Pod", v, f, pod, parent=root), 2)
    # seeds: low domes in the pod's top, a shade deeper than the pod, never dark holes
    az = np.r_[0, np.arange(6) * np.pi / 3 + 0.3, np.arange(11) * 2 * np.pi / 11]
    rr = np.r_[0, np.full(6, 0.023), np.full(11, 0.043)]
    cen = np.stack([rr * np.cos(az), rr * np.sin(az), np.full(18, POD_Z + 0.001)], -1)
    sv, sf = rig.blobs(cen, np.full(18, 0.0062), rng, sub=2, jitter=0.05, squash=(0.9, 1.1))
    rig.mesh("Seeds", sv, sf, rig.mat("Seed", rig.chroma(mix(T["peach-glow"], T["plum-ink"], 0.22), 1.3), rough=0.45), parent=root)
    # stamens: a crowd of fine filaments round the pod, each ending in an anther
    S = 72
    a = np.linspace(0, 2 * np.pi, S, endpoint=False)[:, None] + rng.uniform(-0.05, 0.05, (S, 1))
    k = np.linspace(0, 1, 8)[None, :]
    rad = 0.066 + rng.uniform(0.012, 0.048, (S, 1)) * k ** 1.6
    z = 0.02 + rng.uniform(0.085, 0.125, (S, 1)) * k
    path = np.stack([rad * np.cos(a), rad * np.sin(a), z], -1)
    r = 0.0015 * (1 + 1.5 * ss(0.72, 0.9, k)) * ss(1.0, 0.94, k) + 0 * a
    col = lerp(np.array(lin(T["peach-glow"])), np.array(lin(mix(T["peach-glow"], T["cream"], 0.5))), ss(0.6, 0.9, k)[..., None] + 0 * a[..., None])
    col = np.repeat(np.concatenate([col, np.ones((S, 8, 1))], -1), 6, 1).reshape(-1, 4)
    rig.mesh("Stamens", rig.tube(path, r, 5, np.stack([-np.sin(a), np.cos(a), 0 * a], -1)), rig.grid_faces(8, 6, S),
             rig.mat("Stamen", vcol=True, rough=0.6, **{"Subsurface Weight": 0.3}), col=col, parent=root)


def main():
    a = rig.parse(SETS)
    rig.setup(a, T["cream"], 0.75 * rig.AMBIENT)  # a dimmer sky than the seed's: the layers of petals shade one another
    rng = np.random.default_rng(5)
    rig.lights((0, 0, 0.25), 1.0, key=1.05, fill=0.9, rim=1.5)
    # a soft sun low behind the flower: it is the light that comes through the petals
    rig.light("Back", (0.5, 2.6, 0.75), (0, 0, 0.25), rig.KEY_W * 0.55, 1.8, lin(mix((1, 1, 1), T["peach-glow"], 0.5)))
    # and a pink bounce from below the lens, as if off the water: it warms the underside the key cannot reach
    rig.light("Under", (0.4, -1.9, -0.7), (0, 0, 0.2), rig.KEY_W * 0.3, 2.2, lin(mix(T["lotus-pink"], T["peach-glow"], 0.4)))
    cam = rig.camera(60)
    root = rig.empty("Lotus")
    heart(root, rng)
    pm = petal_mat()
    uv = np.stack(np.meshgrid(np.linspace(0, 1, NU), np.linspace(0, 1, NV)), -1).reshape(-1, 2)
    petals = []  # (object, ring, scale, azimuth, open tilt, (start, end) frames, ruffle phase)
    for ri, ring in enumerate(RINGS):
        for i, adeg in enumerate(ring["az"]):
            beat = PILLAR.get(adeg) if ri == 0 else None
            ob = rig.subsurf(rig.mesh(f"Petal_{ri}_{i}", np.zeros((NV * NU, 3)), rig.grid_faces(NV, NU), pm, uv=uv, col=petal_colour(ri), parent=root), 1)
            # the rest open in the bloom beat, outer ring first
            span = (beat[0], beat[1] - 5) if beat else (BLOOM[0] + 1.3 * ri + 0.25 * i, BLOOM[1] - 2 + 0.8 * ri)
            petals.append((ob, ring, PILLAR_SCALE if beat else 1.0, math.radians(adeg), ring["open"][i], span, 1.7 * ri + 2.3 * i))

    def pose(f, sid, aspect):
        tx, tz, H, pitch, fstop = track(CAM, f)
        loosen = 0.05 * float(ss(20, 113, f))  # the bud eases as the pillars open
        for ob, ring, scale, az, opened, (f0, f1), wave in petals:
            k = smoother((f - f0) / (f1 - f0))
            k = k + 0.06 * math.sin(math.pi * k) * (1 - k)  # a breath past the ease, so the petal arrives and settles
            rig.set_co(ob, petal(ring, scale, az, lerp(ring["closed"] + loosen, opened, k), k, wave))
        rise = smoother(f / 20)
        root.location = (0, 0, lerp(-0.46, 0.0, rise))  # frame 0 is the section's poster: the bud tip is already in it
        root.rotation_euler = (0, math.radians(2) * (1 - rise), TURN + lerp(-0.6, 0.0, rise) + 0.5 * smoother((f - 128) / 21))
        rig.frame_cam(cam, aspect, (tx, 0, tz), H, pitch, 0, fstop=fstop)

    rig.render(a, "lotus", SETS, FRAMES, pose)


if __name__ == "__main__":
    main()
