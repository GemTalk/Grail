! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'XmlParserTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
XmlParserTestCase comment:
'Grail has an XML parser now: a pure-Python pyexpat.

pyexpat is a C extension, so Grail had NO XML parser at all --
xml.sax.make_parser() raised SAXReaderNotAvailable and test_sax could not run
a single test.  Everything else in xml.sax is pure Python and already
vendored, so ONE module stood between them and working.

WHY EXPAT''''S SHAPE RATHER THAN A NICER ONE: CPython''''s expatreader.py is
written against this exact API -- handlers assigned onto a parser object,
Parse(data, isfinal) fed incrementally, ExpatError carrying code / lineno /
offset.  Matching it means expatreader.py and xml/parsers/expat.py run
UNMODIFIED.  They are the tested upstream implementations, and nothing here
re-derives their behaviour.

HOW IT WAS CHECKED: DIFFERENTIALLY, AGAINST THE REAL EXPAT.  Both parsers were
run over the same ~60 documents -- including EVERY chunk split of the same
input -- and their full handler call sequences compared: order, arguments,
error codes and error positions.  That is a better oracle than expectations
written by hand, and it earned its keep twice.  It found that expat blames an
error where the construct BEGINS (the NAME in an end tag, the ``&'''' in a
reference) while this parser reported where the scanner noticed it, two
columns late every time.  And it found four wrong expectations in the fixture
itself, including one asserting a single CharacterData call where real expat
splits a run across chunks.

SCOPE, stated honestly: well-formed XML -- elements, attributes, text, CDATA,
comments, PIs, character references, the five predefined entities, and
namespace processing.  NOT the DTD engine: no external entities, no
validation.  A reference to an unknown entity is an error AT the reference,
which is what expat does when the entity is genuinely undefined.'
%

doit
XmlParserTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
XmlParserTestCase removeAllMethods: 0.
XmlParserTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: XmlParserTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'xml_parser' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/xml_parser.py')
		name: 'xml_parser'.
%

category: 'Grail-Helpers'
method: XmlParserTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: XmlParserTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: XmlParserTestCase
testTheBasicShapesOfADocument
	"Elements, attributes, nesting, the five predefined entities, character
	references in both bases, CDATA as a delimited section, comments, PIs and
	the XML declaration.  Every expectation read off the real expat."

	self assertAll: #('a_simple_document' 'attributes_and_nesting'
		'predefined_entities' 'character_references' 'cdata_is_delimited'
		'comments_and_pis' 'the_xml_declaration')
%

category: 'Grail-Tests'
method: XmlParserTestCase
testAChunkSplitAnywhereGivesTheSameEvents
	"THE WHOLE DIFFICULTY of an incremental parser: a chunk may end in the
	middle of a tag, and the only safe answer is to leave it unconsumed and
	wait.  The document is split at EVERY position in turn.

	What is asserted is the structure plus the CONCATENATED text, not the
	number of callbacks -- expat does not promise one CharacterData call per
	run, and this parser reproduces that.  The first draft asserted one call
	and failed against CPython itself."

	self assertAll: #('every_chunk_split_gives_the_same_events'
		'a_token_split_three_ways')
%

category: 'Grail-Tests'
method: XmlParserTestCase
testNamespaceProcessing
	"Default and prefixed namespaces, and the rule that is easy to get wrong:
	an UNPREFIXED ATTRIBUTE is not in the default namespace, so it keeps its
	bare name while the element beside it is rewritten."

	self assertAll: #('default_namespace' 'prefixed_namespace'
		'an_unprefixed_attribute_is_not_namespaced')
%

category: 'Grail-Tests'
method: XmlParserTestCase
testErrorsCarryExpatsCodesAndPositions
	"A caller reads err.code against expat''s own numbering, and reads lineno
	/ offset to point at the problem -- so both are asserted.  Expat blames
	where the construct BEGINS, which is what this parser had wrong until the
	differential run caught it."

	self assertAll: #('errors_carry_expats_own_codes'
		'an_error_reports_where_it_happened')
%

category: 'Grail-Tests'
method: XmlParserTestCase
testTheUpstreamSaxDriverRunsOnIt
	"The point of matching expat''s API rather than inventing a nicer one:
	CPython''s own expatreader.py is vendored UNMODIFIED and simply works --
	a round trip through XMLGenerator, namespace events as (uri, localname)
	tuples, and a positioned SAXParseException."

	self assertAll: #('the_real_sax_driver_round_trips'
		'the_real_sax_driver_does_namespaces'
		'a_sax_parse_error_is_positioned' 'make_parser_now_returns_one')
%
