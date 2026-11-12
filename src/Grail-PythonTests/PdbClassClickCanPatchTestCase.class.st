Class {
	#name : 'PdbClassClickCanPatchTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PdbClassClickCanPatchTestCase >> testEachCheckAgreesWithCPython [

	"tests/python/pdb_class_click_can_patch.py: pdb has a Pdb class with
	CPython's constructor, which keeps the streams and skip set it is given,
	and whose __init__ click's CliRunner can save, replace and restore
	(#1633).  Each check agrees with CPython 3.14."

	| fixture |

	importlib @env1:modules removeKey: #'pdb_class_click_can_patch' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/pdb_class_click_can_patch.py'
		name: 'pdb_class_click_can_patch'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
