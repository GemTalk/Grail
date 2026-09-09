! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'IndexDunderVarargsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
IndexDunderVarargsTestCase comment:
'A varargs-only __index__ is still an __index__ (PEP 357).

``def __index__(self, context=None)'''' compiles to ___index__:kw: with no
0-arg __index__ -- correctly, since ClassDefAst emits a fixed-arity
forwarder only to OVERRIDE a superclass method and object has no __index__
to override.

Every index consumer guarded itself with a SELECTOR test, either
``___respondsTo___: #''''__index__'''''''' or
``whichClassIncludesSelector: #''''__index__'''''''', which answers false
for that shape.  So the guard concluded the object was not index-like and
raised the sequence''s own refusal -- ``list indices must be integers or
slices, not IdxOpt'''' -- for a class that plainly has an __index__ and
that hasattr() agrees has one.  SEVENTEEN OF TWENTY consumers refused it.

Thirty-two guard sites across fifteen files now ask one predicate,
object >> ___hasIndexDunder___, which probes both shapes.

___respondsTo___: IS DELIBERATELY LEFT ALONE.  It documents an exact
equivalence to whichClassIncludesSelector:environmentId:, it sits on a hot
cached primitive, and it is asked about many selectors for which the
varargs form is not an equivalent answer.  Teaching it about varargs would
have fixed this at the cost of a contract every other caller relies on.
The __index__ protocol gets its own predicate instead.

FIVE OF THE SITES WERE NEARLY MISSED: they spell the selector unquoted
(``#__index__'''' rather than ``#''''__index__''''''''), so a search for
the quoted form found twenty-six of thirty-one.  Int.gs is the sharpest
illustration of the whole defect -- its __int__ branch already handles the
varargs form, with a comment about fractions.Fraction, and the __index__
fallback three lines below did not.

Both shapes are asserted at every consumer, because this is a guard change
and the risk of a guard change is the shape that used to pass.

Also corrects str''s refusal wording: CPython QUOTES the type name there
and nowhere else (``string indices must be integers, not ''''N'''''''' vs
``list indices must be integers or slices, not N''''), and Grail matched
list, tuple and bytes exactly while dropping the quotes on str.'
%

doit
IndexDunderVarargsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
IndexDunderVarargsTestCase removeAllMethods: 0.
IndexDunderVarargsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: IndexDunderVarargsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'index_dunder_varargs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/index_dunder_varargs.py')
		name: 'index_dunder_varargs'.
%

category: 'Grail-Helpers'
method: IndexDunderVarargsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: IndexDunderVarargsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: IndexDunderVarargsTestCase
testTheVarargsShapeWorksAtEveryConsumer
	"Fourteen consumers -- subscript, slice, repeat, hex/oct/bin, int,
	bytes, operator.index -- against a class whose only __index__ takes an
	optional parameter.  A failure names the consumers."

	self assertAll: #('the_varargs_shape_works_everywhere')
%

category: 'Grail-Tests'
method: IndexDunderVarargsTestCase
testThePlainShapeStillWorksAtEveryConsumer
	"The regression half.  This is a guard change, so the shape that
	always passed is asserted at every one of the same consumers."

	self assertAll: #('the_plain_shape_still_works_everywhere')
%

category: 'Grail-Tests'
method: IndexDunderVarargsTestCase
testAGuardThatNowSaysYesStillSaysNo
	"A widened guard must not become an accepting one: an object with no
	__index__ at all is still refused, and refused with the SEQUENCE'S own
	wording, which is the reason these guards exist rather than everything
	calling __index__ and catching."

	self assertAll: #('a_non_index_object_is_still_refused'
		'the_refusal_still_names_the_sequence')
%

category: 'Grail-Tests'
method: IndexDunderVarargsTestCase
testTheCallHappensAndItsErrorsAreTheUsers
	"Now that the guard says yes, __index__ actually runs -- so a non-int
	return is a TypeError and an exception raised inside it propagates
	unchanged rather than being swallowed into ``not index-like''."

	self assertAll: #('a_non_int_result_is_a_TypeError'
		'an_exception_from_index_propagates')
%

category: 'Grail-Tests'
method: IndexDunderVarargsTestCase
testOrdinaryIntegersAreUntouched
	"The overwhelmingly common path through these guards, including bool,
	which is an int subclass and indexes as one."

	self assertAll: #('plain_integers_still_index' 'bool_still_indexes')
%
