! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'XmlSaxInfrastructureTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
XmlSaxInfrastructureTestCase comment:
'xml.sax is real now apart from the PARSER -- and two io defects it found.

The old xml.sax was a deliberate three-function stub whose docstring said
make_parser, ContentHandler, InputSource and the SAX exception hierarchy were
ABSENT so that code needing a parser ``fails loudly at the name it wanted''.
CPython''''s modules for all of that are PURE PYTHON -- only the parser is C --
so they are vendored verbatim, and the loud failure now comes from the real
driver at the real point: SAXReaderNotAvailable(''''No parsers found''''), which
is exactly what CPython raises when it can find no parser module.

XMLGenerator is a SERIALIZER, so it works in full without any parser.

TWO REAL io DEFECTS turned up underneath it, both found by _gettextwriter:

1. StringIO / BytesIO had no seekable / readable / writable.  The caller reads
   them inside ``try: ... except AttributeError: pass'', so the missing method
   was SWALLOWED and the failure surfaced later as ``unbound method
   ''''seekable'''' must be called with an instance'' -- naming nothing that
   was actually wrong.

2. Grail''''s StringIO was outside _pyio''''s ABC hierarchy, so
   isinstance(StringIO(), io.TextIOBase) was False.  That is _gettextwriter''''s
   FIRST branch and the one CPython takes; falling past it landed in the path
   for objects that merely have .write, so XMLGenerator(StringIO()) died inside
   machinery it should never have reached, reporting ``write to closed file''
   about a stream that was open.

   AN ISINSTANCE THAT IS FALSE FOR THE WRONG REASON DOES NOT FAIL WHERE IT IS
   WRONG.  It fails somewhere else entirely.

Also fixed while here: BytesIO >> flush fell off the end and answered SELF
rather than None, which a caller testing the result would have read as truthy.

NOT COVERED, deliberately: XMLGenerator over a BytesIO.  That path needs
``io.BufferedIOBase()'', and a zero-argument call written directly as
``module.Attr()'' currently answers the ATTRIBUTE instead of calling it.  That
is a defect in the module-attribute call path rather than in xml.sax;
docs/Issues.md carries it with the isolation.'
%

doit
XmlSaxInfrastructureTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
XmlSaxInfrastructureTestCase removeAllMethods: 0.
XmlSaxInfrastructureTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: XmlSaxInfrastructureTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'xml_sax_infrastructure' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/xml_sax_infrastructure.py')
		name: 'xml_sax_infrastructure'.
%

category: 'Grail-Helpers'
method: XmlSaxInfrastructureTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: XmlSaxInfrastructureTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: XmlSaxInfrastructureTestCase
testTheIoPredicatesExistAndBind
	"seekable / readable / writable / isatty on both in-memory streams, and
	BOUND -- the bug was an unbound class attribute reached through a
	swallowed AttributeError, so the assignment shape _gettextwriter uses is
	asserted too."

	self assertAll: #('the_io_predicates_exist_and_bind')
%

category: 'Grail-Tests'
method: XmlSaxInfrastructureTestCase
testAClosedStreamMatchesCPythonsAsymmetry
	"StringIO and BytesIO genuinely DISAGREE upstream about flush() on a
	closed stream -- one answers None, the other raises -- because one is a
	TextIOWrapper there and the other is the C type.  Checked against CPython
	rather than made consistent, since a caller that flushes after close
	depends on it."

	self assertAll: #('a_closed_stream_matches_cpythons_asymmetry')
%

category: 'Grail-Tests'
method: XmlSaxInfrastructureTestCase
testTheStreamsAreInTheIoHierarchy
	"isinstance(StringIO(), io.TextIOBase) and the BytesIO twin.  This is the
	branch _gettextwriter takes first, and the reason XMLGenerator failed
	somewhere else entirely."

	self assertAll: #('the_streams_are_in_the_io_hierarchy')
%

category: 'Grail-Tests'
method: XmlSaxInfrastructureTestCase
testXmlGeneratorSerializes
	"The larger half of what xml.sax is used for, and it needs no parser.
	Output compared to CPython''s byte for byte, escaping included; the
	second case pins that a TextIOBase is REUSED rather than rewrapped."

	self assertAll: #('xmlgenerator_serializes_to_a_stringio'
		'two_generators_share_one_text_stream')
%

category: 'Grail-Tests'
method: XmlSaxInfrastructureTestCase
testTheDocumentedSurfaceIsPresent
	"AttributesImpl, the escape/unescape/quoteattr trio that was all the old
	stub had, the SAX exception hierarchy, and handler''s feature constants."

	self assertAll: #('the_documented_surface_is_present')
%

category: 'Grail-Tests'
method: XmlSaxInfrastructureTestCase
testMakeParserEitherWorksOrSaysItCannot
	"The invariant that outlives the current state: make_parser must never
	quietly hand back something that cannot parse.  Grail takes the second
	branch today, with CPython''s own no-parser error; the day a parser
	lands it takes the first, and this test does not change."

	self assertAll: #('make_parser_either_works_or_says_it_cannot')
%
