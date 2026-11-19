Class {
	#name : 'TypesCoroutineTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Coroutines' }
TypesCoroutineTestCase >> testTypesCoroutineFlagsAndWraps [
	"tests/python/types_coroutine.py: types.coroutine hands back an async def
	untouched and a generator function itself, flagged CO_ITERABLE_COROUTINE --
	so its generators yield from a coroutine, are awaitable and serve anext(),
	for a nested def, a module-level def, a closure and a method of a class
	defined at module level or inside a function -- and wraps any other
	generator-like result in types._GeneratorWrapper.  Also type()'s tuple
	subclass bases.  Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'types_coroutine' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/types_coroutine.py')
		name: 'types_coroutine'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '11 checks, 0 disagreeing [], keys match: True'

]
