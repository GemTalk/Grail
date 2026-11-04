Class {
	#name : 'DelOfAnUnboundNameRaisesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DelOfAnUnboundNameRaisesTestCase >> testDelOfAnUnboundNameRaisesWhatCPythonsDeleteRaises [
	"tests/python/del_of_an_unbound_name_raises.py: ``del name'' of a name
	nothing binds raises NameError at a module's or an exec()'s top level and
	for a global, UnboundLocalError for a local or the function's own cell, and
	NameError for an empty free variable; a builtin is no module name, a
	deleted def cannot be deleted again, and bound names still go.  Each check
	agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'del_of_an_unbound_name_raises' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/del_of_an_unbound_name_raises.py')
		name: 'del_of_an_unbound_name_raises'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '15 checks, 0 disagreeing [], keys match: True'

]
