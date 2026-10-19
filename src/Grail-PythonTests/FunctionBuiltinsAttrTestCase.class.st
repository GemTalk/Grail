Class {
	#name : 'FunctionBuiltinsAttrTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionBuiltinsAttrTestCase >> assertMatchesCPythonAt: key [
	"Compare the fixture's recorded result against its CPython-measured
	EXPECTED entry, both through repr so a True and a 'True' cannot pass for
	each other."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
FunctionBuiltinsAttrTestCase >> setUp [
	"Reload tests/python/function_builtins_attr.py fresh each test.  The module
	body mutates the functions it records (the read-only checks call setattr and
	delattr on them), so a shared instance would carry one test's writes into
	the next."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_builtins_attr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_builtins_attr.py')
		name: 'function_builtins_attr'.

]

{ #category : 'Grail-Tests - Callables' }
FunctionBuiltinsAttrTestCase >> testEveryCallableFlavourReportsTheSameBuiltinsObject [
	"Three unrelated Smalltalk classes back Python's one ``function'' idea, so
	each needs the attribute in its own right: BoundMethod for a module-level
	def, ExecBlock for a nested def and a lambda, UnboundMethod for ``Cls.m''.
	UnboundMethod was missed on the first pass and this check is what found it."

	self assertMatchesCPythonAt: 'module_level_func'.
	self assertMatchesCPythonAt: 'nested_func'.
	self assertMatchesCPythonAt: 'lambda_func'.
	self assertMatchesCPythonAt: 'unbound_method'.
	self assertMatchesCPythonAt: 'bound_method'.

]

{ #category : 'Grail-Tests - Callables' }
FunctionBuiltinsAttrTestCase >> testTheAttributeAgreesWithTheFunctionsOwnGlobals [
	"CPython reads a function's builtins OUT OF its globals, so the two cannot
	disagree.  Grail's readers go through __globals__ for the same reason --
	which is also what makes a module that binds its own ``__builtins__'' report
	that binding for the functions defined in it."

	self assertMatchesCPythonAt: 'agrees_with_own_globals'.

]

{ #category : 'Grail-Tests - Read-Only' }
FunctionBuiltinsAttrTestCase >> testTheAttributeRefusesBothAssignmentAndDeletion [
	"A getter and no setter, so both directions are AttributeError.  Deletion
	needs naming separately from assignment: ``__builtins__'' is a computed
	name rather than a __dict__ entry, so a ``del'' that found nothing to
	remove could quietly succeed -- which is how the sibling read-only names
	behaved before their guards were added."

	self assertMatchesCPythonAt: 'set_on_module_level'.
	self assertMatchesCPythonAt: 'del_on_module_level'.
	self assertMatchesCPythonAt: 'set_on_nested'.
	self assertMatchesCPythonAt: 'del_on_nested'.

]

{ #category : 'Grail-Tests - Module Name' }
FunctionBuiltinsAttrTestCase >> testTheBareModuleLevelNameResolvesToTheBuiltinsNamespace [
	"``__builtins__'' as a bare name raised NameError.  It is the builtins
	namespace itself, by identity -- a lookalike dict would pass an equality
	check and still be the wrong object."

	self assertMatchesCPythonAt: 'bare_name_is_builtins_namespace'.
	self assertMatchesCPythonAt: 'globals_entry_is_bare_name'.

]

{ #category : 'Grail-Tests - Module Name' }
FunctionBuiltinsAttrTestCase >> testTheNameIsAnEntryInTheModuleNamespaceNotMerelyReadable [
	"CPython's import machinery writes ``__builtins__'' into each module's
	namespace, so it is visible to dir(), vars() and any iteration -- not just
	to a read.  These check MEMBERSHIP for that reason: Grail also computes the
	name on a miss, so every read-based check here passed while nothing was
	stored, and only these can tell the two implementations apart.

	The builtins module itself is excluded, matching CPython, and that half is
	not cosmetic -- the first guard written for it compared against the module's
	PyModuleDict VIEW rather than the module, matched nothing, and stamped
	builtins along with everything else."

	self assertMatchesCPythonAt: 'present_in_own_module_dict'.
	self assertMatchesCPythonAt: 'present_in_another_module_dict'.
	self assertMatchesCPythonAt: 'readable_as_a_module_attribute'.
	self assertMatchesCPythonAt: 'builtins_module_itself_excluded'.

]
