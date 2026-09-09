! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StructGapsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
StructGapsTestCase comment:
'Two of struct''s five gaps, and the float defect they exposed.

test_struct''s eight failures were FIVE unrelated roots, not one thing --
which is why this fixes two and says so rather than claiming the module.

FORMAT CHARACTERS THAT DID NOT EXIST.  ``F'' and ``D'' are COMPLEX, new
in CPython 3.14: two floats and two doubles, real part then imaginary.
Their ALIGNMENT is that of one half, not of the pair, so a native ``F''
aligns to 4 and not to 8 -- aligning to the pair would pad where CPython
does not.  ``P'' is a void pointer, and joins ``n''/``N'' as NATIVE ONLY:
its width is the platform''s, so a byte-order prefix asks a question it
cannot answer and CPython refuses the combination rather than picking a
width.

AN OVERFLOW CAP THAT COULD NOT FIRE.  A repeat count is unbounded text,
so the running total is capped -- at 2^63-1, which is CPython''s
PY_SSIZE_T_MAX on its platforms.  Grail''s sys.maxsize is 2^60-1, a
GemStone SmallInteger, so a format built from ``sys.maxsize + 1'' -- which
is exactly how test_struct writes the case -- computed a total the cap
never noticed.  Reading the same number the caller reads is what makes
the test mean what it says.

AND A NEGATIVE ZERO LOST ITS SIGN.  ``struct.pack(''<d'', -0.0)'' dropped
the 0x80: _doubleToBits returned early on ``aFloat = 0.0'', which is TRUE
for a negative zero.  The 4-byte and 2-byte paths share _floatToBits:,
which has always tested for it the same way -- 1.0 divided by a negative
zero is minus infinity -- so ONLY the 8-byte path was wrong, and only for
this one value.  It surfaced through the complex round trip, because
-0.0 is what a complex''s halves so often are, but it was never a complex
problem: every ``d'' pack of a negative zero was wrong.

Took test.test_struct 8 -> 5.  The three that remain -- a memoryview of
an array.array that cannot be written through, an iter_unpack with no
type of its own, and a half-initialised Struct -- each need a design
rather than a corrected value, and are in docs/Issues.md.

See tests/python/struct_gaps.py (9 checks, CPython-validated first).'
%

expectvalue /Class
doit
StructGapsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
StructGapsTestCase removeAllMethods: 0.
StructGapsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: StructGapsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'struct_gaps' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/struct_gaps.py')
		name: 'struct_gaps'.
%

category: 'Grail-Helpers'
method: StructGapsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: StructGapsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: StructGapsTestCase
testTheComplexCodes
	"F and D, new in CPython 3.14.  Sizes in every mode, and a round trip
	through both byte orders."

	self assertAll: #('complex_sizes' 'complex_round_trip')
%

category: 'Grail-Tests'
method: StructGapsTestCase
testANegativeZeroKeepsItsSign
	"Never a complex problem: every ``d'' pack of a negative zero dropped
	the sign bit, and only the 8-byte path did."

	self assertAll: #('signed_zero' 'signed_zero_in_a_complex')
%

category: 'Grail-Tests'
method: StructGapsTestCase
testThePointerCodeIsNativeOnly
	"P joins n and N: its width is the platform's, so a byte-order prefix
	is refused rather than answered."

	self assertAll: #('pointer_native_only' 'pointer_round_trip')
%

category: 'Grail-Tests'
method: StructGapsTestCase
testTheOverflowCapFires
	"Against sys.maxsize, which is what CPython compares -- and what the
	test builds its huge counts from.  A large but VALID count still
	computes, which is the half a blunter cap would break."

	self assertAll: #('overflow_is_refused' 'a_large_but_valid_count_is_fine')
%

category: 'Grail-Tests'
method: StructGapsTestCase
testTheOrdinaryCodesAreUnchanged
	"The regression half: every scalar code, both byte orders, a padded
	format and a Struct's size."

	self assertAll: #('the_ordinary_codes')
%
