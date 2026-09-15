! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'DecodeErrorHandlersTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
DecodeErrorHandlersTestCase comment:
'replace, ignore and backslashreplace work on a DECODE.

Every builtin decoder is written to RAISE on ill-formed input, and the
one-argument bytes >> decode: they fall through to has no errors to
consult -- so the substituting policies all behaved as strict for ascii,
utf-16 and utf-32, and for utf-8 everything but ignore.  Nine of thirty
codec/handler pairs agreed with CPython; twenty-five do now.

IMPLEMENTED BY RE-ENTERING THE STRICT DECODER, not by teaching each
decoder a policy.  A strict decoder already reports an accurate [start,
end) for the bytes it choked on, which is the only thing a policy needs --
and re-entry reproduces CPython''s granularity for free: one U+FFFD per
ERROR RANGE, so two stray bytes give two and a truncated multi-byte
sequence gives one.  backslashreplace is the asymmetric one, an escape per
BYTE of the range, which is why the range is passed around rather than an
index.

THE DECODERS HAD TO LEARN TO SAY WHERE.  utf-32''s raises carried a
message and nothing else, so exc.start answered None and the loop had
nothing to work from.  Giving them positions also brought their STRICT
wording into line with CPython''s, which had drifted unnoticed because
nothing read it -- ``surrogates not allowed'''' where CPython says ``code
point in surrogate code point range(0xd800, 0xe000)''''.

A BOM IS RESOLVED ONCE.  ``utf-16'''' detects its byte order from a mark,
and decoding the remainder after an error would look for one again -- and
find the middle of the stream -- so the order is resolved and the mark
dropped before the loop starts.  A test covers exactly that.

STILL DIVERGENT: surrogatepass and surrogateescape on a UTF-16 or UTF-32
decode.  Both must answer a str CARRYING lone surrogates -- a
PyStrSurrogate rather than an ordinary string -- so they need the decoders
to build a different KIND of result, not just a policy applied to a byte
range.  That is a different job and docs/Issues.md carries it.'
%

doit
DecodeErrorHandlersTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
DecodeErrorHandlersTestCase removeAllMethods: 0.
DecodeErrorHandlersTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: DecodeErrorHandlersTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'decode_error_handlers' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/decode_error_handlers.py')
		name: 'decode_error_handlers'.
%

category: 'Grail-Helpers'
method: DecodeErrorHandlersTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: DecodeErrorHandlersTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: DecodeErrorHandlersTestCase
testTheWholeGridDecodes
	"Five codecs by three substituting handlers.  A failure names the
	pair."

	self assertAll: #('the_whole_grid')
%

category: 'Grail-Tests'
method: DecodeErrorHandlersTestCase
testGranularityFollowsTheErrorRanges
	"What re-entering the strict decoder buys: one replacement per RANGE,
	so two stray bytes give two and a truncated sequence gives one --
	while backslashreplace answers per BYTE of the same range."

	self assertAll: #('granularity_follows_the_error_ranges'
		'backslashreplace_is_per_byte' 'ignore_drops_the_whole_range')
%

category: 'Grail-Tests'
method: DecodeErrorHandlersTestCase
testABomIsResolvedOnceNotPerReEntry
	"The hazard the loop creates and must not fall into: a BOM-detecting
	spelling would look for a mark again in the middle of the stream."

	self assertAll: #('a_bom_is_not_re_read_after_an_error')
%

category: 'Grail-Tests'
method: DecodeErrorHandlersTestCase
testUtf32SaysWhereItFailed
	"The prerequisite, and a conformance fix in itself: these raises
	carried a message and no positions, so the strict wording had drifted
	from CPython's unnoticed."

	self assertAll: #('utf32_reports_positions')
%

category: 'Grail-Tests'
method: DecodeErrorHandlersTestCase
testValidInputAndStrictAreUnchanged
	"Adding handlers must not disturb what already decoded, what already
	raised, or utf-8's surrogateescape -- and an empty input stays empty
	rather than entering the loop."

	self assertAll: #('valid_input_still_decodes' 'strict_still_raises'
		'surrogateescape_on_utf8_is_unchanged' 'an_empty_input_is_empty')
%
