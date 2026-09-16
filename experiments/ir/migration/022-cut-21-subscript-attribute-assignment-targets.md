## Progress — cut 21 (subscript / attribute assignment targets)

The two remaining single-target store shapes, matching printSmalltalkOn:'s
target dispatch:
* `obj[idx] = value` -> `(obj) __setitem__: (idx) _: (value).` — slice indices
  (SliceAst) are not emittable values, so slice stores fall out naturally.
* `obj.attr = value` -> `(obj) @env1:__setattr__: 'attr' _: (value).` — the
  FOREIGN-receiver form, the only live branch in a module def
  (CallAst>>isSelfReference: needs classBeingCompiled); `__class__` stores
  (the type-change special case) stay on text. The attribute name is a
  Smalltalk STRING, not a Symbol — user __setattr__ overrides compare
  `name == 'x'` str-vs-str.
AssignAst's read collector now includes a subscript target's receiver + index
and an attribute target's receiver (they are reads; only a bare-name target is
a pure write). Chained (`a = b = v`) and tuple-unpacking targets stay on text.
Fixture: set_at, tag (attribute store on a text-compiled helper class);
compiled 61 -> 63.
