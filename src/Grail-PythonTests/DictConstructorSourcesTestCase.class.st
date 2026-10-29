Class {
	#name : 'DictConstructorSourcesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
DictConstructorSourcesTestCase >> testDictReadsASourceWithKeysAsAMapping [
	"tests/python/dict_constructor_sources.py: dict() reads a source with a
	keys attribute as a mapping, a keys assigned to its class at run time
	included, reads anything else as pairs, and refuses in CPython's words.
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'dict_constructor_sources' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dict_constructor_sources.py')
		name: 'dict_constructor_sources'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
