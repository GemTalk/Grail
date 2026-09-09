! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UnaryOperandTypeErrorTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UnaryOperandTypeErrorTestCase comment:
'A unary operator on a type with no such dunder raises a CATCHABLE TypeError.

Three defects met in one message.  They were found while writing the
fixture for the varargs-dispatch fix and left for this change, so that one
very hot method changed one behaviour at a time.

1. UNCATCHABLE.  For a user-defined class, ``-obj'''' raised a Smalltalk
MessageNotUnderstood, which Python code cannot catch: ``try: -obj except
TypeError:'''' did not handle it, it ABORTED the enclosing module.
doesNotUnderstand:args:envId: did have the right TypeError, but it was
gated ``(self isKindOf: PythonInstance) ifFalse:'''' -- firing for None and
the built-ins and skipped for exactly the user classes that needed it.  An
error a program cannot catch is worse than a wrong message, so this is the
half that matters.

2. EMPTY MESSAGE.  abs() raised a bare ``TypeError signal'''' -- right
class, no message at all -- for every receiver kind.

3. LEAKED SMALLTALK CLASS NAMES.  The message was built from ``self class
name asString'''', so ``-''''ab'''''''' read ``bad operand type for unary
-: ''''Unicode7'''''''', a list read OrderedCollection, a dict PyDict and
object() Object.  That is the exact bug ___pyDnuTypeName___ exists to
prevent, in a message that had never been converted to use it.

THE FIX IS SPLIT IN TWO, deliberately.  A kernel-backed receiver is
refused EARLY, before any resolution is attempted, because it has no
Python class body that could still supply the dunder.  A PythonInstance is
refused at the END of the 0-arg path, once the varargs, classmethod and
metaclass probes have all missed -- otherwise the early exit would shadow
a method a user class really does define.  A test here covers exactly that
risk with the varargs shape.

THE SHAPE OF THE FIXTURE IS THE ARGUMENT: nine receiver kinds by four
operators, messages included.  Nine of the thirty-six matched CPython
before and all thirty-six do now, and each of the three defects hit a
different part of the grid -- only something that varies both axes shows
that.  The grid also carries the two wordings, three operators naming the
GLYPH and abs() naming the FUNCTION, which is CPython''s distinction
rather than a tidy-up.'
%

doit
UnaryOperandTypeErrorTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
UnaryOperandTypeErrorTestCase removeAllMethods: 0.
UnaryOperandTypeErrorTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnaryOperandTypeErrorTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'unary_operand_typeerror' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unary_operand_typeerror.py')
		name: 'unary_operand_typeerror'.
%

category: 'Grail-Helpers'
method: UnaryOperandTypeErrorTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: UnaryOperandTypeErrorTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: UnaryOperandTypeErrorTestCase
testTheWholeGridMatchesCPython
	"Nine receiver kinds by four operators, message text included.  Nine
	of the thirty-six matched before; a failure here names the cells."

	self assertAll: #('the_whole_grid')
%

category: 'Grail-Tests'
method: UnaryOperandTypeErrorTestCase
testTheErrorIsCatchableFromPython
	"The half that matters.  A Smalltalk MessageNotUnderstood is not
	catchable from Python, so this asserts handling rather than merely
	receiving -- via except TypeError and via a bare except Exception."

	self assertAll: #('it_is_catchable_as_a_python_exception'
		'a_bare_except_also_catches_it')
%

category: 'Grail-Tests'
method: UnaryOperandTypeErrorTestCase
testTheMessageNamesThePythonType
	"The leak isolated to the four receivers that showed it, plus the
	assertion that abs() has any message at all."

	self assertAll: #('the_type_name_is_the_python_one'
		'abs_has_a_message_at_all')
%

category: 'Grail-Tests'
method: UnaryOperandTypeErrorTestCase
testARefusalDoesNotShadowADefinedOperator
	"The risk the split creates: a refusal placed too early would hide a
	dunder the class really has.  Covered in both shapes -- the plain
	0-arg one and the varargs one that only resolves late."

	self assertAll: #('defined_unary_operators_still_work'
		'builtin_unary_operators_still_work')
%

category: 'Grail-Tests'
method: UnaryOperandTypeErrorTestCase
testTheRefusalIsPerOperatorNotPerClass
	"A class with __neg__ but no __invert__ is still refused for ~, and
	refused by type name -- so the check is not ``does this class have any
	unary dunder''."

	self assertAll: #('partial_support_is_respected')
%
