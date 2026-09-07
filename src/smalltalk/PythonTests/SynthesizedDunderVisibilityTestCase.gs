! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SynthesizedDunderVisibilityTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SynthesizedDunderVisibilityTestCase comment:
'A dunder Grail SYNTHESIZES as a default is not an attribute CPython has.

object installs default __enter__ / __exit__ / __aenter__ / __aexit__ /
__iter__ / __contains__, and PythonInstance installs default __next__ /
__getitem__ / __setitem__ / __delitem__.  Every one is a method whose
whole body raises the TypeError CPython''s interpreter would have raised,
which is exactly what makes ``with obj:'''' on a non-manager say the right
thing rather than fail as a DNU.

Useful as SMALLTALK methods, and invisible to Python.  CPython''s object
has none of them, so reading one off a type that does not define it is an
AttributeError -- and Grail answered a function instead.

THE COST WAS NOT COSMETIC.  The standard way to ask ``is this a context
manager'''' is to read the dunder off the TYPE and catch AttributeError;
contextlib''s ExitStack.push does precisely that to tell a manager from a
plain callback.  With the probe answering yes for everything, push()
registered functions as context managers and the unwind then died with
``''''function'''' object does not support the context manager protocol''''.
The obvious fallback was closed too: vars(cls) does not show
Python-defined methods, so walking the MRO could not answer the question
either.  Between them there was NO expression a Python program could
write to ask whether a type genuinely implements a dunder.

WHAT IS HIDDEN IS ONLY THE PYTHON-VISIBLE CLASS ATTRIBUTE.  The Smalltalk
defaults stay exactly where they were, so ``with'''', ``for'''' and
subscripting still produce CPython''s messages -- asserted here, because
hiding the attribute by REMOVING the defaults would have traded one
divergence for three.

The test is on the OWNER, not on the name: a class that genuinely defines
the dunder owns it, and so does a builtin like list or dict.  An ``async
def'''' compiles to no Smalltalk method and lands in the per-class dynamic
store, as does a runtime ``Cls.__exit__ = fn'''', so that store is
consulted first -- both are asserted.'
%

doit
SynthesizedDunderVisibilityTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
SynthesizedDunderVisibilityTestCase removeAllMethods: 0.
SynthesizedDunderVisibilityTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: SynthesizedDunderVisibilityTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'synthesized_dunder_visibility' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/synthesized_dunder_visibility.py')
		name: 'synthesized_dunder_visibility'.
%

category: 'Grail-Helpers'
method: SynthesizedDunderVisibilityTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: SynthesizedDunderVisibilityTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: SynthesizedDunderVisibilityTestCase
testATypeWithoutTheDunderHasNoSuchAttribute
	"Including the read ExitStack.push actually performs -- the dunder off
	the type of a plain function."

	self assertAll: #('a_class_without_it' 'a_plain_function')
%

category: 'Grail-Tests'
method: SynthesizedDunderVisibilityTestCase
testATypeThatDefinesItStillAnswers
	"The owner test, not a name test: a class that defines the dunder, a
	subclass that inherits a real one, an ``async def'' (which compiles to
	no Smalltalk method), a runtime assignment, and the builtins."

	self assertAll: #('a_class_that_defines_it' 'assigned_at_runtime_reads'
		'builtins_still_read')
%

category: 'Grail-Tests'
method: SynthesizedDunderVisibilityTestCase
testTheDundersObjectReallyHasAreUntouched
	"__eq__, __hash__, __repr__, __str__ are on CPython's object too, so
	they must keep reading."

	self assertAll: #('the_dunders_object_really_has')
%

category: 'Grail-Tests'
method: SynthesizedDunderVisibilityTestCase
testTheStatementsStillSayTheRightThing
	"The half that makes hiding the attribute safe rather than a trade.
	The defaults are still installed, so ``with'', ``for'' and subscripting
	produce CPython's TypeErrors -- and a real context manager still runs."

	self assertAll: #('with_on_a_non_manager' 'for_on_a_non_iterable'
		'subscript_on_a_non_sequence' 'a_real_manager_still_works')
%

category: 'Grail-Tests'
method: SynthesizedDunderVisibilityTestCase
testAMetaclassSuppliedDunderIsStillVisible
	"``x in Color'' is EnumType >> __contains__:, which makes
	Color.__contains__ a real attribute even though no Enum INSTANCE
	defines one.  The owner test has to walk the metaclass chain too --
	gated on isMeta, because that chain ends in the Smalltalk kernel where
	object's own defaults live.

	AND THE RECORDED METACLASS, which is a different question: ``class
	Owned(metaclass=Meta)'' does not put Meta in Owned's Smalltalk metaclass
	chain at all -- Owned's class is ``Owned class'', whose superclass is
	``PythonInstance class''.  ___grailMetaclass___ is where the association
	is kept, and asking it is what stops this guard hiding an attribute the
	very next branch of ___pyAttrLoad___ was about to answer."

	self assertAll: #('a_metaclass_supplied_dunder_is_visible'
		'a_hand_written_metaclass_too')
%
