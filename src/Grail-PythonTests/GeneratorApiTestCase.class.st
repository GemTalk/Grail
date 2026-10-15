Class {
	#name : 'GeneratorApiTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Generators' }
GeneratorApiTestCase >> testGeneratorApiMatchesCPython [
	"tests/python/generator_api.py:
	 * throw(type, value, tb) normalises as _gen_throw does, and the generator
	   survives every refusal;
	 * __name__ / __qualname__ take only a string and refuse deletion, on a
	   generator and a coroutine;
	 * a genexpr, listcomp, setcomp and nested genexpr each call __iter__ once
	   per iterable, on a module and through exec(), and an async genexpr
	   iterates a sync first clause once, at creation.
	One gap, a generator not picking up its function's later renaming, is
	pinned in the fixture's KNOWN_DIVERGENCES."

	| fixture |
	importlib @env1:modules removeKey: #'generator_api' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_api.py')
		name: 'generator_api'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '28 checks, 0 disagreeing [], keys match: True'

]
