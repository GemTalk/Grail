Class {
	#name : 'TypesNewClassMetaclassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
TypesNewClassMetaclassTestCase >> testNewClassBuildsTheClassByCallingItsMetaclass [
	"tests/python/types_new_class_metaclass.py: types.new_class calls the
	metaclass prepare_class chooses -- explicit, derived from the bases, or the
	more derived of the two -- so its __new__ and __init__ run with the class
	keywords, and a later prepare_class finds it.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'types_new_class_metaclass' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/types_new_class_metaclass.py')
		name: 'types_new_class_metaclass'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '6 checks, 0 disagreeing [], keys match: True'

]
