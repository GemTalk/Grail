! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FormatSpecAndComplexTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FormatSpecAndComplexTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
FormatSpecAndComplexTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FormatSpecAndComplexTestCase — six roots from CPython's test_format:
!
!   1. format-spec error WORDING: a duplicate grouping char fell through to the
!      type check, whose generic message matched none of CPython's four exact
!      ones, and 3.14 names the value's type in that generic message;
!   2. PRECISION was unbounded in THREE engines (format-spec, str %, bytes %)
!      plus float digit generation, so a huge precision died on an UNCATCHABLE
!      NumericError or hung;
!   3. complex.__format__ ignored the spec entirely (it returned __repr__);
!   4. PEP 682's ``z'' (negative-zero coercion) was unimplemented;
!   5. the LEXER mis-read ``0.j'' and ``1.e+300'' as attribute access on an int;
!   6. the %-format "unsupported format character" message did not name it.
!
! Fixture: tests/python/format_spec_and_complex.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FormatSpecAndComplexTestCase removeAllMethods.
FormatSpecAndComplexTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
results
	"Load tests/python/format_spec_and_complex.py fresh."

	| mod |
	importlib @env1:modules removeKey: #'format_spec_and_complex' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/format_spec_and_complex.py')
		name: 'format_spec_and_complex'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
assertResult: aKey equals: expected
	self assert: (self results @env1:__getitem__: aKey) equals: expected
%

! --- 1. error wording ---------------------------------------------------------

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testDuplicateGroupingCharHasItsOwnMessage
	"The SAME char twice reads as grouping + presentation type; a MIXED pair is
	caught by the grouping parse itself.  CPython's two messages differ and
	test_format matches both exactly."

	self assertResult: 'dup_comma' equals: 'ValueError: Cannot specify '','' with '',''.'.
	self assertResult: 'dup_underscore' equals: 'ValueError: Cannot specify ''_'' with ''_''.'.
	self assertResult: 'comma_then_underscore'
		equals: 'ValueError: Cannot specify both '','' and ''_''.'.
	self assertResult: 'underscore_then_comma'
		equals: 'ValueError: Cannot specify both '','' and ''_''.'
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testDuplicateGroupingAlsoDiagnosedAfterThePrecision
	"``{:.,_f}'' -- the FRACTION-grouping position needs the same check as the
	integer one, which is why the shared helper is called from both."

	self assertResult: 'frac_comma_then_underscore'
		equals: 'ValueError: Cannot specify both '','' and ''_''.'.
	self assertResult: 'frac_underscore_then_comma'
		equals: 'ValueError: Cannot specify both '','' and ''_''.'
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testInvalidSpecNamesTheValuesType
	"CPython 3.14: ``Invalid format specifier '%M' for object of type 'int'''."

	self assertResult: 'bad_spec_names_int'
		equals: 'ValueError: Invalid format specifier ''%M'' for object of type ''int'''.
	self assertResult: 'bad_spec_names_str'
		equals: 'ValueError: Invalid format specifier ''%M'' for object of type ''str'''.
	self assertResult: 'bad_spec_names_float'
		equals: 'ValueError: Invalid format specifier ''%M'' for object of type ''float'''.
	self assertResult: 'bad_spec_names_complex'
		equals: 'ValueError: Invalid format specifier ''%M'' for object of type ''complex'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testGroupingWithNTypeKeepsItsExistingMessage
	self assertResult: 'grouping_with_n'
		equals: 'ValueError: Cannot specify '','' with ''n''.'
%

! --- 2. precision is bounded, and CATCHABLY -----------------------------------

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testHugePrecisionRaisesInEveryEngine
	"THREE independent %-engines plus the format-spec parser, and CPython uses a
	DIFFERENT exception for each family: ValueError from the format-spec path,
	OverflowError from %-format (test_format's helper catches only OverflowError
	there, which is how the distinction was found).  Each of these used to hang or
	die on an uncatchable NumericError."

	self assertResult: 'spec_precision_too_big' equals: 'ValueError: precision too big'.
	self assertResult: 'str_mod_precision_too_big'
		equals: 'OverflowError: precision too large'.
	self assertResult: 'bytes_mod_precision_too_big'
		equals: 'OverflowError: precision too large'.
	self assertResult: 'bytearray_mod_precision_too_big'
		equals: 'OverflowError: precision too large'
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testFloatPrecisionBeyondTheVmCeilingIsCatchable
	"Float digits come from exact integer scaling (value * 10^precision), so
	GemStone's LargeInteger ceiling (~39000 digits) is the real limit.  CPython
	does build such a string; Grail cannot, and must say so catchably rather than
	dying on NumericError."

	self assertResult: 'float_precision_beyond_vm'
		equals: 'OverflowError: formatted float is too long (precision too large)'
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testOrdinaryPrecisionIsUntouched
	self assertResult: 'normal_spec_precision' equals: '''1.200'''.
	self assertResult: 'normal_mod_precision' equals: '''1.200'''.
	self assertResult: 'normal_star_precision' equals: '''1.200'''.
	self assertResult: 'big_but_ok_precision' equals: '202'
%

! --- 3. complex honours the spec ---------------------------------------------

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testComplexFormatsBothPartsWithTheType
	"A spec WITH a presentation type formats real and imaginary separately and
	drops the parens; the imaginary part always carries its sign."

	self assertResult: 'complex_f0' equals: '''1+0j'''.
	self assertResult: 'complex_f3' equals: '''1.200+0.000j'''.
	self assertResult: 'complex_negative' equals: '''-1.0-2.0j'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testComplexEmptySpecIsStr
	self assertResult: 'complex_empty_spec' equals: '''(1.2+0j)'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testComplexTypelessSpecPadsItsStr
	"No type -> str(self) is the body and fill/align/width apply to the WHOLE
	result.  str already drops a +0.0 real part, which is why 0j pads as ``0j''
	and 1+2j pads as ``(1+2j)''."

	self assertResult: 'complex_pad_left' equals: '''0j__'''.
	self assertResult: 'complex_pad_right' equals: '''__0j'''.
	self assertResult: 'complex_pad_center' equals: '''_0j_'''.
	self assertResult: 'complex_parens_pad' equals: '''__(1+2j)'''
%

! --- 4. PEP 682 z -------------------------------------------------------------

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testZCoercesNegativeZero
	"The test is on the ROUNDED digits, not the input: -0.001 with .2f rounds to
	zero and loses its sign, while with .2e it does not."

	self assertResult: 'z_neg_zero' equals: '''0.0'''.
	self assertResult: 'z_rounds_to_zero' equals: '''0.00'''.
	self assertResult: 'z_does_not_round_to_zero' equals: '''-1.00e-03'''.
	self assertResult: 'z_nonzero_keeps_sign' equals: '''-1'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testZRespectsTheSignOption
	self assertResult: 'z_space_sign' equals: ''' 0'''.
	self assertResult: 'z_plus_sign' equals: '''+0'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testZIsNotConfusedWithAZFillChar
	"``z>z6.1f'' is fill ``z'', align ``>'', then the z option."

	self assertResult: 'z_as_fill_char' equals: '''zzz0.0'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testZAppliesToComplexParts
	self assertResult: 'z_on_complex' equals: '''0.0+0.0j'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testZOnlyValidInItsOwnPositionAndForFloatTypes
	"Wrong position stays an invalid spec (z is simply not consumed there);
	integer and string presentation types reject it by name."

	self assertResult: 'z_wrong_position_prefix'
		equals: 'ValueError: Invalid format specifier ''z+f'' for object of type ''int'''.
	self assertResult: 'z_wrong_position_suffix'
		equals: 'ValueError: Invalid format specifier ''fz'' for object of type ''int'''.
	self assertResult: 'z_on_int_type'
		equals: 'ValueError: Negative zero coercion (z) not allowed'.
	self assertResult: 'z_on_str_type'
		equals: 'ValueError: Negative zero coercion (z) not allowed'
%

! --- 5. float literals the lexer mis-read ------------------------------------

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testTrailingDotFollowedByImaginarySuffix
	"``0.j'' is the complex 0j.  A dot followed by an identifier start was always
	attribute access, so this raised ``SmallInteger object has no attribute 'j'''
	-- while ``1.5j'' / ``.01j'' / ``1e3j'' worked, since only the TRAILING-dot
	form reaches that branch."

	self assertResult: 'literal_0_dot_j' equals: '''0j'''.
	self assertResult: 'literal_neg_0_dot_j' equals: '''-0j'''
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testTrailingDotFollowedByExponent
	"``1.e+300'' -- same branch, same cause."

	self assertResult: 'literal_1_dot_e300' equals: 'True'
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testLiteralFormsThatAlreadyWorkedStillDo
	self assertResult: 'literal_1_5j' equals: '''1.5j'''.
	self assertResult: 'literal_dot01j' equals: '''0.01j'''.
	self assertResult: 'literal_1e3j' equals: '''1000j'''.
	self assertResult: 'literal_trailing_dot' equals: 'True'
%

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testAttributeReadOnANumberIsNotStolen
	"The exponent lookahead REQUIRES digits after e/E, so no attribute read is
	captured; ``(0).bit_length()'' keeps working."

	self assertResult: 'attr_after_space' equals: '0'
%

! --- 6. the %-format message names the character -----------------------------

category: 'Grail-Tests-FormatSpec'
method: FormatSpecAndComplexTestCase
testUnsupportedPercentCharacterIsNamed
	"``z'' is a format-SPEC option with no %-conversion meaning, and CPython's
	message says which character it choked on."

	self assertResult: 'percent_z_message'
		equals: 'ValueError: unsupported format character ''z'''.
	self assertResult: 'percent_bytes_z_message'
		equals: 'ValueError: unsupported format character ''z'''.
	self assertResult: 'percent_unknown_char'
		equals: 'ValueError: unsupported format character ''q'''
%
