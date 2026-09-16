## Progress — cut 33 (tuple / list unpacking targets)

`a, b = expr` (single target; chained assignment stays on text) reproduces
printSmalltalkTupleStoreOn:target: + emitUnpackCoercionAndStoresOn:elts:holder::

    ___unpack___ := (expr) ___unpackSequence___ ___unpackCheck___: nBefore star: b after: nAfter.
    a := ___unpack___ __getitem__: 0.   b := ___unpack___ __getitem__: 1.

with the star element reading ``___getslice___: i _: -nAfter _: nil'' and the
elements after it reading negative indices, exactly as the text.  Leaves may be
locals, attribute stores (``__setattr__: 'attr' _:'', String name) or subscript
stores; a nested tuple recurses with holder ``___unpack____n'' (the text's block
temp names), and the holders are METHOD temps reused per depth, so a user local
of one of those names makes the def ineligible.  The machinery lives on
AbstractNode (___irUnpackTargetEligible___:locals:, ___emitIRUnpack___:from:
holder:on:, ___emitIRUnpackStore___:from:holder:on:) because ``with … as
(a, b)'' uses the same per-leaf stores.

`for k, v in items` reproduces printSmalltalkOn:'s tuple branch: the step lands
in ``___itemN___'', is normalised through ``PythonCoroutine
___unpackNormalize___:'' (unpacking is defined by iteration), and each leaf reads
``(src __getitem__: i)'' with the subscript re-evaluated per leaf for a nested
tuple (emitUnpackOn:target:source:depth:).  A starred for-target stays on text:
its shape needs a Smalltalk arithmetic send (``@env0:-'') the IR emit does not
yet make.  ForAst's collectors and flow entry now take the target's LEAF names.

AssignAst answers the leaf names as its ___irTopLevelWriteNames___: -- the
first user of the multi-name hook cut 31 introduced.

Fixture: swap, head_tail, middle_star, nested_unpack, unpack_into,
unpack_items, pairs_sum, nested_for, unpack_count_error; compiled 119 -> 128,
first try.

Cut 33 flag-on sweep: the four known-family residuals plus two ERRORs the
runner labels AlmostOutOfMemory (`SubclassAttrShadowTestCase>>testMiChildSeesNearestBase`,
`ZipfileTestCase>>testOpenStreamsInSmallReads`) -- the pressure effect.
