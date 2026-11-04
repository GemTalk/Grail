Class {
	#name : 'ObjectReduceAnswersCPythonsReductionTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ObjectReduceAnswersCPythonsReductionTestCase >> testObjectReduceExAnswersTheReconstructorOrNewobjAsCPythonsDoes [
	"tests/python/object_reduce_answers_cpythons_reduction.py: for an instance
	of a Python class, __reduce_ex__ answers copyreg's reconstructor below
	protocol 2 and __newobj__ (or __newobj_ex__) from 2 on, with a list's or a
	dict's items; __reduce__ answers the protocol-0 form; an overridden
	__reduce__ wins; pickling and copying still round-trip.  Each check agrees
	with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'object_reduce_answers_cpythons_reduction' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/object_reduce_answers_cpythons_reduction.py')
		name: 'object_reduce_answers_cpythons_reduction'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
