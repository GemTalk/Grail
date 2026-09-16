## Progress — cut 32 (`from x import y`, multi-alias imports, `del name`)

All three were held back by the single-write-target flow rule cut 31 replaced.

* `from m import a, b as c` inside a def: valueSourceFor:'s two shapes, one
  statement per alias.  The fromlist carries the imported name so the importer
  answers the LEAF module (``___import__: { 'abs.name'. nil. nil. { 'attr' }.
  0 } kw: nil''); then ``@env1:___pyAttrLoad___: #attr'' -- or, when the
  module class resolves at compile time and ``attr'' is one of its env-1
  fast-path methods, the text's ``BoundMethod receiver: … selector: #attr''
  wrap.  Relative imports resolve through resolvedModuleName as the text does;
  a star import is refused (module-level only anyway).  The fixture covers
  both value shapes: `from math import sqrt` (fast-path wrap) and
  `from os.path import join as pjoin, sep` (attribute loads).
* `import a, b`: ImportAst's emit loops over its aliases;
  ___irTopLevelWriteNames___: answers every bound name.  The shared
  ``((Python @env0:at: #builtins) instance)'' receiver moved to
  StatementAst>>___emitIRBuiltinsInstanceOn___:.
* `del name`: the text's function-local branch, ``name := nil''.  Soundness
  comes from the flow analysis, not a guard: DeleteAst's ___irFlowBound___
  drops the name, so a later read makes the def ineligible and the text
  path's unbound guard raises UnboundLocalError (the fixture's
  `drop_then_read` is the negative control).  A DELETED parameter is carried
  like a reassigned one (transport argument + temp), the text's
  paramNeedsTemp rule with deletedNamesInSubtree folded in.

Fixture: from_import, from_import_alias, multi_import, drop_name, drop_param,
drop_then_read_raises; compiled 113 -> 119.

Cut 32 flag-on sweep: the four known-family residuals plus two ERRORs that
the runner now labels outright as ``a AlmostOutOfMemory occurred (notification
6013)'' -- `PropertyNotDynamicClassAttributeTestCase>>testARealPropertyStillClassifiesAsOne`
and `WeakReferenceTestCase>>testCallbackFiredOnCollection`; the latter passes
alone in a forced-flag session.  The pressure effect, not emit defects.
