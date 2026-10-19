Class {
	#name : 'DynamicClassModuleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
DynamicClassModuleTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
DynamicClassModuleTestCase >> setUp [
	"Reload tests/python/dynamic_class_module.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dynamic_class_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dynamic_class_module.py')
		name: 'dynamic_class_module'.

]

{ #category : 'Grail-Tests - The Module Is Stamped' }
DynamicClassModuleTestCase >> testAClassBuiltAtModuleLevelGetsTheModule [
	"The common spelling, and the one the frame walk CANNOT serve: a module
	body is not a Python frame here, so this answer comes from the stack of
	bodies currently executing.  With no bases it used to raise
	AttributeError."

	self assertMatchesCPythonAt: 'no_bases'.

]

{ #category : 'Grail-Tests - The Module Is Stamped' }
DynamicClassModuleTestCase >> testAClassBuiltInsideAFunctionGetsTheModule [
	"The other route -- this one IS found by walking the frame chain.  Both
	must agree, and only a test says so."

	self assertMatchesCPythonAt: 'built_inside_a_function'.

]

{ #category : 'Grail-Tests - The Module Is Stamped' }
DynamicClassModuleTestCase >> testAClassWithABaseNoLongerAnswersARawNil [
	"The silent half.  The base's accessor pair is inherited while the
	subclass's own slot stays unset, so the read SUCCEEDED and handed back a
	Smalltalk nil -- ``<UndefinedObject object at 0x101>'' -- which no Python
	code can catch or use.  An AttributeError would at least have been
	honest."

	self assertMatchesCPythonAt: 'with_base'.

]

{ #category : 'Grail-Tests - The Module Is Stamped' }
DynamicClassModuleTestCase >> testANamespaceSuppliedModuleIsKept [
	"CPython stamps only when the key is ABSENT, so an explicit
	``__module__'' in the namespace survives.  This is also what makes the
	stamp free for a class statement, whose namespace always carries one --
	and why the stack is never captured on that path."

	self assertMatchesCPythonAt: 'explicit_module_is_kept'.

]

{ #category : 'Grail-Tests - What It Decides' }
DynamicClassModuleTestCase >> testReprIsQualifiedOnceTheModuleIsKnown [
	"A class with no module reprs as ``<class 'X'>'' where CPython says
	``<class 'mod.X'>'' -- and the instance repr is qualified by the same
	value, so both move together."

	self assertMatchesCPythonAt: 'repr_is_qualified'.
	self assertMatchesCPythonAt: 'repr_with_base'.
	self assertMatchesCPythonAt: 'instance_repr_is_qualified'.

]

{ #category : 'Grail-Tests - The Module Is Stamped' }
DynamicClassModuleTestCase >> testTheCallerWinsOverTheBasesModule [
	"collections.OrderedDict is the base; the class built from it belongs to
	the module that BUILT it.  This is the case an ``inherit it from the
	base'' fix would get wrong while passing everything else here."

	self assertMatchesCPythonAt: 'base_from_another_module_does_not_win'.

]

{ #category : 'Grail-Tests - Where It Lands' }
DynamicClassModuleTestCase >> testTheModuleIsInTheClassDictNotMerelyReadable [
	"``'__module__' in C.__dict__'' is how pickle and inspect ask, so being
	readable through the attribute path is not enough."

	self assertMatchesCPythonAt: 'in_the_class_dict'.
	self assertMatchesCPythonAt: 'dict_value'.

]

{ #category : 'Grail-Tests - Nothing Else Moves' }
DynamicClassModuleTestCase >> testTheRestOfTheClassIsUnchanged [
	"Stamping __module__ adds a binding to the namespace the caller supplied,
	so the guard against disturbing what was already there belongs with it --
	the value, the bases, and both directions of the subclass relation."

	self assertMatchesCPythonAt: 'name'.
	self assertMatchesCPythonAt: 'qualname'.
	self assertMatchesCPythonAt: 'namespace_value_survives'.
	self assertMatchesCPythonAt: 'base_is_kept'.
	self assertMatchesCPythonAt: 'subclass_check'.
	self assertMatchesCPythonAt: 'instance_is_usable'.

]
