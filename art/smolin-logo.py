# Chrome SMOLIN logo, traced from art/smolin-logo-source.png and rendered as
# puffy chrome on a transparent background. The cat's whiskers are scattered
# at random angles (seeded, so re-renders match).
#
# Render: /Applications/Blender.app/Contents/MacOS/Blender -b -P art/smolin-logo.py -- \
#   <out.png> <region: full|face|sign> <width> <samples>
import math
import random
import sys
from collections import deque

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/logo.png'
REGION = argv[1] if len(argv) > 1 else 'full'
WIDTH = int(argv[2]) if len(argv) > 2 else 1600
SAMPLES = int(argv[3]) if len(argv) > 3 else 64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, 'smolin-logo-source.png')

random.seed(5)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# --- Stroke mask from the source drawing -----------------------------------
src = bpy.data.images.load(SOURCE)
W, H = src.size
px = np.array(src.pixels[:], dtype=np.float32).reshape(H, W, 4)[::-1]
lum = px[..., :3].mean(axis=2)
mask = lum < 0.9


def shift_max(m, r, axis):
    out = m.copy()
    for d in range(1, r + 1):
        out[tuple(slice(d, None) if a == axis else slice(None) for a in range(2))] |= m[
            tuple(slice(None, -d) if a == axis else slice(None) for a in range(2))
        ]
        out[tuple(slice(None, -d) if a == axis else slice(None) for a in range(2))] |= m[
            tuple(slice(d, None) if a == axis else slice(None) for a in range(2))
        ]
    return out


def dilate(m, r):
    return shift_max(shift_max(m, r, 0), r, 1)


def erode(m, r):
    return ~dilate(~m, r)


# Close the white highlights inside strokes, then drop specks.
mask = erode(dilate(mask, 14), 14)
mask = dilate(erode(mask, 2), 2)


def component(m, seed_yx, box):
    y0, y1, x0, x1 = box
    seen = np.zeros_like(m)
    q = deque([seed_yx])
    seen[seed_yx] = True
    pts = []
    while q:
        y, x = q.popleft()
        pts.append((y, x))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if y0 <= ny < y1 and x0 <= nx < x1 and m[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return pts


# Whisker areas in source pixels (3840x2160): left pair and right pair.
boxes = [(1564, 1760, 1240, 1730), (1488, 1664, 2300, 2780)]
whiskers = []
for box in boxes:
    y0, y1, x0, x1 = box
    left = mask[y0:y1, x0:x1].copy()
    while left.any():
        ys, xs = np.nonzero(left)
        pts = component(mask, (ys[0] + y0, xs[0] + x0), box)
        for y, x in pts:
            left[y - y0, x - x0] = False
        if len(pts) > 400:
            whiskers.append((box, np.array(pts)))

# Scatter the whiskers: each pair gets its own random tilt, the upper whisker
# drifts up and the lower one down, so they look loose but never cross.
for _, pts in whiskers:
    mask[pts[:, 0], pts[:, 1]] = False
moves = []
for box in boxes:
    pair = sorted((pts for b, pts in whiskers if b == box), key=lambda p: p[:, 0].mean())
    sign = random.choice((-1, 1))
    for k, pts in enumerate(pair):
        ang = math.radians(sign * random.uniform(6, 12) * (1 + 1.4 * k))
        dy = (-1 if k == 0 else 1) * random.uniform(28, 48)
        dx = random.uniform(-45, 45)
        moves.append((pts, ang, dy, dx))
for pts, ang, dy, dx in moves:
    cy, cx = pts.mean(axis=0)
    half = int(np.abs(pts - (cy, cx)).max()) + 4
    ty, tx = np.mgrid[-half : half + 1, -half : half + 1]
    # inverse-rotate target offsets back into the source whisker
    sy = ty * math.cos(ang) - tx * math.sin(ang)
    sx = ty * math.sin(ang) + tx * math.cos(ang)
    stamp = np.zeros((2 * half + 1, 2 * half + 1), bool)
    src_local = np.zeros_like(stamp)
    src_local[(pts[:, 0] - int(cy) + half), (pts[:, 1] - int(cx) + half)] = True
    iy = np.clip(np.round(sy).astype(int) + half, 0, 2 * half)
    ix = np.clip(np.round(sx).astype(int) + half, 0, 2 * half)
    stamp = src_local[iy, ix]
    oy, ox = int(cy + dy) - half, int(cx + dx) - half
    mask[oy : oy + 2 * half + 1, ox : ox + 2 * half + 1] |= stamp
print('whiskers moved:', len(whiskers))
if REGION == 'face':  # the icon shows only the cat
    mask[:1240] = False
    mask[:, :1240] = False
    mask[:, 2800:] = False
print('mask px:', int(mask.sum()), 'of', W * H)


def blur(a, r):
    # three box blurs ~ gaussian
    for _ in range(3):
        for axis in (0, 1):
            c = np.cumsum(np.pad(a, [(r + 1, r) if i == axis else (0, 0) for i in range(2)], mode='edge'), axis=axis)
            hi = [slice(None)] * 2
            lo = [slice(None)] * 2
            hi[axis] = slice(2 * r + 1, None)
            lo[axis] = slice(None, -2 * r - 1)
            a = (c[tuple(hi)] - c[tuple(lo)]) / (2 * r + 1)
    return a


m = mask.astype(np.float32)
# Stacked blurs give every stroke a rounded dome, wide strokes a taller one.
dome = sum(blur(m, r) for r in (3, 6, 10, 16)) / 4
height = dome * blur(m, 2)
alpha = np.clip(blur(m, 1) * 1.15, 0, 1)


def to_image(name, rgb):
    img = bpy.data.images.new(name, W, H, alpha=True, float_buffer=True)
    rgba = np.empty((H, W, 4), np.float32)
    rgba[..., :3] = rgb if rgb.ndim == 3 else rgb[..., None]
    rgba[..., 3] = 1
    img.pixels.foreach_set(rgba[::-1].ravel())
    # Cycles only sees generated pixels reliably once they are on disk.
    path = os.path.join(bpy.app.tempdir, name + '.exr')
    img.filepath_raw = path
    img.file_format = 'OPEN_EXR'
    img.save()
    bpy.data.images.remove(img)
    img = bpy.data.images.load(path)
    img.colorspace_settings.name = 'Non-Color'
    return img


# Tangent-space normal map straight from the height field (rows run top-down).
SLOPE = 6
gy, gx = np.gradient(height)
nrm = np.dstack([-gx * SLOPE, gy * SLOPE, np.ones_like(height)])
nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
normal_img = to_image('normal', nrm * 0.5 + 0.5)
alpha_img = to_image('alpha', alpha)

# --- Scene: flat plane, chrome shading from the height map -------------------
aspect = W / H
bpy.ops.mesh.primitive_plane_add(size=2)
plane = bpy.context.active_object
plane.scale = (aspect, 1, 1)
mat = bpy.data.materials.new('chrome')
mat.use_nodes = True
nt = mat.node_tree
nodes, links = nt.nodes, nt.links
bsdf = nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (0.93, 0.93, 0.94, 1)
bsdf.inputs['Metallic'].default_value = 1
bsdf.inputs['Roughness'].default_value = 0.1
tex_n = nodes.new('ShaderNodeTexImage')
tex_n.image = normal_img
tex_n.interpolation = 'Cubic'
tex_a = nodes.new('ShaderNodeTexImage')
tex_a.image = alpha_img
nmap = nodes.new('ShaderNodeNormalMap')
links.new(tex_n.outputs['Color'], nmap.inputs['Color'])
links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
transparent = nodes.new('ShaderNodeBsdfTransparent')
mix = nodes.new('ShaderNodeMixShader')
out = nodes['Material Output']
links.new(tex_a.outputs['Color'], mix.inputs['Fac'])
links.new(transparent.outputs['BSDF'], mix.inputs[1])
links.new(bsdf.outputs['BSDF'], mix.inputs[2])
links.new(mix.outputs['Shader'], out.inputs['Surface'])
plane.data.materials.append(mat)

# Studio: a dark world with rings and strips of light around the logo. They
# are hidden from the camera and only show up as reflections, so the flat top
# of each stroke stays dark and its rounded flanks catch white lines.
world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.012, 0.013, 1)


def glow(strength):
    m = bpy.data.materials.new('glow')
    m.use_nodes = True
    n = m.node_tree.nodes
    n.remove(n['Principled BSDF'])
    em = n.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = strength
    m.node_tree.links.new(em.outputs['Emission'], n['Material Output'].inputs['Surface'])
    return m


def hide(obj, mat):
    obj.data.materials.append(mat)
    obj.visible_camera = False
    obj.visible_shadow = False


# Narrow rings of light: one high (catches the gentle shoulders of each
# stroke), one low (catches the steep edges).
for radius, z, depth, strength in ((3, 4.4, 0.7, 5.0), (3, 1.5, 0.6, 3.0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=radius, depth=depth, location=(0, 0, z), end_fill_type='NOTHING')
    hide(bpy.context.active_object, glow(strength))
# Asymmetric strips so the highlights are not uniform all around.
for loc, rot, size, strength in (((-5, 3, 2), (1.1, 0, -0.9), (0.6, 8), 6.0), ((5, -1, 1.5), (1.2, 0, 1.6), (0.4, 8), 5.0)):
    bpy.ops.mesh.primitive_plane_add(location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = (size[0], size[1], 1)
    hide(o, glow(strength))

# --- Camera framed on the chosen part of the logo ----------------------------
ys, xs = np.nonzero(mask)
face_top = 1270  # source y where the cat face starts
if REGION == 'sign':
    sel = ys < face_top
elif REGION == 'face':
    # Only the cat: below the letters and right of the S tail.
    sel = (ys >= 1240) & (xs >= 1240) & (xs <= 2800)
else:
    sel = np.ones_like(ys, bool)
y0, y1, x0, x1 = ys[sel].min(), ys[sel].max(), xs[sel].min(), xs[sel].max()
pad = 40
y0, y1, x0, x1 = y0 - pad, y1 + pad, x0 - pad, x1 + pad
if REGION == 'face':  # square for the favicon
    side = max(y1 - y0, x1 - x0)
    cy, cx = (y0 + y1) / 2, (x0 + x1) / 2
    y0, y1, x0, x1 = cy - side / 2, cy + side / 2, cx - side / 2, cx + side / 2
cam_data = bpy.data.cameras.new('cam')
cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
to_world = lambda x, y: ((x / W * 2 - 1) * aspect, -(y / H * 2 - 1))
(wx0, wy0), (wx1, wy1) = to_world(x0, y1), to_world(x1, y0)
cam.location = ((wx0 + wx1) / 2, (wy0 + wy1) / 2, 5)
cam_data.ortho_scale = max(wx1 - wx0, wy1 - wy0)
scene.camera = cam
scene.render.resolution_x = WIDTH
scene.render.resolution_y = round(WIDTH * (wy1 - wy0) / (wx1 - wx0))

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
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('WROTE', OUT, scene.render.resolution_x, scene.render.resolution_y)
