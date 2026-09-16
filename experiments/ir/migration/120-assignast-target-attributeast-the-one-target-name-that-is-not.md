## `AssignAst:target-AttributeAst`: the one target name that is not a store (2026-09-16)

`cm:AssignAst:target-AttributeAst` (3). The IR path had a full attribute-store
emit — `__slots__`, inferred slots, the generic `__setattr__:_:` — and refused
one target NAME outright, because `obj.__class__ = X` is not an attribute store
at all. It is an in-place type change, and `printSmalltalkOn:` routes it to:

```smalltalk
object @env1:___pyChangeClassOf: (obj) to: (NewClass)
```

**The target travels as an ARGUMENT, not as the receiver, and that is
load-bearing.** The text's own comment records why: GemStone's `changeClassTo:`
refuses an object that is `self` on the stack, which is exactly what
`(obj) __setattr__: '__class__' _: (X)` would make it — measured by test_sort's
`test_unsafe_object_compare`, which re-types an element mid-sort. So this emit
is not free to pick the tidier spelling; it reproduces the awkward one for a
reason that is already written down.

A SELF receiver still refuses, for the same reason stated the other way: `self`
is on the stack however it is spelled, so the argument form cannot rescue it and
the text keeps `self.__class__ = ...` on the default path. Both corpus sites are
foreign receivers — werkzeug's `Response.force_type`, the documented way to
re-type a response, and test_super's `test___class___modification_multithreaded`.

The fixture varies the RECEIVER (a local, a parameter, an attribute, a
subscript) rather than the assigned class: the receiver expression is the only
part of the statement this emit has latitude about, and evaluating it twice, or
as the send's receiver, is how it would go wrong.

### The board

| row | before | after |
| --- | ---: | ---: |
| `cm:AssignAst:target-AttributeAst` | 3 | **0** |
| `cm:eligible` | 13213 | **13216** |

Three retired, **+3 net** — nothing moves up behind it. Same-tree baseline on
the `main` this branch was cut from, measured by reverting `AssignAst.gs` alone
to `origin/main`. `CENSUS.md` still wants one combined re-measure once the
family has landed.
