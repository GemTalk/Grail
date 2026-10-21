"A submodule whose import fails partway is not left bound on its package
(#1651).  Each test reads tests/python/failed_submodule_import.py, which
measures the behaviour and carries what CPython 3.14 answers."
Class {
	#name : 'FailedSubmoduleImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FailedSubmoduleImportTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
FailedSubmoduleImportTestCase >> setUp [

	(importlib @env1:modules) removeKey: #'failed_submodule_import' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/failed_submodule_import.py'
		name: 'failed_submodule_import'

]

{ #category : 'Grail-Tests' }
FailedSubmoduleImportTestCase >> testAFailedSubmoduleIsNotBoundOnItsPackage [
	"The binding registering made, before the body ran, is taken back."

	self assertAgreesWithCPythonAt: 'half_bound_on_package'.
	self assertAgreesWithCPythonAt: 'half2_bound_on_package'

]

{ #category : 'Grail-Tests' }
FailedSubmoduleImportTestCase >> testAFailedSubmoduleIsNotInSysModules [

	self assertAgreesWithCPythonAt: 'half_in_sys_modules'.
	self assertAgreesWithCPythonAt: 'half2_in_sys_modules'

]

{ #category : 'Grail-Tests' }
FailedSubmoduleImportTestCase >> testASecondFromImportOfAFailedSubmoduleFailsAgain [
	"It used to answer the half-built module, read from the package's
	attribute: X bound, Y not."

	self assertAgreesWithCPythonAt: 'half_first'.
	self assertAgreesWithCPythonAt: 'half_second'.
	self assertAgreesWithCPythonAt: 'half_import_module'

]

{ #category : 'Grail-Tests' }
FailedSubmoduleImportTestCase >> testASecondImportStatementOfAFailedSubmoduleFailsAgain [

	self assertAgreesWithCPythonAt: 'half2_first'.
	self assertAgreesWithCPythonAt: 'half2_second'

]

{ #category : 'Grail-Tests' }
FailedSubmoduleImportTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '9 checks, 0 disagreeing [], keys match: True'

]
