! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'Utf16TruncatedDecodeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
Utf16TruncatedDecodeTestCase comment:
'utf-16 reads TWO BYTES AT A TIME, so a stream that does not divide by two
has a byte that begins a unit nothing finishes -- and a high surrogate is
only half a character until a LOW one follows it.  Both used to be handled
by walking off the end of the loop, silently.

TWO DEFECTS, both in bytes >> ___pyDecodeUTF16___, both SILENT:

1. AN ODD TRAILING BYTE WAS DROPPED.  The walk advanced while i+1 <= n, so
   a leftover byte simply ended it.  b''a\x00b''.decode(''utf-16-le'')
   answered ''a'' where CPython raises, and answered ''a'' under ``replace''''
   too, where CPython gives ''a'' followed by U+FFFD.

2. A HIGH SURROGATE WAS COMBINED WITH WHATEVER FOLLOWED.  The branch checked
   that two more bytes existed but never that they were a LOW surrogate, so
   b''\x00\xd8a\x00''.decode(''utf-16-le'') answered a circled digit two --
   0x10000 + (0 bitShift: 10) + (16r61 - 16rDC00) is 16r2461 -- and ate the
   ``a'''' along with it.  A WRONG character, not merely a missing one.

Losing or inventing a character without saying so is a worse answer than
either raising or substituting, which is why both are tested under every
handler rather than only under ``strict''''.

CPYTHON NAMES THREE CASES DIFFERENTLY and a handler reads the SPAN as much
as the message, so the reasons are asserted too:

    high surrogate, fewer than 2 bytes after   unexpected end of data,
                                               spanning through the end
    high surrogate + a unit that is not low    illegal UTF-16 surrogate
    an unpaired low surrogate                  illegal encoding

``surrogatepass'''' and ``surrogateescape'''' do NOT rescue a truncated tail
-- half a unit is not a surrogate -- and both still raise.  utf-32 already
length-checked, so it is pinned here to keep the fix from drifting into it.'
%

doit
Utf16TruncatedDecodeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
Utf16TruncatedDecodeTestCase removeAllMethods: 0.
Utf16TruncatedDecodeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: Utf16TruncatedDecodeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'utf16_odd_byte' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/utf16_odd_byte.py')
		name: 'utf16_odd_byte'.
%

category: 'Grail-Helpers'
method: Utf16TruncatedDecodeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: Utf16TruncatedDecodeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: Utf16TruncatedDecodeTestCase
testAnOddTrailingByteIsRefusedAndPositioned
	"Six shapes, including one behind a BOM and one after a surrogate pair.
	A failure names the shape, the span and the reason."

	self assertAll: #('strict_raises_and_says_where')
%

category: 'Grail-Tests'
method: Utf16TruncatedDecodeTestCase
testEveryHandlerSeesTheTruncatedByte
	"``replace'' puts ONE U+FFFD where the byte was, ``ignore'' drops it and
	``backslashreplace'' writes it as lowercase hex -- the byte reaching a
	handler at all is the fix."

	self assertAll: #('handlers_substitute_one_byte')
%

category: 'Grail-Tests'
method: Utf16TruncatedDecodeTestCase
testTheSurrogateHandlersDoNotRescueATruncatedTail
	"Half a unit is not a surrogate, so ``surrogatepass'' and
	``surrogateescape'' both still raise -- as CPython does."

	self assertAll: #('surrogate_handlers_still_raise')
%

category: 'Grail-Tests'
method: Utf16TruncatedDecodeTestCase
testAHighSurrogatePairsOnlyWithALowOne
	"Eleven shapes across the three reasons CPython distinguishes, spans
	included."

	self assertAll: #('a_high_surrogate_pairs_only_with_a_low_one')
%

category: 'Grail-Tests'
method: Utf16TruncatedDecodeTestCase
testABrokenPairDoesNotEatTheNextCharacter
	"The unit that did not pair is read again on its own, so the character
	after a refused surrogate SURVIVES -- it used to be swallowed by the
	four-byte advance."

	self assertAll: #('a_real_pair_combines_and_survivors_survive')
%

category: 'Grail-Tests'
method: Utf16TruncatedDecodeTestCase
testWellFormedInputAndUtf32AreUntouched
	"The regression half: even-length input, a bare BOM, a real surrogate
	pair, and utf-32's already-correct refusals."

	self assertAll: #('well_formed_input_is_untouched' 'utf32_is_unchanged')
%
