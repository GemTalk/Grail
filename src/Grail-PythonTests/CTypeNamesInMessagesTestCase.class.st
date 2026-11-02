Class {
	#name : 'CTypeNamesInMessagesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
CTypeNamesInMessagesTestCase >> testATypeCPythonImplementsInCIsNamedByItsTpName [
	"tests/python/c_type_names_in_messages.py: an attribute miss, len() and a
	weakref's repr name a type CPython implements in C by its dotted tp_name
	-- 'collections.deque', 'types.SimpleNamespace' -- whether Grail writes it
	in Smalltalk or in Python, and a class statement's by its bare name.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'c_type_names_in_messages' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/c_type_names_in_messages.py')
		name: 'c_type_names_in_messages'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
