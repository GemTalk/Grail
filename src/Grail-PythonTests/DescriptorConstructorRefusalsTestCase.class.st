Class {
	#name : 'DescriptorConstructorRefusalsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DescriptorConstructorRefusalsTestCase >> testClassmethodStaticmethodAndPropertyRefuseWhatTheirSignaturesDoNotAdmit [
	"tests/python/descriptor_constructor_refusals.py: classmethod and
	staticmethod refuse a keyword and a missing callable and leave the callable
	to __init__, property refuses a fifth argument, one given twice and a
	keyword it does not name, while a subclass's own __init__ still takes its
	keyword.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'descriptor_constructor_refusals' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/descriptor_constructor_refusals.py')
		name: 'descriptor_constructor_refusals'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
