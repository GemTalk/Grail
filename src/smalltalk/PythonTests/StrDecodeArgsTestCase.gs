! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StrDecodeArgsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StrDecodeArgsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StrDecodeArgsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrDecodeArgsTestCase
!
! ``str(bytes, encoding[, errors])'' -- the only multi-argument spelling of
! str() -- and what it does when the arguments are wrong.
!
! CPython checks both extra arguments before decoding anything:
!
!     str(b'2', sys.getdefaultencoding)
!         TypeError: str() argument 'encoding' must be str, not builtin_...
!
! Grail handed whatever it was given straight to ``decode'', which tried to
! ITERATE it, so this surfaced as a Smalltalk MessageNotUnderstood (``a
! BoundMethod does not understand #do:'') rather than a TypeError.  Inside a
! class body that meant an enum definition died with an internal error instead of
! the constructor's complaint.
!
! The same spelling is how a str-mixed enum writes a member whose value needs
! decoding, and that path could not call str() with two arguments AT ALL: the
! ``str'' handle is a BoundMethod of fixed arity 1, and the best-effort guard in
! ___grailConstructMemberValue:args: then kept the raw tuple, so ``three = b'3',
! 'ascii''' silently became a member whose value was a tuple.
!
! The routing is keyed on the first element being BYTES, not on argument count.
! A multi-element member value usually means something else entirely -- the
! argument list to the class's own __new__ (``key_type = 'An$(Bn)', 0'') -- and
! handing that to str() answered ``decoding str is not supported'', displacing
! the ``_value_ not set in __new__'' complaint that test_missing_value_error
! waits for.  Both spellings are pinned below, because the fix is the line
! between them.
!
! Every expectation was checked against CPython 3.14 by running the fixture there
! -- it is plain Python and needs no Grail -- and all twelve results agree.  The
! two constructor complaints are compared up to ``, not <type>'': the trailing
! type name is Grail's Python-visible name for the object (``BoundMethod''),
! which is not CPython's for a builtin function.  That is a separate naming gap
! and not one this fix should paper over.
!
! Drives tests/python/str_decode_args.py.  test_enum
! TestSpecial.test_custom_strenum.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StrDecodeArgsTestCase removeAllMethods.
StrDecodeArgsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: StrDecodeArgsTestCase
setUp
	"Reload tests/python/str_decode_args.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_decode_args' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_decode_args.py')
		name: 'str_decode_args'.
%

category: 'Grail-Private'
method: StrDecodeArgsTestCase
resultAt: key
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key
%

category: 'Grail-Tests - The constructor'
method: StrDecodeArgsTestCase
testABytesValueDecodesUnderItsEncoding
	self assert: (self resultAt: 'decode_2') asString equals: '3'.
	self assert: (self resultAt: 'decode_3') asString equals: '4'.
%

category: 'Grail-Tests - The constructor'
method: StrDecodeArgsTestCase
testABadEncodingOrErrorsArgumentIsATypeError
	"Both were MessageNotUnderstood before -- an internal Smalltalk error
	escaping as the answer to ordinary Python."

	self assert: (self resultAt: 'bad_encoding') asString
		equals: 'str() argument ''encoding'' must be str'.
	self assert: (self resultAt: 'bad_errors') asString
		equals: 'str() argument ''errors'' must be str'.
%

category: 'Grail-Tests - The constructor'
method: StrDecodeArgsTestCase
testTheEncodingIsCheckedFirst
	"With both wrong, CPython names the encoding.  Ordering matters because the
	three-argument form delegates to the two-argument one, which would otherwise
	report whichever it reached first."

	self assert: (self resultAt: 'both_bad') asString
		equals: 'str() argument ''encoding'' must be str'.
%

category: 'Grail-Tests - The constructor'
method: StrDecodeArgsTestCase
testAStrFirstArgumentIsStillRefused
	"str(str, encoding) is not a decode, and the existing complaint stands."

	self assert: (self resultAt: 'decoding_str') asString
		equals: 'decoding str is not supported'.
%

category: 'Grail-Tests - As an enum member value'
method: StrDecodeArgsTestCase
testAMemberValueMayBeBytesAndAnEncoding
	"``three = b'3', 'ascii''' could not be constructed at all -- the str handle
	takes one argument -- and the best-effort guard turned that into a member
	whose value was the raw tuple."

	self assert: (self resultAt: 'member_values') asString equals: '1,3,4'.
	self assert: (self resultAt: 'member_repr') asString
		equals: '<GoodStrEnum.three: ''3''>'.
%

category: 'Grail-Tests - As an enum member value'
method: StrDecodeArgsTestCase
testTheConstructorComplaintReachesTheClassStatement
	"CPython raises out of the class body.  Grail swallowed it and kept the raw
	tuple, so a broken member definition looked like a working one."

	self assert: (self resultAt: 'member_bad_encoding') asString
		equals: 'str() argument ''encoding'' must be str'.
	self assert: (self resultAt: 'member_bad_errors') asString
		equals: 'str() argument ''errors'' must be str'.
%

category: 'Grail-Tests - Not every tuple is a decode'
method: StrDecodeArgsTestCase
testATupleForTheClassOwnNewIsNotHandedToStr
	"""The line the fix is drawn on.  ``key_type = 'An$(Bn)', 0'' is the argument
	list to the class's own __new__, and routing it to str() answered ``decoding
	str is not supported'' -- displacing the complaint CPython actually makes,
	which is that the __new__ never set _value_.

	Keying the decode route on a BYTES first element is what separates the two;
	argument count alone does not."""

	self assert: (self resultAt: 'own_new_complaint') asString
		equals: '_value_ not set in __new__'.
%

category: 'Grail-Tests - Not every tuple is a decode'
method: StrDecodeArgsTestCase
testAWorkingOwnNewStillReceivesItsArgumentsUntouched
	self assert: (self resultAt: 'own_new_ok') asString
		equals: 'An$(Bn)/0/An$(Cn)/1'.
%
