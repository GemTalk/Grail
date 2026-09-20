## Progress — cut 51 (`__slots__` classes) and cut 52 (annotated assignment)

**Cut 51.** A class with `__slots__` refused every method (`method:slots`,
266 stdlib methods).  The text reads and writes a slot through the mangled
NAMED instVar `___slot_x___` -- `(___slot_x___ ifNil: [self ___pyAttrLoad___:
#x])` on a load (a set slot answers at once, an unset one falls through so
`__getattr__` / AttributeError still apply), `___slot_x___ := (v)` on a
store, the same for a tuple-unpack leaf -- by bare name, since the method
is compiled ON the slotted class.  The IR has no name resolution, so the
builder gains `instVarNamed:`, a `GsComVarLeaf instanceVariable:ivOffset:`
resolved against `targetClass allInstVarNames` -- which is exactly why the
slot classes had to wait for the deferred build, where the class exists.
`AttributeAst>>___irSelfSlotName___` is the one discriminator (`CallAst
classSlotNames`, the text's); the load, the single store and the unpack
store consult it.  Augmented attribute stores stay refused for every
receiver (`AugAssignAst:target-AttributeAst`).

**Cut 52.** Annotated assignment (`stmt:AnnAssignAst`, 79 methods, a shape
the class-method corpus exposed), the text's `printSmalltalkOn:` exactly:
the annotation is never evaluated; a def-local `x: T = v` is `x := v`;
`self.attr: T = v` writes dynamic-instVar storage (`dynamicInstVarAt:put:`,
not `__setattr__` -- the text's choice, mirrored) or the class-side setter
for a name in `classAttrNames`; a foreign `obj.attr: T = v` is the setter
send; a subscript is `__setitem__`; a pure annotation emits nothing and
binds nothing; a module-scope Name target (a `global`-declared name) stays
on text.

Fixtures: class Slotted (init, sum, a tuple-swap of two slots, an unset
non-slot read raising AttributeError); AnnTyped and typed_locals (local,
self-attribute and subscript annotated stores).  Compiled 215 -> 224.
