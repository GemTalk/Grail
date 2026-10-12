! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassSideArityMessageTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassSideArityMessageTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassSideArityMessageTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassSideArityMessageTestCase
!
! A FIXED-ARITY @classmethod OR @staticmethod CALLED WITH THE WRONG COUNT RAISES
! CPython's MESSAGE (#1484).  Every other def gets a keyword forwarder whose
! generated arity check raises ``C.m() takes 2 positional arguments but 3 were
! given'' or ``missing 1 required positional argument''.  A class-side def whose
! parameters are all plain and required gets none, so the call fell through to
! BoundMethod >> value:value:'s last resort -- ``cm() takes a different number
! of arguments (2 given)'' -- for too few arguments as well as too many.
!
! BoundMethod >> ___classSideArityMessageFor___:given: builds CPython's text
! from what the compiler recorded: the signature table (the parameter names),
! ___staticMethodNames___ (whether cls counts), and the defining class (the
! qualified name).  A Smalltalk-native method has no signature and keeps the
! generic message.
!
! Fixture: tests/python/class_side_arity_message.py (self-verifying under
! CPython 3.14 -- all 13 checks pass there unchanged).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassSideArityMessageTestCase removeAllMethods.
ClassSideArityMessageTestCase class removeAllMethods.
%

category: 'Grail-Setup'
method: ClassSideArityMessageTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #class_side_arity_message ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_side_arity_message.py')
		name: 'class_side_arity_message'.
%

category: 'Grail-Private'
method: ClassSideArityMessageTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests'
method: ClassSideArityMessageTestCase
testAClassmethodCountsCls
	"cls counts on both sides, as self does; the qualified name is the
	defining class's, through an instance, a subclass or a nested class."

	#('classmethod_too_many' 'classmethod_no_parameters'
	  'classmethod_through_an_instance' 'classmethod_inherited_keeps_its_qualname'
	  'classmethod_of_a_nested_class')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests'
method: ClassSideArityMessageTestCase
testAStaticmethodHasNoReceiverToCount
	"Including a staticmethod with no parameters, which the signature table
	does not record at all."

	#('staticmethod_too_many' 'staticmethod_no_parameters'
	  'staticmethod_through_an_instance')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests'
method: ClassSideArityMessageTestCase
testTooFewNamesTheMissingParameters
	"CPython's format_missing() text, bare ``and'' at two."

	#('classmethod_too_few' 'classmethod_several_missing'
	  'staticmethod_too_few' 'staticmethod_both_missing')
		do: [:key | self assertMatchesCPythonAt: key].
%

category: 'Grail-Tests - Controls'
method: ClassSideArityMessageTestCase
testTheRightCountStillCallsThrough
	self assertMatchesCPythonAt: 'right_counts_still_work'.
%

category: 'Grail-Tests - Controls'
method: ClassSideArityMessageTestCase
testANativeFunctionKeepsTheGenericMessage
	"No recorded signature, so nothing to build CPython's text from: the
	generic message stays, and stays a catchable TypeError."

	| acos raised |
	acos := (importlib @env1:lookupModule: 'math') @env1:___pyAttrLoad___: #acos.
	raised := nil.
	[acos @env1:value: { 1. 2 } value: nil]
		on: TypeError
		do: [:ex | raised := ex messageText asString. ex return: nil].
	self assert: raised notNil.
	self assert: (raised indexOfSubCollection: 'takes a different number of arguments') > 0
		description: raised printString
%

category: 'Grail-Tests - Controls'
method: ClassSideArityMessageTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check would stop being
	asserted and nothing would go red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '13 checks, 0 disagreeing [], keys match: True'
%
