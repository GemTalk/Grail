! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UnaryVarargsDispatchTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UnaryVarargsDispatchTestCase comment:
'A 0-arg send whose only same-named method is the VARARGS form is a CALL.

``def __neg__(self, context=None)'''' compiles to ___neg__:kw: with no
0-arg __neg__, so ``-x'''' -- which UnaryOpAst emits as the bare Smalltalk
send ``x __neg__'''' -- missed and reached object >>
doesNotUnderstand:args:envId:.  A branch there answered a BoundMethod for
any 0-arg send whose class had a same-named callable form, the varargs one
included.

So ``-Decimal(45)'''' evaluated to the bound method OBJECT rather than
Decimal(''-45''): no exception, no warning, just the wrong value flowing
onward.  test_decimal reported it as ``<BoundMethod object at 0x12f34a6>
!= Decimal(''''45'''')''''.  All four unary operators were affected, and so
were len/hash/str on a class whose dunder takes an optional parameter.

THE BRANCH WAS SERVING NOBODY.  Its comment said it existed ``for
`f = obj.method` patterns'''', and the method''s own doc comment explained
that Grail emits attribute reads as bare unary sends -- which has not been
true for some time.  AttributeAst >> ___emitSmalltalkOn___ emits
``___pyAttrLoad___:'''', and that helper probes every arity variant, the
varargs form included, and makes its own BoundMethod.  A plain ``k.zero''''
answers a bound method even though a real 0-arg ``zero'''' exists, which a
bare send would have called.  Both comments are corrected in place, since
the stale one is what made the branch look load-bearing.

MOST OF THIS TEST IS THE REGRESSION HALF, and deliberately so: the claim
being made is that no method READ comes through that branch.  Reads are
asserted for every shape the branch tested for -- 0-arg, 0-arg with
defaults, one-arg, two-arg, starred, and a dunder -- each shown to yield
something callable, to be callable again afterwards, and NOT to equal its
own result.  The last of those is the defect stated in reverse.

The fixed-arity spellings still answer a BoundMethod: a class with only
``foo:'''' cannot satisfy a 0-arg call at all, so there is no call to
prefer, and ``Shapes().one()'''' must still raise TypeError.'
%

doit
UnaryVarargsDispatchTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
UnaryVarargsDispatchTestCase removeAllMethods: 0.
UnaryVarargsDispatchTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnaryVarargsDispatchTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'unary_varargs_dispatch' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unary_varargs_dispatch.py')
		name: 'unary_varargs_dispatch'.
%

category: 'Grail-Helpers'
method: UnaryVarargsDispatchTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: UnaryVarargsDispatchTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: UnaryVarargsDispatchTestCase
testUnaryOperatorsWithAnOptionalParameter
	"The defect: all four unary operators answered the bound method
	rather than calling it, and the plain spelling beside it that worked
	all along."

	self assertAll: #('unary_operators_with_optional_parameter'
		'unary_operators_plain')
%

category: 'Grail-Tests'
method: UnaryVarargsDispatchTestCase
testOtherZeroArgDundersReachedTheSameWay
	"len / hash / str are dispatched the same way and broke the same way,
	so the fix is not specific to the arithmetic unary operators."

	self assertAll: #('other_zero_arg_dunders_with_optional_parameter')
%

category: 'Grail-Tests'
method: UnaryVarargsDispatchTestCase
testReadingAMethodStillDoesNotCallIt
	"The property the changed branch was believed to provide, asserted
	for every method shape it tested for -- and actually provided by the
	attribute path, which is the point."

	self assertAll: #('reading_a_method_does_not_call_it'
		'a_read_method_is_still_callable_afterwards'
		'a_read_is_not_the_result')
%

category: 'Grail-Tests'
method: UnaryVarargsDispatchTestCase
testExplicitCallsAreUnaffected
	"A 0-arg send IS a call, so every explicit call must still land --
	including the varargs shapes the branch used to intercept."

	self assertAll: #('calling_directly_still_works')
%

category: 'Grail-Tests'
method: UnaryVarargsDispatchTestCase
testPreferringACallDoesNotInventOne
	"The fixed-arity half still answers a BoundMethod, so calling it with
	no arguments must fail as CPython's does, and a genuinely missing name
	must still raise AttributeError.

	``-x'' on a class with NO __neg__ of any shape is deliberately NOT
	asserted: Grail raises an uncatchable Smalltalk MessageNotUnderstood
	there, so a check would abort the fixture rather than fail it.  It was
	measured identical with and without this change -- the branch fires
	only when the varargs form EXISTS -- and is recorded in docs/Issues.md
	as its own open defect."

	self assertAll: #('wrong_arity_still_raises'
		'a_read_of_a_missing_name_still_raises')
%

category: 'Grail-Tests'
method: UnaryVarargsDispatchTestCase
testBuiltinsAreUntouched
	"Kernel-backed receivers never reach this DNU; asserted so a future
	change that routes them through it is caught here."

	self assertAll: #('builtin_unary_operators')
%
