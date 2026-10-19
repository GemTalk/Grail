Class {
	#name : 'ModuleAttrIdentityTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleAttrIdentityTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ModuleAttrIdentityTestCase >> setUp [
	"Reload tests/python/module_attr_identity.py fresh each test."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'module_attr_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attr_identity.py')
		name: 'module_attr_identity'.
	probe := testModule @env1:probe.

]

{ #category : 'Grail-Tests' }
ModuleAttrIdentityTestCase >> testEveryFlattenedClassReportsCPythonIdentity [
	"All 19 class entries at once: __name__ and __module__ must equal what
	CPython 3.14 answers.  On failure the diff names the offenders rather
	than reporting a bare false."

	(self at: 'matches_expected') ifFalse: [
		self assert: (self at: 'report') @env0:asString
			equals: 'see tests/python/module_attr_identity.py EXPECTED'].
	self assert: (self at: 'matches_expected')

]

{ #category : 'Grail-Tests' }
ModuleAttrIdentityTestCase >> testInstanceModuleOnlyWhereCPythonHasOne [
	"``functools.Placeholder.__module__'' is 'functools': the INSTANCE
	answers it, because CPython's _PlaceholderType is a heap type carrying
	__module__ in its dict.

	This must NOT become a general instance-side fallback to the class.
	CPython raises AttributeError for ``(1).__module__'' and for the sys
	structseq singletons (sys.flags, sys.implementation, ...), which are C
	types -- so those two stay absent here."

	self assert: (self at: 'placeholder_module') @env0:asString
		equals: 'functools'.
	self assert: (self at: 'sys_flags_instance_absent').
	self assert: (self at: 'sys_impl_instance_absent')

]

{ #category : 'Grail-Tests' }
ModuleAttrIdentityTestCase >> testModulesKeepTheirRealDottedName [
	"os.path and html.entities are MODULES, not classes.  A module has a
	__name__ but no __module__, and os.path IS the posixpath module in
	CPython -- so neither may report its flattened class name."

	self assert: (self at: 'os_path_name') @env0:asString equals: 'posixpath'.
	self assert: (self at: 'html_entities_name') @env0:asString
		equals: 'html.entities'

]

{ #category : 'Grail-Tests' }
ModuleAttrIdentityTestCase >> testQualnameTracksName [
	"Every entry is top-level in its module, so __qualname__ equals
	__name__ -- and must not fall back to the flattened spelling either."

	self assert: (self at: 'partial_qualname') @env0:asString equals: 'partial'.
	self assert: (self at: 'formatter_qualname') @env0:asString equals: 'Formatter'

]
