! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SurrogatepassDecodeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SurrogatepassDecodeTestCase comment:
'``surrogatepass'''' on a DECODE, for the UTF codecs that can carry one.

The strict decoders reject a lone surrogate -- correctly -- and there was
no path that did anything else, so EVERY surrogatepass decode raised.
Twenty-one test_codecs cases were waiting on it: ten
test_incremental_surrogatepass, nine test_lone_surrogates and two
test_surrogatepass_handler, spread across every UTF class.  Fourteen of
them pass now.

Each UTF spells a surrogate the way it spells any other code point --
utf-8 the three-byte WTF-8 form, utf-16 a bare 16-bit unit, utf-32 a bare
32-bit one -- so this reads them exactly as the strict decoder does and
declines to reject the result.

WHAT MADE IT POSSIBLE was bytes class >> ___stringFromCodePoints___:,
written for the escape codecs one change earlier: an ordinary Grail string
CANNOT HOLD a lone surrogate, so the answer has to be a PyStrSurrogate,
and that is the piece that decides which to build.  The same block serves
both, which is the argument for having put it there rather than inline.

The handler changes what is ALLOWED THROUGH, not how the codec works, so
a supplementary character is still a surrogate PAIR in utf-16 and a high
surrogate NOT followed by a low one stays alone rather than swallowing the
next unit.  Both are asserted, along with the encode/decode round trip
that the encode half (already fixed) could not previously complete.'
%

doit
SurrogatepassDecodeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
SurrogatepassDecodeTestCase removeAllMethods: 0.
SurrogatepassDecodeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: SurrogatepassDecodeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'surrogatepass_decode' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/surrogatepass_decode.py')
		name: 'surrogatepass_decode'.
%

category: 'Grail-Helpers'
method: SurrogatepassDecodeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: SurrogatepassDecodeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: SurrogatepassDecodeTestCase
testEveryUtfCarriesASurrogate
	"Eight codecs, each spelling one its own way.  A failure names the
	codec."

	self assertAll: #('every_utf_carries_a_surrogate')
%

category: 'Grail-Tests'
method: SurrogatepassDecodeTestCase
testTheRoundTripCloses
	"The pair this completes: the ENCODE half was already codec-aware and
	could not be read back without this."

	self assertAll: #('encode_then_decode_is_the_identity')
%

category: 'Grail-Tests'
method: SurrogatepassDecodeTestCase
testWhatIsAllowedThroughIsAllThatChanged
	"A supplementary character is still a surrogate PAIR, a lone high
	surrogate stays alone rather than swallowing the next unit, and
	ordinary text is untouched."

	self assertAll: #('a_supplementary_character_is_still_a_pair'
		'a_high_surrogate_alone_stays_alone' 'ordinary_text_is_unchanged')
%

category: 'Grail-Tests'
method: SurrogatepassDecodeTestCase
testStrictAndTheOtherHandlersAreUnchanged
	"The same bytes must still be refused under strict, and replace /
	ignore / surrogateescape must behave as they did."

	self assertAll: #('strict_still_refuses_the_same_bytes'
		'the_other_handlers_still_behave')
%
