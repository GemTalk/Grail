Class {
	#name : 'EtreeParsingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - ElementTree' }
EtreeParsingTestCase >> testElementPathFindsWhatTheShimCouldNotLookFor [
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

]

{ #category : 'Grail-Tests - ElementTree' }
EtreeParsingTestCase >> testEveryParsingCheckAgreesWithCPython [
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

]

{ #category : 'Grail-Tests - ElementTree' }
EtreeParsingTestCase >> testFromstringNoLongerRaisesNotImplementedError [
	"The one behaviour the shim could not offer, named on its own so the
	regression has somewhere to land: parsing used to raise
	NotImplementedError, and the module was imported by real code that then
	could only build trees."

	self assert: (self eval:
'import xml.etree.ElementTree as ElementTree
ElementTree.fromstring(''<a><b>text</b></a>'').find(''b'').text
') equals: 'text'

]

{ #category : 'Grail-Tests - ElementTree' }
EtreeParsingTestCase >> testTheImportShapesRealCallersUseAllWork [
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

]
