! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnicodeDigitsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeDigitsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UnicodeDigitsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnicodeDigitsTestCase - \d covers the Nd category
! ===============================================================================
! Decimal('FULLWIDTH DIGIT ONE') answered NaN, and the cause was three levels
! below decimal.  The CPython shim's Py_UNICODE_ISDECIMAL delegated to C's
! iswdigit under a comment claiming it covered Nd.  It cannot: the C standard
! defines iswdigit as exactly the ten ASCII digits, in every locale.  So the
! regex engine's \d -- which compiles to CATEGORY_UNI_DIGIT, which is
! Py_UNICODE_ISDECIMAL -- matched no non-ASCII digit; _pydecimal's parser
! rejected the literal; and the InvalidOperation it raised became a silent NaN
! under a context with its traps off.
!
! WHAT MADE IT FINDABLE was the asymmetry: \w matched the same character and \d
! did not.  That ruled out the string marshalling and the compiled pattern in
! one step -- both are shared -- and left one predicate.  The compiled code was
! then confirmed byte-identical to CPython's, which put the fault past the
! compiler and inside the engine.
!
! Py_UNICODE_ISDECIMAL now reads a generated Nd range table
! (src/c/shim/grail_digit_table.h, from scripts/generate_unicode_digit_table.py),
! so the answer comes from Unicode rather than from whatever the host libc
! happens to do with a locale -- which also keeps Darwin and CI agreeing.
!
! tests/python/unicode_digits.py holds the 11 checks below and is run under real
! CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
UnicodeDigitsTestCase removeAllMethods.
UnicodeDigitsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - unicode digits'
method: UnicodeDigitsTestCase
testEveryUnicodeDigitCheckAgreesWithCPython
	"Every check in tests/python/unicode_digits.py, which the fixture gate also
	runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'unicode_digits' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_digits.py')
		name: 'unicode_digits'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('ascii_digits_still_match' 'decimal_digits_match_across_scripts'
	  'decimal_reads_a_fullwidth_digit' 'decimal_reads_a_telugu_nan_payload'
	  'decimal_reads_arabic_indic_with_an_exponent'
	  'int_still_reads_unicode_digits' 'not_digit_is_the_exact_complement'
	  'nothing_merely_numeric_looking_matches'
	  'roman_numeral_is_not_a_decimal_digit'
	  'superscript_two_is_not_a_decimal_digit'
	  'the_arabic_indic_range_starts_and_ends_where_it_should').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 11
%

category: 'Grail-Tests - unicode digits'
method: UnicodeDigitsTestCase
testTheTableIsReadRatherThanTheHostLocale
	"The defect this replaced was a call into the host libc, so the property
	that matters is that the answer no longer depends on the host: the whole Nd
	category resolves, from every plane, including the non-BMP digits that a
	16-bit wchar_t could not have carried at all."

	self assert: (self eval:
'import re
len([cp for cp in (0x0660, 0x07C0, 0x1040, 0xFF11, 0x1D7CE, 0x1FBF0)
     if re.match(r''\d'', chr(cp)) is None])
') equals: 0
%

category: 'Grail-Tests - unicode digits'
method: UnicodeDigitsTestCase
testADecimalBuiltFromUnicodeDigitsIsTheSameNumberAsFromAsciiOnes
	"The point of the fix, stated as the caller sees it rather than as a
	character-class property."

	self assert: (self eval:
'import decimal
arabicIndic = chr(0x0663) + chr(0x0667) + chr(0x0662)
decimal.Decimal(arabicIndic) == decimal.Decimal(''372'')
') equals: true
%
