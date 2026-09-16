## Progress — cut 6 (assignment + body locals)

`Assign` with a single bare-local target (`name := value`) is wired, and body
locals become method temps (declared in `___installIRMethodOn___:`, registered by
Python name so a `Name` load / `Assign` target resolves to the leaf).
`___irLocalNameSet___` now = parameters + body-locals.

**The unbound-local rule (the subtle part).** Python raises `UnboundLocalError`
when a local is read before assignment; the text path emits a `(name ifNil:
[UnboundLocalError ___signalUnbound___: #name])` guard for conditionally-bound
locals. Rather than reproduce the guard, `___irAssignFlowSafe___:` keeps such
functions on the **text path**: it admits a def only when (a) every local write
is a top-level assignment (none conditional inside an if/loop branch) and (b)
each local is bound before every read (a sequential walk with a per-node
`___irReadLocalNamesInto___:` read-collector). So the IR path emits bare reads
with no guard, and a conditionally-bound local (`if c: w=1 else: w=2; return w`)
falls back to text — which is also what keeps
`UnboundLocalErrorTestCase>>test_body_local_read_still_guarded` (it introspects
the guard in the generated source) passing. Verified: poly/scaled/use_in_if
IR-compiled; cond_local cleanly fell back (compiled=3, fallbacks=0).

Deferred: conditional local binding (needs the guard, or a proper
bound-on-all-paths intersection), tuple/attribute/subscript targets, augmented
assignment. Next: `While`, then the `Call` forms.
