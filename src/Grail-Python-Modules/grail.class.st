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

	^ aSourceOrNil isNil ifTrue: ['none'] ifFalse: ['text']

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___installMethodsFrom: tempClass onto: targetClass [
	"Copy all env-1 methods in category ''Grail-Class Methods'' from tempClass
	(and its metaclass) onto targetClass (and its metaclass respectively).
	Skips internal class attribute accessors (category ''Grail-Class Attrs'').
	Methods are installed under category ''Grail-ST-Extension''.  An IR-built
	method is regenerated onto the target from its IR builder (P2.2); one with
	no builder cannot be copied -- it keeps no text since P2.3b, and sharing
	it would leave the temporary class its inClass -- and raises a TypeError
	(importlib ___irCopyRefused___:site:onto:).  A text method is recompiled
	from its text."

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
						(BaseException ___isIRPythonMethod___: meth)
							ifTrue: [
								(self ___regenerateIntoPackage___: meth onto: pair value) ifFalse: [
									^ importlib ___irCopyRefused___: meth site: 'st-class'
										onto: pair value]]
							ifFalse: [
								src := importlib ___textSourceFor___: meth in: pair key selector: sel.
								importlib ___irCensusCopy___: 'st-class'
									route: (self ___censusRouteOf___: meth source: src)
									source: src.
								src notNil ifTrue: [
									pair value perform: #'___compileMethod:category:'
										env: 1
										withArguments: { src. 'Grail-ST-Extension' }]]]]]]].
	self ___refileClassHelpersOn: targetClass

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
grail class >> ___refileClassHelpersOn: targetClass [
	"File every method-local class helper on targetClass, both sides, under
	''Grail-ST-Extension''.

	A def regenerated onto the Smalltalk class (___regenerate___:onto:)
	brings the helpers of the class statements in its body with it
	(``___irClassDef_<n>_<C>___'', PyMethodIRBuilder >> classHelpers), which
	file themselves as ''Grail-IR Class Helpers''.  Everything @smalltalk_class
	puts on a Smalltalk class is under ''Grail-ST-Extension'', which is how it is
	found and removed again; a helper left out of it would outlive the def
	that sends it.  The text route compiled none: the twin builds the class
	inline."

	{ targetClass. targetClass class } do: [:beh |
		| md |
		md := beh methodDictForEnv: 1.
		md ifNotNil: [
			md keys do: [:sel |
				((BaseException ___classBodyHelperClassNameFor___: sel) notNil
					and: [(beh categoryOfSelector: sel environmentId: 1) = #'Grail-IR Class Helpers'])
					ifTrue: [
						[beh addCategory: 'Grail-ST-Extension' environmentId: 1]
							on: Error do: [:e | e return: nil].
						beh moveMethod: sel toCategory: 'Grail-ST-Extension' environmentId: 1]]]]

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___regenerate___: aMethod onto: aClass [
	"Whether an IR-built method of the temporary class went onto aClass by
	regenerating its IR there (importlib ___irRegenerate___:onto:category:,
	P2.2), with no text compiled.  False for a text method, which the caller
	recompiles, and for an IR one with no builder to regenerate from, which
	the caller refuses."

	(BaseException ___isIRPythonMethod___: aMethod) ifFalse: [^ false].
	(importlib ___irRegenerate___: aMethod onto: aClass category: 'Grail-ST-Extension')
		isNil ifTrue: [^ false].
	importlib ___irCensusCopy___: 'st-class' route: 'regen' source: nil.
	^ true

]

{ #category : 'Grail-smalltalk_class' }
grail class >> ___regenerateIntoPackage___: aMethod onto: aClass [
	"Whether aMethod, an IR-built method of the temporary class, went onto
	aClass through the home SESSION-METHOD package -- for a class this user
	cannot write, a kernel class such as Association, where
	___regenerate___:onto: (which installs into aClass's own method
	dictionary) fails.  The method is generated for aClass and installed
	nowhere (importlib ___irMethodFor___:on:as:), then filed in the package's
	environment-1 method and category dictionaries for aClass under
	''Grail-ST-Extension'', exactly where Behavior >>
	compileMethod:dictionaries:category:environmentId:methodDictEnvId: files
	a compiled source -- which is what the text twin's recompile did until
	P2.3b deleted the twin.  False when the package policy does not permit a
	session method there, or the method cannot be generated."

	| copy policy sel dicts cats cat |
	copy := importlib ___irMethodFor___: aMethod on: aClass as: aMethod selector.
	copy isNil ifTrue: [^ false].
	policy := GsPackagePolicy current.
	sel := copy selector.
	(policy enabled and: [policy permitSessionMethodFor: aClass selector: sel environmentId: 1])
		ifFalse: [^ false].
	dicts := policy homeSessionMethods methodAndCategoryDictionaryFor: aClass environmentId: 1.
	(dicts at: 1) at: sel put: copy.
	cats := dicts at: 2.
	cats valuesDo: [:selectors | selectors remove: sel ifAbsent: []].
	cat := #'Grail-ST-Extension'.
	(cats at: cat ifAbsent: [cats at: cat put: SymbolSet new]) add: sel.
	policy updateMethodLookupCacheFor: copy in: aClass environmentId: 1.
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
