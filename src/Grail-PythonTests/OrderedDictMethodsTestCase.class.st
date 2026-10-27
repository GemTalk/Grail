Class {
	#name : 'OrderedDictMethodsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
OrderedDictMethodsTestCase >> testCopyReversedEqualityAndMergingAreCPythons [
	"tests/python/ordered_dict_missing_methods.py: OrderedDict's copy keeps
	its class and copy.copy, deepcopy and pickle each answer every key once;
	reversed follows move_to_end; == and != with another OrderedDict are
	order-sensitive; fromkeys and the | operators build OrderedDicts; and
	pprint formats a mappingproxy over one as CPython does.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'ordered_dict_missing_methods' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ordered_dict_missing_methods.py')
		name: 'ordered_dict_missing_methods'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '13 checks, 0 disagreeing [], keys match: True'

]
