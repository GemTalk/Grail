## Checking the `super` row's name: this one was honest (2026-09-11)

After `method:classNotAtModuleScope` turned out to be answering for two shapes
(#933), the same suspicion applied to `CallAst:super-methodLocalClass`: it fires
on `CallAst classDefIsModuleScope == false`, and
`ClassDefAst>>isModuleScopeClassDef` answers false for THREE different reasons
— no module class, nested in another class BODY, nested in a function — so one
row was again counting all three while being named for the last.

Split three ways and measured. **The name was accurate, and the suspicion was
wrong:**

| | corpus 2 | stdlib |
| --- | ---: | ---: |
| `super-methodLocalClass` | **79** | 4 |
| `super-classInClassBody` | 2 | 1 |
| `super-other` | 2 | — |
| `super-doitScopeClass` | 0 | 0 |

97.5% of the row is the shape it is named for, so unlike #933 this measurement
redirects nothing: the cut to make is still `super()` in a method-local class.
Recorded because a negative result is worth the same as a positive one here —
the next reader should not re-run this hunt — and because the two
`super-classInClassBody` entries are exactly the ones cut
`classInClassBody` (#935) moved in. The old single row would have absorbed them
silently, which is the drift the split now prevents.

**What the remaining 79 actually need**, read off the refusal rather than the
name: `super()` in a method-local class wants the `__class__` cell, and that
class is rebuilt on every CALL of its enclosing def. So this is the SAME
lifetime problem cut 79 solved for method bodies, not the static-lifetime
shortcut that made #935 cheap — the cell has to be wired into the shared build.
Neighbours in the same family (`NameAst:__class__-methodLocalClass` 8,
`NonlocalAst:classCell` 2, `nestedDef:super` 2) will likely fall with it.
