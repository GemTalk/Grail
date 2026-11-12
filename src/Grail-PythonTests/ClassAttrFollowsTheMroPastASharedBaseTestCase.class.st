Class {
	#name : 'ClassAttrFollowsTheMroPastASharedBaseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ClassAttrFollowsTheMroPastASharedBaseTestCase >> testEachReadAgreesWithCPython [

	"tests/python/class_attr_follows_the_mro_past_a_shared_base.py: in
	``class D(B, C)'' with B and C both under A, a class attribute C binds in
	its class body is the one D and its instances read, not A's, as the MRO
	D, B, C, A has it (#1769).  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules
		removeKey: #'class_attr_follows_the_mro_past_a_shared_base'
		ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_attr_follows_the_mro_past_a_shared_base.py'
		name: 'class_attr_follows_the_mro_past_a_shared_base'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
