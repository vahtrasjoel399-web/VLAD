# Chrome daisy for the store heading (public/media/store/chrome-flower.png).
# Render: /Applications/Blender.app/Contents/MacOS/Blender -b -P art/chrome-flower.py -- out.png 1000 1333 160
# The site image is that render cropped to 780x980 at (110, 85) and scaled to 720px wide.
import math
import random
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/flower.png'
W = int(argv[1]) if len(argv) > 1 else 600
H = int(argv[2]) if len(argv) > 2 else 800
SAMPLES = int(argv[3]) if len(argv) > 3 else 32

random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def chrome(name, rough=0.06, color=(0.92, 0.92, 0.93)):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = 1.0
    bsdf.inputs['Roughness'].default_value = rough
    return mat


MAT_PETAL = chrome('petal', 0.05)
MAT_CENTER = chrome('center', 0.45, (0.26, 0.26, 0.27))
MAT_STEM = chrome('stem', 0.08, (0.85, 0.85, 0.86))


def petal_mesh(name, length, width, cup, groove, bend, nu=28, nv=10):
    """A petal as a smooth sheet: wide in the middle, closed at the tip, with a centre groove."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    grid = []
    for i in range(nu + 1):
        u = i / nu
        hw = width * (0.22 + 0.78 * math.sin(math.pi * min(u, 0.999)) ** 0.55)
        if u > 0.78:
            hw *= math.sqrt(max(0.0, 1 - ((u - 0.78) / 0.22) ** 2))
        row = []
        for j in range(nv + 1):
            v = j / nv * 2 - 1
            x = u * length
            y = v * hw
            z = cup * v * v * hw
            z -= groove * math.exp(-((v / 0.28) ** 2)) * hw * math.sin(math.pi * u)
            z += bend * u * u * length
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def add_object(name, mesh, mat, parent=None):
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def finish(obj, thickness=0.012, levels=2):
    sol = obj.modifiers.new('solid', 'SOLIDIFY')
    sol.thickness = thickness
    sol.offset = 0
    sub = obj.modifiers.new('sub', 'SUBSURF')
    sub.levels = levels
    sub.render_levels = levels


# Flower head built facing +Z, then turned toward the camera.
head = bpy.data.objects.new('head', None)
scene.collection.objects.link(head)
head.location = (0.0, 0.0, 1.35)
head.rotation_euler = Euler((math.radians(62), math.radians(-8), math.radians(-24)))

rings = [
    # count, length, width, pitch(deg), radius, cup, groove, bend
    (21, 1.12, 0.175, 4, 0.24, 0.5, 0.7, -0.16),
    (13, 0.78, 0.15, 16, 0.22, 0.55, 0.75, -0.08),
]
for r, (count, length, width, pitch, radius, cup, groove, bend) in enumerate(rings):
    offset = 0 if r == 0 else math.pi / count
    for k in range(count):
        a = offset + k / count * math.tau + random.uniform(-0.04, 0.04)
        ln = length * random.uniform(0.9, 1.06)
        me = petal_mesh(f'petal{r}_{k}', ln, width * random.uniform(0.92, 1.08), cup, groove, bend * random.uniform(0.6, 1.4))
        obj = add_object(f'petal{r}_{k}', me, MAT_PETAL, head)
        tilt = math.radians(pitch + random.uniform(-6, 6))
        twist = random.uniform(-0.12, 0.12)
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_basis = (
            Matrix.Rotation(a, 4, 'Z')
            @ Matrix.Translation((radius, 0, 0.02 * r))
            @ Matrix.Rotation(-tilt, 4, 'Y')
            @ Matrix.Rotation(twist, 4, 'X')
        )
        finish(obj)

# Seed disc: a domed button with fine bumps.
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.31)
disc = bpy.context.active_object
disc.name = 'disc'
disc.parent = head
disc.matrix_parent_inverse = Matrix.Identity(4)
disc.location = (0, 0, 0.07)
disc.scale = (1, 1, 0.38)
disc.data.materials.append(MAT_CENTER)
for p in disc.data.polygons:
    p.use_smooth = True
sub = disc.modifiers.new('sub', 'SUBSURF')
sub.levels = sub.render_levels = 2
tex = bpy.data.textures.new('seeds', 'VORONOI')
tex.noise_scale = 0.022
disp = disc.modifiers.new('bumps', 'DISPLACE')
disp.texture = tex
disp.strength = 0.035
disp.mid_level = 0.6

# Stem: a beveled curve sweeping down and to the right, with thorns and a leaf.
curve = bpy.data.curves.new('stem', 'CURVE')
curve.dimensions = '3D'
curve.bevel_depth = 0.04
curve.bevel_resolution = 8
spline = curve.splines.new('BEZIER')
points = [(0.02, 0.18, 1.2), (0.12, 0.2, 0.55), (0.02, 0.15, -0.15), (0.32, 0.1, -0.95)]
spline.bezier_points.add(len(points) - 1)
for bp, co in zip(spline.bezier_points, points):
    bp.co = co
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
stem = add_object('stem', curve, MAT_STEM)
curve.splines[0].use_smooth = True

for t, side in [(0.28, 1), (0.52, -1), (0.74, 1)]:
    # Sample the curve by evaluating a mesh copy is heavy; approximate with the polyline.
    i = min(int(t * (len(points) - 1)), len(points) - 2)
    f = t * (len(points) - 1) - i
    p0, p1 = Vector(points[i]), Vector(points[i + 1])
    pos = p0.lerp(p1, f)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.035, radius2=0.0, depth=0.16)
    thorn = bpy.context.active_object
    thorn.data.materials.append(MAT_STEM)
    thorn.location = pos + Vector((0.03 * side, -0.01, 0))
    thorn.rotation_euler = Euler((0, math.radians(70 * side), 0))
    for p in thorn.data.polygons:
        p.use_smooth = True

leaf_me = petal_mesh('leaf', 0.55, 0.13, 0.5, 0.4, 0.25)
leaf = add_object('leaf', leaf_me, MAT_PETAL)
leaf.location = (0.09, 0.16, 0.35)
leaf.rotation_euler = Euler((math.radians(-20), math.radians(-38), math.radians(-25)))
finish(leaf, 0.014)

# Studio: black world, strip lights that read as long highlights on the chrome.
world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
# Gradient environment with a bright horizon band and a soft top: chrome needs something to reflect.
nodes = world.node_tree.nodes
links = world.node_tree.links
coord = nodes.new('ShaderNodeTexCoord')
sep = nodes.new('ShaderNodeSeparateXYZ')
ramp_in = nodes.new('ShaderNodeMapRange')
ramp_in.inputs['From Min'].default_value = -1
ramp_in.inputs['From Max'].default_value = 1
ramp = nodes.new('ShaderNodeValToRGB')
els = ramp.color_ramp.elements
els[0].position = 0.0
els[0].color = (0, 0, 0, 1)
els[1].position = 1.0
els[1].color = (0.9, 0.9, 0.92, 1)
for pos, val in [(0.4, 0.01), (0.49, 0.03), (0.53, 0.75), (0.57, 0.04), (0.7, 0.02), (0.84, 0.35)]:
    e = els.new(pos)
    e.color = (val, val, val * 1.02, 1)
bg = nodes['Background']
bg.inputs['Strength'].default_value = 1.0
links.new(coord.outputs['Generated'], sep.inputs['Vector'])
links.new(sep.outputs['Z'], ramp_in.inputs['Value'])
links.new(ramp_in.outputs['Result'], ramp.inputs['Fac'])
links.new(ramp.outputs['Color'], bg.inputs['Color'])


def area(name, loc, target, size, size_y, energy):
    light = bpy.data.lights.new(name, 'AREA')
    light.shape = 'RECTANGLE'
    light.size = size
    light.size_y = size_y
    light.energy = energy
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = loc
    direction = Vector(target) - Vector(loc)
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    return obj


area('key', (-3.0, -2.6, 2.6), (0, 0, 1.2), 0.7, 5.0, 450)
area('rim', (2.6, 1.8, 2.4), (0, 0, 1.3), 0.6, 5.0, 900)
area('top', (0.4, -1.2, 4.6), (0, 0, 1.2), 3.0, 1.2, 250)
area('back', (-0.6, 3.0, 1.6), (0, 0, 1.3), 2.5, 2.5, 700)
area('floor', (1.2, -2.4, -1.4), (0, 0, 0.6), 0.5, 3.0, 150)

cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 54
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.location = (0.35, -7.2, 1.0)
cam.rotation_euler = (Vector((0.05, 0, 0.42)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = 'GPU'
except Exception as e:  # CPU fallback
    print('GPU unavailable:', e)
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = W
scene.render.resolution_y = H
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT)
