Class {
	#name : 'ADescriptorsGetHasCPythonsSignatureTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ADescriptorsGetHasCPythonsSignatureTestCase >> testTheGetOfABuiltinDescriptorTakesAnInstanceAndAnOptionalOwner [

	"tests/python/a_descriptors_get_has_cpythons_signature.py: the __get__ of a
	slot wrapper, a method descriptor, a class method descriptor and a function
	reports (instance, owner=None, /), owner's default None, and a builtin's own
	signature is unchanged.  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'a_descriptors_get_has_cpythons_signature' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_descriptors_get_has_cpythons_signature.py')
		name: 'a_descriptors_get_has_cpythons_signature'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
