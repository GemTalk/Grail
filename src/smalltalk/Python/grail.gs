! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- grail class (Python 'grail' module)
expectvalue /Class
doit
module subclass: 'grail'
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
	"No-op.  The module>>instance class method calls initialize on the
	newly-created instance; this stub keeps that contract."
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
				src := tempClass sourceCodeAt: sel environmentId: 1.
				targetClass perform: #'___compileMethod:category:'
					env: 1
					withArguments: { src. 'Grail-ST-Extension' }
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
