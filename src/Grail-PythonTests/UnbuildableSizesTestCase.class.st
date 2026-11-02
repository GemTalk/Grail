"Tests that a size which fits Py_ssize_t but cannot be built is CPython's
MemoryError rather than a build that ends the session.  Drives
tests/python/unbuildable_sizes.py, which is deliberately not self-running:
CPython on macOS overcommits memory and attempts these builds."
Class {
	#name : 'UnbuildableSizesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
UnbuildableSizesTestCase >> testASizeThatCannotBeBuiltIsAMemoryErrorAndTheSessionGoesOn [
	"Padding, a %-format or format-spec width, and a str or tuple repeat that
	the gem's temporary object memory cannot hold are each MemoryError; past
	Py_ssize_t they are CPython's OverflowErrors; and the session is still
	there afterwards to say so."

	| fixture |
	importlib @env1:modules removeKey: #'unbuildable_sizes' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/unbuildable_sizes.py')
		name: 'unbuildable_sizes'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
