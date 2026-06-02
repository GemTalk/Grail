fileformat utf8
set compile_env: 0
! ------------------- Class definition for EmbeddedExtensionModule
expectvalue /Class
doit
module subclass: 'EmbeddedExtensionModule'
  instVarNames: #( cpythonModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPython
  options: #( instancesNonPersistent )

%
expectvalue /Class
doit
EmbeddedExtensionModule comment:
'Grail-side wrapper around a CPython module imported via
PyImport_ImportModule (one instance per imported C extension).'
%
expectvalue /Class
doit
EmbeddedExtensionModule category: 'Grail-CPython'
%
! ------------------- Remove existing behavior from EmbeddedExtensionModule
removeallmethods EmbeddedExtensionModule
removeallclassmethods EmbeddedExtensionModule
! ------------------- Class methods for EmbeddedExtensionModule
category: 'Grail-Instance Creation'
classmethod: EmbeddedExtensionModule
importByName: aName
	"Only ModuleNotFoundError is rewrapped so Python-side fallbacks
	(e.g. markupsafe falling back to _native) trigger; other CPython
	failures (ImportError, SystemError, dlopen) propagate unchanged."

	^ [
		| pyModule module |
		pyModule := CPythonLibrary current importModule: aName.
		module := self new.
		module setCpythonModule: pyModule name: aName.
		module
	] on: CPythonException do: [:exception |
		exception pythonTypeName = 'ModuleNotFoundError'
			ifTrue: [ModuleNotFoundError signal: 'No module named ''' , aName , '''']
			ifFalse: [exception pass]
	]
%
category: 'Grail-Testing'
classmethod: EmbeddedExtensionModule
isImportBackend
	"True when the embedded interpreter is this session's import backend.
	The choice is per gem: a session opts in with #useAsImportBackend,
	recorded in SessionTemps.  With no opt-in, embedded is the backend
	only when the shim is not configured."

	| selected |
	CPythonLibrary isConfigured ifFalse: [^ false].
	selected := SessionTemps current at: #'grailImportBackend' ifAbsent: [nil].
	^ selected == #'embedded'
		or: [selected isNil and: [CPythonShim isConfigured not]]
%

category: 'Grail-Backend Selection'
classmethod: EmbeddedExtensionModule
useAsImportBackend
	"Select the embedded CPython interpreter as this session's import
	backend.  Call once at session start, before importing any C
	extension.  The choice lives in SessionTemps, so it affects only the
	current gem and resets on logout."

	CPythonLibrary isConfigured ifFalse: [
		^ self error: 'Cannot use the embedded backend: libpython is not configured (run install.sh).'].
	SessionTemps current at: #'grailImportBackend' put: #'embedded'.
%
! ------------------- Instance methods for EmbeddedExtensionModule
category: 'Grail-Accessing'
method: EmbeddedExtensionModule
cpythonModule

	^ cpythonModule
%
category: 'Grail-Initialization'
method: EmbeddedExtensionModule
setCpythonModule: aCPythonObject name: aName

	cpythonModule := aCPythonObject.
	self at: #__name__ put: aName.
	self at: #__package__ put: nil.
%

category: 'Grail-Attribute Access'
method: EmbeddedExtensionModule
doesNotUnderstand: aSelector args: anArray envId: envId

	(self includesKey: aSelector) ifTrue: [^ self at: aSelector].
	^ CPythonObjectForwarder
		dispatchAttributeOrCall: aSelector arguments: anArray
		loadingAttributeWith: [:attributeName | self @env1:___pyAttrLoad___: attributeName]
		ifUnsupported: [super doesNotUnderstand: aSelector args: anArray envId: envId]
%

category: 'Grail-Attribute Access'
method: EmbeddedExtensionModule
cantPerform: aSelector withArguments: anArray env: envId
	"Mirror DNU handling for explicit perform: env: calls.  Without this,
	the perform:env:withArguments: dispatch path would inherit module's
	cantPerform: (dict / dynamic-instVar lookup only) and miss the CPython
	forwarder dispatch."

	^ self doesNotUnderstand: aSelector args: anArray envId: envId
%

set compile_env: 1

category: 'Grail-Attribute Access'
method: EmbeddedExtensionModule
___pyAttrLoad___: attributeName

	^ CPythonObjectForwarder @env0:replicateAttribute: attributeName of: cpythonModule
%

set compile_env: 0
