"A failed import unloads only the modules whose own import failed; the
submodules that finished loading stay, and a retry does not run them again.
Each test reads tests/python/failed_package_import.py, which measures the
behaviour and carries what CPython 3.14 answers."
Class {
	#name : 'FailedPackageImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'fixture'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FailedPackageImportTestCase >> assertAgreesWithCPythonAt: aKey [

	| python |

	python := builtins @env1:instance.
	self
		assert: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #r) @env1:__getitem__: aKey)) asString
		equals: (python @env1:repr: ((fixture @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: aKey)) asString

]

{ #category : 'Grail-Setup' }
FailedPackageImportTestCase >> setUp [
	"Imported once per session, not per test.  The fixture records every
	answer in its module body, and running it a second time in one session
	re-executes its packages after its own cleanup has deleted them from
	sys.modules -- which meets the slots=True dataclass defect (docs/Issues.md)
	in the FIRST import, and every check after it disagrees."

	fixture := self ___recordedFixture___: '/tests/python/failed_package_import.py'
		name: 'failed_package_import'

]

{ #category : 'Grail-Tests' }
FailedPackageImportTestCase >> testAPackageWhoseOwnBodyFailsKeepsItsLoadedSubmodule [

	self assertAgreesWithCPythonAt: 'flat_first'.
	self assertAgreesWithCPythonAt: 'flat_loaded_after_failure'.
	self assertAgreesWithCPythonAt: 'flat_second'.
	self assertAgreesWithCPythonAt: 'flat_runs'

]

{ #category : 'Grail-Tests' }
FailedPackageImportTestCase >> testARetryFailsWithTheOriginalError [
	"REGRESSION GUARD for the symptom.  The retry re-ran the module defining a
	slots=True dataclass, and raised ``AttributeError: 'P' object has no
	attribute 'env_vars''' where CPython raises the ModuleNotFoundError
	again."

	self assertAgreesWithCPythonAt: 'deep_first'.
	self assertAgreesWithCPythonAt: 'deep_second'.
	self assertAgreesWithCPythonAt: 'deep_slots_instance_survives'

]

{ #category : 'Grail-Tests' }
FailedPackageImportTestCase >> testARetryRunsOnlyTheModulesThatFailed [

	self assertAgreesWithCPythonAt: 'deep_runs_first'.
	self assertAgreesWithCPythonAt: 'deep_runs_second'

]

{ #category : 'Grail-Tests' }
FailedPackageImportTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a deleted check would stop being
	asserted without anything going red.  This reads the fixture's own
	roll-up."

	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
FailedPackageImportTestCase >> testSubmodulesThatFinishedLoadingStay [
	"removeModule: swept the failed package's whole subtree out of
	sys.modules; CPython removes only the modules whose own import failed."

	self assertAgreesWithCPythonAt: 'deep_loaded_after_failure'.
	self assertAgreesWithCPythonAt: 'deep_loaded_after_retry'.
	self assertAgreesWithCPythonAt: 'deep_config_bound_on_int'

]
