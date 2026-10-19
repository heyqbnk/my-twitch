-- Exports the face parts of base.aseprite to the strips the app draws faces with (see
-- src/doll/stamps.ts). The parts are layers of the "facial-features" group: one group per kind
-- (eyes, brows, mouths) and one layer per part. A kind's tag holds two frames, front over the south
-- rotation and profile over the east one; each layer becomes src/doll/face/<kind>/<layer>.png, the
-- two frames side by side. Strips of removed layers are deleted.
--
-- With the UI: run it on the open base.aseprite (File > Scripts); unsaved edits are exported too.
-- Batch: aseprite -b base.aseprite --script export_face.lua (that's `pnpm doll face`).
local spr = app.activeSprite
if not spr or app.fs.fileTitle(spr.filename) ~= "base" then
  return app.alert("Open base.aseprite first")
end

local script = debug.getinfo(1, "S").source:match("^@(.*)$")
local out = app.fs.normalizePath(app.fs.joinPath(app.fs.filePath(script), "../../../src/doll/face"))
local KINDS = { "eyes", "brows", "mouths" }

local function find(list, name)
  for _, item in ipairs(list) do
    if item.name == name then return item end
  end
end

-- The part layer's two frames side by side
local function strip(layer, tag)
  local img = Image(spr.width * 2, spr.height, spr.colorMode)
  for k = 0, 1 do
    local cel = layer:cel(tag.fromFrame.frameNumber + k)
    if cel then
      img:drawImage(cel.image, Point(cel.position.x + k * spr.width, cel.position.y))
    end
  end
  return img
end

local problems, written, count = {}, {}, 0
local root = find(spr.layers, "facial-features")
for _, kind in ipairs(KINDS) do
  local group, tag = root and find(root.layers, kind), find(spr.tags, kind)
  if not (group and group.isGroup) then
    problems[#problems + 1] = "no layer group facial-features/" .. kind
  elseif not tag or tag.frames ~= 2 then
    problems[#problems + 1] = ("tag %s: needs 2 frames (front, profile)"):format(kind)
  else
    app.fs.makeAllDirectories(app.fs.joinPath(out, kind))
    for _, layer in ipairs(group.layers) do
      if layer.isGroup or not layer.name:match("^[%w%-]+$") then
        problems[#problems + 1] = ("%s/%s: not a part layer"):format(kind, layer.name)
      else
        local path = app.fs.joinPath(out, kind, layer.name .. ".png")
        strip(layer, tag):saveAs(path)
        written[app.fs.normalizePath(path)] = true
        count = count + 1
      end
    end
  end
end

local removed = 0
for _, kind in ipairs(KINDS) do
  local dir = app.fs.joinPath(out, kind)
  for _, file in ipairs(app.fs.listFiles(dir)) do
    local path = app.fs.normalizePath(app.fs.joinPath(dir, file))
    if file:match("%.png$") and not written[path] then
      os.remove(path)
      removed = removed + 1
    end
  end
end

local report = { ("%d parts exported to %s, %d removed"):format(count, out, removed) }
if #problems > 0 then
  report[#report + 1] = "Skipped:"
  for _, problem in ipairs(problems) do report[#report + 1] = problem end
end
if app.isUIAvailable then
  app.alert{ title = "Face export", text = report }
else
  print(table.concat(report, "\n"))
end
