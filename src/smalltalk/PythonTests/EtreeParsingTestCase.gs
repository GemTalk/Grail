! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for EtreeParsingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'EtreeParsingTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
EtreeParsingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! EtreeParsingTestCase - xml.etree.ElementTree can PARSE
! ===============================================================================
! Grail's ElementTree was a 269-line hand-rolled shim that could build a tree
! and serialize it, and whose fromstring/parse raised NotImplementedError.  That
! was the honest state while Grail had no XML parser.  It has one now, so
! CPython 3.14.7's own ElementTree.py is vendored VERBATIM, together with the
! ElementPath.py it needs for find/findall -- which the shim had no version of
! at all.  The whole upstream file is pure Python and its parsing reaches
! xml.parsers.expat, so it needed no Grail-specific change.
!
! WHAT UNBLOCKED THIS is worth recording, because the shim argued against it:
! the shim carried an explicit _attr_order list, justified by a comment saying
! Grail's dict ordering is not guaranteed.  Measured, that is no longer true --
! Grail dicts preserve insertion order and match CPython on every case tried,
! including delete-then-reinsert.  A comment that was true when written had
! become the only remaining reason not to vendor the real file.
!
! tests/python/etree_parsing.py holds the 13 checks below and is run under real
! CPython 3.14 by scripts/check_python_fixtures.sh, so every expectation here is
! measured against CPython rather than against Grail's own output -- including
! the ParseError message and its line/column.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
EtreeParsingTestCase removeAllMethods.
EtreeParsingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - ElementTree'
method: EtreeParsingTestCase
testEveryParsingCheckAgreesWithCPython
	"Every check in tests/python/etree_parsing.py, which the fixture gate also
	runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'etree_parsing' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/etree_parsing.py')
		name: 'etree_parsing'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_namespaced_tag_is_qualified' 'attributes_survive'
	  'building_a_tree_still_works' 'cdata_is_text'
	  'character_references_are_expanded' 'child_text_survives'
	  'element_path_finds_by_path' 'entities_are_expanded'
	  'find_works_with_a_qualified_name' 'fromstring_reads_a_tree'
	  'iter_walks_the_whole_tree'
	  'malformed_xml_raises_parse_error_with_a_position'
	  'parse_then_serialize_round_trips').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 13
%

category: 'Grail-Tests - ElementTree'
method: EtreeParsingTestCase
testFromstringNoLongerRaisesNotImplementedError
	"The one behaviour the shim could not offer, named on its own so the
	regression has somewhere to land: parsing used to raise
	NotImplementedError, and the module was imported by real code that then
	could only build trees."

	self assert: (self eval:
'import xml.etree.ElementTree as ElementTree
ElementTree.fromstring(''<a><b>text</b></a>'').find(''b'').text
') equals: 'text'
%

category: 'Grail-Tests - ElementTree'
method: EtreeParsingTestCase
testTheImportShapesRealCallersUseAllWork
	"The three spellings the vendored packages and the test corpus actually
	use.  Each binds a different object -- the module under an alias, the
	submodule off the package, and a name lifted out of the module -- and
	Grail has had each of the three break independently."

	self assert: (self eval:
'import xml.etree.ElementTree as ElementTree
ElementTree.fromstring(''<a/>'').tag
') equals: 'a'.
	self assert: (self eval:
'from xml.etree import ElementTree
ElementTree.fromstring(''<a/>'').tag
') equals: 'a'.
	self assert: (self eval:
'from xml.etree.ElementTree import fromstring
fromstring(''<a/>'').tag
') equals: 'a'
%

category: 'Grail-Tests - ElementTree'
method: EtreeParsingTestCase
testElementPathFindsWhatTheShimCouldNotLookFor
	"ElementPath is the half the shim omitted entirely, so find/findall could
	only ever have answered a direct child.  A dotted path and a descendant
	search are the two shapes callers reach for first."

	self assert: (self eval:
'import xml.etree.ElementTree as ElementTree
tree = ElementTree.fromstring(''<root><item><name>first</name></item></root>'')
tree.find(''item/name'').text
') equals: 'first'.
	self assert: (self eval:
'import xml.etree.ElementTree as ElementTree
tree = ElementTree.fromstring(''<root><a><name>x</name></a><name>y</name></root>'')
'',''.join([element.text for element in tree.findall(''.//name'')])
') equals: 'x,y'
%
