! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AugmentedBinaryFallbackTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AugmentedBinaryFallbackTestCase comment:
'``x += y'''' must find a binary dunder that has optional parameters.

object >> ___augmentedOp___:inplace:binary: tries the in-place dunder
(__iadd__) and falls back to the binary one (__add__).  For the in-place
half it probed BOTH shapes -- the fixed-arity ``__iadd__:'''' and the
varargs ``___iadd__:kw:'''' -- and for the binary half it probed only
``__add__:''''.

That asymmetry is a real gap rather than a tidiness point, because
``__add__:'''' is not a selector every class with an __add__ has:

    def __add__(self, other)                 ->  __add__:
    def __add__(self, other, context=None)   ->  ___add__:kw:

and the second gets no fixed-arity forwarder either -- correctly, since
ClassDefAst emits those to OVERRIDE a superclass method and object has no
``__add__:'''' to override; its binary operators go through
___binOpAdd___: instead.

So ``x + 5'''' worked and ``x += 5'''' did not, for the same class and the
same method.  _pydecimal''s Decimal is exactly that shape -- every
arithmetic dunder there takes an optional ``context'''' -- which cost
test_decimal seven tests, every one reported as ``unsupported operand
type(s) for +: ''''Decimal'''' and ''''int'''''''' by the env-1 backstop
after the perform missed.  test_decimal went 17 bad to 10.

MOST OF WHAT IS TESTED HERE IS THE REGRESSION HALF.  This method carries
several hard-won behaviours, each with its own defect behind it -- a None
in-place dunder disabling the operator AND blocking the binary fallback, a
NotImplemented return falling through, an unbound local still raising
UnboundLocalError rather than reaching a reflected dunder with nil, the
reflected fallback for a receiver with no __add__ at all.  A new branch in
the middle of that is exactly the kind of change that quietly breaks one,
so they are asserted individually rather than trusted.

The new branch honours NotImplemented for the same reason the in-place
branch above it does: a defaulted-parameter __add__ that declines has to
reach the right operand''s __radd__, as its fixed-arity twin would.'
%

doit
AugmentedBinaryFallbackTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AugmentedBinaryFallbackTestCase removeAllMethods: 0.
AugmentedBinaryFallbackTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AugmentedBinaryFallbackTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'augmented_binary_fallback' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/augmented_binary_fallback.py')
		name: 'augmented_binary_fallback'.
%

category: 'Grail-Helpers'
method: AugmentedBinaryFallbackTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: AugmentedBinaryFallbackTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: AugmentedBinaryFallbackTestCase
testAugmentedFindsADunderWithOptionalParameters
	"The defect itself, across four operators, and beside it the plain
	binary operator that worked all along -- which is what made the report
	confusing: same class, same method, one spelling worked."

	self assertAll: #('augmented_with_optional_parameter'
		'the_plain_operator_still_works'
		'a_plain_dunder_is_unaffected')
%

category: 'Grail-Tests'
method: AugmentedBinaryFallbackTestCase
testTheInPlaceDunderStillTakesPrecedence
	"__iadd__ wins when present, and its NotImplemented still falls
	through to the binary dunder -- here a varargs one, so both halves of
	the fallback are exercised in a single expression."

	self assertAll: #('the_in_place_dunder_still_wins'
		'not_implemented_falls_through')
%

category: 'Grail-Tests'
method: AugmentedBinaryFallbackTestCase
testTheVarargsBranchHonoursNotImplemented
	"A defaulted-parameter __add__ that declines must reach the right
	operand's __radd__, exactly as its fixed-arity twin would, and raise
	TypeError when there is none."

	self assertAll: #('a_varargs_dunder_answering_not_implemented_defers'
		'a_varargs_dunder_declining_with_no_reflection_raises')
%

category: 'Grail-Tests'
method: AugmentedBinaryFallbackTestCase
testTheGuardsAroundTheFallbackStillHold
	"The three behaviours the new branch sits between: __iadd__ = None
	disables the operator outright, an unbound local raises
	UnboundLocalError rather than reaching a reflected dunder with nil, and
	a receiver with no __add__ at all still reaches __radd__."

	self assertAll: #('none_disables_the_operator'
		'an_unbound_local_still_raises'
		'the_reflected_fallback_still_works')
%

category: 'Grail-Tests'
method: AugmentedBinaryFallbackTestCase
testBuiltinsAreUntouched
	"The fast path for kernel-backed receivers, which must not have
	acquired a class-attribute lookup or a varargs probe."

	self assertAll: #('builtins_still_augment'
		'an_unsupported_pair_still_raises')
%
