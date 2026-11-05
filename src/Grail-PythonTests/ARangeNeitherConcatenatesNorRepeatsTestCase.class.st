Class {
	#name : 'ARangeNeitherConcatenatesNorRepeatsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ARangeNeitherConcatenatesNorRepeatsTestCase >> testARangeRefusesPlusAndTimesAndHasNoSuchMethods [
	"tests/python/a_range_neither_concatenates_nor_repeats.py: ``+'' and
	``*'' on a range are CPython's TypeErrors, in place too, an operand's
	reflected method still answers, a list's own message names the range,
	and range has no __add__, __mul__ or __rmul__ for hasattr(), dir() or
	vars().  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'a_range_neither_concatenates_nor_repeats' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/a_range_neither_concatenates_nor_repeats.py')
		name: 'a_range_neither_concatenates_nor_repeats'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
