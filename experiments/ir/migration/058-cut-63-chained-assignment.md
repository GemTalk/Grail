## Progress — cut 63 (chained assignment)

`AssignAst:chained` (36 stdlib methods + 7 defs).  The text binds once and
stores to each target from a block temp:

    [| ___chain___ | ___chain___ := (value). <store>. <store>. ...] value.

-- the temp is a method temp here (cut 50's convention), and each store is
the chain branch's own spelling: `x := ___chain___` for a body local, the
slot or dynamic-instVar write for `self.x`, `(obj) @env1:__setattr__: 'x' _:
___chain___` for a foreign receiver, `(obj) __setitem__: (i) _:
___chain___`, and the tuple-unpack emitter reading the chain temp for `(a, b)
= r = v`.  A Name target the text routes elsewhere (a module-scope store, a
class-body runtime store, a `nonlocal` reached past the class) and the
`__class__` type change keep the whole statement on text
(`AssignAst:chained-target-<Node>`), as does a def whose own local is named
`___chain___`.  The flow analysis learned that a chain binds every Name
target and every tuple leaf, and reads each attribute / subscript target's
pieces.

Fixture: Linked (`self.x = d["k"] = lst[0] = v`, `a = b = self.y = v + 1`,
`(p, q) = r = (a, b)`, a foreign `l.x = other.y = 42`), SlotChain (`self.m =
self.n = v` on slots).  Compiled 298 -> 303, 0 fallbacks, RESULTS true with
the flag on and off.  Gated together with the merge of the wt/d lane's cuts
57-59 (tripwire 353): flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] WarningRegistryTestCase>>testDefaultIsOncePerCallSite`,
AlmostOutOfMemory in its shard log (4 notifications in the sweep): the
cold-shard memory-pressure follow-up, which the wt/d lane measured at the
55-56 merge base as stochastic (3 of its 6 sweeps clean) and traced a
candidate contributor for -- the (beginLine - 1) newline padding on every IR
method's attached source, 26.2 MB across the stdlib against 13.8 MB of real
def source (see the cut 57 section).
