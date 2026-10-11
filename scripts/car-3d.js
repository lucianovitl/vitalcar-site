/* Vitalcar procedural coupe. No assets, dependencies, timers or DOM ownership.
 * Browser: Vitalcar3D.create(canvas) -> { resize(w, h, dpr), draw(state), destroy() }.
 * CommonJS exports also include buildModel(), math and shaders for CPU regression checks.
 * buildModel(): { meshes, materials, bounds, carBounds, stats, vertexStride: 6 }.
 * Each mesh has name/material, Float32Array vertices [x,y,z,nx,ny,nz], Uint16Array
 * triangle indices and { min, max } bounds. All positions/normals are world-space;
 * bounds includes the floor, carBounds excludes it. Matrices are column-major.
 * +X is the nose, +Y is up, +Z is the near side at yaw=0. Yaw increases toward
 * the nose; pitch is camera elevation, clamped to [0.08, 1.18] radians.
 * draw defaults: { yaw: 0.7, pitch: 0.25, color: 'red', lightPhase: 0 } (radians).
 * resize accepts CSS-pixel dimensions, returns actual { width, height, dpr }, and
 * caps DPR at 1.5, each drawing side at 1920, and area at 2,073,600 pixels.
 * draw/resize return false after destruction or observed context loss. destroy is
 * idempotent; the owner handles context restoration and any animation scheduling.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Vitalcar3D = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PI = Math.PI, TAU = PI * 2;
  var MAX_SIDE = 1920, MAX_PIXELS = 2073600;
  var PAINTS = {
    red: [0.58, 0.022, 0.018],
    pearl: [0.76, 0.79, 0.73],
    graphite: [0.042, 0.054, 0.067]
  };

  function finite(n, fallback) { return typeof n === 'number' && isFinite(n) ? n : fallback; }
  function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function normalize(a) {
    var length = Math.sqrt(dot(a, a));
    return length > 1e-12 ? scale(a, 1 / length) : [0, 0, 0];
  }
  function lerpPoint(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }

  function perspective(fovY, aspect, near, far) {
    if (!(fovY > 0 && fovY < PI && aspect > 0 && near > 0 && far > near) ||
        !isFinite(fovY + aspect + near + far)) throw new Error('Invalid perspective.');
    var f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0, 0, f, 0, 0,
      0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0
    ]);
  }
  function lookAt(eye, target, up) {
    var z = normalize(subtract(eye, target));
    if (dot(z, z) < 0.5) throw new Error('Invalid camera position.');
    var x = normalize(cross(up || [0, 1, 0], z));
    if (dot(x, x) < 0.5) x = normalize(cross(Math.abs(z[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0], z));
    var y = cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ]);
  }
  function multiply(a, b) {
    var out = new Float32Array(16);
    for (var c = 0; c < 4; c++) {
      for (var r = 0; r < 4; r++) {
        out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
          a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return out;
  }
  // Returns Cartesian XYZ after the homogeneous divide (including projection).
  function transformPoint(m, p) {
    var w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return [
      (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w,
      (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w,
      (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / w
    ];
  }
  function drawingSize(width, height, dpr, maxSide) {
    width = clamp(finite(width, 1), 1, 65536);
    height = clamp(finite(height, 1), 1, 65536);
    dpr = clamp(finite(dpr, 1), 0.25, 1.5);
    maxSide = clamp(finite(maxSide, MAX_SIDE), 1, MAX_SIDE);
    var w = width * dpr, h = height * dpr;
    var factor = Math.min(1, maxSide / w, maxSide / h, Math.sqrt(MAX_PIXELS / (w * h)));
    return { width: Math.max(1, Math.floor(w * factor)), height: Math.max(1, Math.floor(h * factor)), dpr: dpr * factor };
  }
  function cameraForViewport(width, height, yaw, pitch, bounds) {
    var aspect = Math.max(1, finite(width, 1)) / Math.max(1, finite(height, 1));
    yaw = finite(yaw, 0.7) % TAU;
    pitch = clamp(finite(pitch, 0.25), 0.08, 1.18);
    bounds = bounds || { min: [-2.34, 0.01, -1.13], max: [2.34, 1.70, 1.13] };
    var target = [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2, 0];
    var direction = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    var right = normalize(cross([0, 1, 0], direction)), up = cross(direction, right);
    var fov = 42 * PI / 180, tanY = Math.tan(fov / 2), distance = 4.2;
    // Fit projected corners, not an aspect-blind fixed distance. Leave breathing room
    // for the floor and keep mirrors in frame throughout a complete orbit.
    for (var i = 0; i < 8; i++) {
      var point = subtract([
        i & 1 ? bounds.max[0] : bounds.min[0],
        i & 2 ? bounds.max[1] : bounds.min[1],
        i & 4 ? bounds.max[2] : bounds.min[2]
      ], target);
      var z = dot(direction, point);
      distance = Math.max(distance, z + Math.abs(dot(right, point)) / (tanY * aspect * 0.86),
        z + Math.abs(dot(up, point)) / (tanY * 0.79));
    }
    var eye = add(target, scale(direction, distance));
    // Keep useful depth precision even when a nearly collapsed viewport makes the
    // camera very distant. Eight units also encompass the complete studio floor.
    var near = Math.max(0.1, distance - 8), far = distance + 18;
    var view = lookAt(eye, target, [0, 1, 0]), projection = perspective(fov, aspect, near, far);
    return { eye: eye, target: target, view: view, projection: projection,
      viewProjection: multiply(projection, view), aspect: aspect, distance: distance,
      near: near, far: far, yaw: yaw, pitch: pitch };
  }

  function emptyBounds() { return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }; }
  function includePoint(bounds, point) {
    for (var i = 0; i < 3; i++) {
      bounds.min[i] = Math.min(bounds.min[i], point[i]);
      bounds.max[i] = Math.max(bounds.max[i], point[i]);
    }
  }

  function buildModel() {
    var materials = {
      floor: { color: [0.12, 0.14, 0.16], roughness: 1, metallic: 0, emission: 0, surface: 3 },
      paint: { color: PAINTS.red.slice(), roughness: 0.20, metallic: 0.28, emission: 0, surface: 0 },
      glass: { color: [0.013, 0.035, 0.048], roughness: 0.085, metallic: 0.35, emission: 0, surface: 1 },
      rubber: { color: [0.009, 0.012, 0.015], roughness: 0.91, metallic: 0, emission: 0, surface: 2 },
      trim: { color: [0.021, 0.028, 0.035], roughness: 0.40, metallic: 0.30, emission: 0, surface: 2 },
      alloy: { color: [0.56, 0.64, 0.71], roughness: 0.22, metallic: 0.88, emission: 0, surface: 2 },
      brake: { color: [0.18, 0.20, 0.22], roughness: 0.58, metallic: 0.78, emission: 0, surface: 2 },
      caliper: { color: [0.62, 0.087, 0.026], roughness: 0.36, metallic: 0.20, emission: 0, surface: 2 },
      headlight: { color: [0.66, 0.83, 1], roughness: 0.18, metallic: 0.10, emission: 3.4, surface: 2 },
      taillight: { color: [0.88, 0.004, 0.008], roughness: 0.20, metallic: 0.10, emission: 2.4, surface: 2 }
    };
    var batches = {};
    Object.keys(materials).forEach(function (name) { batches[name] = { vertices: [], indices: [] }; });

    // Primitive-local smoothing avoids rounding hard trim edges. The final batches
    // bake every transform on the CPU, including inverse-scale ellipsoid normals.
    function surface(name, points, triangles, normals, outward) {
      var batch = batches[name], offset = batch.vertices.length / 6, valid = [];
      var ns = normals || points.map(function () { return [0, 0, 0]; });
      for (var i = 0; i < triangles.length; i += 3) {
        var a = triangles[i], b = triangles[i + 1], c = triangles[i + 2];
        var n = cross(subtract(points[b], points[a]), subtract(points[c], points[a]));
        if (dot(n, n) < 1e-16) continue;
        var guide = normals ? add(add(ns[a], ns[b]), ns[c]) : outward;
        if (guide && dot(n, guide) < 0) { var swap = b; b = c; c = swap; n = scale(n, -1); }
        valid.push(a, b, c);
        if (!normals) { ns[a] = add(ns[a], n); ns[b] = add(ns[b], n); ns[c] = add(ns[c], n); }
      }
      points.forEach(function (point, index) {
        var normal = normalize(ns[index]);
        if (dot(normal, normal) < 0.5) normal = outward || [0, 1, 0];
        batch.vertices.push(point[0], point[1], point[2], normal[0], normal[1], normal[2]);
      });
      valid.forEach(function (index) { batch.indices.push(index + offset); });
    }
    function polygon(name, points, outward) {
      var indices = [];
      for (var i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
      surface(name, points, indices, null, outward);
    }
    function grid(name, rows, wrap, outward) {
      var points = [], indices = [], cols = rows[0].length;
      rows.forEach(function (row) { row.forEach(function (p) { points.push(p); }); });
      for (var r = 0; r < rows.length - 1; r++) {
        for (var c = 0; c < (wrap ? cols : cols - 1); c++) {
          var a = r * cols + c, b = r * cols + (c + 1) % cols;
          indices.push(a, b, a + cols, b, b + cols, a + cols);
        }
      }
      surface(name, points, indices, null, outward);
    }
    function box(name, center, size) {
      var x = size[0] / 2, y = size[1] / 2, z = size[2] / 2;
      var corners = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
        [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]].map(function (p) { return add(p, center); });
      [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]].forEach(function (face) {
        polygon(name, face.map(function (v) { return corners[v]; }));
      });
    }
    function tube(name, a, b, radius, segments, endRadius, caps) {
      var axis = normalize(subtract(b, a)), length = Math.sqrt(dot(subtract(b, a), subtract(b, a)));
      var u = normalize(cross(Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], axis));
      var v = cross(axis, u), points = [], normals = [], indices = [];
      endRadius = endRadius === undefined ? radius : endRadius;
      for (var r = 0; r < 2; r++) {
        for (var i = 0; i < segments; i++) {
          var angle = TAU * i / segments, radial = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)));
          points.push(add(r ? b : a, scale(radial, r ? endRadius : radius)));
          normals.push(normalize(add(radial, scale(axis, (radius - endRadius) / length))));
        }
      }
      for (var j = 0; j < segments; j++) {
        var k = (j + 1) % segments;
        indices.push(j, k, j + segments, k, k + segments, j + segments);
      }
      surface(name, points, indices, normals);
      if (caps !== false) {
        polygon(name, points.slice(0, segments), scale(axis, -1));
        polygon(name, points.slice(segments), axis);
      }
    }
    function line(name, points, radius, segments) {
      for (var i = 0; i < points.length - 1; i++) tube(name, points[i], points[i + 1], radius, segments || 6, radius, false);
    }
    function ellipsoid(name, center, radii) {
      var points = [], normals = [], indices = [], rows = 7, cols = 16;
      for (var r = 0; r <= rows; r++) {
        var latitude = PI * r / rows;
        for (var c = 0; c < cols; c++) {
          var longitude = TAU * c / cols;
          var unit = [Math.sin(latitude) * Math.cos(longitude), Math.cos(latitude), Math.sin(latitude) * Math.sin(longitude)];
          points.push(add(center, [unit[0] * radii[0], unit[1] * radii[1], unit[2] * radii[2]]));
          normals.push(normalize([unit[0] / radii[0], unit[1] / radii[1], unit[2] / radii[2]]));
        }
      }
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        var a = y * cols + x, b = y * cols + (x + 1) % cols;
        indices.push(a, b, a + cols, b, b + cols, a + cols);
      }
      surface(name, points, indices, normals);
    }

    // Longitudinal loft: low nose, hood crown, pinched waist, wide rear haunches.
    var sections = [
      [-2.25, 0.88, 0.74], [-2.06, 1.005, 0.88], [-1.70, 1.11, 0.94],
      [-1.36, 1.13, 0.955], [-0.90, 1.09, 0.93], [-0.35, 1.06, 0.904],
      [0.50, 1.075, 0.90], [0.97, 1.105, 0.938], [1.38, 1.13, 0.955],
      [1.83, 1.065, 0.928], [2.06, 0.97, 0.865], [2.25, 0.815, 0.73]
    ];
    var axleXs = [-1.36, 1.38], wheelY = 0.475;
    function bodySection(x) {
      for (var i = 1; i < sections.length; i++) {
        if (x <= sections[i][0]) {
          var a = sections[i - 1], b = sections[i], t = clamp((x - a[0]) / (b[0] - a[0]), 0, 1);
          t = t * t * (3 - 2 * t);
          return [mix(a[1], b[1], t), mix(a[2], b[2], t)];
        }
      }
      return sections[sections.length - 1].slice(1);
    }
    function bodyRing(x) {
      var shape = bodySection(x), top = shape[0], width = shape[1], low = 0.405;
      axleXs.forEach(function (axle) {
        var dx = x - axle;
        if (Math.abs(dx) < 0.535) low = Math.max(low, wheelY + Math.sqrt(0.535 * 0.535 - dx * dx));
      });
      var shoulder = top - 0.095;
      low = Math.min(low, shoulder - 0.012);
      var side = [
        [top, 0], [top - 0.010, width * 0.50], [top - 0.038, width * 0.78],
        [shoulder, width * 0.965], [mix(low, shoulder, 0.68), width * 1.012],
        [mix(low, shoulder, 0.18), width], [low, width * 0.955],
        [low - 0.025, width * 0.80], [low - 0.035, 0]
      ];
      var ring = side.map(function (p) { return [x, p[0], p[1]]; });
      for (var i = side.length - 2; i > 0; i--) ring.push([x, side[i][0], -side[i][1]]);
      return ring;
    }
    var bodyRows = [];
    for (var s = 0; s <= 68; s++) bodyRows.push(bodyRing(mix(-2.25, 2.25, s / 68)));
    grid('paint', bodyRows, true);
    polygon('paint', bodyRows[0], [-1, 0, 0]);
    polygon('paint', bodyRows[bodyRows.length - 1], [1, 0, 0]);
    box('trim', [0, 0.375, 0], [3.82, 0.13, 1.44]);

    // Arches have actual openings in the loft, with proud, rolled fender lips.
    [-1, 1].forEach(function (side) {
      axleXs.forEach(function (axle) {
        var rows = [];
        for (var r = 0; r <= 3; r++) {
          var radius = mix(0.537, 0.579, r / 3), row = [];
          for (var i = 0; i <= 28; i++) {
            var angle = mix(-0.11, PI + 0.11, i / 28), x = axle + Math.cos(angle) * radius;
            row.push([x, wheelY + Math.sin(angle) * radius,
              side * (bodySection(x)[1] * 1.004 + Math.sin(PI * r / 3) * 0.018)]);
          }
          rows.push(row);
        }
        grid('paint', rows, false, [0, 0, side]);
      });
      // A tapered rocker keeps the waist light and visually joins the wheel arches.
      polygon('trim', [[-0.88, 0.405, side * 0.918], [0.90, 0.405, side * 0.918],
        [0.78, 0.325, side * 0.89], [-0.78, 0.325, side * 0.89]], [0, 0, side]);
      line('alloy', [[-0.75, 0.386, side * 0.923], [0.76, 0.386, side * 0.923]], 0.009, 6);
    });

    // A genuinely raised, tapered cabin with a bowed roof and two sloped screens.
    var roof = [[-0.95, 1.604, 0.565], [-0.78, 1.660, 0.593], [-0.40, 1.682, 0.604],
      [0.03, 1.650, 0.599], [0.18, 1.606, 0.577]];
    var roofRows = roof.map(function (section) {
      var row = [];
      for (var i = 0; i <= 12; i++) {
        var t = mix(-1, 1, i / 12);
        row.push([section[0], section[1] - 0.065 * t * t, section[2] * t]);
      }
      return row;
    });
    grid('paint', roofRows, false, [0, 1, 0]);
    function windscreen(top, bottom, outward) {
      var rows = [];
      for (var r = 0; r <= 5; r++) {
        var t = r / 5, row = [];
        for (var c = 0; c <= 12; c++) {
          var across = mix(-1, 1, c / 12);
          row.push([mix(top[0], bottom[0], t), mix(top[1], bottom[1], t) -
            mix(0.065, 0.030, t) * across * across + Math.sin(PI * t) * 0.012,
          mix(top[2], bottom[2], t) * across]);
        }
        rows.push(row);
      }
      grid('glass', rows, false, outward);
    }
    windscreen(roof[4], [0.96, 1.105, 0.737], [1, 1, 0]);
    windscreen(roof[0], [-1.63, 1.106, 0.755], [-1, 1, 0]);
    [-1, 1].forEach(function (side) {
      var back = [-1.63, 1.076, side * 0.755], front = [0.96, 1.075, side * 0.737];
      var upper = roof.map(function (p) { return [p[0], p[1] - 0.065, side * p[2]]; });
      var outline = [back].concat(upper, [front, [0.25, 1.012, side * 0.755], [-0.90, 1.032, side * 0.768]]);
      var points = [[-0.28, 1.305, side * 0.684]].concat(outline), indices = [];
      for (var i = 0; i < outline.length; i++) indices.push(0, i + 1, (i + 1) % outline.length + 1);
      surface('glass', points, indices, null, [0, 0.2, side]);
      line('paint', [back, upper[0]], 0.044, 10);
      line('paint', upper, 0.026, 10);
      line('paint', [upper[4], front], 0.031, 10);
      line('trim', [[-0.55, 1.035, side * 0.766], [-0.56, 1.604, side * 0.603]], 0.030, 8);
      line('trim', [back, [-0.90, 1.032, side * 0.770], [0.25, 1.012, side * 0.759], front], 0.022, 8);
      line('alloy', [back, [-0.90, 1.041, side * 0.779], [0.25, 1.021, side * 0.768], front], 0.008, 6);

      // Short stalk and a beveled, flat-backed mirror housing (no ellipsoid decal).
      tube('trim', [0.62, 1.085, side * 0.784], [0.54, 1.205, side * 1.010], 0.024, 8, 0.032);
      var mirrorRows = [[0.405, 0.052, 0.068], [0.51, 0.073, 0.088], [0.66, 0.043, 0.049]].map(function (section) {
        var row = [];
        for (var j = 0; j < 12; j++) {
          var angle = TAU * j / 12;
          row.push([section[0], 1.213 + Math.cos(angle) * section[1], side * 1.030 + Math.sin(angle) * section[2]]);
        }
        return row;
      });
      grid('paint', mirrorRows, true);
      polygon('paint', mirrorRows[2], [1, 0, 0]);
      polygon('alloy', mirrorRows[0].map(function (p) { return [p[0] - 0.001, p[1], p[2]]; }), [-1, 0, 0]);
    });

    function disc(name, cx, cy, z, radius, count, side) {
      var points = [];
      for (var i = 0; i < count; i++) {
        var a = TAU * i / count;
        points.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, z]);
      }
      polygon(name, points, [0, 0, side]);
    }
    function annulus(name, cx, cy, z, inner, outer, count, side) {
      var rows = [[], []];
      for (var i = 0; i < count; i++) {
        var a = TAU * i / count;
        rows[0].push([cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, z]);
        rows[1].push([cx + Math.cos(a) * outer, cy + Math.sin(a) * outer, z]);
      }
      grid(name, rows, true, [0, 0, side]);
    }
    function wheel(axle, side) {
      var centerZ = side * 0.882, count = 40;
      var profile = [[0.286, -0.104], [0.367, -0.127], [0.421, -0.113],
        [0.453, -0.073], [0.462, 0], [0.453, 0.073], [0.421, 0.113], [0.367, 0.127], [0.286, 0.104]];
      var points = [], normals = [], indices = [];
      for (var r = 0; r < profile.length; r++) {
        var before = profile[(r + profile.length - 1) % profile.length], after = profile[(r + 1) % profile.length];
        var dr = after[0] - before[0], dz = after[1] - before[1];
        for (var c = 0; c < count; c++) {
          var angle = TAU * c / count, cosine = Math.cos(angle), sine = Math.sin(angle);
          points.push([axle + profile[r][0] * cosine, wheelY + profile[r][0] * sine, centerZ + profile[r][1]]);
          normals.push(normalize([dz * cosine, dz * sine, -dr]));
        }
      }
      for (var p = 0; p < profile.length; p++) for (var j = 0; j < count; j++) {
        var a = p * count + j, b = p * count + (j + 1) % count;
        var next = (p + 1) % profile.length * count;
        indices.push(a, b, next + j, b, next + (j + 1) % count, next + j);
      }
      surface('rubber', points, indices, normals);
      annulus('trim', axle, wheelY, centerZ + side * 0.125, 0.332, 0.339, count, side);
      annulus('rubber', axle, wheelY, centerZ + side * 0.129, 0.373, 0.381, count, side);
      tube('trim', [axle, wheelY, centerZ - side * 0.025], [axle, wheelY, centerZ + side * 0.12], 0.293, count, 0.293, false);
      annulus('brake', axle, wheelY, centerZ + side * 0.073, 0.079, 0.251, count, side);
      box('caliper', [axle + 0.180, wheelY + 0.035, centerZ + side * 0.085], [0.078, 0.187, 0.041]);
      for (var hole = 0; hole < 14; hole++) {
        var ha = TAU * hole / 14;
        disc('trim', axle + Math.cos(ha) * 0.205, wheelY + Math.sin(ha) * 0.205,
          centerZ + side * 0.075, 0.008, 6, side);
      }
      tube('alloy', [axle, wheelY, centerZ + side * 0.09], [axle, wheelY, centerZ + side * 0.143], 0.307, count, 0.307, false);
      annulus('alloy', axle, wheelY, centerZ + side * 0.144, 0.269, 0.307, count, side);
      annulus('trim', axle, wheelY, centerZ + side * 0.145, 0.291, 0.295, count, side);
      for (var spoke = 0; spoke < 5; spoke++) for (var pair = -1; pair <= 1; pair += 2) {
        var sa = TAU * spoke / 5 + pair * 0.105;
        var polar = [[0.074, sa - 0.075], [0.275, sa + pair * 0.08 - 0.040],
          [0.275, sa + pair * 0.08 + 0.040], [0.074, sa + 0.075]];
        var face = polar.map(function (v) {
          return [axle + Math.cos(v[1]) * v[0], wheelY + Math.sin(v[1]) * v[0], centerZ + side * 0.141];
        });
        polygon('alloy', face, [0, 0, side]);
        for (var edge = 0; edge < 4; edge++) {
          var aa = face[edge], bb = face[(edge + 1) % 4];
          polygon('alloy', [aa, bb, [bb[0], bb[1], bb[2] - side * 0.027], [aa[0], aa[1], aa[2] - side * 0.027]],
            [bb[1] - aa[1], aa[0] - bb[0], 0]);
        }
      }
      tube('alloy', [axle, wheelY, centerZ + side * 0.115], [axle, wheelY, centerZ + side * 0.157], 0.082, 20);
      disc('trim', axle, wheelY, centerZ + side * 0.158, 0.045, 20, side);
      for (var bolt = 0; bolt < 5; bolt++) {
        var ba = TAU * bolt / 5;
        disc('alloy', axle + Math.cos(ba) * 0.062, wheelY + Math.sin(ba) * 0.062,
          centerZ + side * 0.159, 0.009, 6, side);
      }
    }
    axleXs.forEach(function (axle) { wheel(axle, -1); wheel(axle, 1); });

    function bodySide(x, y, side, lift) {
      var ring = bodyRing(x), z = ring[6][2];
      for (var i = 0; i < 8; i++) {
        if (y <= ring[i][1] && y >= ring[i + 1][1]) {
          z = mix(ring[i][2], ring[i + 1][2], (ring[i][1] - y) / (ring[i][1] - ring[i + 1][1]));
          break;
        }
      }
      return [x, y, side * (z + lift)];
    }
    function bodyTop(x, z) {
      var ring = bodyRing(x), absZ = Math.abs(z);
      for (var i = 0; i < 4; i++) {
        if (absZ <= ring[i + 1][2]) {
          return mix(ring[i][1], ring[i + 1][1], (absZ - ring[i][2]) / (ring[i + 1][2] - ring[i][2]));
        }
      }
      return ring[4][1];
    }
    [-1, 1].forEach(function (side) {
      var seam = [[-0.72, 0.981], [-0.69, 0.62], [-0.62, 0.45], [0.63, 0.45], [0.77, 0.90], [0.79, 0.992]];
      var seamPoints = [];
      for (var segment = 0; segment < seam.length - 1; segment++) {
        var a = seam[segment], b = seam[segment + 1];
        var steps = Math.ceil(Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)) / 0.075);
        for (var step = 0; step < steps; step++) seamPoints.push(bodySide(mix(a[0], b[0], step / steps), mix(a[1], b[1], step / steps), side, 0.004));
      }
      seamPoints.push(bodySide(seam[seam.length - 1][0], seam[seam.length - 1][1], side, 0.004));
      line('trim', seamPoints, 0.004, 5);
      ellipsoid('alloy', bodySide(-0.49, 0.958, side, 0.011), [0.102, 0.016, 0.019]);

      // Small hood extractor recesses and a crease following the actual loft.
      var vent = [[0.99, side * 0.51], [1.31, side * 0.51], [1.24, side * 0.63], [0.96, side * 0.63]];
      polygon('trim', vent.map(function (p) { return [p[0], bodyTop(p[0], p[1]) + 0.008, p[1]]; }), [0, 1, 0]);
      var crease = [];
      for (var i = 0; i <= 10; i++) {
        var x = mix(1.10, 2.06, i / 10), z = side * mix(0.41, 0.29, i / 10);
        crease.push([x, bodyTop(x, z) + 0.003, z]);
      }
      line('paint', crease, 0.006, 6);

      var head = [[2.269, 0.778, side * 0.362], [2.112, 0.885, side * 0.785],
        [2.193, 0.768, side * 0.796], [2.270, 0.690, side * 0.375]];
      polygon('rubber', head, [1, 0.2, side * 0.2]);
      var ledA = lerpPoint(head[0], head[1], 0.07), ledB = lerpPoint(head[0], head[1], 0.92);
      ledA[0] += 0.009; ledB[0] += 0.009;
      ledA[1] -= 0.015; ledB[1] -= 0.015;
      polygon('headlight', [ledA, ledB, add(ledB, [0.003, -0.021, 0]), add(ledA, [0.003, -0.021, 0])], [1, 0.3, 0]);
      var ledC = lerpPoint(head[3], head[2], 0.18), ledD = lerpPoint(head[3], head[2], 0.82);
      ledC[0] += 0.009; ledD[0] += 0.009; ledC[1] += 0.019; ledD[1] += 0.019;
      polygon('headlight', [ledC, ledD, add(ledD, [0, 0.014, 0]), add(ledC, [0, 0.014, 0])], [1, 0.2, 0]);
      polygon('rubber', [[2.260, 0.615, side * 0.56], [2.255, 0.612, side * 0.699],
        [2.270, 0.484, side * 0.656], [2.270, 0.486, side * 0.545]], [1, 0, 0]);

      var rear = [[-2.263, 0.808, side * 0.305], [-2.106, 0.930, side * 0.839],
        [-2.189, 0.819, side * 0.820], [-2.268, 0.731, side * 0.317]];
      polygon('trim', rear, [-1, 0.2, side * 0.2]);
      var redA = lerpPoint(rear[0], rear[1], 0.07), redB = lerpPoint(rear[0], rear[1], 0.94);
      redA[0] -= 0.008; redB[0] -= 0.008; redA[1] -= 0.017; redB[1] -= 0.017;
      polygon('taillight', [redA, redB, add(redB, [-0.004, -0.030, 0]), add(redA, [-0.004, -0.030, 0])], [-1, 0.3, 0]);
      line('taillight', [[-2.268, 0.749, side * 0.347], [-2.211, 0.801, side * 0.723]], 0.010, 6);

      // Recessed, unbranded exhaust outlets with a real annular metal lip.
      var exhaustRows = [[], []];
      for (var e = 0; e < 16; e++) {
        var angle = TAU * e / 16;
        exhaustRows[0].push([-2.332, 0.463 + Math.cos(angle) * 0.046, side * 0.558 + Math.sin(angle) * 0.046]);
        exhaustRows[1].push([-2.332, 0.463 + Math.cos(angle) * 0.060, side * 0.558 + Math.sin(angle) * 0.060]);
      }
      grid('alloy', exhaustRows, true, [-1, 0, 0]);
      tube('alloy', [-2.271, 0.463, side * 0.558], [-2.332, 0.463, side * 0.558], 0.060, 16, 0.060, false);
      tube('rubber', [-2.275, 0.463, side * 0.558], [-2.280, 0.463, side * 0.558], 0.046, 16);
    });

    // Front grille, splitter, rear diffuser and restrained ducktail.
    polygon('rubber', [[2.260, 0.681, -0.516], [2.260, 0.681, 0.516],
      [2.270, 0.515, 0.418], [2.270, 0.515, -0.418]], [1, 0, 0]);
    for (var bar = 0; bar < 4; bar++) {
      var by = 0.541 + bar * 0.035, half = 0.435 + bar * 0.019;
      line('brake', [[2.277, by, -half], [2.277, by, half]], 0.006, 5);
    }
    for (var rib = -4; rib <= 4; rib++) {
      line('trim', [[2.275, 0.535, rib * 0.092], [2.268, 0.667, rib * 0.092]], 0.006, 5);
    }
    var splitter = [[2.00, 0.392, -0.870], [2.27, 0.392, -0.690], [2.32, 0.392, -0.40],
      [2.32, 0.392, 0.40], [2.27, 0.392, 0.690], [2.00, 0.392, 0.870]];
    polygon('trim', splitter, [0, 1, 0]);
    line('trim', splitter, 0.017, 8);
    polygon('trim', [[-2.266, 0.625, -0.678], [-2.266, 0.625, 0.678],
      [-2.278, 0.410, 0.606], [-2.278, 0.410, -0.606]], [-1, 0, 0]);
    for (var fin = -2; fin <= 2; fin++) box('trim', [-2.04, 0.365, fin * 0.185], [0.42, 0.075, 0.025]);
    box('trim', [-2.272, 0.735, 0], [0.024, 0.049, 0.52]);
    box('brake', [-2.286, 0.581, 0], [0.018, 0.087, 0.259]);
    var spoilerRows = [[-2.108, 0.016], [-2.102, 0.077], [-1.972, 0.007]].map(function (section) {
      var row = [];
      for (var i = 0; i <= 12; i++) {
        var z = mix(-0.79, 0.79, i / 12);
        row.push([section[0], bodyTop(section[0], z) + section[1] * (1 - 0.19 * Math.abs(z / 0.79)), z]);
      }
      return row;
    });
    grid('paint', spoilerRows, false, [0, 1, 0]);

    polygon('floor', [[-4, 0.006, -3.2], [-4, 0.006, 3.2], [4, 0.006, 3.2], [4, 0.006, -3.2]], [0, 1, 0]);
    var bounds = emptyBounds(), carBounds = emptyBounds();
    var stats = { vertices: 0, triangles: 0, drawCalls: 0 };
    var meshes = Object.keys(materials).filter(function (name) { return batches[name].indices.length; }).map(function (name) {
      var batch = batches[name], vertices = new Float32Array(batch.vertices), meshBounds = emptyBounds();
      if (vertices.length / 6 > 65535) throw new Error('Model exceeds WebGL1 index budget.');
      for (var i = 0; i < vertices.length; i += 6) {
        var point = [vertices[i], vertices[i + 1], vertices[i + 2]];
        includePoint(meshBounds, point); includePoint(bounds, point);
        if (name !== 'floor') includePoint(carBounds, point);
      }
      stats.vertices += vertices.length / 6;
      stats.triangles += batch.indices.length / 3;
      stats.drawCalls++;
      return { name: name, material: name, vertices: vertices, indices: new Uint16Array(batch.indices), bounds: meshBounds };
    });
    return { meshes: meshes, materials: materials, bounds: bounds, carBounds: carBounds, stats: stats, vertexStride: 6 };
  }

  var VERTEX_SHADER = [
    'precision highp float;',
    'attribute vec3 aPosition;',
    'attribute vec3 aNormal;',
    'uniform mat4 uViewProjection;',
    'varying mediump vec3 vPosition;',
    'varying mediump vec3 vNormal;',
    'void main() {',
    '  vPosition = aPosition;',
    '  vNormal = aNormal;',
    '  gl_Position = uViewProjection * vec4(aPosition, 1.0);',
    '}'
  ].join('\n');

  var FRAGMENT_SHADER = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying mediump vec3 vPosition;',
    'varying mediump vec3 vNormal;',
    'uniform vec3 uEye;',
    'uniform vec3 uColor;',
    'uniform float uRoughness;',
    'uniform float uMetallic;',
    'uniform float uEmission;',
    'uniform float uSurface;',
    'uniform float uLightPhase;',
    'float contact(vec2 p, vec2 center) {',
    '  vec2 q = (p - center) / vec2(0.48, 0.29);',
    '  return exp(-dot(q, q) * 3.4);',
    '}',
    // Procedural studio light cards: a soft ceiling, a warm horizontal strip and
    // a cool rear card. Reflections move with surface normals and camera position.
    'vec3 studio(vec3 r, float roughness) {',
    '  float phase = sin(uLightPhase);',
    '  float card = (1.0 - smoothstep(0.14, 0.27 + roughness * 0.38, abs(r.x - phase * 0.24)))',
    '    * smoothstep(0.19, 0.36, r.y) * (1.0 - smoothstep(0.91, 0.99, r.y));',
    '  float band = (r.y - 0.40 - phase * 0.075) / (0.031 + roughness * 0.19);',
    '  float strip = exp(-band * band) * (0.35 + 0.65 * smoothstep(-0.6, 0.5, r.z));',
    '  float rim = pow(max(dot(r, normalize(vec3(-0.7, 0.30, -0.50))), 0.0), mix(120.0, 12.0, roughness));',
    '  return vec3(0.028, 0.037, 0.052) + vec3(0.18, 0.22, 0.29) * max(r.y, 0.0)',
    '    + vec3(0.91, 0.97, 1.0) * card * 1.65 + vec3(1.15, 1.02, 0.88) * strip * 1.25',
    '    + vec3(0.48, 0.65, 0.89) * rim * 1.35;',
    '}',
    'void main() {',
    '  if (uSurface > 2.5) {',
    '    vec2 p = vPosition.xz;',
    '    float edge = 1.0 - smoothstep(0.53, 1.0, length(p / vec2(3.85, 2.72)));',
    '    vec2 footprint = (p - vec2(-0.04, 0.04)) / vec2(2.12, 0.80);',
    '    float shadow = exp(-dot(footprint, footprint) * 1.4);',
    '    float wheels = contact(p, vec2(-1.36, 0.882)) + contact(p, vec2(-1.36, -0.882))',
    '      + contact(p, vec2(1.38, 0.882)) + contact(p, vec2(1.38, -0.882));',
    '    float alpha = edge * clamp(0.26 + shadow * 0.48 + wheels * 0.28, 0.0, 0.9);',
    '    vec3 floorColor = mix(vec3(0.125, 0.145, 0.165), vec3(0.008, 0.011, 0.015),',
    '      clamp(shadow * 0.85 + wheels * 0.28, 0.0, 1.0));',
    '    gl_FragColor = vec4(floorColor * alpha, alpha);',
    '    return;',
    '  }',
    '  vec3 n = normalize(vNormal);',
    '  if (!gl_FrontFacing) n = -n;',
    '  vec3 v = normalize(uEye - vPosition);',
    '  vec3 l = normalize(vec3(0.55 + 0.32 * sin(uLightPhase), 0.96, 0.38 + 0.35 * cos(uLightPhase)));',
    '  vec3 fill = normalize(vec3(-0.65, 0.55, -0.8));',
    '  float nv = max(dot(n, v), 0.0);',
    '  float fresnel = pow(1.0 - nv, 5.0);',
    '  float key = max(dot(n, l), 0.0);',
    '  float diffuseFill = max(dot(n, fill), 0.0);',
    '  float ground = mix(0.54, 1.0, smoothstep(0.21, 0.94, vPosition.y));',
    '  vec3 ambient = mix(vec3(0.055, 0.070, 0.093), vec3(0.25, 0.28, 0.33), n.y * 0.5 + 0.5);',
    '  vec3 environment = studio(reflect(-v, n), uRoughness);',
    '  vec3 f0 = mix(vec3(0.04), uColor, uMetallic);',
    '  vec3 reflectance = f0 + (vec3(1.0) - f0) * fresnel;',
    '  float specular = pow(max(dot(n, normalize(l + v)), 0.0), mix(180.0, 8.0, uRoughness));',
    '  vec3 color = uColor * (ambient + key * 0.86 + diffuseFill * 0.28) * (1.0 - uMetallic) * ground;',
    '  color += environment * reflectance * (1.0 - uRoughness * 0.45) * ground;',
    '  color += vec3(1.0, 0.94, 0.84) * specular * reflectance * 1.5;',
    '  if (uSurface < 0.5) {',
    '    color += environment * (0.10 + fresnel * 0.38) * ground;',
    '    color += vec3(0.92, 0.97, 1.0) * pow(max(dot(n, normalize(l + v)), 0.0), 160.0) * 0.24;',
    '  } else if (uSurface < 1.5) {',
    // Opaque tinted glazing implies a dark interior; avoids unsorted alpha layers.
    '    color = uColor * (0.55 + key * 0.45) + environment * (0.20 + fresnel * 0.80);',
    '  }',
    '  color += uColor * uEmission;',
    '  color = max(color, vec3(0.0));',
    '  color = pow(color / (vec3(0.80) + color), vec3(0.454545));',
    '  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  function create(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas is required.');
    var gl;
    var attributes = { alpha: true, premultipliedAlpha: true, antialias: true, depth: true,
      stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
    try { gl = canvas.getContext('webgl', attributes) || canvas.getContext('experimental-webgl', attributes); }
    catch (error) { throw new Error('WebGL is unavailable.'); }
    if (!gl) throw new Error('WebGL is unavailable.');

    var program = null, shaders = [], buffers = [], meshes = [], materials, carBounds;
    var disposed = false, lost = false, width = 1, height = 1, maxSide = MAX_SIDE;
    var locations = {}, positionLocation, normalLocation;
    function contextLost() {
      if (!lost && typeof gl.isContextLost === 'function' && gl.isContextLost()) lost = true;
      return lost;
    }
    function destroy() {
      if (disposed) return;
      disposed = true;
      buffers.forEach(function (buffer) { gl.deleteBuffer(buffer); });
      shaders.forEach(function (shader) { gl.deleteShader(shader); });
      if (program) gl.deleteProgram(program);
      buffers.length = 0; shaders.length = 0; meshes.length = 0; program = null;
    }
    function compile(type, source, label) {
      var shader = gl.createShader(type);
      if (!shader) throw new Error('WebGL shader allocation failed.');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('WebGL ' + label + ' shader failed.');
      return shader;
    }
    function upload(target, data) {
      var buffer = gl.createBuffer();
      if (!buffer) throw new Error('WebGL buffer allocation failed.');
      buffers.push(buffer);
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return buffer;
    }
    function resize(w, h, dpr) {
      if (disposed || contextLost()) return false;
      var size = drawingSize(w, h, dpr, maxSide);
      width = size.width; height = size.height;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      return contextLost() ? false : size;
    }

    try {
      if (contextLost()) throw new Error('WebGL context is lost.');
      var vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER, 'vertex');
      var fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER, 'fragment');
      program = gl.createProgram();
      if (!program) throw new Error('WebGL program allocation failed.');
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('WebGL shader link failed.');
      shaders.forEach(function (shader) { gl.detachShader(program, shader); gl.deleteShader(shader); });
      shaders.length = 0;
      positionLocation = gl.getAttribLocation(program, 'aPosition');
      normalLocation = gl.getAttribLocation(program, 'aNormal');
      if (positionLocation < 0 || normalLocation < 0) throw new Error('WebGL vertex attributes are unavailable.');
      ['uViewProjection', 'uEye', 'uColor', 'uRoughness', 'uMetallic', 'uEmission', 'uSurface', 'uLightPhase'].forEach(function (name) {
        locations[name] = gl.getUniformLocation(program, name);
        if (locations[name] === null) throw new Error('WebGL shader uniforms are unavailable.');
      });
      var limit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      if (typeof limit === 'number' && limit > 0) maxSide = Math.min(MAX_SIDE, limit);
      var model = buildModel();
      materials = model.materials; carBounds = model.carBounds;
      meshes = model.meshes.map(function (mesh) {
        return { material: mesh.material, count: mesh.indices.length,
          vertexBuffer: upload(gl.ARRAY_BUFFER, mesh.vertices),
          indexBuffer: upload(gl.ELEMENT_ARRAY_BUFFER, mesh.indices) };
      });
      if (contextLost()) throw new Error('WebGL context is lost.');
      if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL geometry allocation failed.');
      gl.bindBuffer(gl.ARRAY_BUFFER, null); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      if (!resize(finite(canvas.width, 300), finite(canvas.height, 150), 1)) throw new Error('WebGL context is lost.');
    } catch (error) {
      destroy();
      throw error;
    }

    function draw(state) {
      // Loss is latched: no listeners or restart loops. The caller can recreate the
      // renderer after restoration; old GL objects must never be reused then.
      if (disposed || contextLost()) return false;
      state = state || {};
      var camera = cameraForViewport(width, height, state.yaw, state.pitch, carBounds);
      var paint = Object.prototype.hasOwnProperty.call(PAINTS, state.color) ? PAINTS[state.color] : PAINTS.red;
      gl.viewport(0, 0, width, height);
      gl.disable(gl.SCISSOR_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
      gl.colorMask(true, true, true, true); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionLocation); gl.enableVertexAttribArray(normalLocation);
      gl.uniformMatrix4fv(locations.uViewProjection, false, camera.viewProjection);
      gl.uniform3fv(locations.uEye, camera.eye);
      gl.uniform1f(locations.uLightPhase, finite(state.lightPhase, 0) % TAU);
      // Floor is first, premultiplied, and does not obstruct opaque car geometry.
      meshes.forEach(function (mesh) {
        var material = materials[mesh.material], floor = mesh.material === 'floor';
        if (floor) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
        else { gl.disable(gl.BLEND); gl.depthMask(true); }
        gl.uniform3fv(locations.uColor, mesh.material === 'paint' ? paint : material.color);
        gl.uniform1f(locations.uRoughness, material.roughness);
        gl.uniform1f(locations.uMetallic, material.metallic);
        gl.uniform1f(locations.uEmission, material.emission);
        gl.uniform1f(locations.uSurface, material.surface);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 24, 12);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      });
      gl.depthMask(true); gl.disable(gl.BLEND);
      return !contextLost();
    }
    return { resize: resize, draw: draw, destroy: destroy };
  }

  return {
    create: create,
    buildModel: buildModel,
    math: { clamp: clamp, normalize: normalize, dot: dot, cross: cross, subtract: subtract,
      perspective: perspective, lookAt: lookAt, multiply: multiply, transformPoint: transformPoint,
      drawingSize: drawingSize, cameraForViewport: cameraForViewport },
    shaders: { vertex: VERTEX_SHADER, fragment: FRAGMENT_SHADER }
  };
}));
