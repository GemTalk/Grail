! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassCallTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
MetaclassCallTestCase comment:
'A metaclass''s __call__ owns instantiation.

``Owned(...)'''' is ``type(Owned).__call__(Owned, ...)'''' in CPython, so a
metaclass defining __call__ replaces __new__/__init__ entirely.  Grail went
straight to __new__/__init__ and the metaclass never ran -- so the singleton
and registry idioms silently produced a fresh ordinary instance every time.
The wrong-answer half of a conformance gap, not the missing-error half.

TWO ENTRY POINTS HAD TO ASK.  ClassDefAst synthesizes a per-class
``value:value:'''' for user classes; built-in classes fall back to the one on
object''s class side.  Which of the two a class happens to use must not
decide whether its metaclass runs.

EMITTED FOR EVERY CLASS, not only for one written with a ``metaclass=''''
keyword, because a metaclass is INHERITED -- ``class Sub(Owned)'''' has it too
and its own synthesized method would otherwise skip it.  The cost is one send
whose answer is CACHED per class: resolving it means a SessionTemps read, a
superclass walk and a selector-family probe, none of which can happen per
object.  Measured over five runs each way on a loop that does nothing but construct
200000 objects: median 1.396s without, 1.422s with -- about 2 to 3 percent,
and proportionally less wherever __init__ does any real work.

super().__call__ IS THE HALF THAT MAKES IT USEFUL.  Almost every real
metaclass __call__ does something and then delegates, so type >> ___call__:kw:
performs the ordinary construction -- and because the receiver of that is the
class being instantiated, it is the very method the hook guards.  Hence the
BYPASS: a set of classes currently delegating, checked only once a handler is
known to exist.  A set rather than a flag, so a metaclass __call__ that
constructs a DIFFERENT class on the way still gets that class''s own hook.

A MARKER, NOT NIL, signals ``no metaclass __call__'''': returning None from
__call__ is legal Python and must not be mistaken for the absence of one.'
%

doit
MetaclassCallTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
MetaclassCallTestCase removeAllMethods: 0.
MetaclassCallTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassCallTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_call' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_call.py')
		name: 'metaclass_call'.
%

category: 'Grail-Helpers'
method: MetaclassCallTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: MetaclassCallTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: MetaclassCallTestCase
testTheMetaclassOwnsInstantiation
	"Arguments and keywords reach it, and an INHERITED metaclass gets the
	same treatment -- which is why the hook is emitted for every class and
	not only for one carrying the keyword."

	self assertAll: #('call_replaces_instantiation'
		'arguments_reach_the_metaclass' 'an_inherited_metaclass_too')
%

category: 'Grail-Tests'
method: MetaclassCallTestCase
testNewAndInitDoNotRunWhenCallDoesNotDelegate
	"__call__ REPLACES construction; a __call__ that never delegates means
	the class's own __init__ is not called at all.  The log is the
	assertion, not the return value."

	self assertAll: #('new_and_init_do_not_run')
%

category: 'Grail-Tests'
method: MetaclassCallTestCase
testSuperCallStillConstructs
	"The half that makes the feature usable: almost every real metaclass
	__call__ does something and then delegates.  type >> ___call__:kw: runs
	the ordinary construction, and the bypass keeps it from being sent
	straight back into the __call__ that delegated."

	self assertAll: #('super_call_still_constructs')
%

category: 'Grail-Tests'
method: MetaclassCallTestCase
testOrdinaryConstructionIsUnchanged
	"The regression half, and the one that matters most: this hook is on
	the path of every object ever built.  A plain class, a metaclass with
	no __call__, a class with its own __new__ and __init__, and the
	builtins."

	self assertAll: #('a_plain_class_still_constructs'
		'a_metaclass_without_call_still_constructs'
		'new_and_init_still_run' 'builtins_still_construct')
%

category: 'Grail-Tests'
method: MetaclassCallTestCase
testCallMayReturnNone
	"Which is why ``no metaclass __call__'' is signalled by a marker and
	not by nil."

	self assertAll: #('call_may_return_none')
%
