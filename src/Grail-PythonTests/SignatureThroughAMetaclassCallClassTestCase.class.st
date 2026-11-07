Class {
	#name : 'SignatureThroughAMetaclassCallClassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SignatureThroughAMetaclassCallClassTestCase >> testAClassCalledThroughAMetaclassCallClassHasThatClassesSignature [

	"tests/python/signature_through_a_metaclass_call_class.py: a class whose
	metaclass's __call__ is dict has no signature, one whose __call__ is another
	class has that class's, a def __call__ still drops its class, and a
	dataclass on the dict-calling base has the bare docstring.  Each check
	agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'signature_through_a_metaclass_call_class' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/signature_through_a_metaclass_call_class.py')
		name: 'signature_through_a_metaclass_call_class'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
