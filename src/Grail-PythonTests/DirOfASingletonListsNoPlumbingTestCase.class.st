Class {
	#name : 'DirOfASingletonListsNoPlumbingTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DirOfASingletonListsNoPlumbingTestCase >> testDirOfASingletonListsNeitherBinarySelectorsNorItsInstanceAccessors [
	"tests/python/dir_of_a_singleton_lists_no_plumbing.py: dir() of None,
	Ellipsis, NotImplemented, NoneType and a module lists no binary selector
	and neither ``instance'' nor ``clearInstance''; a Python class's own
	methods of those names stay, as do None's real attributes, and comparing
	None still refuses.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'dir_of_a_singleton_lists_no_plumbing' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dir_of_a_singleton_lists_no_plumbing.py')
		name: 'dir_of_a_singleton_lists_no_plumbing'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
