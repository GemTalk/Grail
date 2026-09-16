## Progress — cut 28 (call shapes: class constructors, keyword arguments, general callees)

`CallAst>>___irCallShape___` replaces the three ad-hoc call predicates with ONE
classifier that walks printSmalltalkOn:'s probes in the text's own order and
answers the branch as a Symbol -- or nil where the text takes a branch the IR
does not emit (the special ids, the two arity-mismatch TypeErrors, class-
context sends, `*`/`**` splats).  Exactness by construction: a call an earlier
branch would claim never reaches a later shape.  Nine shapes:

    #builtinFixed    ((builtins instance) name: a _: b)          [was cut 8]
    #builtinVarargs  ((builtins instance) _name: {args} kw: kw)   NEW
    #classNew        (Cls __new__: a _: b)   [bool -> ___truthOf___:]   NEW
    #moduleSelfSend / #moduleSelfSendVarargs  the rebinding probe   [15 / NEW]
    #attrFixed       ((recv) name: a _: b)   [module receiver]     NEW
    #attrVarargs     ((recv) _name: {args} kw: kw)                 NEW
    #attrLegacy      (((obj) ___pyAttrLoad___: #m) value: {args} value: kw) [13, +kw]
    #general         ((callee) value: {args} value: kw)            NEW

**Keyword arguments** lower to printKeywordsDictOn:'s literal -- `((PyDict
@env0:new) @env0:at: 'k' put: v; ...; yourself)` -- through a new builder
`cascade:sends:env:` (GsComCascadeNode over nil-receiver sends, probe 09's
shape).  Named keywords only; a `**splat` merges at runtime and stays on text.

**Class constructors** `str(x)`, `int(s)`, `list(xs)` are the shape that had
kept f-strings on text: the parser desugars `f"{x!r:>4}"` into `+` chains of
`repr(x)` / `format(x, spec)` calls, and `str()` is a class.  The receiver is
the bare class name -- `globalNamed:`, the compile-time symbol-list binding the
text resolves it to, NOT a module-attribute load.  The selector is rebuilt from
the probe's base plus the arity (`___irFixedAritySelector___:`), which is also
how bool's `___truthOf___:` special case rides along.

**General callees** -- a parameter holding a function, a call result, a
subscript, a user class defined in the module (`Box()`: not in the Python
dictionary, so no class-new fast path; text loads the module attribute and
sends value:value:) -- take the unified-protocol fallback with the callee
emitted as a value.  Every fast path stands down for a shadowed name
(___pythonBindingShadows___:), so a local callee lands here exactly as in text.

Fixture: to_text / as_int (class new), make_box (user class, general),
rounded / sorted_desc (builtin varargs with kwargs), apply / apply_kw
(general, local callee, with and without kwargs; kw_target stays on text by
its default argument), spec_fmt (the f-string that would not compile before),
count_chars (len(str(a))); compiled 91 -> 100.

f-strings, confirmed free after cut 28: a three-def probe module (plain
`f"hi {name}!"`, `f"{x!r}/{x:>4}"`, `f"{a + b} and {len(str(a))}"`) compiled
1/3 before the cut (only the plain one) and 3/3 after -- there is no
JoinedStrAst emit to write, only the `str` / `repr` / `format` constructor
and builtin-varargs calls the parser desugars to.  The smoke fixture's
spec_fmt is the standing proof.

Cut 28 flag-on sweep: the four known-family residuals, plus one ERROR --
`TransformCodecsTestCase>>testRot13IsTheStrToStrCase` -- that passes 6/6 alone
in a fresh forced-flag session (73 IR compiles, 0 fallbacks).  That is the THIRD
class to show this shape (enum help, Unicode names, now codecs): an ERROR in a
cold flag-on shard, green alone, never twice in a row.  Not an emit defect of
the cut it appeared under; a cold-shard ORDER interaction under the flag that
deserves its own investigation -- capture the ERROR text from the shard log
before the next run wipes it, and reproduce with GRAIL_TEST_SHARDS on the
shard that carried it.  Flag-off remains the deterministic gate.
