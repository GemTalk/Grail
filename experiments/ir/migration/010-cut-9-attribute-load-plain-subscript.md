## Progress — cut 9 (attribute load + plain subscript)

Two more single-send value nodes, matching `printSmalltalkOn:`:
* `obj.attr` -> `(value) @env1:___pyAttrLoad___: #attr` — the general
  attribute-load path (an eligible module def has no `self`/class context or
  `__slots__`, so the fast paths never apply).
* `xs[i]` -> `(xs) __getitem__: (i)` — plain index only; slice subscripts
  (`xs[i:j]`, which build a `slice` object) are deferred.
Verified char_at/first (subscript) and re_part (`z.real`) IR-compiled.
