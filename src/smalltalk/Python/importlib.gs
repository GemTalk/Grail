! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- importlib class (Python 'importlib' module)
expectvalue /Class
doit
module subclass: 'importlib'
  instVarNames: #()
  classVars: #()
  classInstVars: #('grailDir')
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
importlib comment:
'Python importlib module.

This class provides the implementation of the import statement.
It enables programmatic importing of modules.

Key functions:
- import_module(name, package=None): Import a module by name
- reload(module): Reload a previously imported module
- invalidate_caches(): Invalidate finder caches
- __import__(name, globals, locals, fromlist, level): Low-level import function

Class methods for loading modules from files:
- astForPath: - Create a ModuleAst from a Python file
- astForSource: - Create a ModuleAst from Python source
- runPath: - Execute a Python file as __main__

The module registry is maintained in sys.modules (accessed via sys class>>modules).

See https://docs.python.org/3/library/importlib.html for documentation.
'
%

expectvalue /Class
doit
importlib category: 'Modules'
%

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

set compile_env: 0

category: 'For Tests'
classmethod: importlib
___lookupModule___: aName
	^ self @env1:lookupModule: aName
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

category: 'Demo'
classmethod: importlib
hello

	[
		| module function hello |
		module := importlib @env1:instance.
		function := module @env1:import_module.
		hello := function value: { 'python.hello' } value: nil.
		^hello
	] on: AbstractException do: [:ex |
		ex halt.
	].
%

category: 'Module Loading'
classmethod: importlib
loadModuleFromPath: pathString name: moduleName
	"Load a module from a file path and register it.
	Returns the module instance.

	Creates a real Smalltalk class per Python module. Module-level
	globals become instance variables on the generated class. Top-level `def`
	statements compile as real env-1 methods with arity-specialized selectors.
	The remaining module body compiles as an `initialize` method on the class.

	The class is registered in UserGlobals under a sanitized name derived
	from the dotted module name (e.g. 'a.foo' → 'py_a_foo'). Re-import
	returns the cached instance from sys.modules."

	| moduleAst moduleClass moduleClassName moduleInstance nameParts packageName
	  variables variableNames stream methodSource sl
	  topLevelDefs functionNames lf |
	moduleAst := self astForPath: pathString.
	moduleAst name: moduleName.
	moduleAst useTempsForBlock: false.

	"Collect declared variable names from the module body"
	moduleAst setParent: nil.
	variables := moduleAst body variables.
	variableNames := variables asArray.

	"Build the Smalltalk class name: 'py_' prefix + module name with dots → underscores"
	moduleClassName := ('py_' , (moduleName copyReplaceAll: '.' with: '_')) asSymbol.

	"Create or reuse the Smalltalk class for this module"
	moduleClass := UserGlobals at: moduleClassName ifAbsent: [nil].
	moduleClass ifNil: [
		moduleClass := module subclass: moduleClassName
			instVarNames: variableNames
			classVars: #()
			classInstVars: #()
			poolDictionaries: #()
			inDictionary: UserGlobals
			options: #().
	].

	"Compile top-level `def` statements as real methods on the
	module class. Scan for FunctionDefAst nodes, pre-register stubs so
	inter-function calls resolve, then compile real methods."
	lf := Character lf asString.
	sl := System myUserProfile symbolList copy.
	topLevelDefs := moduleAst body body select: [:stmt |
		stmt isKindOf: FunctionDefAst].
	functionNames := IdentitySet new.
	topLevelDefs do: [:stmt | functionNames add: stmt name asSymbol].

	"Pre-register stub methods for each function so inter-function calls
	resolve during codegen (avoids forward-reference timing issues)."
	topLevelDefs do: [:stmt |
		moduleClass compileMethod: stmt generateStubMethodSource
			dictionaries: sl
			category: 'Python-Methods'
			environmentId: 1.
	].

	"Compile top-level `class` definitions as real Smalltalk classes."
	self compileClassDefs: moduleAst body body symbolList: sl.

	"Set compile-time context so CallAst and FunctionDefAst emit module-
	aware code (self-sends, BoundMethod assignments)."
	CallAst moduleClassBeingCompiled: moduleClass.
	CallAst moduleFunctionNames: functionNames.
	[
		"Compile real methods for each top-level def.
		Resume CompileWarning because function params may shadow module-
		level instVars (e.g. `def f(x)` where `x` is also a module var).
		Block temps can shadow instVars in GemStone but produce a warning."
		topLevelDefs do: [:stmt |
			| methodStream methodSource2 |
			methodStream := PrettyWriteStream on: Unicode7 new.
			stmt generateMethodSourceOn: methodStream.
			methodSource2 := methodStream contents.
			[moduleClass compileMethod: methodSource2
				dictionaries: sl
				category: 'Python-Methods'
				environmentId: 1.
			] on: CompileWarning do: [:ex | ex resume].
		].

		"Generate the module body as Smalltalk source for the initialize method.
		Top-level defs emit BoundMethod assignments; calls emit self-sends."
		stream := PrettyWriteStream on: Unicode7 new.
		moduleAst printSmalltalkOn: stream.

		"Compile the body as an env-1 `initialize` method on the new class."
		methodSource := 'initialize' , lf , stream contents.
		moduleClass compileMethod: methodSource
			dictionaries: sl
			category: 'Python-Module Body'
			environmentId: 1.
	] ensure: [
		CallAst moduleClassBeingCompiled: nil.
		CallAst moduleFunctionNames: nil.
	].

	"Generate unary accessor methods for each module-level variable so
	attribute access like `module.x` resolves to an instVar read.
	Skip function names — they have real methods + BoundMethod in instVar."
	variableNames do: [:varName |
		| accessorSource |
		(functionNames includes: varName asSymbol) ifFalse: [
			accessorSource := varName , lf , '	^ ' , varName.
			moduleClass compileMethod: accessorSource
				dictionaries: sl
				category: 'Python-Accessors'
				environmentId: 1.
		].
	].

	"Create an instance, set metadata, register, then run.
	Must use @env0:new (not basicNew) because module inherits from
	SymbolDictionary, which requires internal structure initialization."
	moduleInstance := moduleClass @env0:new.
	nameParts := $. split: moduleName.
	packageName := (nameParts size > 1)
		ifTrue: ['.' @env1:join: (nameParts copyFrom: 1 to: nameParts size - 1)]
		ifFalse: [None].
	moduleInstance
		@env1:__name__: moduleName;
		@env1:__package__: packageName.
	(pathString endsWith: '__init__.py') ifTrue: [
		| dirPath |
		dirPath := pathString copyFrom: 1 to: pathString size - '/__init__.py' size.
		moduleInstance @env1:__path__: { dirPath }.
		moduleInstance @env1:__package__: moduleName.
	].
	"Register BEFORE execution so circular imports resolve"
	self registerModule: moduleName with: moduleInstance.
	"Execute the module body"
	moduleInstance @env1:initialize.
	^ moduleInstance
%

category: 'Module Loading'
classmethod: importlib
loadDynamicModuleNamed: moduleName fromPath: pathString
	"Load a .so C extension module via CPythonShim and register it."

	| moduleInstance |
	moduleInstance := CPythonShim loadDynamicModule: moduleName fromPath: pathString.
	self registerModule: moduleName with: moduleInstance.
	^ moduleInstance
%

category: 'Python-Module Registry'
classmethod: importlib
registerModule: aName with: aModule
	"Register a module class in the module registry"
	(self @env1:modules)
		at: aName asSymbol
		put: aModule
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
	"Builtins are not resolved through the symbol list; the codegen
	emits direct `((builtins instance) name: …)` sends. The symbol
	list just needs the Python class dictionary for class lookups
	(Exception, None, etc.)."
	mySymbolList := SymbolList with: Python.
	[
		method := stream contents
			_compileInContext: nil
			symbolList: mySymbolList
			oldLitVars: nil
			environmentId: 1
			flags: 0.
	] on: AbstractException do: [:ex |
		ex pass. "Code is here to allow a breakpoint"
	].
	[
		^ method _executeInContext: nil
	] on: AbstractException do: [:ex |
		ex pass. "Code is here to allow a breakpoint"
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

category: 'Class Compilation'
classmethod: importlib
compileClassDefs: bodyStatements symbolList: sl
	"For each ClassDefAst in the module body, create a real
	Smalltalk class with instance variables (from __init__), compile
	instance methods, and generate a value:value: class-side method
	for Python instantiation."

	| classDefs |
	classDefs := bodyStatements select: [:stmt | stmt isKindOf: ClassDefAst].
	classDefs do: [:classDef |
		self compileClassDef: classDef symbolList: sl.
	].
%

category: 'Class Compilation'
classmethod: importlib
compileClassDef: classDef symbolList: sl
	"Compile a single Python class definition as a real Smalltalk class."

	| className pyClass ivarNames methodDefs selfParam funcNames linefeed initMethod initSelector |
	linefeed := Character lf asString.
	className := ('pyc_' , classDef name) asSymbol.
	ivarNames := classDef instanceVarNamesFromInit.
	methodDefs := classDef instanceMethodDefs.
	selfParam := classDef selfParameterName.
	funcNames := IdentitySet new.
	methodDefs do: [:stmt | funcNames add: stmt name asSymbol].

	"Create the Smalltalk class in UserGlobals (always recreate to pick up
	instVar changes from modified source)"
	UserGlobals removeKey: className ifAbsent: [].
	pyClass := Object subclass: className
		instVarNames: ivarNames
		classVars: #()
		classInstVars: #()
		poolDictionaries: #()
		inDictionary: UserGlobals
		options: #().

	"Pre-register stub methods"
	methodDefs do: [:stmt |
		[pyClass compileMethod: stmt generateClassMethodStubSource
			dictionaries: sl
			category: 'Python-Class Methods'
			environmentId: 1.
		] on: CompileWarning do: [:ex | ex resume].
	].

	"Set class compile context"
	CallAst classBeingCompiled: pyClass.
	CallAst classInstVarNames: (IdentitySet withAll: ivarNames).
	CallAst classFunctionNames: funcNames.
	CallAst selfParameterName: selfParam.
	[
		"Compile each instance method"
		methodDefs do: [:stmt |
			| methodStream methodSrc |
			methodStream := PrettyWriteStream on: Unicode7 new.
			stmt generateClassMethodSourceOn: methodStream.
			methodSrc := methodStream contents.
			[pyClass compileMethod: methodSrc
				dictionaries: sl
				category: 'Python-Class Methods'
				environmentId: 1.
			] on: CompileWarning do: [:ex | ex resume].
		].
	] ensure: [
		CallAst classBeingCompiled: nil.
		CallAst classInstVarNames: nil.
		CallAst classFunctionNames: nil.
		CallAst selfParameterName: nil.
	].

	"Generate unary accessor methods for each instance variable"
	ivarNames do: [:varName |
		| accessorSource |
		accessorSource := varName , linefeed , '	^ ' , varName.
		[pyClass compileMethod: accessorSource
			dictionaries: sl
			category: 'Python-Accessors'
			environmentId: 1.
		] on: CompileWarning do: [:ex | ex resume].
	].

	"Generate value:value: class-side method for Python instantiation.
	Creates instance, calls __init__ if present, returns instance."
	initMethod := methodDefs detect: [:stmt | stmt name asSymbol == #'__init__'] ifNone: [nil].
	initSelector := initMethod ifNotNil: [initMethod classMethodSelector] ifNil: [nil].
	self compileInstantiationMethodFor: pyClass initSelector: initSelector symbolList: sl.
%

category: 'Class Compilation'
classmethod: importlib
compileInstantiationMethodFor: pyClass initSelector: initSelector symbolList: sl
	"Generate a class-side value:value: method for Python-style instantiation:
		ClassName(args) compiles to → ClassName value: {args} value: kwargs

	The generated method creates a new instance (via @env0:new to get
	proper initialization) and dispatches to __init__ if defined."

	| src |
	src := WriteStream on: Unicode7 new.
	src nextPutAll: 'value: positional value: keywords'; nextPut: Character lf.
	src nextPutAll: '| instance |'; nextPut: Character lf.
	src nextPutAll: 'instance := self @env0:new.'; nextPut: Character lf.
	initSelector ifNotNil: [
		src nextPutAll: 'instance perform: #'''.
		src nextPutAll: initSelector asString.
		src nextPutAll: ''' env: 1 withArguments: positional.'.
		src nextPut: Character lf.
	].
	src nextPutAll: '^ instance'.
	[pyClass class compileMethod: src contents
		dictionaries: sl
		category: 'Python-Instantiation'
		environmentId: 1.
	] on: CompileWarning do: [:ex | ex resume].
%

set compile_env: 1

category: 'Module Loading'
classmethod: importlib
___moduleNameToPath___: aName
	"Convert a module name (e.g., 'python.hello') to a file path.
	Checks for name.py first, then name/__init__.py (package).
	Returns the full path if found, or nil if not found."
	| pathParts basePath pyPath initPath |
	grailDir == nil ifTrue: [^ nil].
	pathParts := $. ___split___: aName.
	basePath := (grailDir ___concat___: '/') ___concat___: ('/' join: pathParts).
	"Try name.py first"
	pyPath := basePath ___concat___: '.py'.
	(GsFile @env0:existsOnServer: pyPath) ifTrue: [^ pyPath].
	"Try name/__init__.py (package)"
	initPath := basePath ___concat___: '/__init__.py'.
	(GsFile @env0:existsOnServer: initPath) ifTrue: [^ initPath].
	^ nil
%

category: 'Module Loading'
classmethod: importlib
___moduleNameToSoPath___: aName
	"Search for a .so extension module in the lib/ directory.
	Returns the full path if found, or nil if not found."
	| filePath |
	grailDir == nil ifTrue: [^ nil].
	filePath := ((grailDir ___concat___: '/lib/') ___concat___: aName) ___concat___: '.so'.
	(GsFile @env0:existsOnServer: filePath) ifTrue: [^ filePath].
	^ nil
%

category: 'Python-Module Registry'
classmethod: importlib
lookupModule: aName
	"Look up a module by name in the registry.
	Returns the module class or nil if not found."
	^ self modules ___at___: aName ___asSymbol___ ifAbsent: [nil]
%

category: 'Python-Module Registry'
classmethod: importlib
modules
	"Return the module registry (delegates to sys.modules).
	This is a SymbolDictionary mapping module names to module instances."
	^ sys modules
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


category: 'Python-Initialization'
method: importlib
initialize
	"No-op — all methods are real fast-path methods."
%

! ===============================================================================
! Fast-path callable methods
! ===============================================================================

category: 'Python-Built-in Functions'
method: importlib
___import__: positional kw: kwargs
	"Low-level import function (__import__).
	__import__(name, globals=None, locals=None, fromlist=(), level=0) -> module"

	| name globals locals fromlist level absoluteName moduleInstance filePath result nameParts isDotted prefix parentFilePath parentParts parentName childName parentModule |
	name := positional ___at___: 1.
	globals := (positional __len__ ___gt___: 1)
		ifTrue: [positional ___at___: 2]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'globals'] ifNil: [None]].
	locals := (positional __len__ ___gt___: 2)
		ifTrue: [positional ___at___: 3]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'locals'] ifNil: [None]].
	fromlist := (positional __len__ ___gt___: 3)
		ifTrue: [positional ___at___: 4]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'fromlist'] ifNil: [{}]].
	level := (positional __len__ ___gt___: 4)
		ifTrue: [positional ___at___: 5]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'level'] ifNil: [0]].

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

	"Split the name into parts; detect dotted names"
	nameParts := $. ___split___: absoluteName.
	isDotted := nameParts __len__ ___gt___: 1.

	"Ensure parent packages are loaded for dotted names"
	isDotted ifTrue: [
		prefix := nameParts @env0:at: 1.
		(self ___class___ lookupModule: prefix) ifNil: [
			parentFilePath := self ___class___ ___moduleNameToPath___: prefix.
			parentFilePath notNil ifTrue: [
				self ___class___ @env0:loadModuleFromPath: parentFilePath name: prefix.
			].
		].
		2 @env0:to: nameParts __len__ - 1 do: [:i |
			prefix := (prefix ___concat___: '.') ___concat___: (nameParts @env0:at: i).
			(self ___class___ lookupModule: prefix) ifNil: [
				parentFilePath := self ___class___ ___moduleNameToPath___: prefix.
				parentFilePath notNil ifTrue: [
					self ___class___ @env0:loadModuleFromPath: parentFilePath name: prefix.
				].
			].
		].
	].

	"Look up the module"
	moduleInstance := self ___class___ lookupModule: absoluteName.
	moduleInstance notNil ifTrue: [
		result := moduleInstance
	] ifFalse: [
		"Module not found in registry - search filesystem for .py"
		filePath := self ___class___ ___moduleNameToPath___: absoluteName.
		filePath notNil ifTrue: [
			result := self ___class___ @env0:loadModuleFromPath: filePath name: absoluteName.
		] ifFalse: [
			"Search filesystem for .so (C extension module)"
			filePath := self ___class___ ___moduleNameToSoPath___: absoluteName.
			filePath notNil ifTrue: [
				result := self ___class___ @env0:loadDynamicModuleNamed: absoluteName fromPath: filePath.
			] ifFalse: [
				"Module not found in filesystem either"
				ModuleNotFoundError ___signal___: (('No module named ''' ___concat___: absoluteName) ___concat___: '''')
			]
		]
	].

	"Bind submodule as attribute on parent module"
	isDotted ifTrue: [
		parentParts := nameParts @env0:copyFrom: 1 to: nameParts __len__ - 1.
		parentName := '.' @env0:join: parentParts.
		childName := nameParts @env0:last.
		parentModule := self ___class___ lookupModule: parentName.
		parentModule notNil ifTrue: [
			parentModule ___at___: childName ___asSymbol___ put: result.
		].
	].

	"Return the correct module per CPython semantics"
	^ (isDotted and: [fromlist __len__ ___eq___: 0])
		ifTrue: [self ___class___ lookupModule: (nameParts ___at___: 1)]
		ifFalse: [result]
%

category: 'Python-Built-in Functions'
method: importlib
_import_module: positional kw: kwargs
	"import_module(name, package=None) -> module.
	Delegates to ___import__:kw:."

	| name package absoluteName |
	name := positional ___at___: 1.
	package := (positional __len__ ___gt___: 1)
		ifTrue: [positional ___at___: 2]
		ifFalse: [kwargs ifNotNil: [kwargs __getitem__: 'package'] ifNil: [None]].

	absoluteName := (name ___beginsWith___: '.')
		ifTrue: [
			package == None ifTrue: [
				ImportError ___signal___: 'attempted relative import with no known parent package'
			].
			self ___resolve_name___: name package: package
		]
		ifFalse: [name].

	^ self ___import__: {absoluteName} kw: nil
%

category: 'Python-Built-in Functions'
method: importlib
import_module: name
	"import_module(name) -> module. 1-arg fast path."
	^ self _import_module: { name } kw: nil
%

category: 'Python-Built-in Functions'
method: importlib
invalidate_caches
	"invalidate_caches() -> None. No-op for built-in modules."
	^ None
%

category: 'Python-Built-in Functions'
method: importlib
reload: aModule
	"reload(module) -> module. Clears and reinitializes the module."
	| moduleClass |
	moduleClass := aModule ___class___.
	moduleClass clearInstance.
	^ moduleClass instance
%

set compile_env: 0
