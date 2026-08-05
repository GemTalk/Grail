! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PrintableReprAndPrintfTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PrintableReprAndPrintfTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PrintableReprAndPrintfTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PrintableReprAndPrintfTestCase — the last three roots of CPython's test_format
! (its final 2 failures + 1 error), plus the str %-format diagnostics that
! fixing the first of them exposed:
!
!   1. repr() escaped ASCII CONTROL characters only, so every OTHER
!      non-printable code point came out verbatim — unassigned (Cn), format
!      (Cf), private-use (Co) and the non-ASCII separators (Zs/Zl/Zp).
!      str.isprintable() shared the same range approximation.  Both now key on
!      the Unicode general category via Character>>unicodeCategory (libicu).
!   2. Scientific digits were produced by normalising the mantissa into [1, 10)
!      with repeated FLOAT division/multiplication, destroying the value before
!      rounding: an exact tie rounded the wrong way and a high precision lost
!      every digit.  %g also chose fixed-vs-scientific on the PRE-rounding
!      exponent.  Both now use exact integer scaling.
!   3. bytes %-format lacked %r, used str's wording for a bad float operand,
!      never rejected unconsumed arguments, and could not report the length of
!      a wrong-length %c operand.
!   4. Reaching test_str_format's second half exposed missing str %-format
!      diagnostics — including ``'%c' % -1'', which reached
!      Character class>>codePoint: and died with an UNCATCHABLE Smalltalk
!      OutOfRange, and %d/%g silently PARSING a string operand.
!
! Every expectation here was captured from CPython 3.14.4 running the same
! fixture, so the file is an oracle diff rather than hand-written guesses.
!
! Fixture: tests/python/printable_repr_and_printf.py
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PrintableReprAndPrintfTestCase removeAllMethods.
PrintableReprAndPrintfTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
results
	"Load tests/python/printable_repr_and_printf.py fresh."

	| mod |
	importlib @env1:modules removeKey: #'printable_repr_and_printf' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/printable_repr_and_printf.py')
		name: 'printable_repr_and_printf'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
assertResult: aKey equals: expected
	self assert: (self results @env1:__getitem__: aKey) equals: expected
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
charRangeResults
	"Load tests/python/printf_char_range.py fresh.  A SEPARATE fixture on
	purpose: before the fix its first line aborted the module load outright (a
	Smalltalk OutOfRange, uncatchable from Python), which would otherwise have
	taken every other expectation in this class down with it and made a
	regression anywhere indistinguishable from that one."

	| mod |
	importlib @env1:modules removeKey: #'printf_char_range' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/printf_char_range.py')
		name: 'printf_char_range'.
	^ mod @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
assertCharRangeResult: aKey equals: expected
	self assert: (self charRangeResults @env1:__getitem__: aKey) equals: expected
%

! --- 1. repr() / isprintable() follow the Unicode general category ------------

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testReprEscapesUnassignedCodePoints
	"An UNASSIGNED code point (category Cn) is not printable, so repr() escapes
	it.  This is the case test_format's test_str_format pins directly, and the
	one the old ``cp < 32 or cp = 127'' test could not see."

	self assertResult: 'repr_unassigned' equals: '"''\\u0378''"'.
	self assertResult: 'repr_unassigned_high' equals: '"''\\U000e0002''"'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testReprEscapesNonAsciiControlFormatAndPrivateUse
	"Cc above ASCII, Cf (format) and Co (private use) are all non-printable."

	self assertResult: 'repr_c1_control' equals: '"''\\x80''"'.
	self assertResult: 'repr_format_char' equals: '"''\\u200d''"'.
	self assertResult: 'repr_private_use' equals: '"''\\ue000''"'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testReprEscapesSeparatorsExceptAsciiSpace
	"Zs / Zl / Zp are non-printable, with ASCII space the ONE exception Python
	carves out.  Do not substitute GemStone's Character>>isPrintable here: it
	calls all four of these printable."

	self assertResult: 'repr_nbsp' equals: '"''\\xa0''"'.
	self assertResult: 'repr_ideographic_space' equals: '"''\\u3000''"'.
	self assertResult: 'repr_line_separator' equals: '"''\\u2028''"'.
	self assertResult: 'repr_para_separator' equals: '"''\\u2029''"'.
	self assertResult: 'repr_ascii_space' equals: '"'' ''"'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testReprKeepsPrintableNonAsciiLiteral
	"repr() is not ascii(): a PRINTABLE non-ASCII character stays verbatim.
	Escaping by magnitude rather than by printability would break this."

	self assertResult: 'repr_printable_lm' equals: 'True'.
	self assertResult: 'repr_printable_latin' equals: 'True'.
	self assertResult: 'repr_printable_greek' equals: 'True'.
	self assertResult: 'repr_printable_emoji' equals: 'True'.
	self assertResult: 'repr_printable_cjk' equals: 'True'.
	"...while ascii() escapes it, which is what makes the two differ."
	self assertResult: 'ascii_printable_nonascii' equals: '"''\\u0544''"'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testReprKeepsEstablishedAsciiEscapes
	"The ASCII escapes jinja2's compiler depends on must be unchanged."

	self assertResult: 'repr_newline' equals: '"''\\n''"'.
	self assertResult: 'repr_nul' equals: '"''\\x00''"'.
	self assertResult: 'repr_del' equals: '"''\\x7f''"'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testIsPrintableFollowsUnicodeCategory
	"str.isprintable() is defined by the same rule as repr()'s escaping, so the
	two cannot be allowed to drift apart."

	self assertResult: 'isprintable_unassigned' equals: 'False'.
	self assertResult: 'isprintable_nbsp' equals: 'False'.
	self assertResult: 'isprintable_format_char' equals: 'False'.
	self assertResult: 'isprintable_newline' equals: 'False'.
	self assertResult: 'isprintable_ascii_space' equals: 'True'.
	self assertResult: 'isprintable_printable_lm' equals: 'True'.
	self assertResult: 'isprintable_empty' equals: 'True'
%

! --- 2. exact scientific digits ----------------------------------------------

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testSciDigitsRoundExactTieToEven
	"1505.0 is exactly representable and 1.505 is an exact TIE at three
	significant digits, so round-half-to-even keeps the 0.  Normalising the
	mantissa by float division landed just ABOVE 1.505 and rounded up to
	'1.51e+03' (test_format test_g_format_has_no_trailing_zeros)."

	self assertResult: 'sci_tie_to_even' equals: '''1.50e+03'''.
	self assertResult: 'sci_tie_to_even_neg' equals: '''-1.50e+03'''.
	self assertResult: 'sci_tie_g' equals: '''1.5e+03'''.
	self assertResult: 'sci_tie_g_alt' equals: '''1.50e+03'''.
	self assertResult: 'sci_tie_g_format' equals: '''1.5e+03'''.
	self assertResult: 'sci_tie_g_format_alt' equals: '''1.50e+03'''.
	self assertResult: 'sci_tie_g6' equals: '''1.23e+07'''.
	self assertResult: 'sci_tie_g6_alt' equals: '''1.23000e+07'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testSciDigitsKeepHighPrecisionInformation
	"0.1 * 10 is EXACTLY 1.0, so the old float normalisation threw away every
	significant digit before rounding: '%.17e' printed
	'1.00000000000000000e-01' rather than the value's real digits."

	self assertResult: 'sci_high_precision' equals: '''1.00000000000000006e-01'''.
	self assertResult: 'sci_g17' equals: '''0.10000000000000001'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testGChoosesNotationAfterRounding
	"CPython's %g renders '%.<p-1>e' first and picks notation from THAT
	exponent.  999.9 to three significant digits is 1.00e+03 — exponent 3, so
	scientific — where the pre-rounding exponent 2 chose fixed and printed
	'1000'."

	self assertResult: 'g_exponent_after_rounding' equals: '''1e+03'''.
	self assertResult: 'g_exponent_after_rounding2' equals: '''1e+03'''.
	"the fixed branch is still taken when it should be"
	self assertResult: 'g_fixed_branch' equals: '''0.00015'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testSciDigitsOrdinaryCasesUnchanged
	"Exact scaling must not disturb zero, the exponent extremes, a denormal, or
	ordinary half-even rounding."

	self assertResult: 'sci_plain' equals: '''1.000e+00'''.
	self assertResult: 'sci_zero' equals: '''0.000e+00'''.
	self assertResult: 'sci_zero_g' equals: '''0'''.
	self assertResult: 'sci_big_exponent' equals: '''1.000e+300'''.
	self assertResult: 'sci_small_exponent' equals: '''1.000e-300'''.
	self assertResult: 'sci_denormal' equals: '''4.941e-324'''.
	self assertResult: 'sci_half_even_down' equals: '''1.2e+00'''.
	self assertResult: 'sci_half_even_up' equals: '''1.4e+00'''
%

! --- 3. bytes %-format --------------------------------------------------------

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testBytesPercentRIsAliasForPercentA
	"PEP 461 makes %r an alias for %a in bytes formatting.  It was missing, so
	b'%r' fell through to the NUMERIC branch and raised
	``%r format: a real number is required, not bytes''."

	self assertResult: 'bytes_r_is_ascii_alias' equals: 'b"b''ghi''"'.
	self assertResult: 'bytes_r_on_str' equals: 'b"''jkl''"'.
	self assertResult: 'bytes_r_escapes_nonascii' equals: 'b"''\\u0544''"'.
	self assertResult: 'bytes_r_on_float' equals: 'b''3.25'''.
	self assertResult: 'bytearray_r' equals: 'bytearray(b"b\''ghi\''")'.
	"%a and %b must still behave as before"
	self assertResult: 'bytes_a_still_works' equals: 'b"b''ghi''"'.
	self assertResult: 'bytes_b_dunder' equals: 'b''123'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testBytesFloatOperandHasItsOwnWording
	"bytes formatting says plain ``float argument required, not str'' where the
	d/i/u converters use the ``%i format: ...'' shape.  test_format pins both,
	so they cannot be unified."

	self assertResult: 'bytes_float_arg_wording' equals: 'TypeError: float argument required, not str'.
	self assertResult: 'bytes_float_arg_wording_bytes' equals: 'TypeError: float argument required, not bytes'.
	self assertResult: 'bytes_int_arg_wording' equals: 'TypeError: %i format: a real number is required, not str'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testBytesRejectsUnconsumedArguments
	"``b'no format' % 7'' is a TypeError; Grail returned the format string and
	dropped the argument.  Note the wording: ``bytes formatting''."

	self assertResult: 'bytes_leftover_args' equals: 'TypeError: not all arguments converted during bytes formatting'.
	self assertResult: 'bytes_leftover_args_bytes' equals: 'TypeError: not all arguments converted during bytes formatting'.
	self assertResult: 'bytearray_leftover_args' equals: 'TypeError: not all arguments converted during bytes formatting'.
	"a MAPPING may leave keys unreferenced, so the check must not fire there"
	self assertResult: 'bytes_mapping_extra_keys_ok' equals: 'b''1'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testBytesCharOperandDiagnostics
	"A wrong-LENGTH bytes-like operand reports its length, which the generic
	type message cannot say; a str and an out-of-range int keep their own."

	self assertResult: 'bytes_c_wrong_length'
		equals: 'TypeError: %c requires an integer in range(256) or a single byte, not a bytes object of length 2'.
	self assertResult: 'bytes_c_wrong_length_ba'
		equals: 'TypeError: %c requires an integer in range(256) or a single byte, not a bytearray object of length 2'.
	self assertResult: 'bytes_c_str'
		equals: 'TypeError: %c requires an integer in range(256) or a single byte, not str'.
	self assertResult: 'bytes_c_range' equals: 'OverflowError: %c arg not in range(256)'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testBytesUnknownConversionNamesCharacterHexAndIndex
	"CPython's message carries the character, its hex code and its 0-based
	index in the format string."

	self assertResult: 'bytes_unknown_conv'
		equals: 'ValueError: unsupported format character ''z'' (0x7a) at index 1'
%

! --- 4. str %-format diagnostics ---------------------------------------------

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testStrUnknownConversionNamesCharacterHexAndIndex
	"Only the scan loop knows the index, so the diagnostic has to be raised
	there rather than in the converter."

	self assertResult: 'str_unknown_conv_index'
		equals: 'ValueError: unsupported format character ''b'' (0x62) at index 5'.
	self assertResult: 'str_unknown_conv_z'
		equals: 'ValueError: unsupported format character ''z'' (0x7a) at index 1'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testStrCharConversionRangeIsCatchable
	"An out-of-range code point used to reach Character class>>codePoint:,
	whose OutOfRange is a SMALLTALK error that Python ``except'' cannot catch —
	``'%c' % -1'' aborted the whole module rather than raising."

	self assertCharRangeResult: 'str_c_negative'
		equals: 'OverflowError: %c arg not in range(0x110000)'.
	self assertCharRangeResult: 'str_c_too_big'
		equals: 'OverflowError: %c arg not in range(0x110000)'.
	self assertCharRangeResult: 'str_c_huge'
		equals: 'OverflowError: %c arg not in range(0x110000)'.
	"the boundary values that must still work"
	self assertCharRangeResult: 'str_c_zero' equals: 'True'.
	self assertCharRangeResult: 'str_c_max' equals: 'True'
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testStrCharConversionTypeDiagnostics
	"%c fell through to ``value asString'', so ``'%c' % 3.14'' produced the
	four characters ``3.14'' from a single-character conversion."

	self assertResult: 'str_c_float'
		equals: 'TypeError: %c requires an int or a unicode character, not float'.
	self assertResult: 'str_c_length2'
		equals: 'TypeError: %c requires an int or a unicode character, not a string of length 2'.
	self assertResult: 'str_c_bytes'
		equals: 'TypeError: %c requires an int or a unicode character, not bytes'.
	"the shapes %c does accept"
	self assertResult: 'str_c_ok_int' equals: '''A'''.
	self assertResult: 'str_c_ok_char' equals: '''A'''.
	self assertResult: 'str_c_ok_bool' equals: '''\x01'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testStrNumericConversionsRejectStrings
	"GemStone's String>>asFloat and String>>asInteger PARSE, so a bare
	``value asFloat'' quietly accepted a string operand and ``'%g' % '1'''
	answered '1' where CPython raises."

	self assertResult: 'str_float_conv_rejects_str' equals: 'TypeError: must be real number, not str'.
	self assertResult: 'str_int_conv_rejects_str'
		equals: 'TypeError: %i format: a real number is required, not str'.
	self assertResult: 'str_hex_conv_rejects_str'
		equals: 'TypeError: %x format: an integer is required, not str'.
	"the coercions that must keep working: d/i/u take any real number"
	self assertResult: 'str_int_conv_float_truncates' equals: '''3'''.
	self assertResult: 'str_int_conv_float_neg' equals: '''-3'''.
	self assertResult: 'str_int_conv_bool' equals: '''1'''.
	self assertResult: 'str_float_conv_int' equals: '''3.00'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testStrRejectsUnconsumedArguments
	"``'no format' % '1''' is a TypeError; the check must not fire for a
	mapping, whose extra keys are allowed."

	self assertResult: 'str_leftover_args'
		equals: 'TypeError: not all arguments converted during string formatting'.
	self assertResult: 'str_leftover_tuple'
		equals: 'TypeError: not all arguments converted during string formatting'.
	self assertResult: 'str_mapping_extra_keys_ok' equals: '''1'''
%

category: 'Grail-Tests-Printf'
method: PrintableReprAndPrintfTestCase
testOnlyTupleUnpacksIntoArguments
	"A LIST on the right of % is ONE value.  Grail unpacked OrderedCollection
	as well, so ``'%s' % [1, 2]'' formatted just the first element and silently
	dropped the rest — which only became visible once unconsumed arguments were
	rejected."

	self assertResult: 'str_s_conv_any' equals: '''[1, 2]'''.
	self assertResult: 'str_list_is_one_value' equals: '''[1] and [2, 3]'''.
	self assertResult: 'str_list_not_unpacked'
		equals: 'TypeError: not enough arguments for format string'.
	self assertResult: 'str_tuple_is_unpacked' equals: '''1 2'''.
	self assertResult: 'bytes_list_is_one_value'
		equals: 'TypeError: %b requires a bytes-like object, or an object that implements __bytes__, not ''list'''.
	self assertResult: 'bytes_tuple_is_unpacked' equals: 'b''a b'''
%
