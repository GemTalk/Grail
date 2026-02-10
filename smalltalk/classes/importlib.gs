! ===============================================================================
! importlib Module (Python 'importlib' module)
! ===============================================================================
! This file contains the Python importlib module implementation.
! The importlib module provides the implementation of the import statement.
! ===============================================================================

! ------------------- Remove existing Python methods from importlib
expectvalue /Metaclass3
doit
importlib removeAllMethods.
importlib class removeAllMethods.
%

set compile_env: 2

! ------------------- Class methods for importlib

category: 'Python-Module Registry'
classmethod: importlib
modules
	"Return the module registry (delegates to sys.modules).
	This is a SymbolDictionary mapping module names to module instances."
	^ sys modules
%

category: 'Python-Module Registry'
classmethod: importlib
lookupModule: aName
	"Look up a module by name in the registry.
	Returns the module class or nil if not found."
	^ self modules ___at___: aName ___asSymbol___ ifAbsent: [nil]
%

category: 'Module Loading'
classmethod: importlib
___moduleNameToPath___: aName
	"Convert a module name (e.g., 'smalltalk.tests.hello') to a file path (e.g., 'smalltalk/tests/hello.py').
	Returns the full path if the file exists, or nil if not found."
	| pathParts filePath baseDir |
	grailDir == nil ifTrue: [^ nil].
	pathParts := $. ___split___: aName.
	filePath := (grailDir ___concat___: '/') ___concat___: ('/' join: pathParts).
	filePath := filePath ___concat___: '.py'.
	(GsFile perform: #existsOnServer: env: 0 withArguments: { filePath }) ifTrue: [^ filePath].
	^ nil
%

! ------------------- Instance methods for importlib

category: 'Python-Initialization'
method: importlib
initialize
	"Initialize all module attributes with their default values"
	self 
		initialize_import_module;
		initialize_reload;
		initialize_invalidate_caches;
		initialize___import__;
		yourself
%

category: 'Python-Initialization'
method: importlib
initialize_import_module
	"Import a module by name.
	import_module(name, package=None) -> module
	
	The name argument specifies what module to import in absolute or relative terms.
	If the name is specified in relative terms, then the package argument must be set."
	self ___at___: #import_module put: [:positional :keywords |
		| name package absoluteName importFunc |
		name := positional ___at___: 1.
		package := (positional __len__ ___gt___: 1)
			ifTrue: [positional ___at___: 2]
			ifFalse: [keywords ifNotNil: [keywords __getitem__: 'package'] ifNil: [None]].
		
		"Resolve relative imports using package, then delegate to __import__.
		For now we simply return whatever __import__ returns (typically the
		top-level module)."
		absoluteName := (name ___beginsWith___: '.')
			ifTrue: [
				package == None ifTrue: [
					ImportError ___signal___: 'attempted relative import with no known parent package'
				].
				self ___resolve_name___: name package: package
			]
			ifFalse: [name].
		
		importFunc := self __import__.
		importFunc value: {absoluteName} value: nil
	]
%

category: 'Python-Initialization'
method: importlib
initialize_reload
	"Reload a previously imported module.
	reload(module) -> module

	The argument must be a module object."
	self ___at___: #reload put: [:positional :keywords |
		| aModule moduleClass |
		aModule := positional ___at___: 1.
		"For built-in modules, we can clear and reinitialize the instance"
		moduleClass := aModule ___class___.
		moduleClass clearInstance.
		moduleClass instance
	]
%

category: 'Python-Initialization'
method: importlib
initialize_invalidate_caches
	"Invalidate the caches of all finders.
	invalidate_caches() -> None

	For built-in modules, this is a no-op."
	self ___at___: #invalidate_caches put: [:positional :keywords |
		None
	]
%

category: 'Python-Initialization'
method: importlib
initialize___import__
	"Low-level import function.
	__import__(name, globals=None, locals=None, fromlist=(), level=0) -> module

	This is the function invoked by the import statement."
	self ___at___: #__import__ put: [:positional :keywords |
		| name globals locals fromlist level absoluteName moduleInstance filePath result |
		name := positional ___at___: 1.
		globals := (positional __len__ ___gt___: 1)
			ifTrue: [positional ___at___: 2]
			ifFalse: [keywords ifNotNil: [keywords __getitem__: 'globals'] ifNil: [None]].
		locals := (positional __len__ ___gt___: 2)
			ifTrue: [positional ___at___: 3]
			ifFalse: [keywords ifNotNil: [keywords __getitem__: 'locals'] ifNil: [None]].
		fromlist := (positional __len__ ___gt___: 3)
			ifTrue: [positional ___at___: 4]
			ifFalse: [keywords ifNotNil: [keywords __getitem__: 'fromlist'] ifNil: [{}]].
		level := (positional __len__ ___gt___: 4)
			ifTrue: [positional ___at___: 5]
			ifFalse: [keywords ifNotNil: [keywords __getitem__: 'level'] ifNil: [0]].

		"Handle relative imports"
		absoluteName := (level ___gt___: 0)
			ifTrue: [
				| package |
				package := globals ifNotNil: [globals __getitem__: '__package__'] ifNil: [None].
				package == None ifTrue: [
					ImportError ___signal___: 'attempted relative import with no known parent package'
				].
				self ___resolve_name___: name package: package level: level
			]
			ifFalse: [name].

		"Look up the module"
		moduleInstance := self ___class___ lookupModule: absoluteName.
		moduleInstance notNil ifTrue: [
			result := moduleInstance
		] ifFalse: [
			"Module not found in registry - search filesystem"
			filePath := self ___class___ ___moduleNameToPath___: absoluteName.
			filePath notNil ifTrue: [
				result := self ___class___ perform: #loadModuleFromPath:name: env: 0 withArguments: { filePath. absoluteName. }.
			] ifFalse: [
				"Module not found in filesystem either"
				ModuleNotFoundError ___signal___: (('No module named ''' ___concat___: absoluteName) ___concat___: '''')
			]
		].
		result
	]
%

category: 'Python-Private'
method: importlib
___resolve_name___: name package: package
	"Resolve a relative module name to an absolute name"
	| dots remaining parentParts |
	dots := 0.
	name do: [:c | c = $. ifTrue: [dots := dots + 1] ifFalse: [^ self error: 'Invalid relative import']].
	remaining := name copyFrom: dots + 1 to: name size.
	parentParts := $. ___split___: package.
	(dots > parentParts __len__) ifTrue: [
		ImportError ___signal___: 'attempted relative import beyond top-level package'
	].
	parentParts := parentParts __getitem__: (0 ___to___: (parentParts __len__ - dots)).
	remaining isEmpty
		ifTrue: ['.' join: parentParts]
		ifFalse: [('.' join: parentParts parentParts) ___concat___: '.' ___concat___: remaining]
%

category: 'Python-Private'
method: importlib
___resolve_name___: name package: package level: level
	"Resolve a relative module name to an absolute name with explicit level"
	| parentParts |
	parentParts := $. ___split___: package.
	(level > parentParts __len__) ifTrue: [
		ImportError ___signal___: 'attempted relative import beyond top-level package'
	].
	parentParts := parentParts __getitem__: (0 ___to___: (parentParts __len__ - level + 1)).
	name isEmpty
		ifTrue: ['.' join: parentParts parentParts]
		ifFalse: [('.' join: parentParts parentParts) ___concat___: '.' ___concat___: name]
%

! ------------------- Getter and setter methods for importlib

category: 'Python-Accessors'
method: importlib
import_module
	"Return the import_module function"
	^ self ___at___: #import_module
%

category: 'Python-Accessors'
method: importlib
import_module: aBlock
	"Set the import_module function (for monkey patching)"
	self ___at___: #import_module put: aBlock
%

category: 'Python-Accessors'
method: importlib
reload
	"Return the reload function"
	^ self ___at___: #reload
%

category: 'Python-Accessors'
method: importlib
reload: aBlock
	"Set the reload function (for monkey patching)"
	self ___at___: #reload put: aBlock
%

category: 'Python-Accessors'
method: importlib
invalidate_caches
	"Return the invalidate_caches function"
	^ self ___at___: #invalidate_caches
%

category: 'Python-Accessors'
method: importlib
invalidate_caches: aBlock
	"Set the invalidate_caches function (for monkey patching)"
	self ___at___: #invalidate_caches put: aBlock
%

category: 'Python-Accessors'
method: importlib
__import__
	"Return the __import__ function"
	^ self ___at___: #__import__
%

category: 'Python-Accessors'
method: importlib
__import__: aBlock
	"Set the __import__ function (for monkey patching)"
	self ___at___: #__import__ put: aBlock
%

set compile_env: 0

! ------------------- Convenience class methods for importlib

category: 'Demo'
classmethod: importlib
hello

	[
		| module function hello |
		module := importlib perform: #instance env: 2.
		function := module perform: #import_module env: 2.
		hello := function value: { 'smalltalk.tests.hello' } value: nil.
		^hello
	] on: AbstractException do: [:ex |
		ex halt.
	].
%

category: 'Module Loading'
classmethod: importlib
loadModuleFromPath: pathString name: moduleName
	"Load a module from a file path and register it.
	Returns the module instance."
	| moduleAst mySymbolList moduleInstance nameParts packageName |
	moduleAst := self astForPath: pathString.
	moduleAst name: moduleName.
	mySymbolList := SymbolList with: builtins ___instance___.
	moduleAst executeWithScope: mySymbolList.
	"Create a module instance"
	moduleInstance := module basicNew.
	nameParts := $. split: moduleName.
	packageName := (nameParts size > 1)
		ifTrue: ['.' perform: #join: env: 2 withArguments: { (nameParts copyFrom: 1 to: nameParts size - 1) }]
		ifFalse: [None].
	moduleInstance 
		perform: #'__name__:' env: 2 withArguments: { moduleName };
		perform: #'__package__:' env: 2 withArguments: { packageName }.
	"Register the module in sys.modules"
	self 
		registerModule: moduleName 
		with: moduleInstance.
	^ moduleInstance
%

category: 'Python-Module Registry'
classmethod: importlib
registerModule: aName with: aModule
	"Register a module class in the module registry"
	(self perform: #modules env: 2) 
		at: aName asSymbol 
		put: aModule
%

category: 'For Tests'
classmethod: importlib
___lookupModule___: aName
	^ self perform: #'lookupModule:' env: 2 withArguments: { aName }
%

category: 'For Tests'
classmethod: importlib
grailDir
	"Return the absolute path to the Grail project directory."
	^ grailDir
%

category: 'Configuration'
classmethod: importlib
grailDir: aString
	"Set the absolute path to the Grail project directory."
	grailDir := aString
%

category: 'AST-Generation'
classmethod: importlib
astForPath: pathString
	"Create a ModuleAst from a Python file path.

	importlib astForPath: '/path/to/file.py'.
	"
		| file sourceString module |
		file := GsFile open: pathString mode: 'rb' onClient: false.
		sourceString := file contentsAsUtf8 decodeToUnicode.
		file close.
		module := ModuleAst parseSource: sourceString.
		module path: pathString.
		^module
%

category: 'AST-Generation'
classmethod: importlib
astForSource: aString
	"Create a ModuleAst from Python source code.

	importlib astForSource: '1 == 1'.
	"
		^ModuleAst parseSource: aString
%

category: 'Module Loading'
classmethod: importlib
runPath: pathString
	"Execute a Python file as __main__ (like running 'python3 file.py').

	importlib runPath: '/path/to/script.py'.
	"
	| file module stream method mySymbolList |
	module := self astForPath: pathString.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	file := GsFile open: '/tmp/grail.st' mode: 'w' onClient: false.
	file nextPutAll: stream contents.
	file close.
	mySymbolList := SymbolList with: builtins ___instance___.
	[
		method := stream contents
			_compileInContext: nil
			symbolList: mySymbolList
			oldLitVars: nil
			environmentId: 2
			flags: 0.
	] on: AbstractException do: [:ex |
		ex pass.
	].
	[
		^ method _executeInContext: 2
	] on: AbstractException do: [:ex |
		ex pass.
	].
%

category: 'Module Loading'
classmethod: importlib
smalltalkForPath: pathString
	"Generate Smalltalk code from a Python file.
	Useful for debugging the transpiler.

	importlib smalltalkForPath: '/path/to/script.py'.
	"
	| module stream |
	module := self astForPath: pathString.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	^ stream contents
%

category: 'Module Loading'
classmethod: importlib
smalltalkForSource: aString
	"Generate Smalltalk code from Python source code.
	Useful for debugging the transpiler.

	importlib smalltalkForSource: '1 + 2'.
	"
	| module stream |
	module := self astForSource: aString.
	stream := PrettyWriteStream on: Unicode7 new.
	module printSmalltalkOn: stream.
	^ stream contents
%
