! ------------------- Superclass check
run
NativeModule ifNil: [self error: 'NativeModule is not defined. Check file ordering.'].
%

! ------- grail class (Python 'grail' module)
expectvalue /Class
doit
NativeModule subclass: 'grail'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
grail comment:
'Python grail module.

Provides GemStone/Grail-specific meta-programming APIs.  Not available in
standard CPython; analogous to the ``micropython'' module in MicroPython.

Methods on this class are real env-1 fast-path methods, dispatched
directly via ``grail.method(args)'' Python calls.
'
%

expectvalue /Class
doit
grail category: 'Grail-Modules'
%

! ===============================================================================
! grail Module (Python ''grail'' module)
! ===============================================================================

! ------------------- Remove existing Python methods from grail
expectvalue /Metaclass3
doit
grail removeAllMethods: 1.
grail class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: grail
initialize
	"Publish the Grail-internal base classes that Grail's own bundled
	Python needs to subclass.

	These live in the ``Python'' SymbolDictionary, which is currently also
	what a bare Python name resolves against -- so today they happen to be
	reachable as globals.  That is not CPython behaviour (``AbstractPyInt''
	is not a builtin), and the bundled stdlib should not depend on it.
	Reaching them through ``from grail import ...'' states the dependency,
	and is what lets bare-name resolution be narrowed to real builtins
	without breaking re/_constants.py, http/__init__.py and friends.

	The ``grail'' module is the right home: it already exists for exactly
	this -- Grail-specific APIs with no CPython counterpart.

	Only production classes belong here.  GrailForwarderTarget is a test
	fixture living in the PythonTests dictionary (and filed after this
	module), so tests/python/smalltalk_forwarder.py reaches it through the
	``gemstone'' module's named-global lookup instead."

	self @env0:at: #AbstractPyInt put: AbstractPyInt.
	self @env0:at: #NamedIntConstant put: NamedIntConstant.
%

! ===============================================================================
! @smalltalk_class decorator
! ===============================================================================

category: 'Grail-smalltalk_class'
method: grail
_smalltalk_class: args kw: kw
	"grail.smalltalk_class(dictionary=''DictName'', class_name=''ClassName'')

	Decorator factory.  Decorates a Python class definition to install its
	env-1 methods onto an existing Smalltalk class instead of creating a new
	Python-style class.  Usage:

	    from grail import smalltalk_class

	    @smalltalk_class(dictionary=''Kernel'', class_name=''OrderedCollection'')
	    class OrderedCollection:
	        __slots__ = ()   # must match the class''s own instVarNames

	        def as_python_list(self):
	            ...

	The decorator:
	  1. Looks up the target class in the named dictionary.
	  2. Validates __slots__ against the target''s own instVarNames (name + order).
	  3. Compiles each env-1 method from the temporary class onto the target.
	  4. Returns the target Smalltalk class.

	__slots__ must be declared.  An empty tuple () is correct when the class
	declares no instance variables of its own (all instVars are inherited).

	Instance variable access via self.x works only when the target class has
	existing Smalltalk accessor methods named x / x:."

	| dictName className selfClass |
	kw @env0:isNil ifTrue: [
		TypeError ___signal___: 'grail.smalltalk_class() requires keyword arguments: dictionary, class_name'].
	dictName := kw @env0:at: 'dictionary' ifAbsent: [
		TypeError ___signal___: 'grail.smalltalk_class() requires keyword argument: dictionary'.].
	className := kw @env0:at: 'class_name' ifAbsent: [
		TypeError ___signal___: 'grail.smalltalk_class() requires keyword argument: class_name'.].
	selfClass := self @env0:class.
	^ [ :args2 :kw2 |
		| cls |
		cls := args2 @env0:at: 1.
		selfClass @env0:___applySmallTalkClass: cls dictionary: dictName name: className
	]
%

! ===============================================================================
! Fresh imports (test.support.import_helper.import_fresh_module)
! ===============================================================================

category: 'Grail-Fresh Import'
method: grail
_begin_fresh_import: aName
	"grail._begin_fresh_import(name) -- the next import of ``name'' builds a
	SESSION-LOCAL module: cold, recorded in no canonical registry, its class
	filed in the session dictionary (importlib class >>
	___isSessionLocalModule___:).  Paired with _end_fresh_import; only
	import_fresh_module calls either."

	(SessionTemps @env0:current @env0:at: #'GrailFreshImports'
		ifAbsentPut: [Set @env0:new]) @env0:add: aName @env0:asString.
	^ None
%

category: 'Grail-Fresh Import'
method: grail
_end_fresh_import: aName
	"grail._end_fresh_import(name) -- end the fresh import of ``name'', and let
	go of everything that still holds its module but the caller: the name's
	sys.modules entry (CPython's helper restores sys.modules too), its class in
	the session dictionary, and its entry in the module-singleton registry --
	found by asking the kernel for the module's referrers, since nothing else
	names them.  The class has to go as well, because generated
	code resolves names against that dictionary AHEAD of PythonModules: left
	there, a later ordinary import of the same name would compile against the
	fresh module's class."

	^ self ___endFreshImport___: aName keepingInstance: false
%

category: 'Grail-Fresh Import'
method: grail
_end_fresh_import_kept: aName
	"grail._end_fresh_import_kept(name) -- _end_fresh_import, but the fresh
	module STAYS its class's session singleton, so it lives for the session.

	For a copy whose code will run: a method reaches its module's globals
	through ``<module class> ___instance___'', and with the registry entry gone
	that mints ANOTHER instance and re-runs the module body.  test_statistics'
	pure-Python copy (import_fresh_module with blocked=) then compared its
	NormalDist instances against a third module's class and found them unequal.
	A plain fresh import keeps the dropping form: what test_struct checks there
	is that the module can be collected, and it never calls into it again."

	^ self ___endFreshImport___: aName keepingInstance: true
%

category: 'Grail-Fresh Import'
method: grail
___endFreshImport___: aName keepingInstance: keep
	"The body of _end_fresh_import / _end_fresh_import_kept."

	| name set mod classes |
	name := aName @env0:asString.
	set := SessionTemps @env0:current @env0:at: #'GrailFreshImports' otherwise: nil.
	set == nil ifFalse: [set @env0:remove: name ifAbsent: []].
	mod := importlib @env1:modules @env0:at: name @env0:asSymbol otherwise: nil.
	importlib @env1:modules @env0:removeKey: name @env0:asSymbol ifAbsent: [].
	classes := importlib @env0:___sessionModuleClasses___.
	mod == nil ifFalse: [
		(classes @env0:keys @env0:select: [:k | (classes @env0:at: k) == mod @env0:class])
			@env0:do: [:k | classes @env0:removeKey: k].
		"...and the per-session singleton registry (module class >>
		___sessionInstances___), keyed by that class: the last thing holding it."
		keep ifFalse: [
			module @env0:___sessionInstances___ @env0:removeKey: mod @env0:class ifAbsent: []]].
	^ None
%

! ===============================================================================
! @smalltalk decorator
! ===============================================================================

category: 'Grail-smalltalk'
method: grail
_smalltalk: args kw: kw
	"grail.smalltalk — marks a class method as a forwarder to a native
	(env-0) Smalltalk method.  RECOGNISED AT COMPILE TIME by FunctionDefAst
	(see isSmalltalkForwarder): a @smalltalk-decorated method inside a class
	body is rewritten so that calling it dispatches ``self @env0:<selector>''
	with the method''s arguments, mapping a nil result to None.  Usage:

	    from grail import smalltalk

	    class Widget:
	        @smalltalk
	        def size(self): ...              # -> self size          (env 0)

	        @smalltalk('at:put:')
	        def set(self, key, value): ...   # -> self at: key put: value (env 0)

	Bare ``@smalltalk'' derives the target selector from the method name and
	arity (name / name: / name:_: ...); ``@smalltalk('selector')'' names it
	explicitly (any unary / binary / keyword Smalltalk selector).

	This runtime method is only an IDENTITY decorator — it exists so the
	name imports (``from grail import smalltalk'') and so any module-level /
	CPython-compat use stays harmless.  Class-body methods never reach it:
	the rewrite happens at compile time.  Called bare (args = (func,)) it
	returns the function unchanged; called as a factory (args = ('sel',)) it
	returns an identity decorator."

	| first |
	first := (args @env0:isNil or: [args @env0:isEmpty])
		ifTrue: [nil]
		ifFalse: [args @env0:at: 1].
	(first isKindOf: CharacterCollection) ifTrue: [
		"Factory form @smalltalk('sel'): return an identity decorator."
		^ [:a2 :k2 | a2 @env0:at: 1]].
	"Bare form @smalltalk applied to the function: return it unchanged."
	^ first
%

category: 'Grail-Import Support'
method: grail
_fresh_native_module: aName
	"A freshly built copy of the NATIVE module aName, or None.

	test.support.import_helper.import_fresh_module asks for this when it is
	given ``fresh='': CPython's helper answers a NEW module object, and
	test_warnings checks exactly that -- ``assertIsNot(original_warnings,
	c_warnings)'' (CWarnTests.test_accelerated).  Grail's import machinery has
	no way to re-run a native module's import, so the helper used to answer
	the module already in sys.modules.

	None -- and the helper's old answer -- unless aName is a native module
	that has declared its instances independent (NativeModule class >>
	___hasFreshInstances___)."

	| cls |
	cls := Python @env0:at: aName @env0:asString @env0:asSymbol otherwise: nil.
	(cls @env0:isKindOf: Behavior) ifFalse: [^ None].
	(cls @env0:inheritsFrom: NativeModule) ifFalse: [^ None].
	cls ___hasFreshInstances___ ifFalse: [^ None].
	^ cls ___freshInstance___
%

set compile_env: 0

! ===============================================================================
! grail class-side helpers (env-0 Smalltalk)
! ===============================================================================

category: 'Grail-smalltalk_class'
classmethod: grail
___applySmallTalkClass: tempClass dictionary: dictName name: className
	"Core @smalltalk_class decorator implementation.  Validates __slots__,
	copies env-1 methods from tempClass onto the target Smalltalk class,
	and returns the target."

	| target |
	target := self ___lookupClass: className inDictionary: dictName.
	self ___validateSlots: tempClass against: target className: className.
	self ___installMethodsFrom: tempClass onto: target.
	^ target
%

category: 'Grail-smalltalk_class'
classmethod: grail
___lookupClass: className inDictionary: dictName
	"Return the Smalltalk class named className inside the dictionary named
	dictName.  Searches the current session symbol list.  Raises AttributeError
	if the dictionary or class is not found."

	| dictSym classSym symList |
	dictSym := dictName asSymbol.
	classSym := className asSymbol.
	symList := GsCurrentSession currentSession symbolList.
	symList do: [:dict |
		| target |
		(dict name == dictSym) ifTrue: [
			target := dict at: classSym ifAbsent: [nil].
			target ifNotNil: [^ target]
		]
	].
	^ AttributeError @env1:___signal___:
		('grail.smalltalk_class: class ''' , className asString ,
		 ''' not found in dictionary ''' , dictName asString , '''')
%

category: 'Grail-smalltalk_class'
classmethod: grail
___validateSlots: tempClass against: targetClass className: className
	"Validate that tempClass declares __slots__ and that its entries match
	targetClass instVarNames (own, not inherited) in name and order.
	Raises TypeError on any mismatch."

	| slots ownIvars |
	slots := [tempClass perform: #'__slots__' env: 1]
		on: MessageNotUnderstood do: [:e | nil].
	slots isNil ifTrue: [
		^ TypeError @env1:___signal___:
			(className asString ,
			 ': @smalltalk_class requires a __slots__ declaration')].
	ownIvars := targetClass instVarNames.
	(slots size = ownIvars size) ifFalse: [
		^ TypeError @env1:___signal___:
			(className asString ,
			 ': __slots__ has ' , slots size printString ,
			 ' entries but class has ' , ownIvars size printString ,
			 ' own instVars')].
	ownIvars doWithIndex: [:ivarName :i |
		| slotName |
		slotName := (slots at: i) asString.
		(slotName = ivarName asString) ifFalse: [
			TypeError @env1:___signal___:
				(className asString ,
				 ': __slots__[' , (i - 1) printString ,
				 '] is ''' , slotName ,
				 ''' but expected ''' , ivarName asString , '''')
		]
	]
%

category: 'Grail-smalltalk_class'
classmethod: grail
___installMethodsFrom: tempClass onto: targetClass
	"Copy all env-1 methods in category ''Grail-Class Methods'' from tempClass
	(and its metaclass) onto targetClass (and its metaclass respectively).
	Skips internal class attribute accessors (category ''Grail-Class Attrs'').
	Methods are installed under category ''Grail-ST-Extension''."

	| md |
	"Instance-side methods"
	md := tempClass methodDictForEnv: 1.
	md ifNotNil: [
		md keys do: [:sel |
			| cat src |
			cat := tempClass categoryOfSelector: sel environmentId: 1.
			(cat notNil and: [cat asSymbol = #'Grail-Class Methods']) ifTrue: [
				"An IR-built method carries Python source; the text it replaced
				is in the class-side ___irTextSources___ table."
				src := importlib ___textSourceFor___: (tempClass compiledMethodAt: sel environmentId: 1)
					in: tempClass selector: sel.
				src notNil ifTrue: [
					targetClass perform: #'___compileMethod:category:'
						env: 1
						withArguments: { src. 'Grail-ST-Extension' }]
			]
		]
	].
	"Class/static methods (metaclass-side)"
	md := tempClass class methodDictForEnv: 1.
	md ifNotNil: [
		md keys do: [:sel |
			| cat src |
			cat := tempClass class categoryOfSelector: sel environmentId: 1.
			(cat notNil and: [cat asSymbol = #'Grail-Class Methods']) ifTrue: [
				src := tempClass class sourceCodeAt: sel environmentId: 1.
				targetClass class perform: #'___compileMethod:category:'
					env: 1
					withArguments: { src. 'Grail-ST-Extension' }
			]
		]
	]
%
