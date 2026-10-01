"""Build AKEYA's original fashion sculpture and scroll animation.

Run with Blender 3.0+:
  blender --background --factory-startup --python assets/blender/build_ritual.py
Optional: -- --render-posters to also render the three stills with Cycles.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "frontend" / "public" / "ritual"
SOURCE = Path(__file__).resolve().parent
OUTPUT.mkdir(parents=True, exist_ok=True)
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 121
scene.render.resolution_x = 1440
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "Medium High Contrast"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.world = bpy.data.worlds.new("Warm studio")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.28, 0.31, 0.27, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.35
scene["art_direction"] = "Original sculpted fashion model. Three looks; one continuous camera and accessory journey."
scene["web_playback"] = "Frames 1-121 mapped to scroll progress 0-1. No autoplay."


def material(name, hex_color, roughness=0.5, metallic=0, sheen=0):
    color = tuple(int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))
    linear = tuple(((value + 0.055) / 1.055) ** 2.4 if value > 0.04045 else value / 12.92 for value in color)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*linear, 1)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Sheen"].default_value = sheen
    return mat


skin = material("Sculpted terracotta porcelain", "B98162", 0.55)
skin_shadow = material("Soft lip clay", "9C604F", 0.52)
hair = material("Espresso sculpted hair", "32241F", 0.50)
hair_light = material("Raised hair strands", "483129", 0.44)
hair_dark = material("Hair grooves", "211B18", 0.5)
garment = material("Forest silk dress", "3D6051", 0.46, sheen=0.6)
gold = material("Brushed gold", "D5B271", 0.32, metallic=0.72)
lilac = material("Lilac satin", "B7A0D0", 0.32, sheen=0.8)
butter = material("Butter satin", "E3C97D", 0.36, sheen=0.7)
nail = material("Natural nails", "C68F76", 0.4)
plinth_mat = material("Dark stone", "203C2E", 0.72)


def mesh_object(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def ellipsoid(name, center, scale, mat, segments=40, rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def tube(name, points, radii, mat, sides=12):
    points = [Vector(p) for p in points]
    vertices, faces = [], []
    for i, point in enumerate(points):
        tangent = (points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]).normalized()
        normal = tangent.cross(Vector((0, 1, 0)))
        if normal.length < 0.01:
            normal = tangent.cross(Vector((1, 0, 0)))
        normal.normalize()
        binormal = tangent.cross(normal).normalized()
        for j in range(sides):
            v = point + radii[i] * (math.cos(TAU * j / sides) * normal + math.sin(TAU * j / sides) * binormal)
            vertices.append(tuple(v))
            if i < len(points) - 1:
                a = i * sides + j
                b = i * sides + (j + 1) % sides
                faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((len(points) - 1) * sides + j for j in range(sides)))
    return mesh_object(name, vertices, faces, mat)


def strand(name, points, radius, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 8
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object


def lathe(name, rings, mat, sides=72, face=False):
    vertices, faces = [], []
    for i, (z, rx, ry, cy) in enumerate(rings):
        for j in range(sides):
            theta = TAU * j / sides
            x, y = rx * math.sin(theta), cy - ry * math.cos(theta)
            if face and math.cos(theta) > 0:
                front = max(0, math.cos(theta)) ** 6
                nose = 0.14 * math.exp(-(x / 0.072) ** 2 - ((z - 2.52) / 0.11) ** 2)
                bridge = 0.07 * math.exp(-(x / 0.048) ** 2 - ((z - 2.65) / 0.17) ** 2)
                cheeks = 0.018 * math.exp(-((abs(x) - 0.24) / 0.1) ** 2 - ((z - 2.52) / 0.12) ** 2)
                y -= front * (nose + bridge + cheeks)
            vertices.append((x, y, z))
            if i < len(rings) - 1:
                a, b = i * sides + j, i * sides + (j + 1) % sides
                faces.append((a, b, b + sides, a + sides))
    faces += [tuple(reversed(range(sides))), tuple((len(rings) - 1) * sides + j for j in range(sides))]
    obj = mesh_object(name, vertices, faces, mat)
    modifier = obj.modifiers.new("Silhouette smoothing", "SUBSURF")
    modifier.levels = 1
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def interpolate_rings(keys, steps=48):
    rings = []
    for i in range(steps + 1):
        z = keys[0][0] + (keys[-1][0] - keys[0][0]) * i / steps
        for left, right in zip(keys, keys[1:]):
            if left[0] <= z <= right[0]:
                t = (z - left[0]) / (right[0] - left[0])
                rings.append((z, *(left[j] * (1 - t) + right[j] * t for j in range(1, 4))))
                break
    return rings


head_rings = interpolate_rings([
    (2.025, .055, .10, -.02), (2.08, .17, .21, -.025),
    (2.18, .265, .29, -.015), (2.34, .355, .34, 0),
    (2.5, .412, .365, .015), (2.7, .402, .35, .025),
    (2.91, .386, .345, .04), (3.08, .35, .305, .05),
    (3.24, .18, .17, .05), (3.28, .015, .015, .05),
])
head = lathe("Model - sculpted face", head_rings, skin, face=True)


def face_point(x, z, offset=.007):
    ring = min(head_rings, key=lambda ring: abs(ring[0] - z))
    _, rx, ry, cy = ring
    cosine = math.sqrt(max(0, 1 - (x / rx) ** 2))
    nose = .14 * math.exp(-(x / .072) ** 2 - ((z - 2.52) / .11) ** 2)
    bridge = .07 * math.exp(-(x / .048) ** 2 - ((z - 2.65) / .17) ** 2)
    return (x, cy - ry * cosine - cosine ** 6 * (nose + bridge) - offset, z)
lathe("Model - neck and shoulders", interpolate_rings([
    (.78, .59, .27, .08), (1.15, .68, .31, .055), (1.4, .76, .31, .04),
    (1.56, .66, .29, .02), (1.7, .33, .235, .02),
    (1.83, .20, .19, .025), (2.1, .18, .17, .03), (2.17, .20, .20, .02),
], 36), skin)
lathe("Dress - draped bust", interpolate_rings([
    (.17, .72, .35, .065), (.35, .68, .345, .065), (.86, .68, .345, .065),
    (1.13, .75, .35, .04), (1.35, .80, .35, .04), (1.44, .765, .335, .025),
], 26), garment)
for side in [-1, 1]:
    strap = strand("Dress shoulder strap", [(side * .57, -.255, 1.32), (side * .63, -.14, 1.6), (side * .59, .10, 1.63), (side * .55, .27, 1.34)], .04, garment)
    ellipsoid("Ear", (side * .404, .012, 2.51), (.063, .078, .145), skin)
    strand("Ear inner contour", [(side * .448, -.02, 2.60), (side * .453, -.045, 2.50), (side * .432, -.035, 2.43)], .012, skin_shadow)
    points = [(side * .445 + .076 * math.cos(TAU * i / 36), -.014, 2.33 + .106 * math.sin(TAU * i / 36)) for i in range(37)]
    strand("Gold oval earring", points, .013, gold)
    # Closed eyelids give the sculpted face a deliberate, calm expression.
    x = side * .17
    strand("Closed eyelid", [face_point(x - .094, 2.687), face_point(x, 2.67), face_point(x + .094, 2.682)], .007, hair_dark)
    strand("Sculpted eyebrow", [face_point(x - .09, 2.778), face_point(x, 2.795), face_point(x + .085, 2.774)], .011, hair)
    ellipsoid("Nostril shadow", (side * .043, -.433, 2.484), (.02, .006, .01), skin_shadow, 24, 12)
strand("Cupid bow", [face_point(-.10, 2.345), face_point(-.041, 2.355), face_point(0, 2.346), face_point(.041, 2.355), face_point(.10, 2.345)], .012, skin_shadow)
strand("Lower lip", [face_point(-.085, 2.325), face_point(0, 2.315), face_point(.085, 2.325)], .016, skin_shadow)

# The scalp surface follows a swept-back hairline, with individual raised grooves.
vertices, faces = [], []
for i in range(29):
    t = i / 28
    for j in range(96):
        theta = TAU * j / 96
        limit = 1.05 + 1.03 * (1 - math.cos(theta)) / 2
        phi = .008 + t * limit
        vertices.append((.442 * math.sin(phi) * math.sin(theta), .04 - .40 * math.sin(phi) * math.cos(theta), 2.67 + .65 * math.cos(phi)))
        if i < 28:
            a, b = i * 96 + j, i * 96 + (j + 1) % 96
            faces.append((a, b, b + 96, a + 96))
mesh_object("Hair - swept scalp", vertices, faces, hair)
for j in range(66):
    start = -math.pi + (j + .5) / 66 * TAU
    limit = 1.05 + 1.03 * (1 - math.cos(start)) / 2
    end = math.copysign(math.pi, start)
    points = []
    for i in range(13):
        t = i / 12
        theta = start * (1 - t) + end * t
        phi = limit * (1 - t) + 1.25 * t - .48 * math.sin(math.pi * t)
        points.append((.449 * math.sin(phi) * math.sin(theta), .04 - .407 * math.sin(phi) * math.cos(theta), 2.67 + .657 * math.cos(phi)))
    strand("Hair flow %02d" % j, points, .0045 if j % 3 else .006, hair_light if j % 4 else hair_dark)


def group(name, location):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj


def parent_preserving(obj, parent):
    bpy.context.view_layer.update()
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()


pony = group("Ponytail choreography", (0, .43, 2.87))
for j in range(9):
    theta = TAU * j / 9
    points, radii = [], []
    for i in range(28):
        t = i / 27
        spread = .065 + .11 * math.sin(t * math.pi)
        points.append((.15 * math.sin(t * 3) + spread * math.cos(theta + t * 3),
                       .47 + .44 * math.sin(t * 2.2) + spread * math.sin(theta + t * 3),
                       2.87 - 1.20 * t))
        radii.append(.048 + .055 * math.sin(t * math.pi) if i < 26 else .036 - (i - 26) * .015)
    parent_preserving(tube("Ponytail lock %02d" % j, points, radii, hair if j % 3 else hair_light, 12), pony)

bun = group("Bun choreography", (0, .43, 3.01))
for j in range(5):
    points = []
    for i in range(69):
        angle = TAU * i / 68
        radius = .21 + .025 * math.cos(angle * 3 + j)
        points.append((radius * math.cos(angle), .46 + .085 * math.sin(angle * 2 + j * 1.25),
                       3.02 + radius * math.sin(angle)))
    parent_preserving(tube("Wound bun lock %02d" % j, points, [.05] * len(points), hair if j % 2 else hair_light, 10), bun)

# A raised forearm and articulated fingers are modeled, not a floating bracelet.
arm = group("Wrist pose", (.61, .015, 1.55))
forearm = group("Forearm gesture", (1.02, -.10, .97))
parent_preserving(forearm, arm)
forearm.rotation_mode = "QUATERNION"
arm_objects = []
arm_objects.append(tube("Upper arm", [(.61, .015, 1.55), (.77, .025, 1.36), (.94, -.015, 1.11), (1.02, -.10, .97)], [.16, .145, .13, .12], skin, 24))
arm_objects.append(tube("Forearm", [(1.02, -.10, .97), (1.11, -.25, 1.2), (1.07, -.44, 1.56), (.96, -.52, 1.95)], [.12, .13, .105, .075], skin, 24))
arm_objects.append(ellipsoid("Elbow", (1.02, -.10, .98), (.12, .12, .14), skin))
arm_objects.append(ellipsoid("Palm", (.93, -.535, 2.12), (.125, .065, .205), skin))
for j in range(4):
    x = .835 + j * .06
    length = [.255, .315, .295, .235][j]
    points = [(x, -.54, 2.25), (x - .01, -.56, 2.25 + length * .45),
              (x - .012, -.6 - .014 * j, 2.25 + length * .85), (x + .003, -.66 - .012 * j, 2.25 + length)]
    arm_objects.append(tube("Finger %d" % j, points, [.027, .025, .021, .012], skin, 12))
    arm_objects.append(ellipsoid("Fingertip %d" % j, points[-1], (.016, .02, .022), skin, 24, 12))
    arm_objects.append(ellipsoid("Nail %d" % j, (points[-1][0], points[-1][1] - .014, points[-1][2] - .006), (.012, .005, .022), nail, 20, 12))
arm_objects.append(tube("Thumb", [(1.025, -.56, 2.06), (1.1, -.58, 2.12), (1.13, -.61, 2.23), (1.115, -.64, 2.29)], [.044, .039, .028, .014], skin, 16))
for obj in arm_objects:
    parent_preserving(obj, arm if obj.name in ["Upper arm", "Elbow"] else forearm)
left_arm = tube("Relaxed left arm", [(-.63, .045, 1.52), (-.82, .07, 1.27), (-.85, .02, .97), (-.78, -.055, .62)], [.15, .14, .12, .10], skin, 24)


def scrunchie(name, mat):
    vertices, faces = [], []
    for i in range(144):
        u = i / 144 * TAU
        for j in range(32):
            v = j / 32 * TAU
            folds = .023 * math.cos(u * 24 + .7 * math.sin(v) + .35 * math.sin(u * 5))
            tube_radius = .062 + folds + .006 * math.sin(u * 48 + v * 3)
            radius = .145 + tube_radius * math.cos(v)
            vertices.append((radius * math.cos(u), radius * math.sin(u), tube_radius * math.sin(v) * .9))
            faces.append((i * 32 + j, ((i + 1) % 144) * 32 + j, ((i + 1) % 144) * 32 + (j + 1) % 32, i * 32 + (j + 1) % 32))
    return mesh_object(name, vertices, faces, mat)


hero_scrunchie = scrunchie("Hero lilac scrunchie", lilac)
second_scrunchie = scrunchie("Butter wrist scrunchie", butter)
parent_preserving(second_scrunchie, forearm)
hero_scrunchie.rotation_mode = "QUATERNION"
second_scrunchie.rotation_mode = "QUATERNION"
second_scrunchie.location = (.975, -.52, 1.855)
second_scrunchie.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(Vector((-.2, -.1, .98)).normalized())
# Reset inverse: the bracelet coordinates are authored in model space.
second_scrunchie.matrix_parent_inverse = forearm.matrix_world.inverted()

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=.91, depth=.17, location=(0, .05, .075))
plinth = bpy.context.object
plinth.name = "Sculpture pedestal"
plinth.data.materials.append(plinth_mat)
bevel = plinth.modifiers.new("Stone rim", "BEVEL")
bevel.width = .035
bevel.segments = 3
bpy.context.view_layer.objects.active = plinth
bpy.ops.object.modifier_apply(modifier=bevel.name)


def smooth(value):
    value = max(0, min(value, 1))
    return value * value * (3 - 2 * value)


def mix(a, b, t):
    return Vector(a).lerp(Vector(b), t)


camera_data = bpy.data.cameras.new("Ritual lens")
camera = bpy.data.objects.new("RitualCamera", camera_data)
bpy.context.collection.objects.link(camera)
scene.camera = camera
camera_data.lens = 52
camera_data.clip_start = .1
camera_data.clip_end = 100
camera.rotation_mode = "QUATERNION"

for frame in range(1, 122, 2):
    t = (frame - 1) / 120
    first = smooth((t - .18) / .25)
    second = smooth((t - .57) / .26)
    # A single orbit carries the silhouette into the bun, then closes in on the wrist.
    eye = mix((4.6, -4.2, 3.4), (3.5, 4.1, 3.7), first)
    eye = eye.lerp(Vector((3.3, -4.8, 3.0)), second)
    focus = mix((-.20, .05, 2.05), (-.18, .10, 2.35), first)
    focus = focus.lerp(Vector((.42, -.35, 2.0)), second)
    camera.location = eye
    camera.rotation_quaternion = (focus - eye).to_track_quat("-Z", "Y")
    camera.keyframe_insert(data_path="location", frame=frame)
    camera.keyframe_insert(data_path="rotation_quaternion", frame=frame)

    pony.scale = (max(.001, 1 - first),) * 3
    pony.keyframe_insert(data_path="scale", frame=frame)
    bun.scale = (max(.001, first),) * 3
    bun.keyframe_insert(data_path="scale", frame=frame)
    arm.rotation_euler = (0, 0, 0)
    arm.keyframe_insert(data_path="rotation_euler", frame=frame)
    rest_rotation = Vector((-.06, -.42, .98)).normalized().rotation_difference(Vector((.05, -.12, -1)).normalized())
    forearm.rotation_quaternion = rest_rotation.slerp(Vector((0, 0, 1)).rotation_difference(Vector((0, 0, 1))), second)
    forearm.keyframe_insert(data_path="rotation_quaternion", frame=frame)
    position = mix((.06, .64, 2.84), (0, .51, 3.035), first)
    position = position.lerp(Vector((.96, -.52, 1.96)), second)
    position.x += .44 * math.sin(math.pi * second)
    hero_scrunchie.location = position
    hair_rotation = Vector((0, 0, 1)).rotation_difference(Vector((0, 1, .1)).normalized())
    wrist_rotation = Vector((0, 0, 1)).rotation_difference(Vector((-.2, -.1, .98)).normalized())
    hero_scrunchie.rotation_quaternion = hair_rotation.slerp(wrist_rotation, second)
    size = (1.22 + first * .10) * (1 - second) + second * .84
    hero_scrunchie.scale = (size * (1 + .30 * math.sin(math.pi * second)), size, size)
    for data_path in ["location", "rotation_quaternion", "scale"]:
        hero_scrunchie.keyframe_insert(data_path=data_path, frame=frame)
    second_scrunchie.scale = (max(.001, second * .8),) * 3
    second_scrunchie.keyframe_insert(data_path="scale", frame=frame)

# Every exported action shares the same range. glTF groups the tracks into a clip.
for action in bpy.data.actions:
    for curve in action.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = "LINEAR"

for name, location, power, size in [
    ("Key softbox", (3, -4, 6), 500, 5),
    ("Rim softbox", (-3, 3, 5), 650, 4),
    ("Fill softbox", (-4, -2, 2.8), 220, 4),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 2)) - light.location).to_track_quat("-Z", "Y").to_euler()

for frame, name in [(1, "01 - Ponytail"), (61, "02 - Bun"), (121, "03 - Wrist stack")]:
    scene.timeline_markers.new(name, frame=frame)
scene.frame_set(1)
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.threads_mode = "FIXED"
scene.render.threads = 4
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "akeya-ritual.blend"), compress=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT / "akeya-ritual.glb"),
    export_format="GLB", export_cameras=True, export_lights=False,
    export_animations=True, export_frame_range=True, export_force_sampling=True,
    export_nla_strips=False, export_yup=True, export_apply=False,
)
report = {
    "source": "assets/blender/akeya-ritual.blend",
    "generator": "assets/blender/build_ritual.py",
    "blender_version": bpy.app.version_string,
    "frames": [1, 121], "fps": 24, "duration_seconds": 5,
    "looks": [{"name": "ponytail", "frame": 1}, {"name": "bun", "frame": 61}, {"name": "wrist", "frame": 121}],
    "camera": camera.name, "reference_aspect": 4 / 3,
    "description": "Original sculpted model, not a scan or likeness of a real person.",
    "mesh_objects": len([obj for obj in scene.objects if obj.type == "MESH"]),
    "vertices": sum(len(obj.data.vertices) for obj in scene.objects if obj.type == "MESH"),
}
(OUTPUT / "animation.json").write_text(json.dumps(report, indent=2) + "\n")
if "--render-posters" in sys.argv:
    render_directory = SOURCE / "renders"
    render_directory.mkdir(exist_ok=True)
    for frame, name in [(1, "ponytail"), (61, "bun"), (121, "wrist")]:
        scene.frame_set(frame)
        scene.render.filepath = str(render_directory / f"blender-{name}.png")
        bpy.ops.render.render(write_still=True)
print("AKEYA Blender scene and glTF export complete.")
