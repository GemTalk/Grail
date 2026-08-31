! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'InitSubclassClassBodyTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
InitSubclassClassBodyTestCase comment:
'``__init_subclass__'' bound by a CLASS BODY, and found along the MRO.

Two rules, both measured against CPython 3.14.6 and both broken before
2026-08-31.

PEP 487''s IMPLICIT CLASSMETHOD.  ``type.__new__'' wraps whatever it finds
under __init_subclass__ in the class namespace with ``classmethod'', so the
hook gets the new class as its first argument -- however the name got into
that namespace.  Grail honoured that for a ``def'' at the TOP of a class body
(which compiles to a real Smalltalk method) and for nothing else.  A ``def''
inside an ``if'', a ``for'', a ``try'' or a ``with'' is a CONDITIONAL binding
and routes through ___classBodyDefinitionalStore___:put: as a bare block,
which ___grailRunAssignedInitSubclass___ then called with NO positional
argument -- CPython''s convention for a hook installed by setattr AFTER the
class exists, and the wrong one here.  Every such hook died with
``__init_subclass__() missing 1 required positional argument: ''''cls''''''.
pip''s annotated-types writes its hook under ``if not TYPE_CHECKING:''.

``__init_subclass__ = classmethod(fn)'' written in a body was worse: it never
ran at all, silently.  An assignment compiles no method, so the definition
search had nothing to find, and the assignment search read only TWO of the
three homes a class attribute can have -- the session overlay and the
committed ___dynInstVars___ holder, but not the ACCESSOR PAIR that an
unconditional class-body assignment actually lands in.

RESOLUTION ALONG THE MRO.  A hook DEFINED on a SECONDARY base was skipped:
the search walked Smalltalk superclass links, which see the primary base
only, so ``class A(Left, Middle, Right, middle=1)'' never reached Middle''s
hook and ``middle'' travelled on to object''s terminal hook, which rejected
it -- naming object for a hook sitting on the second base.  The ASSIGNED-hook
search already walked every base; the defined one now uses the same list.

The complementary file is tests/python/init_subclass_assigned.py, which pins
the SETATTR half: there a plain function receives nothing and a classmethod
receives the class, and the difference between the two files is the point of
having both.

See tests/python/init_subclass_class_body.py.'
%

expectvalue /Class
doit
InitSubclassClassBodyTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
InitSubclassClassBodyTestCase removeAllMethods: 0.
InitSubclassClassBodyTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: InitSubclassClassBodyTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'init_subclass_class_body' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/init_subclass_class_body.py')
		name: 'init_subclass_class_body'.
%

category: 'Grail-Helpers'
method: InitSubclassClassBodyTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: InitSubclassClassBodyTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests - the implicit classmethod'
method: InitSubclassClassBodyTestCase
testADefUnderAConditionalReceivesTheClass
	"The annotated-types shape.  A def is a def wherever in the body it sits."

	self assertAll: #(
		'a_def_under_if_receives_the_class'
		'a_def_under_for_receives_the_class'
		'a_def_under_try_receives_the_class')
%

category: 'Grail-Tests - the implicit classmethod'
method: InitSubclassClassBodyTestCase
testAStarArgsHookGetsTheClassPositionally
	"``def __init_subclass__(cls, *args, **kwargs)'' -- annotated-types''
	exact signature -- with no keywords in play, so the class is the only
	thing that can arrive."

	self assertAll: #('a_star_args_hook_gets_the_class_positionally')
%

category: 'Grail-Tests - the implicit classmethod'
method: InitSubclassClassBodyTestCase
testABodyHookRunsWithNoKeywords
	"Nothing about this needs a class keyword: the hook was simply not run
	with the class, keywords or no keywords."

	self assertAll: #('a_body_hook_with_no_keywords_still_gets_the_class')
%

category: 'Grail-Tests - the third home'
method: InitSubclassClassBodyTestCase
testABodyClassmethodAssignmentRuns
	"It ran not at all before -- no hook, no error."

	self assertAll: #('a_body_classmethod_assignment_runs')
%

category: 'Grail-Tests - the third home'
method: InitSubclassClassBodyTestCase
testABodyPlainAssignmentReceivesTheClass
	"``__init_subclass__ = fn'' in a body is the same implicit classmethod as
	a def, and CPython passes the class to it."

	self assertAll: #('a_body_plain_assignment_receives_the_class')
%

category: 'Grail-Tests - along the MRO'
method: InitSubclassClassBodyTestCase
testASecondaryBaseHookRuns
	self assertAll: #(
		'a_secondary_base_hook_runs'
		'a_secondary_base_hook_runs_without_keywords')
%

category: 'Grail-Tests - along the MRO'
method: InitSubclassClassBodyTestCase
testTheFirstBaseThatSuppliesOneWins
	"MRO order: the leftmost base carrying a hook runs, and it runs ONCE."

	self assertAll: #('the_first_base_that_supplies_one_wins')
%

category: 'Grail-Tests - along the MRO'
method: InitSubclassClassBodyTestCase
testNoHookOnAnyBaseStillRejectsAKeyword
	"Widening the search must not turn the leftover-keyword complaint off."

	self assertAll: #('no_hook_on_any_base_still_rejects_a_keyword')
%

category: 'Grail-Tests - the message'
method: InitSubclassClassBodyTestCase
testTheMessageNamesTheClassBeingCreated
	"CPython 3.14 builds the message from the new class''s __qualname__.  The
	raise happens in object''s terminal hook, but the DEFECT is always
	somewhere else -- a misspelt keyword, or a base whose hook should have
	consumed it -- so naming object sends the reader to the one place that is
	working correctly.  The package census lost real time to exactly that."

	self assertAll: #('the_message_names_the_class_being_created')
%
