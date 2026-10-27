Class {
	#name : 'StoreEvaluationOrderTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
StoreEvaluationOrderTestCase >> testStoresEvaluateTheirPartsInCPythonsOrderEachOnce [
	"tests/python/store_evaluation_order.py: an attribute or subscript store,
	plain or annotated, evaluates its value before the target's receiver and
	index, so ``no_name[k] = 1/0'' raises ZeroDivisionError; an augmented one
	evaluates the receiver and index once, so ``d[next(it)] += 1'' advances
	the iterator once.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'store_evaluation_order' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/store_evaluation_order.py')
		name: 'store_evaluation_order'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]
