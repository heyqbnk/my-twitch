-- Redraws the "face preview" layer of base.aseprite from the marks on its "anchors" layer, inside
-- Aseprite: a moved mark shows its face at once, before `pnpm doll anchors` writes it to
-- face-anchors.json. Faces are drawn from the part layers of the "facial-features" group the way
-- the app draws them (src/doll/stamps.ts), so an edited part shows on every frame at once, before
-- `pnpm doll face` exports it.
--
-- With the UI: open base.aseprite and run this script (File > Scripts). The dialog picks the face;
-- "Live" redraws on every edit of the sprite. Undo steps back over the redraw first, then the edit.
-- Batch mode redraws once and saves: aseprite -b base.aseprite --script face_preview.lua
-- [--script-param eyes=open --script-param brows=thin --script-param mouth=smile]
local spr = app.activeSprite
if not spr then
  return print("open base.aseprite first")
end

local EYE_MARK, MOUTH_MARK = 0xff00ff, 0x00ffff
-- Darker body pixels are the outline: the face never draws on them (stamps.ts OUTLINE)
local OUTLINE = 60
local STAMP_SIZE = 128
local SRC = app.fs.normalizePath(app.fs.joinPath(
  app.fs.filePath(debug.getinfo(1, "S").source:match("^@(.*)$")), "../../../src/doll"))
local pc = app.pixelColor

local function find(list, name)
  for _, item in ipairs(list) do
    if item.name == name then
      return item
    end
  end
end

local function layer(name)
  return find(spr.layers, name)
end

local function readAnchors()
  local path = app.fs.joinPath(SRC, "face-anchors.json")
  local fh = assert(io.open(path, "r"), "can't read " .. path)
  local anchors = json.decode(fh:read("a"))
  fh:close()
  return anchors
end

-- The opaque pixels of strip frame k as {x, y, color}
local function framePixels(strip, k)
  local px = {}
  for y = 0, strip.height - 1 do
    for x = 0, STAMP_SIZE - 1 do
      local c = strip:getPixel(k * STAMP_SIZE + x, y)
      if pc.rgbaA(c) > 0 then px[#px + 1] = { x, y, pc.rgba(pc.rgbaR(c), pc.rgbaG(c), pc.rgbaB(c), 255) } end
    end
  end
  return px
end

local function relative(px, anchor, keep)
  local out = {}
  for _, p in ipairs(px) do
    if not keep or keep(p[1]) then out[#out + 1] = { p[1] - anchor[1], p[2] - anchor[2], p[3] } end
  end
  return out
end

-- A part layer's two frames (front, profile) side by side, like its exported strip
local function strip(part, tag)
  local img = Image(STAMP_SIZE * 2, STAMP_SIZE, spr.colorMode)
  for k = 0, 1 do
    local cel = part:cel(tag.fromFrame.frameNumber + k)
    if cel then
      img:drawImage(cel.image, Point(cel.position.x + k * STAMP_SIZE, cel.position.y))
    end
  end
  return img
end

-- The part layers of a kind
local function partLayers(kind)
  local root = assert(layer("facial-features"), "no facial-features layer group")
  return assert(find(root.layers, kind), "no facial-features/" .. kind .. " layer group").layers
end

-- A part's stamp, like partStamps in stamps.ts: {front = {pixels per anchor}, profile = pixels},
-- a pixel being {dx, dy, color}
local function loadStamp(kind, name, anchors)
  local part = assert(find(partLayers(kind), name), "no " .. kind .. " " .. name)
  local front, profile = anchors["rotations/south.png"], anchors["rotations/east.png"]
  local img = strip(part, assert(find(spr.tags, kind), "no " .. kind .. " tag"))
  local px = framePixels(img, 0)
  local stamp = { profile = relative(framePixels(img, 1),
    kind == "mouths" and profile.mouth or profile.eyes[1]) }
  if kind == "mouths" then
    stamp.front = { relative(px, front.mouth) }
  else
    local axis = front.mouth[1]
    stamp.front = {
      relative(px, front.eyes[1], function(x) return x <= axis end),
      relative(px, front.eyes[2], function(x) return x > axis end),
    }
  end
  return stamp
end

-- Frames of the face parts aren't body frames
local function isPartFrame(frame)
  local tag = find(spr.tags, "facial-features")
  return tag and tag.fromFrame.frameNumber <= frame and frame <= tag.toFrame.frameNumber
end

local function names(kind)
  local list = {}
  for _, part in ipairs(partLayers(kind)) do
    list[#list + 1] = part.name
  end
  table.sort(list)
  return list
end

local function facing(frame)
  for _, tag in ipairs(spr.tags) do
    if tag.fromFrame.frameNumber <= frame and frame <= tag.toFrame.frameNumber then
      return tag.name:match("/(%a+)$")
    end
  end
end

-- {eyes = {{x, y}, ...}, mouth = {x, y}} from the frame's marks, or nil and what's wrong with them
local function readMarks(cel)
  if not cel then
    return nil, "no marks"
  end
  local eyes, mouths, other = {}, {}, 0
  local ox, oy = cel.position.x, cel.position.y
  for it in cel.image:pixels() do
    local c = it()
    if pc.rgbaA(c) > 0 then
      local rgb = pc.rgbaR(c) << 16 | pc.rgbaG(c) << 8 | pc.rgbaB(c)
      local at = { it.x + ox, it.y + oy }
      if rgb == EYE_MARK then
        eyes[#eyes + 1] = at
      elseif rgb == MOUTH_MARK then
        mouths[#mouths + 1] = at
      else
        other = other + 1
      end
    end
  end
  if (#eyes ~= 1 and #eyes ~= 2) or #mouths ~= 1 or other > 0 then
    return nil, ("%d eye marks, %d mouth marks, %d other pixels"):format(#eyes, #mouths, other)
  end
  table.sort(eyes, function(a, b) return a[1] < b[1] or (a[1] == b[1] and a[2] < b[2]) end)
  return { eyes = eyes, mouth = mouths[1] }
end

-- The face of one frame on a sprite-sized image: stamp pixels land only on the body's skin
local function drawFace(bodyCel, marks, mirrored, parts)
  local out = Image(spr.width, spr.height, spr.colorMode)
  local body, bx, by = bodyCel.image, bodyCel.position.x, bodyCel.position.y
  local function draw(px, anchor, mirror)
    local ax, ay = anchor[1], anchor[2]
    for _, p in ipairs(px) do
      local x = mirror and ax + 1 - p[1] or ax + p[1]
      local y = ay + p[2]
      local c = 0
      if x - bx >= 0 and y - by >= 0 and x - bx < body.width and y - by < body.height then
        c = body:getPixel(x - bx, y - by)
      end
      if pc.rgbaA(c) > 0 and (pc.rgbaR(c) + pc.rgbaG(c) + pc.rgbaB(c)) / 3 >= OUTLINE then
        out:drawPixel(x, y, p[3])
      end
    end
  end
  local left, right = marks.eyes[1], marks.eyes[2]
  -- brows, eyes, then the mouth
  for i, stamp in ipairs(parts) do
    local mouth = i == 3
    if right then
      for k, px in ipairs(stamp.front) do
        draw(px, mouth and marks.mouth or ({ left, right })[k])
      end
    else
      draw(stamp.profile, mouth and marks.mouth or left, mirrored)
    end
  end
  return out
end

local function sameAsCel(img, cel)
  local current = Image(spr.width, spr.height, spr.colorMode)
  if cel then
    current:drawImage(cel.image, cel.position)
  end
  return current:isEqual(img)
end

-- Redraws the changed frames of "face preview" in one undo step; returns the problems found and
-- the number of frames redrawn
local function redraw(face)
  local anchors = readAnchors()
  local parts = {
    loadStamp("brows", face.brows, anchors),
    loadStamp("eyes", face.eyes, anchors),
    loadStamp("mouths", face.mouth, anchors),
  }
  local bodies, anchors = layer("animations"), layer("anchors")
  local preview = layer("face preview")
  local problems, changes = {}, {}
  for _, frame in ipairs(spr.frames) do
    local f = frame.frameNumber
    local bodyCel = bodies:cel(f)
    if bodyCel and not isPartFrame(f) then
      local marks, problem = readMarks(anchors:cel(f))
      local img = Image(spr.width, spr.height, spr.colorMode)
      if marks then
        img = drawFace(bodyCel, marks, facing(f) == "west", parts)
      else
        problems[#problems + 1] = ("frame %d: %s"):format(f, problem)
      end
      if not (preview and sameAsCel(img, preview:cel(f))) then
        changes[#changes + 1] = { f, img }
      end
    end
  end
  if #changes > 0 then
    app.transaction("Face preview", function()
      if not preview then
        preview = spr:newLayer()
        preview.name = "face preview"
        preview.stackIndex = anchors.stackIndex
        preview.isEditable = false
      end
      for _, change in ipairs(changes) do
        spr:newCel(preview, change[1], change[2], Point(0, 0))
      end
    end)
  end
  return problems, #changes
end

local params = app.params
local face = {
  eyes = params.eyes or "open",
  brows = params.brows or "thin",
  mouth = params.mouth or "smile",
}

if not app.isUIAvailable then
  local problems, redrawn = redraw(face)
  for _, problem in ipairs(problems) do
    print(problem)
  end
  print(redrawn .. " frames redrawn")
  return spr:saveAs(spr.filename)
end

local busy, listener = false, nil
local dlg = Dialog{ title = "Face preview", onclose = function()
  pcall(function() spr.events:off(listener) end)
end }

local function update()
  if busy then
    return
  end
  busy = true
  local ok, result = pcall(redraw, face)
  busy = false
  local status = not ok and tostring(result) or #result == 0 and "all marks ok"
    or result[1] .. (#result > 1 and (" (+%d more)"):format(#result - 1) or "")
  dlg:modify{ id = "status", text = status }
  app.refresh()
end

local function pick(id, label, options, value, apply)
  dlg:combobox{ id = id, label = label, options = options, option = value,
    onchange = function()
      apply(dlg.data[id])
      update()
    end }
end

pick("eyes", "Eyes", names("eyes"), face.eyes, function(v) face.eyes = v end)
pick("brows", "Brows", names("brows"), face.brows, function(v) face.brows = v end)
pick("mouth", "Mouth", names("mouths"), face.mouth, function(v) face.mouth = v end)
dlg:check{ id = "live", text = "Live", selected = true }
dlg:label{ id = "status", text = "" }
dlg:button{ text = "Redraw", onclick = update }

listener = spr.events:on("change", function(ev)
  -- redrawing after an undo would put a new step on top of it and block undoing further
  if dlg.data.live and not ev.fromUndo then
    update()
  end
end)
dlg:show{ wait = false }
update()
