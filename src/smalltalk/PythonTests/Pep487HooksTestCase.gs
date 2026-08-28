! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'Pep487HooksTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
Pep487HooksTestCase comment:
'PEP 487: the commonest __init_subclass__ spelling, and __set_name__
failures that carry CPython''s note.

``def __init_subclass__(cls)'' -- no **kwargs, no @classmethod -- never
ran.  It compiles to BOTH a varargs entry and a unary instance-side
method, and the entry''s body is its argument checks followed by
``^ self __init_subclass__'': a VIRTUAL send whose receiver is the new
CLASS, so it resolved through the METACLASS chain, sailed past the hook
(instance-side) and landed on object''s no-op terminator.  The hook ran,
did nothing, and reported success.  The **kwargs spelling was unaffected
-- it has no unary method and its varargs entry holds the real body --
which is why this survived.  object >> ___grailInitSubclass___: now runs
the unary method NON-virtually when the owner defines one and no class
keywords are in play; with keywords the varargs entry is still right,
since its own check raises CPython''s message before the broken tail.

__set_name__ gained two things: a WRONG-ARITY hook is now called (through
the varargs entry every def spelling compiles) instead of being skipped
by the exact-selector probe, so CPython''s TypeError happens; and any
exception escaping the call carries the PEP 678 note ``Error calling
__set_name__ on ''X'' instance ''a'' in ''C''`` with the original
exception still propagating, type and identity intact.

Took test.test_subclassinit from ERROR/9 to 3; the survivors (metaclass
class-keyword plumbing, type.__new__ keyword rejection, MRO-ordered
cooperative chains) are diagnosed in docs/Issues.md.

See tests/python/pep487_hooks.py (17 checks, CPython-validated first).'
%

expectvalue /Class
doit
Pep487HooksTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
Pep487HooksTestCase removeAllMethods: 0.
Pep487HooksTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: Pep487HooksTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pep487_hooks' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pep487_hooks.py')
		name: 'pep487_hooks'.
%

category: 'Grail-Helpers'
method: Pep487HooksTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: Pep487HooksTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: Pep487HooksTestCase
testTheNoKwargsSpellingRuns
	"The hook fires for the subclass and only the subclass, in a module
	body and inside a function alike, with or without a super() call, and
	an exception it raises propagates."

	self assertAll: #('no_kwargs_hook_runs' 'owner_untouched'
		'hook_saw_the_subclass' 'hook_without_super_call'
		'hook_on_a_class_defined_in_a_function' 'hook_exception_propagates')
%

category: 'Grail-Tests'
method: Pep487HooksTestCase
testKeywordsAndTheKwargsSpelling
	"A class keyword offered to a hook that takes none is CPython's arity
	TypeError; the **kwargs spelling keeps working either way."

	self assertAll: #('keyword_rejected_by_arity_check'
		'kwargs_spelling_no_keywords' 'kwargs_spelling_with_keywords')
%

category: 'Grail-Tests'
method: Pep487HooksTestCase
testSetNameStillRuns
	"Owner and name delivered, and the walk still precedes the
	__init_subclass__ chain."

	self assertAll: #('set_name_owner' 'set_name_name'
		'set_name_runs_before_init_subclass')
%

category: 'Grail-Tests'
method: Pep487HooksTestCase
testSetNameFailuresCarryTheNote
	"A wrong-arity hook raises instead of being skipped, and both it and a
	hook that raises deliver the original exception with CPython's note."

	self assertAll: #('wrong_arity_raises' 'wrong_arity_note'
		'raising_set_name_type' 'raising_set_name_message'
		'raising_set_name_note')
%
