! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SaxUtilsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SaxUtilsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SaxUtilsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SaxUtilsTestCase - xml.sax.saxutils
! ===============================================================================
! Grail's src/python/stdlib/xml/sax/saxutils.py is CPython 3.14's file cut down
! to escape, unescape, quoteattr and their shared __dict_replace helper, copied
! verbatim.  The parser-facing half of the upstream module (XMLGenerator,
! XMLFilterBase, prepare_input_source) is deliberately absent, because Grail has
! no SAX reader for it to sit on.
!
! Three pure string functions look too simple to need a test, which is exactly
! how their ordering traps survive: escape must do & FIRST and unescape must do
! &amp; LAST, or the pair stops round-tripping on text that already contains an
! entity.  tests/python/saxutils_conformance.py holds 45 such checks and is run
! under real CPython by scripts/check_python_fixtures.sh, so the expectations
! here are measured against CPython rather than against Grail's own behaviour.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SaxUtilsTestCase removeAllMethods.
SaxUtilsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - saxutils'
method: SaxUtilsTestCase
testSaxUtilsMatchesCPython
	"Every check in tests/python/saxutils_conformance.py, which the fixture
	gate also runs under CPython 3.14.

	The keys are listed rather than iterated so that a check DISAPPEARING is
	a failure too -- a fixture that stopped defining RESULTS entirely would
	otherwise pass this test with an empty loop."

	| mod results keys |
	importlib @env1:modules removeKey: #'saxutils_conformance' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/saxutils_conformance.py')
		name: 'saxutils_conformance'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	keys := #('escape_all_three' 'escape_amp' 'escape_ampersand_first'
	  'escape_default_entities_isolated' 'escape_double_applied'
	  'escape_empty' 'escape_entities' 'escape_entities_after_builtins'
	  'escape_entities_are_ordered' 'escape_entities_empty_dict'
	  'escape_entities_reverse_order' 'escape_entities_see_escaped_text'
	  'escape_leaves_quotes' 'escape_lt_gt' 'escape_plain'
	  'quoteattr_all_whitespace' 'quoteattr_both_quotes'
	  'quoteattr_builtin_entities_win' 'quoteattr_carriage_return'
	  'quoteattr_default_entities_isolated' 'quoteattr_double_only'
	  'quoteattr_empty' 'quoteattr_entities'
	  'quoteattr_entity_introduced_quote' 'quoteattr_escapes_markup'
	  'quoteattr_newline' 'quoteattr_plain' 'quoteattr_realistic_url'
	  'quoteattr_single_only' 'quoteattr_space_untouched' 'quoteattr_tab'
	  'round_trip_all_ascii_punct' 'round_trip_entity_text'
	  'round_trip_plain' 'unescape_all_three' 'unescape_amp'
	  'unescape_ampersand_last' 'unescape_default_entities_isolated'
	  'unescape_empty' 'unescape_entities' 'unescape_entities_before_amp'
	  'unescape_entities_empty_dict' 'unescape_leaves_unknown'
	  'unescape_lt_gt' 'unescape_plain').
	keys do: [:key |
		self
			assert: ((results @env1:__getitem__: key) = true)
			description: key , ' -> ' , (results @env1:__getitem__: key) printString].
	self assert: keys size equals: 45
%

category: 'Grail-Tests - saxutils'
method: SaxUtilsTestCase
testImportShapes
	"The three ways the real callers spell the import, all of which behave
	as they do under CPython (measured, 2026-08-29):

	  from xml.sax.saxutils import escape        html5lib serializer
	  from xml.sax.saxutils import escape, unescape
	                                            html5lib filters.sanitizer
	  from xml.sax.saxutils import unescape      bleach sanitizer

	Plus the dotted form, and the parent-package binding: after
	``import xml.sax.saxutils'', ``xml.sax'' must carry a ``saxutils''
	attribute, as it does in CPython."

	self assert: (self eval:
'from xml.sax.saxutils import escape
escape(''<a & b>'')
') equals: '&lt;a &amp; b&gt;'.
	self assert: (self eval:
'from xml.sax.saxutils import escape, unescape
unescape(escape(''&lt;''))
') equals: '&lt;'.
	self assert: (self eval:
'import xml.sax.saxutils
xml.sax.saxutils.quoteattr(''a\nb'')
') equals: '"a&#10;b"'.
	self assert: (self eval:
'import xml.sax.saxutils
import xml.sax
hasattr(xml.sax, ''saxutils'')
') equals: true
%

category: 'Grail-Tests - saxutils'
method: SaxUtilsTestCase
testParserSurfaceIsPresentButHasNoParser
	"THIS TEST WAS A TRIPWIRE AND IT WORKED.

	It used to assert that all eight of parse / parseString / make_parser /
	InputSource / ContentHandler / ErrorHandler / SAXException /
	SAXParseException were ABSENT, and its comment said why in as many words:
	stubbing any of them would let code needing a real parser get something
	that looks like one, so leaving them out makes it fail at the name it
	wanted -- ``if a SAX reader is ever added, it should fail here first''.

	It did fail first.  What changed is the premise, not the principle: only
	the PARSER in CPython's xml.sax is C.  _exceptions, handler, xmlreader and
	saxutils are pure Python and are now vendored verbatim, so all eight names
	are present and all eight WORK.  XMLGenerator serializes, AttributesImpl
	holds attributes, the exception hierarchy raises and is caught.

	The principle is kept exactly where it was.  What must never happen is
	make_parser handing back something that cannot parse, so that is what is
	asserted now: it raises SAXReaderNotAvailable, which is CPython's OWN
	error for a build with no parser module.  The loud failure the old test
	protected still happens -- at the real point, from the real driver, rather
	than at an AttributeError for a missing name."

	self assert: (self eval:
'import xml.sax
present = []
for name in (''parse'', ''parseString'', ''make_parser'', ''InputSource'',
             ''ContentHandler'', ''ErrorHandler'', ''SAXException'',
             ''SAXParseException''):
    if hasattr(xml.sax, name):
        present.append(name)
len(present)
') equals: 8.

	"and the parser itself still refuses, the way CPython refuses"
	self assert: (self eval:
'import xml.sax
try:
    xml.sax.make_parser()
    outcome = ''RETURNED A PARSER''
except xml.sax.SAXReaderNotAvailable:
    outcome = ''SAXReaderNotAvailable''
except Exception as exc:
    outcome = type(exc).__name__
outcome
') equals: 'SAXReaderNotAvailable'
%
