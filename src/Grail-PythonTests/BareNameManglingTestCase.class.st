Class {
	#name : 'BareNameManglingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BareNameManglingTestCase >> assertMatchesCPythonAt: key [
	"Both sides through repr, so a 5 and a '5' cannot pass for each other."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
BareNameManglingTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'bare_name_mangling' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/bare_name_mangling.py')
		name: 'bare_name_mangling'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testABareReadIsMangledToo [
	"The permissive direction: Grail used to FIND a module-level __helper from
	inside a class, where CPython looks up _C__helper and raises NameError."

	self assertMatchesCPythonAt: 'bare_read_is_mangled'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testAGlobalIsDeclaredUnderTheMangledName [
	self assertMatchesCPythonAt: 'global_key'.
	self assertMatchesCPythonAt: 'global_value'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testAPrivateNestedClassBindsMangled [
	"Pre-existing, closed here: ``class __Inner'' inside C was stored under its
	raw name, so C._C__Inner was an AttributeError.  Its members mangle with the
	INNER class's name."

	self assertMatchesCPythonAt: 'inner_class_name'.
	self assertMatchesCPythonAt: 'inner_class_member_uses_inner_name'.
	self assertMatchesCPythonAt: 'class_attr'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testAWrittenPremangledNameKeepsItsSpelling [
	"``def _C__lit'' is spelled exactly like a mangled ``__lit'', and CPython
	reports it as written.  This is why __name__ reads a table of the defs that
	were ACTUALLY mangled rather than un-mangling the selector."

	self assertMatchesCPythonAt: 'literal_premangled_name'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testBindingsMangleButNamesDoNot [
	"CPython mangles a def's BINDING and keeps its __name__ as written."

	self assertMatchesCPythonAt: 'nested_def'.
	self assertMatchesCPythonAt: 'method_name'.
	self assertMatchesCPythonAt: 'bound_method_name'.
	self assertMatchesCPythonAt: 'inherited_private_name'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testEveryOtherBindingForm [
	self assertMatchesCPythonAt: 'nonlocal'.
	self assertMatchesCPythonAt: 'lambda'.
	self assertMatchesCPythonAt: 'comprehension'.
	self assertMatchesCPythonAt: 'except_as'.
	self assertMatchesCPythonAt: 'import_as'.
	self assertMatchesCPythonAt: 'fstring'.
	self assertMatchesCPythonAt: 'default_lambda'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testLocalsUseOneSpelling [
	"__x and _C__x are the SAME local -- the property whose absence broke the
	codegen-only attempt."

	self assertMatchesCPythonAt: 'local_keys'.
	self assertMatchesCPythonAt: 'two_spellings_one_local'.
	self assertMatchesCPythonAt: 'del'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testParametersAreMangledButCallKeywordsAreNot [
	"A private PARAMETER is mangled (co_varnames _C__a), and a call-site
	keyword never is -- so ``self.f(__a=1)'' is a TypeError even from inside
	the class.  The keyword half is the trap: parseAtom mangles the NameAst the
	keyword is read from, so its name has to come from the raw token."

	self assertMatchesCPythonAt: 'param_mangled_kw_ok'.
	self assertMatchesCPythonAt: 'param_raw_kw_rejected'.
	self assertMatchesCPythonAt: 'call_site_kw_stays_raw'.

]

{ #category : 'Grail-Tests' }
BareNameManglingTestCase >> testTheUpstreamWalrusGlobalCase [
	"THE TEST THIS WAS FOR, in its upstream nesting -- a class defined inside a
	function, ``global __x1'' in its method, and walruses writing the global
	under both spellings.  Before the fix the pre-mangled walrus reached a
	different variable from the one ``global'' declared."

	self assertMatchesCPythonAt: 'upstream_walrus_global'.

]
