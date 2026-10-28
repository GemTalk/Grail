Class {
	#name : 'ModuleRebuildDefaultsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ModuleRebuildDefaultsTestCase >> testARebuiltDefEvaluatesItsDefaultsAgain [
	"tests/python/module_rebuild_defaults.py: a module rebuilt into its
	instance (importlib.reload here; an install's redeploy or a lazy bind in a
	deployment) evaluates a module-level def's defaults again, as CPython
	re-executing the def does.  The memo kept the first body's values, so
	dataclasses' field(default=MISSING, default_factory=MISSING) compared a stale
	sentinel with the new global and every field(default_factory=list) raised
	``cannot specify both default and default_factory'' (GemTalk/Grail#1884).
	Each check agrees with CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'module_rebuild_defaults' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_rebuild_defaults.py')
		name: 'module_rebuild_defaults'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
