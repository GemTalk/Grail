Class {
	#name : 'DelTupleTargetTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DelTupleTargetTestCase >> testATupleOrListDelTargetDeletesEveryElement [
	"tests/python/del_tuple_target.py: ``del a, (b, c), [d, (e, f)]'' deletes
	every name in it, left to right, at module scope, in a function and in a
	class body, and through subscripts and attributes; ``del ()'' deletes
	nothing; ast.parse keeps the Tuple.  A parenthesized or bracketed target
	used to fail the whole module's compile -- test_grammar's test_del_stmt.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'del_tuple_target' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/del_tuple_target.py')
		name: 'del_tuple_target'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
