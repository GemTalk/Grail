Class {
	#name : 'BuildClassBuiltinTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BuildClassBuiltinTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
BuildClassBuiltinTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'build_class_builtin' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/build_class_builtin.py')
		name: 'build_class_builtin'.

]

{ #category : 'Grail-Tests - the class gate' }
BuildClassBuiltinTestCase >> testAClassStatementRequiresBuildClass [
	"Two empty mappings refuse, and a COPY OF REAL BUILTINS does not -- the
	third row is the one a gate written before the name existed got wrong,
	and it is the shape a bare exec() inside a function actually produces."

	self assertMatchesCPythonAt: 'empty_builtins'.
	self assertMatchesCPythonAt: 'empty_frozendict'.
	self assertMatchesCPythonAt: 'frozen_real_builtins'.

]

{ #category : 'Grail-Tests - the name exists' }
BuildClassBuiltinTestCase >> testBothEnumerationsReportTheDunderBuiltins [
	"They came from different places and disagreed: dir(builtins) answers the
	curated spec list, __dict__ walks the selectors, and the selector walk
	could not tell ``___build_class__:kw:'' from machinery."

	self assertMatchesCPythonAt: 'in_dict'.
	self assertMatchesCPythonAt: 'in_dir'.
	self assertMatchesCPythonAt: 'import_in_dict'.
	self assertMatchesCPythonAt: 'import_in_dir'.

]

{ #category : 'Grail-Tests - Controls' }
BuildClassBuiltinTestCase >> testClassDefinitionIsUntouchedWithoutAnOverride [
	"The gate is emitted only inside a doit whose builtins were replaced, so
	every ordinary class definition must be exactly as it was -- in an exec,
	at module scope, and with a built-in base."

	self assertMatchesCPythonAt: 'class_in_plain_exec'.
	self assertMatchesCPythonAt: 'class_at_module_scope'.
	self assertMatchesCPythonAt: 'class_with_a_base'.
	self assertMatchesCPythonAt: 'bare_exec_still_builds_classes'.

]

{ #category : 'Grail-Tests - the name exists' }
BuildClassBuiltinTestCase >> testDirAndVarsAgreeForBuiltins [
	"The INVARIANT rather than an instance of it -- and the reason a copy of
	builtins is now a usable __builtins__."

	self assertMatchesCPythonAt: 'dir_and_vars_agree'.
	self assertMatchesCPythonAt: 'copy_carries_it'.

]

{ #category : 'Grail-Tests - Controls' }
BuildClassBuiltinTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '14 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
BuildClassBuiltinTestCase >> testMachineryStaysHidden [
	"THE CONTROL FOR THE RULE CHANGE: loosening ``begins with ___'' must not
	start reporting Grail's own internals as Python names.  A ``___name___''
	selector still has three trailing underscores and is still skipped."

	self assertMatchesCPythonAt: 'internal_names_stay_hidden'.

]
