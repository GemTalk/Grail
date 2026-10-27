Class {
	#name : 'TypesGetOriginalBasesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypesGetOriginalBasesTestCase >> testGetOriginalBasesAnswersTheBasesBeforeMroEntries [
	"tests/python/types_get_original_bases.py: types.get_original_bases answers a
	class's own __orig_bases__ when a base's __mro_entries__ replaced it, its
	__bases__ otherwise -- a sole types.GenericAlias base included -- and
	refuses a non-class.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'types_get_original_bases' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/types_get_original_bases.py')
		name: 'types_get_original_bases'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
