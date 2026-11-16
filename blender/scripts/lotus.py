"""Animation 3 lotus. Run:
blender -b --factory-startup -P blender/scripts/lotus.py -- --export out.glb [--render dir] [--blend file.blend]
Blender is Z up, front = -Y (site camera at glTF +Z). Deterministic, no randomness."""
import argparse
import math
import sys
from pathlib import Path

import bpy
import mathutils
from mathutils import Euler, Quaternion, Vector

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


# ---- tuned numbers -------------------------------------------------------
# ring: count, azimuths(deg), r, z_base, length, width, closed_tilt, open (absolute),
#       bulge (fraction of length), cup, curl (tip curl, fraction of length)
RINGS = [
    dict(az=[-150, -90, -30, 30, 90, 150], r=0.07, z=0.00, L=0.50, W=0.26, closed=-0.09,
         open=[1.10, 1.10, 1.10, 1.00, 1.00, 1.00], bulge=0.26, cup=0.55, curl=0.04),
    dict(az=[-120, -60, 0, 60, 120, 180], r=0.05, z=0.01, L=0.42, W=0.22, closed=-0.08,
         open=[0.75] * 6, bulge=0.22, cup=0.55, curl=0.04),
    dict(az=[-54, 18, 90, 162, 234], r=0.03, z=0.02, L=0.30, W=0.16, closed=-0.07,
         open=[0.40] * 5, bulge=0.17, cup=0.55, curl=0.04),
]
PILLAR = {-150: 1, -90: 2, -30: 3}  # ring 0 azimuth -> order
PILLAR_SCALE = 1.08
NU, NV = 9, 14
SOLIDIFY = 0.006
POD_TOP_Z, POD_TOP_R = 0.14, 0.08

common.reset_scene()
scene = bpy.context.scene
root = bpy.data.objects.new("Lotus", None)
scene.collection.objects.link(root)


def new_obj(name, me, parent):
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.parent = parent
    return ob


def make_mesh(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    return me


def paint(me, fn, domain="POINT"):
    """fn(co, normal) -> (r, g, b, a) linear."""
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", domain)
    if domain == "POINT":
        for v in me.vertices:
            attr.data[v.index].color = fn(v.co, v.normal)
    else:
        for p in me.polygons:
            for li in p.loop_indices:
                attr.data[li].color = fn(me.vertices[me.loops[li].vertex_index].co, p.normal)
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = me.color_attributes.find("Col")


def lathe(name, profile, segs):
    """profile: [(radius, z)] bottom to top; closed with a top cap if last radius > 0."""
    verts, faces = [], []
    for r, z in profile:
        for s in range(segs):
            a = 2 * math.pi * s / segs
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for k in range(len(profile) - 1):
        for s in range(segs):
            a, b = k * segs + s, k * segs + (s + 1) % segs
            faces.append((a, b, b + segs, a + segs))
    faces.append(tuple(range((len(profile) - 1) * segs, len(profile) * segs)))
    return make_mesh(name, verts, faces)


# ---- stem ---------------------------------------------------------------
mint = (*lin(T["stem-mint"]), 1.0)
STEM_TOP, STEM_BOT, SEGS_Z = -0.02, -1.10, 24
verts, faces = [], []
for k in range(SEGS_Z + 1):
    t = k / SEGS_Z
    z = STEM_TOP + (STEM_BOT - STEM_TOP) * t
    cx = 0.07 * math.sin(t * 2.2) * t  # gentle sideways curve
    rad = 0.022 - 0.010 * t
    for s in range(8):
        a = 2 * math.pi * s / 8
        verts.append((cx + rad * math.cos(a), rad * math.sin(a), z))
for k in range(SEGS_Z):
    for s in range(8):
        a, b = k * 8 + s, k * 8 + (s + 1) % 8
        faces.append((a, a + 8, b + 8, b))
me = make_mesh("Stem", verts, faces)
paint(me, lambda co, n: (*mint[:3], 1.0 - smoothstep(-0.45, -1.10, co.z)))
new_obj("Stem", me, root)

# ---- receptacle, pod, seed -----------------------------------------------
me = lathe("Receptacle", [(0.016, -0.06), (0.030, -0.035), (0.058, -0.012), (0.080, 0.004)], 14)
me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
paint(me, lambda co, n: mint)
new_obj("Receptacle", me, root)

peach = T["peach-glow"]
side = (*lin(mixc(peach, T["stem-mint"], 0.5)), 1.0)
top = (*lin(peach), 1.0)
me = lathe("Pod", [(0.030, 0.03), (POD_TOP_R, POD_TOP_Z)], 14)
for p in me.polygons:
    p.use_smooth = len(p.vertices) == 4 and False
paint(me, lambda co, n: top if n.z > 0.9 else side, "CORNER")
new_obj("Pod", me, root)

taupe = (*lin(mixc(peach, T["plum-ink"], 0.45)), 1.0)
verts, faces = [], []
RS, RR = 10, 8
for i in range(RR + 1):
    th = math.pi * i / RR
    for j in range(RS):
        ph = 2 * math.pi * j / RS
        verts.append((0.011 * math.sin(th) * math.cos(ph), 0.011 * math.sin(th) * math.sin(ph),
                      0.0175 * math.cos(th) + POD_TOP_Z + 0.008))
for i in range(RR):
    for j in range(RS):
        a, b = i * RS + j, i * RS + (j + 1) % RS
        faces.append((a, b, b + RS, a + RS))
me = make_mesh("Seed", verts, faces)
paint(me, lambda co, n: taupe)
new_obj("Seed", me, root)


# ---- petals ---------------------------------------------------------------
def petal_mesh(name, ring, scale):
    L, W = ring["L"] * scale, ring["W"] * scale
    B, C, K = ring["bulge"] * L, ring["curl"] * L, ring["cup"]
    verts, faces = [], []
    for j in range(NV):
        v = j / (NV - 1)
        s = math.sin(math.pi * v ** 1.16) ** 0.85
        w = max(0.04, s + 0.10 * (1 - v) ** 2)
        for i in range(NU):
            u = -1 + 2 * i / (NU - 1)
            x = u * w * W / 2
            y = K * x * x / (W / 2)  # cup: edges curl toward +Y
            y -= B * math.sin(math.pi * v) ** 2  # mid-length bulge outward (-Y)
            y += C * v ** 3  # tip curls inward
            verts.append((x, y, v * L))
    for j in range(NV - 1):
        for i in range(NU - 1):
            a = j * NU + i
            faces.append((a, a + 1, a + 1 + NU, a + NU))
    me = make_mesh(name, verts, faces)
    pk, tp = lin(T["petal-soft"]), lin(T["lotus-pink"])
    paint(me, lambda co, n: (*[a + (b - a) * smoothstep(0.45, 1.0, co.z / L) for a, b in zip(pk, tp)], 1.0))
    return me


pivots = []  # (pivot, petal, closedQ, open_delta, order)
for ri, ring in enumerate(RINGS):
    for i, adeg in enumerate(ring["az"]):
        a = math.radians(adeg)
        order = PILLAR.get(adeg, 4) if ri == 0 else 4
        scale = PILLAR_SCALE if order < 4 else 1.0
        pv = bpy.data.objects.new(f"Pivot_{ri}_{i}", None)
        scene.collection.objects.link(pv)
        pv.parent = root
        pv.rotation_mode = "XYZ"
        pv.location = (ring["r"] * math.cos(a), ring["r"] * math.sin(a), ring["z"])
        pv.rotation_euler = (ring["closed"], 0, a + math.pi / 2)
        delta = ring["open"][i] - ring["closed"]
        pv["ring"], pv["order"], pv["open"] = ri, order, delta
        pt = new_obj(f"Petal_{ri}_{i}", petal_mesh(f"Petal_{ri}_{i}", ring, scale), pv)
        mod = pt.modifiers.new("Solidify", "SOLIDIFY")
        mod.thickness, mod.offset = SOLIDIFY, -1
        pivots.append((pv, pt, pv.rotation_euler.to_quaternion(), delta, order))

bpy.context.view_layer.update()

# ---- self-checks ----------------------------------------------------------
dg = bpy.context.evaluated_depsgraph_get()
tris = 0
for ob in scene.objects:
    if ob.type == "MESH":
        em = ob.evaluated_get(dg).to_mesh()
        tris += len(em.loop_triangles)
        ob.evaluated_get(dg).to_mesh_clear()
        assert ob.data.color_attributes.active_color is not None, f"{ob.name}: no active colour"
        assert ob.data.color_attributes.active_color.data_type == "FLOAT_COLOR", ob.name
assert tris <= 15000, f"{tris} triangles"
assert len(pivots) == 17, len(pivots)
counts = {}
for p in pivots:
    counts[p[4]] = counts.get(p[4], 0) + 1
assert counts == {1: 1, 2: 1, 3: 1, 4: 14}, counts


def tip_radius(pv, pt, q):
    tip = max(pt.data.vertices, key=lambda v: v.co.z).co
    m = mathutils.Matrix.LocRotScale(pv.location, q, None)
    p = m @ tip
    return math.hypot(p.x, p.y)


for pv, pt, cq, delta, order in pivots:
    r0 = tip_radius(pv, pt, cq)
    r1 = tip_radius(pv, pt, cq @ Quaternion((1, 0, 0), delta))
    assert r1 > r0, f"{pv.name}: hinge sign wrong ({r0:.3f} -> {r1:.3f})"
print(f"LOTUS checks ok: {tris} triangles, 17 pivots, orders {counts}")

common.export_glb(args.export)
print("LOTUS exported", args.export)

# ---- lookdev ----------------------------------------------------------------
if not (args.render or args.blend):
    sys.exit(0)

mat = bpy.data.materials.new("Lookdev")
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes["Principled BSDF"]
att = nt.nodes.new("ShaderNodeAttribute")
att.attribute_name = "Col"
nt.links.new(att.outputs["Color"], bsdf.inputs["Base Color"])
nt.links.new(att.outputs["Alpha"], bsdf.inputs["Alpha"])
bsdf.inputs["Roughness"].default_value = 0.6
for n in ("Sheen Weight",):
    if n in bsdf.inputs:
        bsdf.inputs[n].default_value = 1.0
for attr in ("surface_render_method",):
    if hasattr(mat, attr):
        setattr(mat, attr, "DITHERED")
for ob in scene.objects:
    if ob.type == "MESH":
        ob.data.materials.append(mat)

cream = lin(T["cream"])
world = bpy.data.worlds.new("W")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (*cream, 1)
bg.inputs["Strength"].default_value = 0.9
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
    aim(lo, (0, 0, 0.1))


add_light("Key", "AREA", (-3, -3, 4), lin(T["cream"]), 600, 3)
add_light("Fill", "AREA", (3, -2.5, 1), (0.75, 0.85, 1.0), 120, 3)
add_light("Rim", "AREA", (1.5, 4, 2), lin(T["petal-soft"]), 300, 2)

cam_d = 2.49
cd = bpy.data.cameras.new("Cam")
cd.angle = math.radians(35)
cam = bpy.data.objects.new("Cam", cd)
scene.collection.objects.link(cam)
cam.location = Vector((0, -cam_d * math.cos(0.25), 0.12 + cam_d * math.sin(0.25)))
aim(cam, (0, 0, 0.12))
scene.camera = cam

if args.blend:
    Path(args.blend).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=args.blend)


def pose(open_orders, tilt=0.0):
    for pv, pt, cq, delta, order in pivots:
        pv.rotation_mode = "QUATERNION"
        e = 1.0 if order in open_orders else 0.0
        pv.rotation_quaternion = cq @ Quaternion((1, 0, 0), delta * e)
    root.rotation_euler = (tilt, 0, 0)


if args.render:
    out = Path(args.render)
    out.mkdir(parents=True, exist_ok=True)
    for name, orders, tilt in [("closed", (), 0), ("p1", (1,), 0), ("p123", (1, 2, 3), 0),
                               ("bloom", (1, 2, 3, 4), 0), ("finale", (1, 2, 3, 4), 1.1)]:
        pose(orders, tilt)
        scene.render.filepath = str(out / f"{name}.png")
        bpy.ops.render.render(write_still=True)
    print("LOTUS renders", out)
