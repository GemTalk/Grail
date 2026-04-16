! ------------------- Superclass check
run
SymbolDictionary ifNil: [self error: 'SymbolDictionary is not defined. Check file ordering.'].
%

! ------- module class (Python 'module' type)
!
! See docs/Rewrite_Dispatch_Model.md for the full design.
!
! `module` is a SymbolDictionary subclass. Module loading
! (`importlib loadModuleFromPath:`) depends on the runtime `module`
! instance being dictionary-shaped, because module-level Python globals
! for non-class-backed modules are stored as entries in the instance's
! SymbolDictionary slot and looked up via symbol-list resolution at
! compile time.

expectvalue /Class
doit
SymbolDictionary subclass: 'module'
  instVarNames: #()
  classVars: #()
  classInstVars: #( instance )
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
module comment:
'Python module type — root class for all Python modules in Grail.

Concrete modules (sys, math, builtins, importlib, ...) are direct
subclasses of this class. Each module is a singleton; the class-side
`instance` method returns its sole instance.

Storage:
  * `module` inherits from `SymbolDictionary`. Module-level Python
    globals are stored as entries in the instance''s dictionary slot
    and resolved through Smalltalk symbol-list lookup at compile time.
    The compile pipeline in `importlib loadModuleFromPath:` depends on
    this for variable resolution.
  * In contrast, builtins (abs, len, type, ...) are dispatched via
    real env-1 methods on the `builtins` class — see
    docs/Rewrite_Dispatch_Model.md. The dictionary-style storage here
    is only used for module-level user globals, not for builtins.

Inheritance:
  * `builtins` is the leaf subclass for the Python builtins module,
    holding all builtin methods (`abs:`, `len:`, `_print:kw:`, etc.).
    Other Python modules also subclass `module` directly. The
    inheritance is a Smalltalk implementation detail, not a Python
    type-theoretic claim — `type(math)` and `type(builtins)` should
    both report as `<class ''module''>`.

User-defined Python modules are compiled to real Smalltalk classes
with explicit instance variables for the module''s globals; the
dictionary-style storage here is only used for the legacy built-in
module singletons.
'
%

expectvalue /Class
doit
module category: 'Modules'
%

! ------------------- Remove existing Python methods from module
expectvalue /Metaclass3
doit
module removeAllMethods: 1.
module class removeAllMethods: 1.
%

set compile_env: 0

category: 'Convenience Methods'
classmethod: module
___instance___
	"env-0 entry point for the singleton accessor (callable from C/GciPerform)."
	^ self @env1:instance
%

set compile_env: 1

category: 'Python-Singleton'
classmethod: module
clearInstance
	"Clear the singleton instance (useful for testing)."
	instance := nil
%

category: 'Python-Singleton'
classmethod: module
instance
	"Return the singleton instance of this module subclass, creating it on
	first access. Initialization runs in env 1 so subclasses can install
	Python-side state."

	instance == nil ifTrue: [
		instance := self @env0:new.
		instance @env1:initialize
	].
	^ instance
%

category: 'Python-Singleton'
classmethod: module
new
	"Modules are singletons; use `instance` instead of `new`."
	TypeError ___signal___:
		('Use #''instance'' instead of #''new'' for '
			___concat___: (self ___name___ ___asString___ ___concat___: ' module'))
%

category: 'Python-Accessors'
method: module
__doc__
	"Return the module docstring, falling back to the base object docstring
	if unset."

	| doc |
	doc := self ___at___: #__doc__.
	doc == nil ifTrue: [^ super __doc__].
	^ doc
%

category: 'Python-Accessors'
method: module
__doc__: aValue
	self ___at___: #__doc__ put: aValue
%

category: 'Python-Accessors'
method: module
__loader__
	^ self ___at___: #__loader__
%

category: 'Python-Accessors'
method: module
__loader__: aValue
	self ___at___: #__loader__ put: aValue
%

category: 'Python-Accessors'
method: module
__name__
	^ self ___at___: #__name__
%

category: 'Python-Accessors'
method: module
__name__: aValue
	self ___at___: #__name__ put: aValue
%

category: 'Python-Accessors'
method: module
__package__
	^ self ___at___: #__package__
%

category: 'Python-Accessors'
method: module
__package__: aValue
	self ___at___: #__package__ put: aValue
%

category: 'Python-Accessors'
method: module
__path__
	"Return the module's __path__ if it has been set, else nil. Modules that
	are packages have a __path__; plain modules do not."

	^ (self @env0:includesKey: #__path__)
		ifTrue: [self ___at___: #__path__]
		ifFalse: [nil]
%

category: 'Python-Accessors'
method: module
__path__: aValue
	self ___at___: #__path__ put: aValue
%

category: 'Python-Accessors'
method: module
__spec__
	^ self ___at___: #__spec__
%

category: 'Python-Accessors'
method: module
__spec__: aValue
	self ___at___: #__spec__ put: aValue
%

set compile_env: 0

category: 'Python-Attribute Access'
method: module
doesNotUnderstand: aSelector args: anArray envId: envId
	"Fall back to dictionary lookup for unrecognized messages.
	This enables dynamic module attributes (e.g., functions loaded from .so
	files) to be accessed via normal Python attribute syntax. This path is
	used by compiled code message sends."

	(self includesKey: aSelector) ifTrue: [^ self at: aSelector].
	^ super doesNotUnderstand: aSelector args: anArray envId: envId
%

category: 'Python-Attribute Access'
method: module
cantPerform: aSymbol withArguments: anArray env: envId
	"Fall back to dictionary lookup for unrecognized messages.
	This path is used by perform:env: calls."

	(self includesKey: aSymbol) ifTrue: [^ self at: aSymbol].
	^ super cantPerform: aSymbol withArguments: anArray env: envId
%

set compile_env: 0
