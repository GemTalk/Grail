! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'IndexArgumentCoercionTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
IndexArgumentCoercionTestCase comment:
'An index ARGUMENT is coerced through __index__, as an index SUBSCRIPT is.

``x[k]'''' honoured PEP 357.  ``L.insert(k, v)'''', ``L.pop(k)'''',
``range(k)'''', ``s.find(sub, k)'''' and friends did not: they took the
argument as given and went straight to env-0 arithmetic on it.

THE FAILURE WAS THE BAD KIND.  An env-0 send to a Python object is a
Smalltalk MessageNotUnderstood, which Python code cannot catch -- ``try:
L.insert(k, 9) except TypeError:'''' did not handle it, it ABORTED the
enclosing module.  Fourteen consumers behaved that way.

UNLIKE THE SUBSCRIPT DEFECT, THIS ONE IS NOT ABOUT THE VARARGS SHAPE.  It
failed for a plain ``def __index__(self)'''' too, because nothing was
coerced at all.  That is why the fixture asserts BOTH shapes at every
consumer and does not treat the plain one as a mere regression check.

The fix is ___asIndex___ at each site, which is what every subscript
already did.  Where a bound may legitimately be None (``s.find(sub, None,
None)''''), None is resolved to its default FIRST -- it is a legal bound
and has no __index__ -- and a test covers exactly that ordering.

FOUND BY SWEEPING.  The previous change closed the varargs-__index__ hole
and left this documented as a separate defect affecting four consumers.
Sweeping the index-ARGUMENT surface the same way turned four into
fourteen: list.index / tuple.index with a start, bytearray.pop, all three
range arities, bytes.find, and str''s find / index / count / startswith /
endswith.  Two shared choke points carried most of it --
SequenceableCollection >> ___pyIndex___:from:to: serves list.index and
tuple.index at every arity, and one start/end normalization idiom repeats
across str and bytes.'
%

doit
IndexArgumentCoercionTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
IndexArgumentCoercionTestCase removeAllMethods: 0.
IndexArgumentCoercionTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: IndexArgumentCoercionTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'index_argument_coercion' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/index_argument_coercion.py')
		name: 'index_argument_coercion'.
%

category: 'Grail-Helpers'
method: IndexArgumentCoercionTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: IndexArgumentCoercionTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: IndexArgumentCoercionTestCase
testBothIndexShapesReachEveryConsumer
	"Fifteen consumers against both __index__ shapes.  The plain one is
	asserted for its own sake, not as a regression check: nothing was
	coerced at all, so it failed too.  A failure names the consumers."

	self assertAll: #('the_varargs_shape' 'the_plain_shape')
%

category: 'Grail-Tests'
method: IndexArgumentCoercionTestCase
testPlainIntegersAreUnaffected
	"The overwhelmingly common path through every one of these methods."

	self assertAll: #('plain_ints_still_work')
%

category: 'Grail-Tests'
method: IndexArgumentCoercionTestCase
testANonIndexArgumentRaisesACatchableTypeError
	"The defect stated as its cure: a refusal a Python program can HANDLE,
	naming the type, rather than a Smalltalk MessageNotUnderstood that
	aborts the module.  A non-int __index__ result raises too."

	self assertAll: #('a_non_index_argument_raises_a_catchable_TypeError'
		'the_refusal_names_the_type' 'a_non_int_result_raises')
%

category: 'Grail-Tests'
method: IndexArgumentCoercionTestCase
testNoneIsStillALegalBound
	"The ordering the fix depends on: None is a legal bound with no
	__index__, so it must be resolved to its default BEFORE coercion.
	Coercing first would turn every s.find(sub, None) into a TypeError."

	self assertAll: #('None_is_still_a_legal_bound')
%

category: 'Grail-Tests'
method: IndexArgumentCoercionTestCase
testNegativeAndEdgeArgumentsStillBehave
	"Coercion runs before the negative/clamping arithmetic, so the rules
	that arithmetic implements have to be unchanged by it."

	self assertAll: #('negative_arguments_still_count_from_the_end'
		'empty_and_edge_ranges_still_hold')
%
