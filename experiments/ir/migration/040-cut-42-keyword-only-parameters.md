## Progress — cut 42 (keyword-only parameters)

Three additions to the prologue, each the text's:

* the too-many-positional guard grows CPython's parenthetical when the call
  ALSO bound keyword-only parameters (`takes 1 positional argument but 2
  positional arguments (and 1 keyword-only argument) were given`,
  test_keywordonlyarg pins it).  The count is runtime -- the kw dict's keys
  that name a keyword-only parameter -- accumulated in `___kg___`, which is a
  block temp of an INLINED block in the text and so a method temp here, over
  `{ 'k'. 'j' } do: [:___n___ | kwargs keysDo: [:___k___ | ... ifTrue: [___kg___
  := ___kg___ + 1]]]`; a store to a method temp from inside real nested
  blocks, which probe 05 proved needs nothing from the producer.  The plain
  message is the fall-through (`___emitIRTooManyWithKeywordOnlyOn___:...`);
* after the positional and *vararg bindings, `TypeError
  ___checkMissingKeywordOnly___: kwargs defaults: nil names: #( 'k' )
  qualifiedName: 'f'` -- only when some keyword-only parameter has no default
  -- then per parameter `k := kwargs ifNil: [<default or raise>] ifNotNil:
  [kwargs at: 'k' ifAbsent: [<default or raise>]]`, the fallback emitted twice
  as fresh nodes (cut 40's `ifNilValue:then:else:` finally used);
* the keyword-only names join the accepted list of the unexpected-keyword
  guard, and the kw_defaults (positionally paired with kwonlyargs, nil where
  required) go through `___irDefaultsReason___` like the positional ones.

`___irSignatureReason___` now refuses only `signature:posonly` (and a default
expression it cannot emit).

Fixture: kw_only (required + defaulted), kw_only_default_global, kw_only_star
(`*args` plus a keyword-only default), kw_only_kwargs (keyword-only dropped
from **rest), kw_only_calls, kw_only_errors (the four messages verbatim,
including the parenthetical); compiled 153 -> 159.

Cut 42 flag-on sweep: the known families (now including cut 41's
`testLambdaFrameSpans`) plus two `AlmostOutOfMemory` ERRORs
(`StaticmethodShadowingTestCase>>testAnUnshadowedStaticmethodIsUnaffected`,
`ZipfileTestCase>>testOpenStreamsInSmallReads`) -- the pressure effect, this
time without the cascade.
