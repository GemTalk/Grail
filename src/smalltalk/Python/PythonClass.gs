! ------------------- Superclass check
run
SymbolDictionary ifNil: [self error: 'SymbolDictionary is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonClass
expectvalue /Class
doit
SymbolDictionary subclass: 'PythonClass'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()

%

expectvalue /Class
doit
PythonClass comment:
'Runtime representation of a Python class.

A PythonClass is a SymbolDictionary that holds class-level attributes
(methods as closures, class variables, etc.). Instances are also
SymbolDictionaries with a __class__ entry pointing back to the class.

Attribute access uses doesNotUnderstand: to fall back to dictionary lookup,
mirroring the module pattern.

Instantiation (__call__): creates a new SymbolDictionary instance,
copies methods (wrapping closures to bind self), and calls __init__.
'
%

expectvalue /Class
doit
PythonClass category: 'Python'
%

! ------------------- Remove existing behavior from PythonClass
removeallmethods PythonClass
removeallclassmethods PythonClass

set compile_env: 1

category: 'Python-Instantiation'
method: PythonClass
value: positional value: keywords
	"Instantiate this class: create instance dict, copy methods, call __init__."

	| instance initFunc |
	instance := SymbolDictionary perform: #new env: 0.
	"Copy all entries from class to instance, wrapping closures as bound methods"
	self perform: #keysAndValuesDo: env: 0 withArguments: {[:k :v |
		(v ___isKindOf___: ExecBlock) ifTrue: [
			"Wrap closure to auto-inject instance as first positional arg"
			instance perform: #at:put: env: 0 withArguments: {k.
				[:pos :kw | v value: (({instance} perform: #, env: 0 withArguments: {pos})) value: kw]}.
		] ifFalse: [
			instance perform: #at:put: env: 0 withArguments: {k. v}.
		].
	]}.
	instance ___at___: #'__class__' put: self.
	"Call __init__ if defined"
	initFunc := self perform: #at:ifAbsent: env: 0 withArguments: {#'__init__'. [nil]}.
	initFunc ifNotNil: [
		initFunc value: (({instance} perform: #, env: 0 withArguments: {positional})) value: keywords.
	].
	^ instance
%

category: 'Python-Attribute Access'
method: PythonClass
__name__
	^ self ___at___: #'__name__'
%

set compile_env: 0

category: 'Python-Attribute Access'
method: PythonClass
doesNotUnderstand: aSelector args: anArray envId: envId
	"Fall back to dictionary lookup for unrecognized messages."

	(self includesKey: aSelector) ifTrue: [^ self at: aSelector].
	^ super doesNotUnderstand: aSelector args: anArray envId: envId
%

category: 'Python-Attribute Access'
method: PythonClass
cantPerform: aSymbol withArguments: anArray env: envId
	"Fall back to dictionary lookup for unrecognized messages."

	(self includesKey: aSymbol) ifTrue: [^ self at: aSymbol].
	^ super cantPerform: aSymbol withArguments: anArray env: envId
%
