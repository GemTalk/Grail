"Python grail module.

Provides GemStone/Grail-specific meta-programming APIs.  Not available in
standard CPython; analogous to the ``micropython' module in MicroPython.

Methods on this class are real env-1 fast-path methods, dispatched
directly via ``grail.method(args)' Python calls.

"
Class {
	#name : 'grail',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-smalltalk_class' }
grail class >> ___applySmallTalkClass: tempClass dictionary: dictName name: className [
	"Core @smalltalk_class decorator implementation.  Validates __slots__,
	copies env-1 methods from tempClass onto the target Smalltalk class,
	and returns the target."

	| target |
	target := self ___lookupClass: className inDictionary: dictName.
	self ___validateSlots: tempClass against: target className: className.
	self ___installMethodsFrom: tempClass onto: target.
	^ target

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___censusRouteOf___: aMethod source: aSourceOrNil [
	"The P2.2 census route of one @smalltalk_class copy
	(importlib ___irCensusCopy___:route:source:)."

	aSourceOrNil isNil ifTrue: [^ 'none'].
	^ (BaseException ___isIRPythonMethod___: aMethod) ifTrue: ['twin'] ifFalse: ['text']

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___installMethodsFrom: tempClass onto: targetClass [
	"Copy all env-1 methods in category ''Grail-Class Methods'' from tempClass
	(and its metaclass) onto targetClass (and its metaclass respectively).
	Skips internal class attribute accessors (category ''Grail-Class Attrs'').
	Methods are installed under category ''Grail-ST-Extension''.  An IR-built
	method is regenerated onto the target from its IR builder (P2.2); a text
	one, or an IR one with no builder, is recompiled from its text."

	{ tempClass -> targetClass. tempClass class -> targetClass class } do: [:pair |
		| md |
		md := pair key methodDictForEnv: 1.
		md ifNotNil: [
			md keys do: [:sel |
				| cat meth src |
				cat := pair key categoryOfSelector: sel environmentId: 1.
				(cat notNil and: [cat asSymbol = #'Grail-Class Methods']) ifTrue: [
					meth := pair key compiledMethodAt: sel environmentId: 1.
					(self ___regenerate___: meth onto: pair value) ifFalse: [
						"A text method, or an IR one with no builder: its text,
						which for an IR method is in the class-side
						___irTextSources___ table (its sourceString is Python)."
						src := importlib ___textSourceFor___: meth in: pair key selector: sel.
						importlib ___irCensusCopy___: 'st-class'
							route: (self ___censusRouteOf___: meth source: src)
							source: src.
						src notNil ifTrue: [
							pair value perform: #'___compileMethod:category:'
								env: 1
								withArguments: { src. 'Grail-ST-Extension' }]]]]]]

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___lookupClass: className inDictionary: dictName [
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

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___regenerate___: aMethod onto: aClass [
	"Whether an IR-built method of the temporary class went onto aClass by
	regenerating its IR there (importlib ___irRegenerate___:onto:category:,
	P2.2), with no text compiled.  False for a text method, and for an IR one
	with no builder to regenerate from: the caller then recompiles its text."

	((BaseException ___isIRPythonMethod___: aMethod)
		and: [importlib ___irCopiesRegenerate___]) ifFalse: [^ false].
	(importlib ___irRegenerate___: aMethod onto: aClass category: 'Grail-ST-Extension')
		isNil ifTrue: [^ false].
	importlib ___irCensusCopy___: 'st-class' route: 'regen' source: nil.
	^ true

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___validateSlots: tempClass against: targetClass className: className [
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

]
