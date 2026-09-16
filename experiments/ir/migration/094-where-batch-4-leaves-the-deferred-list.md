## Where batch 4 leaves the deferred list

Done in cuts 25–30: except tuples, in-handler bare raise, ``raise … from``,
multi-clause except (the shield), try/else, the as-target f_locals parity,
assert, slice loads and slice objects, del subscript/attribute, all nine call
shapes (class constructors, keyword arguments, general callees, module and
attribute varargs), reassigned parameters, function-level import, and -- for
free through the call shapes -- f-strings.

Still deferred: `with` (the __enter__/__exit__ protocol with its own frame
push), comprehensions and generator expressions (ComprehensionAst's iteration
protocol and traceback frame), `from x import y` and multi-alias imports,
`del name`, ``**splat'' keywords and ``*args'' splats, the two arity-mismatch
TypeErrors (text's, deliberately not ours), tuple-target assignment
(``a, b = b, a''), the try/else flow-analysis refinement (body top-level writes
are bound within the else), PEP 657 columns for IR frames (the (method, ip) ->
span side table), and the recursion-guard byte budget that makes
test_recursion_raises_recursion_error flap under the flag.

Cut 30 flag-on sweep: the four known-family residuals, plus one shard-1 ERROR
(`PropertyNotDynamicClassAttributeTestCase>>testARealPropertyStillClassifiesAsOne`
this time) with `AlmostOutOfMemory` present in that shard's log -- the
pressure effect above, landing on whichever import is running when the
ceiling is hit.
