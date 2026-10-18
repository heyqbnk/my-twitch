-- Builds a file for drawing a profile eye by hand: frames open / half / closed, a locked "head"
-- layer from <dir>/context.png and an editable "eye" layer from <dir>/eye-<0..2>.png.
local dir, out = app.params["dir"], app.params["out"]
local spr = Sprite(128, 128, ColorMode.RGB)
local head = spr.layers[1]
head.name = "head"
spr:newFrame()
spr:newFrame()
local eye = spr:newLayer()
eye.name = "eye"
local names = { "open", "half", "closed" }
for i = 1, 3 do
  spr:newCel(head, i, Image{ fromFile = dir .. "/context.png" }, Point(0, 0))
  spr:newCel(eye, i, Image{ fromFile = ("%s/eye-%d.png"):format(dir, i - 1) }, Point(0, 0))
  local tag = spr:newTag(i, i)
  tag.name = names[i]
  spr.frames[i].duration = 0.5
end
head.isEditable = false
spr:saveAs(out)
