-- Rebuilds the helper layers of base.aseprite from <dir>/list.txt ("<frame> <x> <y>" per line):
-- "face preview" (locked) from <dir>/face-<frame>.png and "anchors" from <dir>/marks-<frame>.png.
local spr = app.activeSprite
local dir = app.params["dir"]

local function remove(name)
  for _, layer in ipairs(spr.layers) do
    if layer.name == name then
      spr:deleteLayer(layer)
      return
    end
  end
end

local function add(name, prefix, editable)
  remove(name)
  local layer = spr:newLayer()
  layer.name = name
  for line in io.lines(dir .. "/list.txt") do
    local f, x, y = line:match("(%d+) (%-?%d+) (%-?%d+)")
    local img = Image{ fromFile = ("%s/%s-%s.png"):format(dir, prefix, f) }
    spr:newCel(layer, tonumber(f), img, Point(tonumber(x), tonumber(y)))
  end
  layer.isEditable = editable
end

add("face preview", "face", false)
add("anchors", "marks", true)
spr:saveAs(spr.filename)
