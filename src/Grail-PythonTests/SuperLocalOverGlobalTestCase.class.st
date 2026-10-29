Class {
	#name : 'SuperLocalOverGlobalTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
SuperLocalOverGlobalTestCase >> testExplicitSuperReadsALocalBeforeAModuleGlobal [
	"tests/python/super_local_over_global.py: super()'s explicit first
	argument is a local class or parameter when one binds the name, even
	where a ``global'' elsewhere makes the module know it too, and a module
	level class still reads as before.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'super_local_over_global' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_local_over_global.py')
		name: 'super_local_over_global'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
