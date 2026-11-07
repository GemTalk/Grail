Class {
	#name : 'UnpackingASequenceUsesItsOwnIterTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnpackingASequenceUsesItsOwnIterTestCase >> testATupleOrListSubclassWithItsOwnIterUnpacksWhatItYields [

	"tests/python/unpacking_a_sequence_uses_its_own_iter.py: a tuple or list
	subclass that defines __iter__ unpacks, in an assignment and in a
	comprehension's target, to what it yields, counted and refused by
	iterating, one value too many and no more; one without its own __iter__,
	and a namedtuple, still unpack their items.  Each check agrees with
	CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'unpacking_a_sequence_uses_its_own_iter' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unpacking_a_sequence_uses_its_own_iter.py')
		name: 'unpacking_a_sequence_uses_its_own_iter'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
