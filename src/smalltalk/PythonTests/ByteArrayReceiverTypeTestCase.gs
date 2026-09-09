! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'ByteArrayReceiverTypeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ByteArrayReceiverTypeTestCase comment:
'A bytearray method answers a bytearray.

CPython''s rule is uniform -- these methods answer the RECEIVER''s type --
so every one of them called on a bytearray gives a bytearray back.  Grail
got it right for some and wrong for others, and the split was arbitrary:
``upper'''' preserved the type while ``lower'''' did not, from adjacent
methods written the same way.  Seventeen of the twenty-seven measured were
wrong.

THE CAUSE WAS A HARDCODED ``bytes ___new___:'''' where the established
idiom is ``(self class) ___new___:'''', so the result was built as the base
type no matter what it was called on.  The fix is that substitution, at 38
construction sites across 18 methods -- and deliberately NOT at the
single-byte scratch operands, which are the right-hand side of a
concatenation and take their class from the accumulator.

replace WAS WRONG FOR A DIFFERENT REASON, kept separate because it is a
different mistake: it answers ``new join: parts'''', and join follows its
RECEIVER, which there is the REPLACEMENT.  So the result type tracked an
ARGUMENT rather than the object the method was called on --
``bytearray(b''''aXb'''').replace(b''''X'''', b''''-'''')'''' came back a
plain bytes because the replacement was one.  ___asReceiverClass___:
coerces at the end, and is a no-op whenever the two already agree.

THE SILENT KIND.  The bytes are right, so nothing fails until something
downstream mutates the result -- a bytearray is mutable and a bytes is not
-- or checks its type.  A test here mutates a replace() result for exactly
that reason, and another asserts the CONTENT of every repaired method,
because a type coercion is precisely where content quietly goes wrong.'
%

doit
ByteArrayReceiverTypeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
ByteArrayReceiverTypeTestCase removeAllMethods: 0.
ByteArrayReceiverTypeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: ByteArrayReceiverTypeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'bytearray_receiver_type' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bytearray_receiver_type.py')
		name: 'bytearray_receiver_type'.
%

category: 'Grail-Helpers'
method: ByteArrayReceiverTypeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: ByteArrayReceiverTypeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: ByteArrayReceiverTypeTestCase
testEveryMethodKeepsTheReceiverType
	"The seventeen that were wrong, by family: case, stripping, padding,
	replacing, splitting and trimming."

	self assertAll: #('case_methods' 'stripping' 'padding' 'replacing'
		'splitting' 'trimming')
%

category: 'Grail-Tests'
method: ByteArrayReceiverTypeTestCase
testTheOnesThatAlreadyWorkedStillDo
	"Slicing, +, *, copy, join and translate -- the ten that were right,
	which is what made the inconsistency hard to notice."

	self assertAll: #('already_worked')
%

category: 'Grail-Tests'
method: ByteArrayReceiverTypeTestCase
testTheContentIsUnchanged
	"A type coercion is exactly where content goes quietly wrong, so every
	repaired method is checked for its BYTES as well as its class."

	self assertAll: #('the_bytes_are_still_right' 'split_content')
%

category: 'Grail-Tests'
method: ByteArrayReceiverTypeTestCase
testABytesReceiverIsUnaffected
	"The regression half.  ``self class'' has to answer bytes for a bytes,
	and the coercion in replace must be a no-op when the classes agree."

	self assertAll: #('bytes_stays_bytes' 'bytes_content_unchanged')
%

category: 'Grail-Tests'
method: ByteArrayReceiverTypeTestCase
testTheResultIsMutable
	"Which is the POINT of the type rather than a detail of it: the result
	now supports the mutation a bytes would refuse."

	self assertAll: #('the_result_can_be_mutated')
%
