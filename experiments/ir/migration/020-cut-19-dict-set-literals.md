## Progress — cut 19 (dict / set literals)

printSmalltalkOn:'s accumulator-block shapes:
* `{k: v, ...}` -> `([:___d | ___d __setitem__: (k) _: (v). ... ___d]
  value: (PyDict perform: #new env: 0))`; `{}` -> `PyDict new` (env 0).
* `{a, b}` -> `([:___s | ___s add: (a). ... ___s] value: (set perform: #new
  env: 0))`.
Pairs/elements store left to right (later dict keys overwrite earlier, as in
CPython). `{**m}` unpacking (a nil key) and set splats stay on text. Reuses
blockWithArg:do: from cut 15 — the accumulator arg is read per store and is the
block's final statement (its value). Fixture: make_point, empty_dict, lookup
(dict literal + subscript), uniq_count (set + len); compiled 53 -> 57.
