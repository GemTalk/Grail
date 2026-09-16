## Batch 7 after merging main (#836)

Main brought #836 -- `self.m()` honours an override -- whose dispatcher keeps
the pristine original under a `___grailOrig_` shadow by recompiling `orig
sourceString` with the prefix, and `del C.m` does the same.  That is the
[recompiling-method-source] trap of cut 36 again: an IR method's source is
its Python, so under the flag the shadow compiled nothing, the dispatcher's
fall-through DNU'd (`SelfSendOverrideTestCase`), and a metaclass that stores
the class body's defs as attributes installed a dispatcher whose pinned
capture found no shadow and re-entered it until AlmostOutOfStack
(`MetaclassDispatchTestCase`, `ClassBodyNamespaceDefsTestCase`) -- three new
flag-on errors on the merged tree, none of them from cuts 44-45.

Both sites now go through `importlib ___copyMethod___:from:to:prefix:category:`
(the cut-36 copier with a selector prefix): a text method's source recompiled
prefixed, exactly as before; an IR method recompiled from its text twin, or
SHARED under the prefixed key when there is none -- a method-dictionary entry
need not be keyed by the method's own selector (measured).  One more lesson
from the same fix: importlib.gs returns to `compile_env: 0` before that
section, so the copier is an env-0 method, and an `@env1:` send from Object.gs
DNU'd *inside the sites' handlers* -- the two tests then failed flag-OFF too,
which is what pointed at the send rather than at the IR.  Every consumer that
recompiles `sourceString` -- MI merge, enum gap-fill, `smalltalk_class`, the
special-receiver recompile, and now the dispatcher shadow and the delete
shadow -- goes through the one helper.

Gates on the merged tree (main incl. #836 and #837, plus cuts 44-45 and the
shadow fix): smoke 4/4 at 190 with 0 fallbacks; flag-off **6431 run, 6431
passed, 0 failed, 0 errors**; flag-on 6431 run, 8 failed, 1 error -- the same
residue as before the merge (five PEP 657 span tests, the two generated-text
introspections, the IR-frame receiver suggestion, the private-name recursion
budget) and nothing new.
