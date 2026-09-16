## `AugAssignAst:target-NameAst`: the read and the write have to land together (2026-09-16)

`AugAssignAst:target-NameAst` (2, module-program). `global c; c += 1` refused.

An augmented assignment is a READ and a WRITE, and both halves must land in the
same place. With `global` in force there is no local to augment — the parser
strips a declared global from the scope's variables — so
`___irLocalNameTarget___:` answered nil, `___irComplexTargetKind___:` knows only
attribute and subscript targets, and the statement fell through both.

### The scope decision is borrowed, not re-derived

`___irModuleScopeNameTarget___` asks `___nameStoreRoutesToModule___:` — the same
four-way rule `AssignAst`'s store uses — rather than testing "is there a global
declaration" a second time. An aug-assign that routed its store differently from
the plain assign beside it would put the read and the write in different places,
which is exactly the defect the `nestedDef:global` cut had to fix one lexical
level down. Same rule, one reader more.

### The read is guarded and the write is not

That asymmetry is what makes an unbound global raise `NameError` rather than
answering nil, and it is the one shape of this statement that is an error rather
than a value — so the emit cannot be "read it, apply the operator, store it":

```smalltalk
<mod> dynamicInstVarAt: #'c' put: (
    (<mod> dynamicInstVarAt: #'c'
        ifAbsent: [NameError ___signal___: 'name ''c'' is not defined'])
    ___augmentedOp___: (v) inplace: #'__iadd__:' binary: #'__add__:').
```

### The receiver differs by scope, and both must reach one binding

A top-level def compiles to a method ON THE MODULE, so its `self` IS the module;
a class method's is not. Both shapes are in the fixture, and it reads the value
back from module scope after a method has bumped it — 1 + 1 from two top-level
calls, then 10 from the method, is 12. Otherwise each could bump a different
binding and look right on its own. The receiver comes from
`___emitIRModuleReceiverOn___:` (the delete-global cut) rather than being
spelled twice.

### The board

| row | before | after |
| --- | ---: | ---: |
| `AugAssignAst:target-NameAst` | 2 | **0** |
| `compiled` | 1867 | **1869** |

**A module-program row, so this moves `compiled` and not `cm:eligible`** — both
corpus sites are top-level defs: abc's `_bump_invalidation_counter`, whose whole
job is to invalidate caches by bumping a module counter, and test_sort's `check`,
which counts errors in a module global. Same-tree baseline measured by reverting
`AugAssignAst.gs` alone to `origin/main`.

One wrong turn worth recording: the first emit sent `___signal___:` in env 0 and
failed with *"a NameError class does not understand #'___signal___:'"*. The text
writes it with no `@env0:` prefix, which means env 1 — the generated text's
default. Reading the dump rather than assuming the guard was "internal
plumbing, therefore env 0" is what settled it.
