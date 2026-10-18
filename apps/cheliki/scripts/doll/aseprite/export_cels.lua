-- Saves the cels of layer `layer` (every layer if not given) as <out>/<frame>.png and their
-- positions in <out>/cels.txt: "<frame> <x> <y>" per line.
local spr = app.activeSprite
local dir, name = app.params["out"], app.params["layer"]
local log = io.open(dir .. "/cels.txt", "w")
for _, layer in ipairs(spr.layers) do
  if not name or layer.name == name then
    for _, cel in ipairs(layer.cels) do
      cel.image:saveAs(("%s/%d.png"):format(dir, cel.frameNumber))
      log:write(("%d %d %d\n"):format(cel.frameNumber, cel.position.x, cel.position.y))
    end
  end
end
log:close()
