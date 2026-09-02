! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinArgValidationTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
BuiltinArgValidationTestCase comment:
'The builtins that accepted what CPython refuses.

Argument validation is not decoration.  Three of these were not missing
errors at all:

  * ``len'' handed back whatever __len__ returned.  A __len__ answering a
    STRING made len() answer a string, and a negative one made it answer
    a negative -- wrong ANSWERS, and ones that travel, because everything
    downstream of len() is entitled to assume a non-negative int.

  * ``setattr(o, 1, 2)'' did not refuse the integer name; it SET an
    attribute under a key no attribute lookup will ever produce.  A
    silent write to an unreachable slot.

  * ``format(1, 2)'' reached ___formatValue___:spec:, which sends
    #isEmpty to the spec -- so a bad second argument answered ``a
    SmallInteger does not understand #isEmpty'', an uncatchable Smalltalk
    error out of a builtin.

The rest are refusals: a non-string attribute name (four builtins
disagreeing four ways -- getattr and delattr raised AttributeError, so
``except AttributeError'' swallowed a type mistake, and hasattr answered
False), a second positional to ``sorted'' (the Python 2 ``cmp'' spelling,
silently IGNORED, so the list came back sorted by natural order and
looked fine) or to ``input'' (which went ahead and READ A LINE) or to
``dir'', and a ``__repr__ = None'' that made repr() answer the None
singleton instead of a string.

``dir'' gained a varargs entry that exists only to refuse: without one
the extra argument fell through to the generic arity dispatcher, whose
message is Grail''s wording for a MISSING METHOD rather than CPython''s
for a bad call.

Took test.test_builtin 68 -> 62.

See tests/python/builtin_arg_validation.py (14 checks, CPython-validated
first).'
%

expectvalue /Class
doit
BuiltinArgValidationTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
BuiltinArgValidationTestCase removeAllMethods: 0.
BuiltinArgValidationTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinArgValidationTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_arg_validation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_arg_validation.py')
		name: 'builtin_arg_validation'.
%

category: 'Grail-Helpers'
method: BuiltinArgValidationTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: BuiltinArgValidationTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: BuiltinArgValidationTestCase
testLenMustGetANonNegativeInt
	"Two of the three were WRONG ANSWERS: len() handed back a string or a
	negative number, and every caller downstream is entitled to assume
	otherwise.  CPython's complaint about the negative is a ValueError,
	not a TypeError."

	self assertAll: #('len_no_dunder' 'len_bad_return' 'len_negative')
%

category: 'Grail-Tests'
method: BuiltinArgValidationTestCase
testAnAttributeNameMustBeAString
	"Four builtins, one message -- and four different wrong answers
	before: getattr and delattr raised AttributeError, hasattr answered
	False, and setattr silently STORED under an integer key."

	self assertAll: #('attr_name_must_be_a_string')
%

category: 'Grail-Tests'
method: BuiltinArgValidationTestCase
testTheArityOfTheOnesThatTakeOne
	"``sorted(seq, cmp)'' is the Python 2 spelling and was silently
	ignored, so the list came back sorted by natural order and looked
	correct.  ``input('a', 'b')'' went ahead and read a line."

	self assertAll: #('dir_takes_one' 'sorted_takes_one'
		'sorted_needs_one' 'input_takes_one')
%

category: 'Grail-Tests'
method: BuiltinArgValidationTestCase
testFormatSpecMustBeAStringRatherThanACrash
	"The uncatchable one: an int spec reached a #isEmpty send."

	self assertAll: #('format_spec_must_be_str' 'format_spec_none'
		'format_spec_ok')
%

category: 'Grail-Tests'
method: BuiltinArgValidationTestCase
testADunderSetToNoneIsNotCallable
	"``__repr__ = None'' blocked repr in CPython and made Grail's repr()
	answer the None singleton, which every caller then treated as text."

	self assertAll: #('repr_blocked' 'hash_unhashable')
%

category: 'Grail-Tests'
method: BuiltinArgValidationTestCase
testTheCallsThatAlreadyWorkedStillDo
	"The regression half: twelve ordinary uses of the same six builtins."

	self assertAll: #('still_fine')
%
