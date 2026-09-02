! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'UnicodeErrorArgsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
UnicodeErrorArgsTestCase comment:
'A UnicodeError names WHERE it went wrong.

CPython constructs both as ``cls(encoding, object, start, end, reason)''
and exposes all five as read-write attributes.  Its own stdlib reads
them -- an error handler registered through codecs.register_error
receives the exception and nothing else, so ``exc.start'' is its only way
to know which character failed -- and ``str(exc)'' is ASSEMBLED from
them:

    ''ascii'' codec can''t decode byte 0xff in position 1: ordinal not in range(128)
    ''ascii'' codec can''t encode character ''\x5cxe9'' in position 1: ordinal not in range(128)

Grail kept the five in ``args'' and named none, so the read answered a
BoundMethod.  Naming them (MoreCodecsTestCase) fixed that half and left
the raise sites passing a bare MESSAGE as args[0] -- so exc.encoding
answered the message and exc.start answered None.  This is the other
half: the raise sites pass the five, and __str__ builds CPython''s
sentence from them.

THE UTF-8 DECODER got its position back the hard way.  GemStone''s
decodeFromUTF8 is all-or-nothing -- it refuses the whole input and says
nothing about where -- so the strict path answered ONE wording,
``invalid continuation byte'', for every kind of malformation.  The
input is now re-scanned on failure, which costs nothing on a path that
has already lost, and CPython''s three reasons fall out of the scan: a
byte that cannot LEAD, a byte that is not a legal CONTINUATION of the
lead, and running off the end mid-sequence.  The narrowed ranges 0xE0,
0xED, 0xF0 and 0xF4 impose are what make an overlong or an encoded
surrogate a continuation error.  Twenty-two inputs pin start, end and
reason against CPython.

STILL OPEN: Grail''s Smalltalk encoders do not DISPATCH to a registered
error handler -- ``str.encode(enc, ''my_policy'')'' raises rather than
calling it.  That is the reason the five attributes exist at all, and it
was blocked on them until now; docs/Issues.md carries it.

See tests/python/unicode_error_args.py (8 checks, CPython-validated
first).'
%

expectvalue /Class
doit
UnicodeErrorArgsTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
UnicodeErrorArgsTestCase removeAllMethods: 0.
UnicodeErrorArgsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: UnicodeErrorArgsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'unicode_error_args' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unicode_error_args.py')
		name: 'unicode_error_args'.
%

category: 'Grail-Helpers'
method: UnicodeErrorArgsTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: UnicodeErrorArgsTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: UnicodeErrorArgsTestCase
testAConstructedErrorReportsAndRenders
	"What a re-raise builds -- encodings/punycode.py catches the inner
	ascii error and reconstructs one with the offsets adjusted."

	self assertAll: #('constructed_decode' 'constructed_encode')
%

category: 'Grail-Tests'
method: UnicodeErrorArgsTestCase
testTheMessageShapes
	"A span of one names the byte or character; a longer span gives a
	range and names neither.  The character's escape widens with it --
	\x5cxNN, \x5cuNNNN, \x5cUNNNNNNNN -- and is always escaped, even when
	printable."

	self assertAll: #('a_span_of_more_than_one'
		'the_escape_widens_with_the_character')
%

category: 'Grail-Tests'
method: UnicodeErrorArgsTestCase
testTheCodecsThemselvesPassThem
	"The half that was missing: a raise site is the only place that knows
	the position, and every one of them used to pass a message instead."

	self assertAll: #('ascii_decode' 'ascii_encode' 'latin1_encode')
%

category: 'Grail-Tests'
method: UnicodeErrorArgsTestCase
testTheUTF8Taxonomy
	"Twenty-two inputs, start / end / reason each checked against CPython
	-- including the three well-formed ones, so a scan that blamed
	everything would not pass."

	self assertAll: #('utf8_taxonomy')
%
