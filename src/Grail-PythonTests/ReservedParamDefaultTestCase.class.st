Class {
	#name : 'ReservedParamDefaultTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - reserved parameter names' }
ReservedParamDefaultTestCase >> testEveryReservedParamCheckAgreesWithCPython [
	"Every check in tests/python/reserved_param_default.py, which the fixture
	gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'reserved_param_default' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reserved_param_default.py')
		name: 'reserved_param_default'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_nested_reserved_param_needs_no_default'
	  'a_nested_reserved_param_takes_its_default'
	  'a_nested_reserved_param_yields_to_an_argument'
	  'a_reserved_name_binds_its_argument'
	  'a_reserved_name_takes_its_default'
	  'an_explicit_argument_beats_the_default'
	  'an_ordinary_parameter_is_unaffected'
	  'every_reserved_name_takes_its_default'
	  'self_equals_self_reads_an_enclosing_transport_temp'
	  'self_equals_self_reads_the_enclosing_receiver').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 10

]

{ #category : 'Grail-Tests - reserved parameter names' }
ReservedParamDefaultTestCase >> testIterparseIsReachableAgain [
	"iterparse is built on XMLPullParser, whose __init__ calls _setevents, so
	the whole pull-parsing half of ElementTree stood or fell with the compile
	above.  Asserted through read_events rather than through iteration, because
	iterating the result reaches a SEPARATE open defect -- a class attribute
	holding an already-bound method is re-bound on read (docs/Issues.md)."

	self assert: (self eval:
'import xml.etree.ElementTree as ElementTree
parser = ElementTree.XMLPullParser([''start'', ''end''])
parser.feed(''<a><b/></a>'')
'','' .join(event + '':'' + element.tag for event, element in parser.read_events())
') equals: 'start:a,start:b,end:b,end:a'

]

{ #category : 'Grail-Tests - reserved parameter names' }
ReservedParamDefaultTestCase >> testTheElementTreeIdiomThatPromptedThisCompilesAndRuns [
	"The shape from CPython's ElementTree.XMLParser._setevents, named on its own
	so the regression has somewhere to land that reads like the code that found
	it rather than like a reduction of it."

	self assert: (self eval:
'class Parser:
    def setevents(self, queue):
        def handler(text, append=queue.append, self=self):
            append((text, self.tag))
        return handler
    tag = ''root''
p = Parser()
seen = []
p.setevents(seen)(''hello'')
seen[0]
') equals: (self eval: '(''hello'', ''root'')')

]
