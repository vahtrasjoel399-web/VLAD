# Chrome wireframe globe with a solid polar cap, after the reference on the
# client's Pinterest board. Used in the store "How it works" block.
# Render: /Applications/Blender.app/Contents/MacOS/Blender -b -P art/chrome-globe.py -- out.png 900 128
import math
import sys

import bpy
from mathutils import Euler, Vector

argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/globe.png'
SIZE = int(argv[1]) if len(argv) > 1 else 900
SAMPLES = int(argv[2]) if len(argv) > 2 else 96

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

mat = bpy.data.materials.new('chrome')
mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (0.93, 0.93, 0.94, 1)
bsdf.inputs['Metallic'].default_value = 1
bsdf.inputs['Roughness'].default_value = 0.06

globe = bpy.data.objects.new('globe', None)
scene.collection.objects.link(globe)
TUBE = 0.075
CAP = 62  # latitude (deg) where the solid polar cap starts


def ring(points, closed=True):
    curve = bpy.data.curves.new('wire', 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = TUBE
    curve.bevel_resolution = 6
    curve.use_fill_caps = True
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    spline.use_cyclic_u = closed
    spline.use_smooth = True
    obj = bpy.data.objects.new('wire', curve)
    obj.data.materials.append(mat)
    obj.parent = globe
    scene.collection.objects.link(obj)


# Meridians: half circles from the south pole up to the cap edge.
for k in range(12):
    lon = k / 12 * math.tau
    pts = []
    for i in range(121):
        lat = math.radians(-90 + (90 + CAP) * i / 120)
        pts.append((math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)))
    ring(pts, closed=False)
# Parallels.
for lat_deg in (-60, -36, -12, 12, 36, CAP):
    lat = math.radians(lat_deg)
    pts = [
        (math.cos(lat) * math.cos(a), math.cos(lat) * math.sin(a), math.sin(lat))
        for a in (j / 160 * math.tau for j in range(160))
    ]
    ring(pts)

# Solid polar cap: a slightly thick shell over the top of the sphere.
bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64, radius=1 + TUBE * 0.6)
cap = bpy.context.active_object
cap.parent = globe
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
z_min = math.sin(math.radians(CAP)) * (1 + TUBE * 0.6)
for v in cap.data.vertices:
    v.select = v.co.z < z_min
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.delete(type='VERT')
bpy.ops.object.mode_set(mode='OBJECT')
solid = cap.modifiers.new('solid', 'SOLIDIFY')
solid.thickness = TUBE * 1.6
for p in cap.data.polygons:
    p.use_smooth = True
cap.data.materials.append(mat)

# Tip the globe toward the camera so the cap reads, like the reference.
globe.rotation_euler = Euler((math.radians(30), math.radians(-12), math.radians(14)))

# Studio: graded dome with a bright horizon band, plus strip lights.
world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
nodes, links = world.node_tree.nodes, world.node_tree.links
coord = nodes.new('ShaderNodeTexCoord')
sep = nodes.new('ShaderNodeSeparateXYZ')
rng = nodes.new('ShaderNodeMapRange')
rng.inputs['From Min'].default_value = -1
rng.inputs['From Max'].default_value = 1
ramp = nodes.new('ShaderNodeValToRGB')
els = ramp.color_ramp.elements
els[0].position, els[0].color = 0.0, (0, 0, 0, 1)
els[1].position, els[1].color = 1.0, (0.9, 0.9, 0.92, 1)
for pos, val in [(0.4, 0.01), (0.49, 0.03), (0.53, 0.75), (0.57, 0.04), (0.7, 0.02), (0.84, 0.35)]:
    e = els.new(pos)
    e.color = (val, val, val * 1.02, 1)
links.new(coord.outputs['Generated'], sep.inputs['Vector'])
links.new(sep.outputs['Z'], rng.inputs['Value'])
links.new(rng.outputs['Result'], ramp.inputs['Fac'])
links.new(ramp.outputs['Color'], nodes['Background'].inputs['Color'])


def area(loc, size, size_y, energy):
    light = bpy.data.lights.new('a', 'AREA')
    light.shape = 'RECTANGLE'
    light.size, light.size_y, light.energy = size, size_y, energy
    obj = bpy.data.objects.new('a', light)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()


area((-3.5, -3, 3), 0.7, 6, 600)
area((3.5, 2, 2.5), 0.6, 6, 900)
area((0.5, -1.5, 5), 3, 1.2, 300)
area((-1, 4, 1.5), 3, 3, 700)

cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 85
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -7.6, 0)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    scene.cycles.device = 'GPU'
except Exception as e:
    print('GPU unavailable:', e)
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT)
