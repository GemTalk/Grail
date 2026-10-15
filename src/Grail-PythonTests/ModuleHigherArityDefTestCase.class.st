Class {
	#name : 'ModuleHigherArityDefTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ModuleHigherArityDefTestCase >> setUp [
	"Load tests/python/module_higher_arity_def.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'module_higher_arity_def' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_higher_arity_def.py')
		name: 'module_higher_arity_def'.

]

{ #category : 'Grail-Tests' }
ModuleHigherArityDefTestCase >> testCallable [
	"Bare name read of a 9-arg def is a callable BoundMethod, not
	a NameError-raising miss."

	self assert: testModule @env1:read_fn_9_as_value equals: true

]

{ #category : 'Grail-Tests' }
ModuleHigherArityDefTestCase >> testFnFourArgsReadable [
	"4-arg def — first arity past the original 1..3 fast path."

	self assert: testModule @env1:call_fn_4_via_value_read equals: { 10. 20. 30. 40 } asOrderedCollection

]

{ #category : 'Grail-Tests' }
ModuleHigherArityDefTestCase >> testFnNineArgsReadable [
	"9-arg def — matches flask/cli.py's run_command shape."

	self assert: testModule @env1:call_fn_9_via_value_read equals: 45

]

{ #category : 'Grail-Tests' }
ModuleHigherArityDefTestCase >> testModuleNameDunder [
	"A bare ``__name__'' read yields the module-name string, not a
	BoundMethod.  Pre-fix the ``__name__:'' setter shadowed the
	accessor in ___moduleAttrLoad___, so ``__name__ == modname'' was
	always False.  Exercised at module-body time, inside a function,
	and via the ``if __name__ == '__main__':'' guard."

	self assert: testModule @env1:body_name_matches equals: true.
	self assert: testModule @env1:func_name_matches equals: true.
	self assert: testModule @env1:name_main_guard equals: 'not_main'

]

{ #category : 'Grail-Tests' }
ModuleHigherArityDefTestCase >> testOptionalDundersDoNotRaise [
	"Bare reads of optional module dunders (__doc__ / __package__ /
	__spec__ / __loader__) must not raise when the slot is absent.
	Regression: once bare reads actually performed the accessor (the
	__name__ fix), the unguarded ``at:'' in these accessors raised
	LookupError — surfaced as a werkzeug.local import failure."

	self assert: testModule @env1:reads_optional_dunders_safely equals: true

]
