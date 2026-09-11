! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'IncrementalEscapeDecodeTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
IncrementalEscapeDecodeTestCase comment:
'An incremental decoder must BUFFER an escape split across chunks.

BufferedIncrementalDecoder already did its half correctly: it keeps
whatever the codec did not consume and prepends it next time.  What it
needs FROM THE CODEC is the ``final'''' flag honoured -- when final is
false, stop before a trailing sequence that might still be completed and
report ``consumed'''' short, so the buffer picks it up.

utf-8 and utf-16 already did that, through _utf8_incomplete_tail.  The two
ESCAPE codecs ignored final entirely and decoded the whole input, so a
chunk ending mid-escape raised instead of waiting: b''a\'' fed without
final is not ``a backslash at end of string'''', it is a caller who has
not sent the rest yet.

WHICH ESCAPES CAN BE INCOMPLETE DIFFERS BETWEEN THE TWO, which is the part
worth testing rather than assuming:

    b''a\x''   unicode-escape holds it, raw-unicode-escape does NOT
    b''a\u''   both hold it

because raw-unicode-escape knows only \uXXXX and \UXXXXXXXX, so its \x is
an ordinary backslash followed by an ordinary x -- already complete.
Octal and the one-letter escapes are never held: they are done as soon as
the backslash has one byte after it.  A backslash preceded by an ODD run
of backslashes is itself escaped and begins nothing, which is why the
detector counts the run rather than looking at one byte.

``final'''' IS THE WHOLE DISTINCTION, so the same bytes that WAIT when
more may come must FAIL when the caller says there is no more -- asserted
both ways, including a decoder left holding a dangling escape when the
stream ends.'
%

doit
IncrementalEscapeDecodeTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
IncrementalEscapeDecodeTestCase removeAllMethods: 0.
IncrementalEscapeDecodeTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: IncrementalEscapeDecodeTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'incremental_escape_decode' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/incremental_escape_decode.py')
		name: 'incremental_escape_decode'.
%

category: 'Grail-Helpers'
method: IncrementalEscapeDecodeTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: IncrementalEscapeDecodeTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: IncrementalEscapeDecodeTestCase
testTheCodecReportsWhatItConsumed
	"Fourteen tail shapes through BOTH escape codecs, since they disagree
	about \x and agree about \u.  A failure names the shape."

	self assertAll: #('consumed_counts')
%

category: 'Grail-Tests'
method: IncrementalEscapeDecodeTestCase
testAnEscapeSplitAcrossChunksReassembles
	"Every boundary an escape can be cut at, including one byte at a
	time -- the shape where every chunk lands inside an escape."

	self assertAll: #('an_escape_split_across_chunks'
		'split_one_byte_at_a_time')
%

category: 'Grail-Tests'
method: IncrementalEscapeDecodeTestCase
testTheOtherCodecsStillReassemble
	"utf-8 and utf-16 already honoured final; this must not disturb
	them."

	self assertAll: #('the_other_codecs_still_reassemble')
%

category: 'Grail-Tests'
method: IncrementalEscapeDecodeTestCase
testFinalIsTheWholeDistinction
	"The same bytes that WAIT when more may come must FAIL when the caller
	says there is no more, including a decoder left holding a dangling
	escape at end of stream."

	self assertAll: #('a_truly_truncated_escape_still_raises'
		'a_dangling_escape_at_the_end_of_a_stream')
%

category: 'Grail-Tests'
method: IncrementalEscapeDecodeTestCase
testBatchUseAndResetAreUnchanged
	"A one-shot decode still behaves exactly as before -- including the
	trailing-backslash refusal -- and reset() drops a held partial."

	self assertAll: #('the_batch_codec_is_untouched'
		'reset_clears_the_buffer')
%
