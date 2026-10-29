Class {
	#name : 'NonlocalAndGlobalTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
NonlocalAndGlobalTestCase >> testNameDeclaredGlobalAndNonlocalIsRefused [
	"tests/python/nonlocal_and_global.py: a name one scope declares both
	global and nonlocal is CPython's ``name 'x' is nonlocal and global'', over
	the first statement declaring it, in a function or a class body.  Each
	check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'nonlocal_and_global' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nonlocal_and_global.py')
		name: 'nonlocal_and_global'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
